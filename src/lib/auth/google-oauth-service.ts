import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { jwtVerify, createRemoteJWKSet, type JWTVerifyGetKey } from "jose";
import { withAuth, withService } from "@/lib/db/with-user";
import { createSession } from "@/lib/auth/session";
import { getGoogleAuthConfig } from "@/lib/auth/google-config";
import type { UserRole } from "@/types/database";

export const OAUTH_COOKIE_NAME = "vivona_oauth_tx";
const GOOGLE_JWKS_URL = new URL("https://www.googleapis.com/oauth2/v3/certs");
const remoteJWKSet = createRemoteJWKSet(GOOGLE_JWKS_URL);

// In-memory sliding window rate limiter: max 10 requests per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) {
    return false;
  }
  entry.count += 1;
  return true;
}

export function sanitizeReturnTo(returnTo?: string | null): string {
  if (!returnTo) return "/client";
  const trimmed = returnTo.trim();
  // Relative path only, prevents open redirect (must start with single '/', not '//')
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\")) {
    return trimmed;
  }
  return "/client";
}

export interface GoogleTokenExchangeResult {
  id_token: string;
  access_token?: string;
  token_type?: string;
}

export interface GoogleIdTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  nonce?: string;
  email: string;
  email_verified: boolean | string;
  name?: string;
  picture?: string;
}

/**
 * Creates an OAuth PKCE state transaction and returns Google's authorization URL.
 */
export async function createGoogleAuthTransaction(
  ip: string,
  returnToParam?: string | null
): Promise<{ url: string; transactionId: string }> {
  if (!checkRateLimit(ip)) {
    throw new Error("Rate limit exceeded. Please wait a minute before retrying.");
  }

  const config = getGoogleAuthConfig();
  if (!config.enabled) {
    throw new Error("Google Sign-In is disabled on this server.");
  }

  // 1. Generate high-entropy state, nonce, and PKCE verifier
  const state = randomBytes(32).toString("hex");
  const nonce = randomBytes(32).toString("hex");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  const stateHash = createHash("sha256").update(state).digest("hex");
  const returnTo = sanitizeReturnTo(returnToParam);

  // 2. Store transaction in private.oauth_transactions (10 minute expiry)
  const tx = await withAuth(async (sql) => {
    const [row] = await sql`
      INSERT INTO private.oauth_transactions (
        state_hash, nonce, code_verifier, return_to, expires_at
      ) VALUES (
        ${stateHash}, ${nonce}, ${codeVerifier}, ${returnTo}, NOW() + INTERVAL '10 minutes'
      )
      RETURNING id
    `;
    return row;
  });

  // 3. Build Google authorization URL
  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("client_id", config.clientId);
  googleUrl.searchParams.set("redirect_uri", config.redirectUri);
  googleUrl.searchParams.set("scope", "openid email profile");
  googleUrl.searchParams.set("prompt", "select_account");
  googleUrl.searchParams.set("state", state);
  googleUrl.searchParams.set("nonce", nonce);
  googleUrl.searchParams.set("code_challenge", codeChallenge);
  googleUrl.searchParams.set("code_challenge_method", "S256");

  return {
    url: googleUrl.toString(),
    transactionId: tx.id,
  };
}

export interface InjectedCallbackHandlers {
  exchangeCode?: (
    code: string,
    codeVerifier: string,
    redirectUri: string,
    clientId: string,
    clientSecret: string
  ) => Promise<GoogleTokenExchangeResult>;
  verifyIdToken?: (
    idToken: string,
    clientId: string
  ) => Promise<GoogleIdTokenPayload>;
}

/**
 * Standard server-side code exchange with Google token endpoint (5s timeout).
 */
async function defaultExchangeCode(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<GoogleTokenExchangeResult> {
  const tokenParams = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams,
    signal: AbortSignal.timeout(5000),
  });

  const data = await res.json();
  if (!res.ok || !data.id_token) {
    const errorMsg = data.error_description || data.error || "Token exchange failed";
    throw new Error(`Google token exchange error: ${errorMsg}`);
  }

  return {
    id_token: data.id_token,
    access_token: data.access_token,
    token_type: data.token_type,
  };
}

