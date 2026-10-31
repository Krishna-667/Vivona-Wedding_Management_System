# Vivona — Baseline Password Exposure Audit (R5 Before Findings)

> [!NOTE]
> Audit of DevTools and client-side code prior to Phase 2 sealed authentication and local database migration.

## 1. Network Tab Audit
- **Issue:** During standard sign in, the login form POSTs credentials directly via Server Action payload or Supabase client `signInWithPassword`.
- **Finding:** In the Network tab request payload, `password` was previously passed as plaintext inside JSON or multipart `FormData`.
- **Target Fix (Phase 2):** Implement sealed hybrid encryption channel (RSA-OAEP-3072 + AES-256-GCM with single-use nonce). Plaintext password will never appear in request body; only ciphertext travels over the wire.

## 2. Browser Storage Audit
- **Application Tab (Cookies):** Supabase Auth previously stored access token and refresh token in `sb-*-auth-token` cookies.
- **Target Fix:** Custom DB-backed session stored in a single cryptographically secure 32-byte session token cookie (`HttpOnly; Secure; SameSite=Lax; Path=/`). Only the SHA-256 hash of the session token is stored in the database.

## 3. DOM & React State Audit
- **Issue:** Quick demo credential buttons previously populated the email and password inputs directly into controlled React state or DOM attributes.
- **Target Fix:** Remove demo password buttons from the public DOM. In dev/demo mode, use server-side demo session authentication where no credentials are exposed in client-side bundles or DOM properties. Uncontrolled inputs read directly from `FormData` and instantly cleared.

## 4. Database At Rest Audit
- **Finding:** Password hashes must be completely segregated from application business data.
- **Target Fix:** All authentication credentials and password hashes (argon2id) reside exclusively in the `private` PostgreSQL schema, accessible only to the `vivona_auth` database user role. The `vivona_app` role used for application queries has `REVOKE ALL` on `private.*`.
