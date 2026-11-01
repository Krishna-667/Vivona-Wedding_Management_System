import "server-only";

export interface GoogleAuthConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

const PLACEHOLDERS = [
  "your-client-id",
  "your-client-secret",
  "changeme",
  "placeholder",
  "example",
];

function isPlaceholder(value?: string): boolean {
  if (!value) return true;
  const lower = value.toLowerCase().trim();
  if (lower === "") return true;
  return PLACEHOLDERS.some((ph) => lower.includes(ph));
}

/**
 * Validates Google OAuth configuration at boot/startup.
 * If AUTH_GOOGLE_ENABLED=true, throws a descriptive error if variables
 * are missing or set to placeholder values.
 */
export function getGoogleAuthConfig(): GoogleAuthConfig {
  const enabled = process.env.AUTH_GOOGLE_ENABLED === "true";
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/auth/google/callback`;

  if (enabled) {
    if (!clientId || isPlaceholder(clientId)) {
      throw new Error(
        "FATAL: Google OAuth is enabled (AUTH_GOOGLE_ENABLED=true), but GOOGLE_CLIENT_ID is missing or placeholder in .env.local."
      );
    }
    if (!clientSecret || isPlaceholder(clientSecret)) {
      throw new Error(
        "FATAL: Google OAuth is enabled (AUTH_GOOGLE_ENABLED=true), but GOOGLE_CLIENT_SECRET is missing or placeholder in .env.local."
      );
    }
    if (!redirectUri.includes("/api/auth/google/callback")) {
      throw new Error(
        `FATAL: GOOGLE_REDIRECT_URI must point to /api/auth/google/callback, received: ${redirectUri}`
      );
    }
  }

  return {
    enabled,
    clientId,
    clientSecret,
    redirectUri,
  };
}
