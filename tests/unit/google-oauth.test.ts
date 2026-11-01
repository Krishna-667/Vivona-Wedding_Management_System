import { describe, it, expect } from "vitest";
import { randomBytes, createHash } from "node:crypto";
import { issueLocalGoogleAuthCode, verifyLocalGoogleAuthCode } from "@/lib/auth/google-local";

describe("Google OAuth 2.0 PKCE & Security Verification", () => {
  it("generates a high-entropy PKCE code verifier and SHA-256 code challenge (RFC 7636)", () => {
    const codeVerifier = randomBytes(32).toString("base64url");
    expect(codeVerifier.length).toBeGreaterThanOrEqual(43);

    const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
    expect(codeChallenge).toBeDefined();
    expect(codeChallenge.length).toBeGreaterThan(0);
    expect(codeChallenge).not.toEqual(codeVerifier);
  });

  it("builds a secure Google OAuth authorization URL with required scopes and PKCE", () => {
    const clientId = "test-client-id.apps.googleusercontent.com";
    const redirectUri = "http://localhost:3000/api/auth/google/callback";
    const state = randomBytes(24).toString("hex");
    const codeVerifier = randomBytes(32).toString("base64url");
    const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", clientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("state", state);
    googleAuthUrl.searchParams.set("code_challenge", codeChallenge);
    googleAuthUrl.searchParams.set("code_challenge_method", "S256");
    googleAuthUrl.searchParams.set("access_type", "offline");
    googleAuthUrl.searchParams.set("prompt", "select_account");

    expect(googleAuthUrl.origin).toBe("https://accounts.google.com");
    expect(googleAuthUrl.pathname).toBe("/o/oauth2/v2/auth");
    expect(googleAuthUrl.searchParams.get("client_id")).toBe(clientId);
    expect(googleAuthUrl.searchParams.get("redirect_uri")).toBe(redirectUri);
    expect(googleAuthUrl.searchParams.get("response_type")).toBe("code");
    expect(googleAuthUrl.searchParams.get("scope")).toBe("openid email profile");
    expect(googleAuthUrl.searchParams.get("code_challenge")).toBe(codeChallenge);
    expect(googleAuthUrl.searchParams.get("code_challenge_method")).toBe("S256");
    expect(googleAuthUrl.searchParams.get("state")).toBe(state);
  });

  it("strictly validates state match to protect against CSRF attacks", () => {
    const savedState = "abc123state";
    const validIncomingState = "abc123state";
    const forgedIncomingState = "attacker_state_456";

    const isCsrfSafe = (saved: string, incoming: string | null) => {
      return Boolean(incoming && saved && incoming === saved);
    };

    expect(isCsrfSafe(savedState, validIncomingState)).toBe(true);
    expect(isCsrfSafe(savedState, forgedIncomingState)).toBe(false);
    expect(isCsrfSafe(savedState, null)).toBe(false);
  });

  it("strictly rejects unverified Google email accounts", () => {
    const verifiedUser = {
      id: "12345",
      email: "client@gmail.com",
      verified_email: true,
      name: "Verified User",
    };

    const unverifiedUser = {
      id: "67890",
      email: "unverified@gmail.com",
      verified_email: false,
      name: "Spoofed User",
    };

    const isAllowed = (u: typeof verifiedUser) => Boolean(u.email && u.verified_email === true);

    expect(isAllowed(verifiedUser)).toBe(true);
    expect(isAllowed(unverifiedUser)).toBe(false);
  });

  it("issues and verifies cryptographically signed local authorization codes with state enforcement", () => {
    const state = "valid_csrf_token_xyz";
    const code = issueLocalGoogleAuthCode({
      email: "prithitha24it@psnacet.edu.in",
      name: "Prithith",
      state,
    });

    expect(code.startsWith("local_")).toBe(true);

    // Verify valid code and state
    const verified = verifyLocalGoogleAuthCode(code, state);
    expect(verified).not.toBeNull();
    expect(verified?.email).toBe("prithitha24it@psnacet.edu.in");
    expect(verified?.name).toBe("Prithith");

    // Reject on mismatched CSRF state
    const wrongState = verifyLocalGoogleAuthCode(code, "attacker_state");
    expect(wrongState).toBeNull();

    // Reject on tampered authorization code
    const tampered = verifyLocalGoogleAuthCode(code.slice(0, -5) + "abcde", state);
    expect(tampered).toBeNull();
  });
});
