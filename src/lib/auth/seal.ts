import "server-only";
import {
  randomBytes,
  createHash,
  privateDecrypt,
  createDecipheriv,
  constants,
} from "node:crypto";
import { withAuth } from "@/lib/db/with-user";

export interface AuthChallenge {
  challengeId: string;
  nonce: string;
  publicKeyPem: string;
}

export interface SealedPayload {
  challengeId: string;
  encryptedKey: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}

export interface DecryptedCredentials {
  email: string;
  password: string;
}

/**
 * 1. Creates an ephemeral challenge nonce for client-side credential sealing.
 * Nonce expires in 2 minutes and can only be used once.
 */
export async function createAuthChallenge(): Promise<AuthChallenge> {
  const nonce = randomBytes(32).toString("hex");
  const nonceHash = createHash("sha256").update(nonce).digest("hex");
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes TTL

  const [row] = await withAuth(async (sql) => {
    return sql`
      INSERT INTO private.auth_challenges (nonce_hash, kid, purpose, expires_at)
      VALUES (${nonceHash}, 'v1', 'login', ${expiresAt})
      RETURNING id
    `;
  });

  const publicKeyB64 = process.env.AUTH_RSA_PUBLIC_KEY || "";
  const publicKeyPem = Buffer.from(publicKeyB64, "base64").toString("utf-8");

  return {
    challengeId: row.id,
    nonce,
    publicKeyPem,
  };
}

/**
 * 2. Unseals encrypted credentials submitted by the client via WebCrypto.
 * Decrypts AES key using RSA-OAEP-256 private key, then decrypts ciphertext using AES-256-GCM.
 * Validates one-time nonce and timestamp freshness.
 */
export async function unsealCredentials(
  sealed: SealedPayload
): Promise<DecryptedCredentials> {
  const { challengeId, encryptedKey, iv, authTag, ciphertext } = sealed;

  if (!challengeId || !encryptedKey || !iv || !authTag || !ciphertext) {
    throw new Error("Invalid sealed credentials format.");
  }

  // Verify challenge in database
  const challenge = await withAuth(async (sql) => {
    const [ch] = await sql`
      SELECT id, nonce_hash, expires_at, used_at
      FROM private.auth_challenges
      WHERE id = ${challengeId}
    `;

    if (!ch) {
      throw new Error("Authentication challenge not found.");
    }
    if (ch.used_at) {
      throw new Error("Authentication challenge has already been used.");
    }
    if (new Date(ch.expires_at) < new Date()) {
      throw new Error("Authentication challenge has expired. Please try again.");
    }

    // Mark as used immediately to prevent replay
    await sql`
      UPDATE private.auth_challenges
      SET used_at = NOW()
      WHERE id = ${challengeId}
    `;

    return ch;
  });

  // Decrypt AES symmetric key using RSA Private Key
  const privateKeyB64 = process.env.AUTH_RSA_PRIVATE_KEY || "";
  const privateKeyPem = Buffer.from(privateKeyB64, "base64").toString("utf-8");

  let decryptedAesKey: Buffer;
  try {
    decryptedAesKey = privateDecrypt(
      {
        key: privateKeyPem,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(encryptedKey, "base64")
    );
  } catch {
    throw new Error("Failed to decrypt authentication payload key.");
  }

  // Decrypt payload with AES-256-GCM
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      decryptedAesKey,
      Buffer.from(iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(authTag, "base64"));
    let decryptedText = decipher.update(ciphertext, "base64", "utf-8");
    decryptedText += decipher.final("utf-8");

    const payload = JSON.parse(decryptedText);

    const computedHash = createHash("sha256").update(payload.nonce).digest("hex");
    if (computedHash !== challenge.nonce_hash) {
      throw new Error("Challenge nonce verification failed.");
    }

    // Freshness check: payload must have been created within 2 minutes
    if (Math.abs(Date.now() - Number(payload.timestamp)) > 120000) {
      throw new Error("Authentication payload expired.");
    }

    if (!payload.email || !payload.password) {
      throw new Error("Missing email or password in sealed payload.");
    }

    return {
      email: String(payload.email).trim().toLowerCase(),
      password: String(payload.password),
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("nonce")) {
      throw err;
    }
    throw new Error("Failed to decrypt authentication payload.");
  }
}
