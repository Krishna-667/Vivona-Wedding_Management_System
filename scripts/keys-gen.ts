import { randomBytes, generateKeyPairSync } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

function generateKeys() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  const updates: Record<string, string> = {};

  if (!envContent.includes("DATA_ENCRYPTION_KEY=") || envContent.includes("DATA_ENCRYPTION_KEY=\n")) {
    updates["DATA_ENCRYPTION_KEY"] = randomBytes(32).toString("base64");
  }
  if (!envContent.includes("BLIND_INDEX_KEY=") || envContent.includes("BLIND_INDEX_KEY=\n")) {
    updates["BLIND_INDEX_KEY"] = randomBytes(32).toString("base64");
  }
  if (!envContent.includes("FILE_ENCRYPTION_KEY=") || envContent.includes("FILE_ENCRYPTION_KEY=\n")) {
    updates["FILE_ENCRYPTION_KEY"] = randomBytes(32).toString("base64");
  }
  if (!envContent.includes("BACKUP_KEY=") || envContent.includes("BACKUP_KEY=\n")) {
    updates["BACKUP_KEY"] = randomBytes(32).toString("base64");
  }

  // RSA-OAEP-3072 key pair for credential sealing
  if (!envContent.includes("AUTH_RSA_PRIVATE_KEY=") || envContent.includes("AUTH_RSA_PRIVATE_KEY=\n")) {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 3072,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });

    updates["AUTH_RSA_PRIVATE_KEY"] = Buffer.from(privateKey).toString("base64");
    updates["AUTH_RSA_PUBLIC_KEY"] = Buffer.from(publicKey).toString("base64");
  }

  if (Object.keys(updates).length > 0) {
    let newContent = envContent;
    for (const [key, val] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(newContent)) {
        newContent = newContent.replace(regex, `${key}=${val}`);
      } else {
        newContent += `\n${key}=${val}`;
      }
    }
    fs.writeFileSync(envPath, newContent.trim() + "\n", "utf-8");
    console.log(`Generated ${Object.keys(updates).length} new security keys into .env.local`);
  } else {
    console.log("All security keys already exist in .env.local.");
  }
}

generateKeys();
