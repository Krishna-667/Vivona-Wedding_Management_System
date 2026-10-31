/**
 * Client-Side Credential Sealer
 * Uses standard W3C Web Cryptography API (window.crypto.subtle)
 * Supported in 100% of modern browsers with zero external dependencies.
 *
 * Ensures passwords NEVER traverse the network in plaintext.
 * Encrypts with ephemeral AES-256-GCM, sealed with RSA-OAEP-256 public key.
 */

export interface SealedPayload {
  challengeId: string;
  encryptedKey: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}

function pemToSpki(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/, "")
    .replace(/-----END [A-Z ]+-----/, "")
    .replace(/\s+/g, "");

  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function sealCredentialsInBrowser(
  credentials: { email: string; password: string },
  challenge: { challengeId: string; nonce: string; publicKeyPem: string }
): Promise<SealedPayload> {
  const subtle = window.crypto.subtle;
  if (!subtle) {
    throw new Error("Web Cryptography API is not available in this browser context.");
  }

  // 1. Import RSA Public Key
  const spkiBuffer = pemToSpki(challenge.publicKeyPem);
  const rsaKey = await subtle.importKey(
    "spki",
    spkiBuffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  // 2. Generate Ephemeral AES-256-GCM symmetric key
  const aesKey = await subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // 3. Encrypt JSON payload with AES-GCM
  const payloadString = JSON.stringify({
    email: credentials.email,
    password: credentials.password,
    nonce: challenge.nonce,
    timestamp: Date.now(),
  });

  const encodedPayload = new TextEncoder().encode(payloadString);

  const encryptedBuffer = await subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    aesKey,
    encodedPayload
  );

  // In WebCrypto, the last 16 bytes of encryptedBuffer is the GCM authentication tag
  const ciphertextBytes = encryptedBuffer.slice(0, encryptedBuffer.byteLength - 16);
  const tagBytes = encryptedBuffer.slice(encryptedBuffer.byteLength - 16);

  // 4. Export and Encrypt raw AES key with RSA-OAEP
  const rawAesKey = await subtle.exportKey("raw", aesKey);
  const encryptedKeyBuffer = await subtle.encrypt(
    { name: "RSA-OAEP" },
    rsaKey,
    rawAesKey
  );

  return {
    challengeId: challenge.challengeId,
    encryptedKey: arrayBufferToBase64(encryptedKeyBuffer),
    iv: arrayBufferToBase64(iv.buffer),
    authTag: arrayBufferToBase64(tagBytes),
    ciphertext: arrayBufferToBase64(ciphertextBytes),
  };
}
