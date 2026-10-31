import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";
import { randomBytes, createCipheriv } from "node:crypto";
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

function resolvePgDump(): string {
  const localDump = path.resolve(process.cwd(), ".local-db", "pgsql", "bin", "pg_dump.exe");
  if (fs.existsSync(localDump)) return localDump;
  return "pg_dump";
}

async function runBackup() {
  console.log("📦 Starting AES-256-GCM Encrypted Database Backup...");

  const key = getBackupKey();
  const pgDumpPath = resolvePgDump();

  const backupsDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = path.join(backupsDir, `vivona_${timestamp}.vbak`);

  const dumpProcess = spawn(
    pgDumpPath,
    [
      "--host=127.0.0.1",
      "--port=5432",
      "--username=vivona_owner",
      "--no-password",
      "--format=plain",
      "vivona",
    ],
    {
      env: {
        ...process.env,
        PGPASSWORD: "ChangeMe_Owner#2026",
      },
    }
  );

  const chunks: Buffer[] = [];
  dumpProcess.stdout.on("data", (chunk: Buffer) => {
    chunks.push(chunk);
  });

  let dumpError = "";
  dumpProcess.stderr.on("data", (err: Buffer) => {
    dumpError += err.toString();
  });

  await new Promise<void>((resolve, reject) => {
    dumpProcess.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_dump failed with exit code ${code}: ${dumpError}`));
    });
  });

  const plainBuffer = Buffer.concat(chunks);
  console.log(`✓ Database dumped plain size: ${(plainBuffer.length / 1024).toFixed(1)} KB`);

  // Encrypt with AES-256-GCM
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const finalBackup = Buffer.concat([MAGIC, iv, authTag, ciphertext]);
  fs.writeFileSync(outFile, finalBackup);

  console.log(`🔒 Encrypted backup saved: ${outFile}`);
  console.log(`✓ Backup size: ${(finalBackup.length / 1024).toFixed(1)} KB`);
  console.log("✅ Backup Completed Successfully!");
}

runBackup().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
