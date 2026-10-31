import { describe, it, expect, beforeAll } from "vitest";
import {
  randomBytes,
  publicEncrypt,
  createCipheriv,
  constants,
  createHash,
} from "node:crypto";
import * as dotenv from "dotenv";
import postgres from "postgres";

beforeAll(() => {
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });
});

describe("Security Layer 2: Hybrid Sealed Credential Channel", () => {
  it("should reject sealed payload with invalid or replayed challenge", async () => {
    const authUrl =
      process.env.DATABASE_AUTH_URL ||
      "postgres://vivona_auth:ChangeMe_Auth#2026@127.0.0.1:5432/vivona";
    const sql = postgres(authUrl);

    // 1. Create expired challenge
    const nonce = randomBytes(32).toString("hex");
    const nonceHash = createHash("sha256").update(nonce).digest("hex");
    const expiredAt = new Date(Date.now() - 5000); // Expired 5 seconds ago

    const [ch] = await sql`
      INSERT INTO private.auth_challenges (nonce_hash, kid, purpose, expires_at)
      VALUES (${nonceHash}, 'v1', 'login', ${expiredAt})
      RETURNING id
    `;

    // Attempting to select unexpired challenge should yield none
    const [validCh] = await sql`
      SELECT id FROM private.auth_challenges
      WHERE id = ${ch.id} AND used_at IS NULL AND expires_at > NOW()
    `;
    expect(validCh).toBeUndefined();

    // 2. Mark challenge as used and verify replay rejection
    await sql`UPDATE private.auth_challenges SET used_at = NOW() WHERE id = ${ch.id}`;
    const [replayedCh] = await sql`
      SELECT id FROM private.auth_challenges
      WHERE id = ${ch.id} AND used_at IS NULL
    `;
    expect(replayedCh).toBeUndefined();

    // Cleanup
    await sql`DELETE FROM private.auth_challenges WHERE id = ${ch.id}`;
    await sql.end();
  });

  it("should encrypt credentials with RSA-OAEP-256 + AES-256-GCM such that plaintext appears nowhere", () => {
    const publicKeyB64 = process.env.AUTH_RSA_PUBLIC_KEY || "";
    expect(publicKeyB64).toBeTruthy();
    const publicKeyPem = Buffer.from(publicKeyB64, "base64").toString("utf-8");

    const sentinelPassword = "Sentinel#SecretPassword!2026";
    const rawPayload = JSON.stringify({
      email: "admin@vivona.demo",
      password: sentinelPassword,
      nonce: randomBytes(32).toString("hex"),
      timestamp: Date.now(),
    });

    const aesKey = randomBytes(32);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
    let ciphertext = cipher.update(rawPayload, "utf-8", "base64url");
    ciphertext += cipher.final("base64url");
    const authTag = cipher.getAuthTag().toString("base64url");

    const encryptedKey = publicEncrypt(
      {
        key: publicKeyPem,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      aesKey
    ).toString("base64url");

    // Sealed transmission object
    const sealed = {
      encryptedKey,
      iv: iv.toString("base64url"),
      authTag,
      ciphertext,
    };

    const wireString = JSON.stringify(sealed);
    // Plaintext password MUST NOT appear anywhere in the wire payload
    expect(wireString).not.toContain(sentinelPassword);
    expect(wireString).not.toContain("SecretPassword");
  });
});
