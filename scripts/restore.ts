import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";
import { createDecipheriv } from "node:crypto";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const MAGIC = Buffer.from("VBAK", "utf-8"); // 4 bytes

function getBackupKey(): Buffer {
  const b64Key = process.env.BACKUP_KEY;
  if (!b64Key) {
    throw new Error("BACKUP_KEY environment variable is missing.");
  }
  const key = Buffer.from(b64Key, "base64");
  if (key.length !== 32) {
    throw new Error(`BACKUP_KEY must be exactly 32 bytes. Found: ${key.length} bytes.`);
  }
  return key;
}

function resolvePsql(): string {
  const localPsql = path.resolve(process.cwd(), ".local-db", "pgsql", "bin", "psql.exe");
  if (fs.existsSync(localPsql)) return localPsql;
  return "psql";
}

async function runRestore() {
  const backupFile = process.argv[2];
  if (!backupFile) {
    console.error("Usage: pnpm db:restore <path-to-.vbak-file>");
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), backupFile);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Backup file not found at: ${resolvedPath}`);
  }

  console.log(`🔓 Reading and decrypting backup file: ${resolvedPath}`);
  const key = getBackupKey();
  const fileBuffer = fs.readFileSync(resolvedPath);

  if (fileBuffer.length < 32 || !fileBuffer.subarray(0, 4).equals(MAGIC)) {
    throw new Error("Invalid backup file: Missing VBAK magic header.");
  }

  const iv = fileBuffer.subarray(4, 16);
  const authTag = fileBuffer.subarray(16, 32);
  const ciphertext = fileBuffer.subarray(32);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decryptedSql = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  console.log(`✓ Decrypted SQL size: ${(decryptedSql.length / 1024).toFixed(1)} KB`);

  // Stream SQL to psql
  const psqlPath = resolvePsql();
  console.log("📥 Restoring into local database via psql...");

  const psqlProcess = spawn(
    psqlPath,
    [
      "--host=127.0.0.1",
      "--port=5432",
      "--username=vivona_owner",
      "vivona",
    ],
    {
      env: {
        ...process.env,
        PGPASSWORD: "ChangeMe_Owner#2026",
      },
    }
  );

  psqlProcess.stdin.write(decryptedSql);
  psqlProcess.stdin.end();

  let psqlError = "";
  psqlProcess.stderr.on("data", (chunk: Buffer) => {
    psqlError += chunk.toString();
  });

  await new Promise<void>((resolve, reject) => {
    psqlProcess.on("close", (code) => {
      // psql might emit notices to stderr without failing
      if (code === 0) resolve();
      else reject(new Error(`psql restore exited with code ${code}: ${psqlError}`));
    });
  });

  console.log("✅ Encrypted Backup Restored Successfully!");
}

runRestore().catch((err) => {
  console.error("Restore failed:", err);
  process.exit(1);
});
