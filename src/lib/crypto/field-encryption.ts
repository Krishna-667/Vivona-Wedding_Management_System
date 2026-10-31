import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHmac,
} from "node:crypto";

const CIPHER_ALGO = "aes-256-gcm";
const CURRENT_VERSION = "v1";

function getDataEncryptionKey(): Buffer {
  const b64Key = process.env.DATA_ENCRYPTION_KEY;
  if (!b64Key) {
    throw new Error("DATA_ENCRYPTION_KEY environment variable is missing.");
  }
  const key = Buffer.from(b64Key, "base64");
  if (key.length !== 32) {
    throw new Error(`DATA_ENCRYPTION_KEY must be exactly 32 bytes. Found: ${key.length} bytes.`);
  }
  return key;
}

function getBlindIndexKey(): Buffer {
  const b64Key = process.env.BLIND_INDEX_KEY;
  if (!b64Key) {
    throw new Error("BLIND_INDEX_KEY environment variable is missing.");
  }
  const key = Buffer.from(b64Key, "base64");
  if (key.length !== 32) {
    throw new Error(`BLIND_INDEX_KEY must be exactly 32 bytes. Found: ${key.length} bytes.`);
  }
  return key;
}

/**
 * Checks if a string is already encrypted in the v1 format: v1:<iv>:<tag>:<ciphertext>
 */
export function isEncrypted(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return value.startsWith(`${CURRENT_VERSION}:`);
}

/**
 * Encrypts a sensitive database field value using AES-256-GCM.
 * AAD is bound to `${table}.${column}` to prevent ciphertext transposition attacks.
 * Returns formatted ciphertext: v1:<iv>:<tag>:<ciphertext> (base64url)
 */
export function encryptField(
  table: string,
  column: string,
  plaintext: string | null | undefined
): string | null {
  if (plaintext == null) return null;
  const str = String(plaintext);
  if (str === "") return "";
  if (isEncrypted(str)) return str; // Already encrypted

  const key = getDataEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(CIPHER_ALGO, key, iv);

  const aad = Buffer.from(`${table}.${column}`, "utf-8");
  cipher.setAAD(aad);

  let ciphertext = cipher.update(str, "utf-8", "base64url");
  ciphertext += cipher.final("base64url");
  const authTag = cipher.getAuthTag().toString("base64url");

  return `${CURRENT_VERSION}:${iv.toString("base64url")}:${authTag}:${ciphertext}`;
}

/**
 * Decrypts a sensitive database field value encrypted in the v1 format.
 * Validates AAD `${table}.${column}` and authentication tag.
 */
export function decryptField(
  table: string,
  column: string,
  ciphertext: string | null | undefined
): string | null {
  if (ciphertext == null) return null;
  const str = String(ciphertext);
  if (str === "") return "";
  if (!isEncrypted(str)) return str; // Unencrypted fallback (e.g. before migration)

  const parts = str.split(":");
  if (parts.length !== 4 || parts[0] !== CURRENT_VERSION) {
    throw new Error(`Unsupported ciphertext format or version: ${parts[0]}`);
  }

  const [, ivB64, tagB64, dataB64] = parts;
  const key = getDataEncryptionKey();
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");

  const decipher = createDecipheriv(CIPHER_ALGO, key, iv);
  const aad = Buffer.from(`${table}.${column}`, "utf-8");
  decipher.setAAD(aad);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(dataB64, "base64url", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
}

/**
 * Computes an exact-match blind index HMAC-SHA256 for exact search lookups.
 * Input is normalized (trimmed, lowercased).
 */
export function computeBlindIndex(value: string | null | undefined): string | null {
  if (value == null) return null;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "") return null;

  const key = getBlindIndexKey();
  return createHmac("sha256", key).update(normalized).digest("hex");
}
