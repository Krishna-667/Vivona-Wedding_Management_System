import { describe, it, expect, beforeAll } from "vitest";
import * as dotenv from "dotenv";
import {
  encryptField,
  decryptField,
  computeBlindIndex,
  isEncrypted,
} from "../../src/lib/crypto/field-encryption";
import {
  encryptFile,
  decryptFile,
  isFileEncrypted,
} from "../../src/lib/storage/encryption";

beforeAll(() => {
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });
});

describe("Security Layer 3: Field-Level AES-256-GCM Encryption", () => {
  const table = "enquiries";
  const column = "contact_phone";
  const plaintext = "+91 98765 43210";

  it("should encrypt plaintext into v1:iv:tag:ciphertext format", () => {
    const ciphertext = encryptField(table, column, plaintext);
    expect(ciphertext).toBeTruthy();
    expect(isEncrypted(ciphertext)).toBe(true);

    const parts = ciphertext!.split(":");
    expect(parts.length).toBe(4);
    expect(parts[0]).toBe("v1");
    // Verify ciphertext differs completely from plaintext
    expect(ciphertext).not.toContain(plaintext);
  });

  it("should decrypt ciphertext back to original plaintext", () => {
    const ciphertext = encryptField(table, column, plaintext);
    const decrypted = decryptField(table, column, ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it("should reject decryption if AAD is mismatched (column transposition attack)", () => {
    const ciphertext = encryptField(table, "contact_phone", plaintext);
    // Attempting to decrypt under different column AAD must throw GCM tag verification failure
    expect(() => {
      decryptField(table, "contact_email", ciphertext);
    }).toThrow();
  });

  it("should compute deterministic, normalized blind indexes", () => {
    const bidx1 = computeBlindIndex("  +91 98765 43210  ");
    const bidx2 = computeBlindIndex("+91 98765 43210");
    const bidx3 = computeBlindIndex("+91 98765 00000");

    expect(bidx1).toBeTruthy();
    expect(bidx1).toBe(bidx2); // Case & whitespace insensitive
    expect(bidx1).not.toBe(bidx3);
    expect(bidx1).not.toContain("98765");
  });
});

describe("Security Layer 4: Private Files AES-256-GCM Encryption", () => {
  const originalFile = Buffer.from("%PDF-1.4 Mock Luxury Wedding Agreement Content\nSigner: Priyamvada", "utf-8");

  it("should encrypt file buffer with VIV1 magic header and random IV", () => {
    const encrypted = encryptFile(originalFile);
    expect(isFileEncrypted(encrypted)).toBe(true);
    expect(encrypted.subarray(0, 4).toString("utf-8")).toBe("VIV1");
    // Ciphertext bytes must differ from uploaded original
    expect(encrypted.includes(Buffer.from("Mock Luxury Wedding Agreement"))).toBe(false);
  });

  it("should decrypt encrypted file buffer back to original bytes", () => {
    const encrypted = encryptFile(originalFile);
    const decrypted = decryptFile(encrypted);
    expect(decrypted.equals(originalFile)).toBe(true);
  });

  it("should return unencrypted/public files untouched without modification", () => {
    const publicImage = Buffer.from("RIFF....WEBPVP8 ... Mock Public Image", "utf-8");
    const result = decryptFile(publicImage);
    expect(result.equals(publicImage)).toBe(true);
  });
});
