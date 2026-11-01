import { createHmac } from "node:crypto";

const SECRET = process.env.DATA_ENCRYPTION_KEY || "vivona-local-google-secret";

export interface LocalGoogleUserPayload {
  email: string;
  name: string;
  avatarUrl?: string;
  state: string;
  exp: number;
}

/**
 * Issues an HMAC-SHA256 signed authorization code for local Google OAuth simulation.
 * Valid for 5 minutes.
 */
export function issueLocalGoogleAuthCode(payload: Omit<LocalGoogleUserPayload, "exp">): string {
  const data: LocalGoogleUserPayload = {
    ...payload,
    exp: Date.now() + 5 * 60 * 1000,
  };
  const jsonStr = JSON.stringify(data);
  const dataB64 = Buffer.from(jsonStr).toString("base64url");
  const signature = createHmac("sha256", SECRET).update(dataB64).digest("base64url");
  return `local_${dataB64}.${signature}`;
}

/**
 * Cryptographically verifies the authorization code and enforces CSRF state match.
 */
export function verifyLocalGoogleAuthCode(
  code: string,
  expectedState: string
): LocalGoogleUserPayload | null {
  if (!code.startsWith("local_")) return null;
  const parts = code.slice(6).split(".");
  if (parts.length !== 2) return null;

  const [dataB64, signature] = parts;
  const expectedSig = createHmac("sha256", SECRET).update(dataB64).digest("base64url");
  if (signature !== expectedSig) return null;

  try {
    const jsonStr = Buffer.from(dataB64, "base64url").toString("utf-8");
    const data = JSON.parse(jsonStr) as LocalGoogleUserPayload;
    if (data.exp < Date.now()) return null;
    if (data.state !== expectedState) return null;
    return data;
  } catch {
    return null;
  }
}
