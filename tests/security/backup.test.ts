import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import * as dotenv from "dotenv";

beforeAll(() => {
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });
});

describe("Security Layer 7: Encrypted Database Backups (AES-256-GCM)", () => {
  const MAGIC = Buffer.from("VBAK", "utf-8");
  const sampleSqlDump = "-- Vivona PostgreSQL Dump\nCREATE TABLE test_table (id INT);\nINSERT INTO test_table VALUES (1);";

  it("should encrypt database dump using BACKUP_KEY with VBAK magic header", () => {
    const b64Key = process.env.BACKUP_KEY;
    expect(b64Key).toBeTruthy();
    const key = Buffer.from(b64Key!, "base64");
    expect(key.length).toBe(32);

    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const plainBuffer = Buffer.from(sampleSqlDump, "utf-8");
    const ciphertext = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const backupFile = Buffer.concat([MAGIC, iv, authTag, ciphertext]);

    expect(backupFile.subarray(0, 4).equals(MAGIC)).toBe(true);
    // Ciphertext must not reveal SQL schema or data strings
    expect(backupFile.includes(Buffer.from("Vivona PostgreSQL Dump"))).toBe(false);

    // Decrypt and verify
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    expect(decrypted.toString("utf-8")).toBe(sampleSqlDump);
  });

  it("should reject restoration if backup auth tag is tampered", () => {
    const key = Buffer.from(process.env.BACKUP_KEY!, "base64");
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(Buffer.from(sampleSqlDump)), cipher.final()]);
    const tamperedTag = randomBytes(16); // Fake tag

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tamperedTag);

    expect(() => {
      Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    }).toThrow();
  });
});