/**
 * Standard ID token verification with jose against Google's JWKS.
 */
async function defaultVerifyIdToken(
  idToken: string,
  clientId: string,
  keyResolver: JWTVerifyGetKey = remoteJWKSet
): Promise<GoogleIdTokenPayload> {
  const { payload } = await jwtVerify(idToken, keyResolver, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });

  return payload as unknown as GoogleIdTokenPayload;
}

export interface CallbackResolution {
  ok: true;
  redirectTo: string;
  profileId: string;
  role: UserRole;
}

export type CallbackError =
  | "google_denied"
  | "state_mismatch"
  | "email_unverified"
  | "account_disabled"
  | "identity_conflict"
  | "provider_error";

/**
 * Executes the OAuth callback logic, enforces all Step 3 Account Rules,
 * provisions or links identity, and establishes the user session.
 */
export async function processGoogleOAuthCallback(
  params: {
    code?: string | null;
    state?: string | null;
    error?: string | null;
    transactionId?: string | null;
  },
  injected?: InjectedCallbackHandlers
): Promise<{ ok: true; resolution: CallbackResolution } | { ok: false; error: CallbackError }> {
  // 1. Handle error returned by Google
  if (params.error) {
    return { ok: false, error: "google_denied" };
  }

  if (!params.code || !params.state || !params.transactionId) {
    return { ok: false, error: "state_mismatch" };
  }

  const transactionId = params.transactionId;

  // 2. Retrieve and consume transaction row (Single-Use enforcement)
  const tx = await withAuth(async (sql) => {
    const [row] = await sql`
      UPDATE private.oauth_transactions
      SET used_at = NOW()
      WHERE id = ${transactionId}
        AND used_at IS NULL
        AND expires_at > NOW()
      RETURNING id, state_hash, nonce, code_verifier, return_to
    `;
    return row;
  });

  if (!tx) {
    return { ok: false, error: "state_mismatch" };
  }

  // 3. Constant-time state comparison
  const incomingStateHash = createHash("sha256").update(params.state).digest("hex");
  const a = Buffer.from(incomingStateHash, "hex");
  const b = Buffer.from(tx.state_hash, "hex");

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "state_mismatch" };
  }

  const config = getGoogleAuthConfig();

  // 4. Exchange code for tokens
  let exchangeResult: GoogleTokenExchangeResult;
  try {
    const exchangeFn = injected?.exchangeCode || defaultExchangeCode;
    exchangeResult = await exchangeFn(
      params.code,
      tx.code_verifier,
      config.redirectUri,
      config.clientId,
      config.clientSecret
    );
  } catch (err) {
    console.error("OAuth code exchange failure:", err);
    return { ok: false, error: "provider_error" };
  }

  // 5. Verify ID Token using jose
  let payload: GoogleIdTokenPayload;
  try {
    const verifyFn = injected?.verifyIdToken || ((token, cId) => defaultVerifyIdToken(token, cId));
    payload = await verifyFn(exchangeResult.id_token, config.clientId);
  } catch (err) {
    console.error("OAuth ID token verification failure:", err);
    return { ok: false, error: "provider_error" };
  }

  // Assert nonce match
  if (payload.nonce && payload.nonce !== tx.nonce) {
    return { ok: false, error: "state_mismatch" };
  }

  // Assert email_verified is true
  const isEmailVerified =
    payload.email_verified === true || payload.email_verified === "true";
  if (!isEmailVerified || !payload.email) {
    return { ok: false, error: "email_unverified" };
  }

  const googleSub = payload.sub;
  const cleanEmail = payload.email.toLowerCase().trim();
  const fullName = payload.name?.trim() || cleanEmail.split("@")[0];
  const avatarUrl = payload.picture || null;

  // 6. Apply Step 3 Account Rules
  const resolution = await withService(async (sql) => {
    // Rule 1: Google sub already linked in private.oauth_identities
    const [linkedIdentity] = await sql`
      SELECT i.profile_id, p.role, p.is_active, p.email
      FROM private.oauth_identities i
      JOIN public.profiles p ON p.id = i.profile_id
      WHERE i.provider = 'google' AND i.provider_sub = ${googleSub}
    `;

    if (linkedIdentity) {
      if (!linkedIdentity.is_active) {
        return { error: "account_disabled" as const };
      }
      return {
        profileId: linkedIdentity.profile_id,
        role: linkedIdentity.role as UserRole,
        returnTo: tx.return_to,
      };
    }

    // Rule 2: Lookup user by email in public.profiles
    const [existingProfile] = await sql`
      SELECT p.id, p.email, p.role, p.is_active, p.email_verified, c.password_hash
      FROM public.profiles p
      LEFT JOIN private.auth_credentials c ON c.profile_id = p.id
      WHERE LOWER(p.email) = LOWER(${cleanEmail})
    `;

    if (existingProfile) {
      if (!existingProfile.is_active) {
        return { error: "account_disabled" as const };
      }

      // Check if profile is already linked to another Google sub
      const [conflictingSub] = await sql`
        SELECT provider_sub
        FROM private.oauth_identities
        WHERE profile_id = ${existingProfile.id} AND provider = 'google'
      `;

      if (conflictingSub && conflictingSub.provider_sub !== googleSub) {
        return { error: "identity_conflict" as const };
      }

      // Check if this was an unverified password account (pre-registration takeover protection)
      if (!existingProfile.email_verified && existingProfile.password_hash) {
        // Link, remove unverified password, revoke all sessions
        await sql`
          UPDATE private.auth_credentials
          SET password_hash = NULL, updated_at = NOW()
          WHERE profile_id = ${existingProfile.id}
        `;

        await sql`
          DELETE FROM private.sessions
          WHERE profile_id = ${existingProfile.id}
        `;
      }

      // Link identity and mark email_verified = true
      await sql`
        INSERT INTO private.oauth_identities (profile_id, provider, provider_sub, email)
        VALUES (${existingProfile.id}, 'google', ${googleSub}, ${cleanEmail})
        ON CONFLICT (provider, provider_sub) DO NOTHING
      `;

      await sql`
        UPDATE public.profiles
        SET email_verified = true,
            avatar_url = COALESCE(avatar_url, ${avatarUrl}),
            updated_at = NOW()
        WHERE id = ${existingProfile.id}
      `;

      return {
        profileId: existingProfile.id,
        role: existingProfile.role as UserRole,
        returnTo: tx.return_to,
      };
    }

    // Rule 3: New email: create client (never admin/employee), no password
    const [newProfile] = await sql`
      INSERT INTO public.profiles (
        email, full_name, role, is_active, email_verified, avatar_url
      ) VALUES (
        ${cleanEmail}, ${fullName}, 'client', true, true, ${avatarUrl}
      )
      RETURNING id, role
    `;

    await sql`
      INSERT INTO private.oauth_identities (profile_id, provider, provider_sub, email)
      VALUES (${newProfile.id}, 'google', ${googleSub}, ${cleanEmail})
    `;

    await sql`
      INSERT INTO private.auth_credentials (profile_id, password_hash, updated_at)
      VALUES (${newProfile.id}, NULL, NOW())
      ON CONFLICT (profile_id) DO NOTHING
    `;

    return {
      profileId: newProfile.id,
      role: newProfile.role as UserRole,
      returnTo: tx.return_to,
    };
  });

  if ("error" in resolution && resolution.error) {
    return { ok: false, error: resolution.error as CallbackError };
  }

  // 7. Establish authenticated database session
  await createSession(resolution.profileId);

  // 8. Determine destination dashboard by role (never public home page)
  let targetPath = resolution.returnTo;
  if (resolution.role === "admin") {
    targetPath = "/admin";
  } else if (resolution.role === "employee") {
    targetPath = "/employee";
  } else {
    // Client role
    targetPath = resolution.returnTo.startsWith("/client") ? resolution.returnTo : "/client";
  }

  return {
    ok: true,
    resolution: {
      ok: true,
      redirectTo: targetPath,
      profileId: resolution.profileId,
      role: resolution.role,
    },
  };
}
