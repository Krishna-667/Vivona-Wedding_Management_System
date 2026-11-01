# Root Cause Diagnosis & Auth Security Audit (STEP 0)

**Date & Time:** 2026-11-01T04:21:00+05:30  
**Target:** Vivona Authentication System  
**Auditor:** Automated Diagnostic Suite (DeepMind Agentic Engine)

---

## 1. Executive Summary

This diagnostic audit reproduces and details the vulnerabilities and edge cases surrounding authentication in Vivona, specifically the issues where users could land unexpectedly on the home page `/` or encounter bypass vectors, along with the precise file and line numbers of the root causes.

---

## 2. Baseline Verification Checks (Pre-Implementation)

| Check # | Requirement | Pre-Fix Status | Evidence & Root Cause |
|---|---|---|---|
| **Check 1** | Signed-out visit to `/client`, `/employee`, `/admin` must redirect to `/login` | ⚠️ **Partial** | `src/middleware.ts` (lines 20-31) checked cookie existence. However, child route handlers and APIs without layouts lacked explicit `requireRole()` enforcement. |
| **Check 2** | Wrong, empty or unknown-email password must fail with no session | ✅ **Verified** | `src/app/actions/auth.ts` (lines 98-108 and 206-216) awaits `verifyPassword` with argon2id and destroys any existing session before returning `{ ok: false, error: "Invalid email or password." }`. |
| **Check 3** | Fake cookie / localStorage flag must NOT count as logged in | ⚠️ **Vulnerable in Edge** | `src/middleware.ts` (lines 20-23): `Boolean(request.cookies.get("vivona_session")?.value)` treated ANY non-empty cookie string as authenticated, letting spoofed cookies reach server components before DB token lookup in layouts. |
| **Check 4** | Back button after logout must show zero protected content | ❌ **Vulnerable** | Missing `Cache-Control: no-store, no-cache, must-revalidate` HTTP headers on authenticated layouts/pages allowed browsers to display cached authenticated DOM trees from bfcache upon pressing the Back button. |

---

## 3. Detailed Root Causes & File References

### Vulnerability A: Landing on Home Page on Google Sign-In Error or Cancellation
- **File:** `src/app/api/auth/google/route.ts` (lines 84-90) & `src/app/(auth)/login/page.tsx` (lines 17-28)
- **Root Cause:** When OAuth credentials were unconfigured or an error occurred in OAuth initiation, the system either redirected without standardized error parameters or relied on default return URLs. In some flows, `redirectTo` defaulted to `/` if missing, or unhandled errors during client navigation dropped the user back to the public homepage `/`.

### Vulnerability B: Edge Middleware Spoofability
- **File:** `src/middleware.ts` (lines 20-31)
- **Root Cause:**
  ```typescript
  const hasSessionCookie = Boolean(
    request.cookies.get("vivona_session")?.value ||
    request.cookies.get("__Host-vivona_session")?.value
  );
  if ((isProtectedAdmin || isProtectedEmployee || isProtectedClient) && !hasSessionCookie) { ... }
  ```
  The edge middleware relied solely on the presence of a cookie name rather than treating middleware as a coarse redirect and mandating strict server-side `requireRole()` checks in every route, page, and server action.

### Vulnerability C: Missing Unified Server-Side `requireRole()`
- **File:** `src/app/(admin)/layout.tsx` (lines 15-19), `src/app/(employee)/layout.tsx`, `src/app/(client)/layout.tsx`
- **Root Cause:** Authorization checks were performed ad-hoc in layout files rather than through a single, cryptographically enforced `requireRole(["admin" | "employee" | "client"])` guard that:
  1. Validates the session token hash in `private.sessions`.
  2. Ensures `expires_at > NOW()`.
  3. Verifies `profile.is_active === true`.
  4. Enforces the strict role match against database truth.

### Vulnerability D: Presence of Bypass Tokens in Application Code
- **File:** `src/app/actions/booking.ts` (line 33)
- **Root Cause:**
  ```typescript
  if (token === "dev-bypass-token" && process.env.NODE_ENV !== "production") {
    return true;
  }
  ```
  Permitted development-time bypasses within core application action code.

### Vulnerability E: Missing Cache-Control on Authenticated Routes
- **File:** All layout files under `src/app/(admin)`, `src/app/(employee)`, `src/app/(client)`
- **Root Cause:** Absence of `no-store` caching directives allowed browser forward/back caches (bfcache) to preserve and render protected user data after logout.

---

## 4. Remediation Plan

1. **Database Schema:** Create `private.oauth_identities`, `private.oauth_transactions`, add `email_verified` to `public.profiles`, and allow nullable `password_hash` in `private.auth_credentials` (ensuring at least one auth method exists per user).
2. **Setup & Boot Validation:** Add `docs/GOOGLE_OAUTH_SETUP.md`, `.env.example`, and boot-time schema verification refusing to boot if `AUTH_GOOGLE_ENABLED=true` but client credentials are missing.
3. **PKCE Flow with Jose:** Implement `/api/auth/google/start` and `/api/auth/google/callback` with PKCE (RFC 7636), `jose` ID token verification against Google's JWKS, atomic single-use state verification, and strict role resolution.
4. **Hardened Access Guards:** Implement `src/lib/auth/permissions.ts` with `requireRole()` across all protected pages and server actions.
5. **No-Store Cache Control:** Apply `Cache-Control: no-store` on all authenticated paths.
6. **Automated Regression Suite:** 100% test coverage including mock JWKS unit tests and Playwright E2E regression tests for all 4 Step 0 baseline checks.
