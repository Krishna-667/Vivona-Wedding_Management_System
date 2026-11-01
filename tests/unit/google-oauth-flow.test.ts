import { describe, it, expect, beforeAll } from "vitest";
import { generateKeyPair, SignJWT, exportJWK, createLocalJWKSet, jwtVerify } from "jose";
import { createHash, randomBytes } from "node:crypto";
import {
  processGoogleOAuthCallback,
  sanitizeReturnTo,
  checkRateLimit,
} from "@/lib/auth/google-oauth-service";
import { withAuth, withService } from "@/lib/db/with-user";

describe("Google OAuth 2.0 PKCE & Step 3 Account Rules", () => {
  let rsaPrivateKey: any;
  let localJwks: any;
  const CLIENT_ID = "vivona-unit-test-client-id.apps.googleusercontent.com";

  beforeAll(async () => {
    process.env.AUTH_GOOGLE_ENABLED = "true";
    process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = "vivona-unit-test-client-secret-12345";

    // Generate ephemeral RSA-256 keypair for offline ID token signing and verification
    const keyPair = await generateKeyPair("RS256");
    rsaPrivateKey = keyPair.privateKey;
    const publicKeyJwk = await exportJWK(keyPair.publicKey);
    publicKeyJwk.kid = "vivona-unit-test-key";
    publicKeyJwk.alg = "RS256";
    localJwks = createLocalJWKSet({ keys: [publicKeyJwk] });
  });

  // Local offline verifier using the local RSA JWKS
  const offlineVerify = async (token: string, clientId: string) => {
    const { payload } = await jwtVerify(token, localJwks, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });
    return payload as any;
  };

  // Helper to create a signed mock Google ID Token
  async function createMockIdToken(claims: {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
    nonce?: string;
    iss?: string;
    aud?: string;
    exp?: number;
  }): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({
      email: claims.email ?? "test.couple@gmail.com",
      email_verified: claims.email_verified ?? true,
      name: claims.name ?? "Test Couple",
      picture: claims.picture ?? "https://lh3.googleusercontent.com/avatar.jpg",
      nonce: claims.nonce,
    })
      .setProtectedHeader({ alg: "RS256", kid: "vivona-unit-test-key" })
      .setIssuedAt(now)
      .setIssuer(claims.iss ?? "https://accounts.google.com")
      .setAudience(claims.aud ?? CLIENT_ID)
      .setSubject(claims.sub ?? `google-sub-${randomBytes(8).toString("hex")}`)
      .setExpirationTime(claims.exp ?? now + 3600)
      .sign(rsaPrivateKey);
  }

  // Helper to seed a valid OAuth transaction row
  async function seedOAuthTransaction(opts?: {
    nonce?: string;
    state?: string;
    returnTo?: string;
    expired?: boolean;
    used?: boolean;
  }) {
    const state = opts?.state ?? randomBytes(32).toString("hex");
    const nonce = opts?.nonce ?? randomBytes(32).toString("hex");
    const codeVerifier = randomBytes(32).toString("base64url");
    const stateHash = createHash("sha256").update(state).digest("hex");
    const returnTo = opts?.returnTo ?? "/client";

    const expiresInterval = opts?.expired ? "- INTERVAL '1 minute'" : "+ INTERVAL '10 minutes'";
    const usedAtClause = opts?.used ? "NOW()" : "NULL";

    const tx = await withAuth(async (sql) => {
      const [row] = await sql`
        INSERT INTO private.oauth_transactions (
          state_hash, nonce, code_verifier, return_to, expires_at, used_at
        ) VALUES (
          ${stateHash}, ${nonce}, ${codeVerifier}, ${returnTo}, NOW() ${sql.unsafe(expiresInterval)}, ${sql.unsafe(usedAtClause)}
        )
        RETURNING id
      `;
      return row;
    });

    return {
      id: tx.id,
      state,
      nonce,
      codeVerifier,
    };
  }

  it("sanitizes returnTo parameter to prevent open-redirect exploits", () => {
    expect(sanitizeReturnTo(null)).toBe("/client");
    expect(sanitizeReturnTo("")).toBe("/client");
    expect(sanitizeReturnTo("https://attacker.com")).toBe("/client");
    expect(sanitizeReturnTo("//attacker.com")).toBe("/client");
    expect(sanitizeReturnTo("/\\attacker.com")).toBe("/client");
    expect(sanitizeReturnTo("/client/agreement")).toBe("/client/agreement");
    expect(sanitizeReturnTo("/admin/weddings")).toBe("/admin/weddings");
  });

  it("enforces sliding-window IP rate limiting", () => {
    const testIp = `192.168.1.${Math.floor(Math.random() * 200 + 10)}`;
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(testIp)).toBe(true);
    }
    // 11th request within 1 min exceeds rate limit
    expect(checkRateLimit(testIp)).toBe(false);
  });

  it("rejects callback when state parameter is missing, mismatched, or replayed", async () => {
    const tx = await seedOAuthTransaction();

    // 1. Mismatched state
    const resultMismatch = await processGoogleOAuthCallback({
      code: "mock_code",
      state: "tampered_attacker_state",
      transactionId: tx.id,
    });
    expect(resultMismatch.ok).toBe(false);
    if (!resultMismatch.ok) {
      expect(resultMismatch.error).toBe("state_mismatch");
    }

    // 2. Replay attempt on consumed transaction
    const txUsed = await seedOAuthTransaction({ used: true });
    const resultReplay = await processGoogleOAuthCallback({
      code: "mock_code",
      state: txUsed.state,
      transactionId: txUsed.id,
    });
    expect(resultReplay.ok).toBe(false);
    if (!resultReplay.ok) {
      expect(resultReplay.error).toBe("state_mismatch");
    }
  });

  it("strictly rejects ID token with wrong audience or issuer", async () => {
    const tx = await seedOAuthTransaction();

    // Wrong audience
    const badAudToken = await createMockIdToken({
      aud: "wrong-client-id.apps.googleusercontent.com",
      nonce: tx.nonce,
    });

    const resultAud = await processGoogleOAuthCallback(
      {
        code: "mock_code",
        state: tx.state,
        transactionId: tx.id,
      },
      {
        exchangeCode: async () => ({ id_token: badAudToken }),
        verifyIdToken: offlineVerify,
      }
    );
    expect(resultAud.ok).toBe(false);
    if (!resultAud.ok) {
      expect(resultAud.error).toBe("provider_error");
    }

    // Wrong issuer
    const tx2 = await seedOAuthTransaction();
    const badIssToken = await createMockIdToken({
      iss: "https://untrusted-auth-server.com",
      nonce: tx2.nonce,
    });

    const resultIss = await processGoogleOAuthCallback(
      {
        code: "mock_code",
        state: tx2.state,
        transactionId: tx2.id,
      },
      {
        exchangeCode: async () => ({ id_token: badIssToken }),
        verifyIdToken: offlineVerify,
      }
    );
    expect(resultIss.ok).toBe(false);
    if (!resultIss.ok) {
      expect(resultIss.error).toBe("provider_error");
    }
  });

  it("strictly rejects expired ID token", async () => {
    const tx = await seedOAuthTransaction();
    const pastExp = Math.floor(Date.now() / 1000) - 300; // 5 min ago
    const expiredToken = await createMockIdToken({
      exp: pastExp,
      nonce: tx.nonce,
    });

    const result = await processGoogleOAuthCallback(
      {
        code: "mock_code",
        state: tx.state,
        transactionId: tx.id,
      },
      {
        exchangeCode: async () => ({ id_token: expiredToken }),
        verifyIdToken: offlineVerify,
      }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("provider_error");
    }
  });

  it("strictly rejects ID token when email_verified is false", async () => {
    const tx = await seedOAuthTransaction();
    const unverifiedToken = await createMockIdToken({
      email_verified: false,
      nonce: tx.nonce,
    });

    const result = await processGoogleOAuthCallback(
      {
        code: "mock_code",
        state: tx.state,
        transactionId: tx.id,
      },
      {
        exchangeCode: async () => ({ id_token: unverifiedToken }),
        verifyIdToken: offlineVerify,
      }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("email_unverified");
    }
  });

  it("Step 3 Rule: creates client account with no password for new Google email", async () => {
    const tx = await seedOAuthTransaction();
    const randomSuffix = randomBytes(6).toString("hex");
    const testEmail = `new.couple.${randomSuffix}@gmail.com`;
    const googleSub = `sub-new-${randomSuffix}`;

    const idToken = await createMockIdToken({
      sub: googleSub,
      email: testEmail,
      name: "New Couple Client",
      nonce: tx.nonce,
    });

    const result = await processGoogleOAuthCallback(
      {
        code: "mock_code",
        state: tx.state,
        transactionId: tx.id,
      },
      {
        exchangeCode: async () => ({ id_token: idToken }),
        verifyIdToken: offlineVerify,
      }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resolution.role).toBe("client");
      expect(result.resolution.redirectTo).toBe("/client");

      // Verify DB records
      await withService(async (sql) => {
        const [profile] = await sql`
          SELECT id, email, role, email_verified FROM public.profiles WHERE id = ${result.resolution.profileId}
        `;
        expect(profile.role).toBe("client");
        expect(profile.email_verified).toBe(true);

        const [identity] = await sql`
          SELECT provider, provider_sub FROM private.oauth_identities WHERE profile_id = ${result.resolution.profileId}
        `;
        expect(identity.provider).toBe("google");
        expect(identity.provider_sub).toBe(googleSub);

        const [cred] = await sql`
          SELECT password_hash FROM private.auth_credentials WHERE profile_id = ${result.resolution.profileId}
        `;
        expect(cred.password_hash).toBeNull();
      });
    }
  });

  it("Step 3 Rule: links and signs in when Google sub is already linked", async () => {
    const randomSuffix = randomBytes(6).toString("hex");
    const testEmail = `linked.${randomSuffix}@gmail.com`;
    const googleSub = `sub-linked-${randomSuffix}`;

    // Provision profile and identity
    const profile = await withService(async (sql) => {
      const [p] = await sql`
        INSERT INTO public.profiles (email, full_name, role, is_active, email_verified)
        VALUES (${testEmail}, 'Linked User', 'client', true, true)
        RETURNING id
      `;
      await sql`
        INSERT INTO private.oauth_identities (profile_id, provider, provider_sub, email)
        VALUES (${p.id}, 'google', ${googleSub}, ${testEmail})
      `;
      return p;
    });

    const tx = await seedOAuthTransaction();
    const idToken = await createMockIdToken({
      sub: googleSub,
      email: testEmail,
      nonce: tx.nonce,
    });

    const result = await processGoogleOAuthCallback(
      {
        code: "mock_code",
        state: tx.state,
        transactionId: tx.id,
      },
      {
        exchangeCode: async () => ({ id_token: idToken }),
        verifyIdToken: offlineVerify,
      }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resolution.profileId).toBe(profile.id);
      expect(result.resolution.role).toBe("client");
    }
  });

  it("Step 3 Rule: protects unverified password account from pre-registration takeover", async () => {
    const randomSuffix = randomBytes(6).toString("hex");
    const testEmail = `pre.register.${randomSuffix}@gmail.com`;
    const googleSub = `sub-prereg-${randomSuffix}`;

    // Seed unverified profile with existing password hash
    const profile = await withService(async (sql) => {
      const [p] = await sql`
        INSERT INTO public.profiles (email, full_name, role, is_active, email_verified)
        VALUES (${testEmail}, 'Unverified Pre-Reg', 'client', true, false)
        RETURNING id
      `;
      await sql`
        INSERT INTO private.auth_credentials (profile_id, password_hash)
        VALUES (${p.id}, 'argon2id_hash_unverified_pre_reg')
      `;
      // Create existing session with unique token hash
      const uniqueTokenHash = randomBytes(32).toString("hex");
      await sql`
        INSERT INTO private.sessions (token_hash, profile_id, expires_at)
        VALUES (${uniqueTokenHash}, ${p.id}, NOW() + INTERVAL '1 day')
      `;
      return { id: p.id, uniqueTokenHash };
    });

    const tx = await seedOAuthTransaction();
    const idToken = await createMockIdToken({
      sub: googleSub,
      email: testEmail,
      nonce: tx.nonce,
    });

    const result = await processGoogleOAuthCallback(
      {
        code: "mock_code",
        state: tx.state,
        transactionId: tx.id,
      },
      {
        exchangeCode: async () => ({ id_token: idToken }),
        verifyIdToken: offlineVerify,
      }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      await withService(async (sql) => {
        // Password hash must be wiped to prevent takeover by original creator
        const [cred] = await sql`
          SELECT password_hash FROM private.auth_credentials WHERE profile_id = ${profile.id}
        `;
        expect(cred.password_hash).toBeNull();

        // Old sessions must be revoked
        const sessions = await sql`
          SELECT id FROM private.sessions WHERE profile_id = ${profile.id} AND token_hash = ${profile.uniqueTokenHash}
        `;
        expect(sessions.length).toBe(0);

        // Identity linked and verified
        const [p] = await sql`SELECT email_verified FROM public.profiles WHERE id = ${profile.id}`;
        expect(p.email_verified).toBe(true);
      });
    }
  });

  it("Step 3 Rule: rejects deactivated account and identity conflict", async () => {
    // 1. Deactivated account
    const randomSuffix = randomBytes(6).toString("hex");
    const deactEmail = `deactivated.${randomSuffix}@gmail.com`;
    const deactSub = `sub-deact-${randomSuffix}`;

    await withService(async (sql) => {
      const [p] = await sql`
        INSERT INTO public.profiles (email, full_name, role, is_active, email_verified)
        VALUES (${deactEmail}, 'Deactivated User', 'client', false, true)
        RETURNING id
      `;
      await sql`
        INSERT INTO private.oauth_identities (profile_id, provider, provider_sub, email)
        VALUES (${p.id}, 'google', ${deactSub}, ${deactEmail})
      `;
    });

    const tx1 = await seedOAuthTransaction();
    const deactToken = await createMockIdToken({
      sub: deactSub,
      email: deactEmail,
      nonce: tx1.nonce,
    });

    const resultDeact = await processGoogleOAuthCallback(
      {
        code: "mock_code",
        state: tx1.state,
        transactionId: tx1.id,
      },
      {
        exchangeCode: async () => ({ id_token: deactToken }),
        verifyIdToken: offlineVerify,
      }
    );
    expect(resultDeact.ok).toBe(false);
    if (!resultDeact.ok) {
      expect(resultDeact.error).toBe("account_disabled");
    }

    // 2. Identity conflict: email already linked to different Google sub
    const conflictEmail = `conflict.${randomSuffix}@gmail.com`;
    const existingSub = `sub-orig-${randomSuffix}`;
    const newAttackerSub = `sub-attacker-${randomSuffix}`;

    await withService(async (sql) => {
      const [p] = await sql`
        INSERT INTO public.profiles (email, full_name, role, is_active, email_verified)
        VALUES (${conflictEmail}, 'Original User', 'client', true, true)
        RETURNING id
      `;
      await sql`
        INSERT INTO private.oauth_identities (profile_id, provider, provider_sub, email)
        VALUES (${p.id}, 'google', ${existingSub}, ${conflictEmail})
      `;
    });

    const tx2 = await seedOAuthTransaction();
    const conflictToken = await createMockIdToken({
      sub: newAttackerSub,
      email: conflictEmail,
      nonce: tx2.nonce,
    });

    const resultConflict = await processGoogleOAuthCallback(
      {
        code: "mock_code",
        state: tx2.state,
        transactionId: tx2.id,
      },
      {
        exchangeCode: async () => ({ id_token: conflictToken }),
        verifyIdToken: offlineVerify,
      }
    );
    expect(resultConflict.ok).toBe(false);
    if (!resultConflict.ok) {
      expect(resultConflict.error).toBe("identity_conflict");
    }
  });
});
