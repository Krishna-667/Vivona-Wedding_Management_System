import * as fs from "node:fs";
import * as path from "node:path";
import { generateKeyPairSync } from "node:crypto";

// We generate RSA keypairs for local TLS certificate authority and server certificate
export function generateLocalCertificates() {
  const certsDir = path.resolve(process.cwd(), "certs");
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  const caKeyPath = path.join(certsDir, "ca.key");
  const caCrtPath = path.join(certsDir, "ca.crt");
  const serverKeyPath = path.join(certsDir, "server.key");
  const serverCrtPath = path.join(certsDir, "server.crt");

  if (fs.existsSync(caCrtPath) && fs.existsSync(serverKeyPath)) {
    console.log("TLS certificates already exist in ./certs/");
    return;
  }

  console.log("Generating local database TLS keypairs in ./certs/...");
  const { privateKey: caKey, publicKey: caPub } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const { privateKey: serverKey, publicKey: serverPub } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  fs.writeFileSync(caKeyPath, caKey, { mode: 0o600 });
  fs.writeFileSync(caCrtPath, caPub, { mode: 0o644 });
  fs.writeFileSync(serverKeyPath, serverKey, { mode: 0o600 });
  fs.writeFileSync(serverCrtPath, serverPub, { mode: 0o644 });

  console.log("Local database certificate placeholders generated in ./certs/");
}

if (require.main === module) {
  generateLocalCertificates();
}
