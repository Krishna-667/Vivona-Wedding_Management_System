# Vivona Security Architecture & Hardening Model

**Product: Vivona · Local Database · Zero Cloud · Strict TypeScript · 3 Roles**

---

## 1. Threat vs Control Matrix (0.5 Compliance)

| # | Layer | Threat | Control | Verified By | Status |
|---|---|---|---|---|---|
| **1** | **Passwords at Rest** | Database theft / dumps | `argon2id` (memoryCost: 19456, timeCost: 2, parallelism: 1); hashes reside in schema `private`, readable only by `vivona_auth` role | Unit & security tests: `vivona_app` cannot SELECT from `private.*` | **ENFORCED** |
| **2** | **Credentials in Transit** | Network sniffing, proxy inspection, DevTools Network tab leaks | HTTPS + **Sealed Payload Channel** (hybrid RSA-OAEP-256 + AES-256-GCM via browser WebCrypto with one-time 120s nonce) | Automated Playwright sentinel leak test | **ENFORCED** |
| **3** | **Sensitive Fields at Rest** | SQL injection, raw dumps, unauthorized staff access | **AES-256-GCM field encryption** + HMAC-SHA256 blind index for exact search; AAD bound to `table.column` | Database assertions: raw SQL returns `v1:` ciphertext | **ENFORCED** |
| **4** | **Private Files at Rest** | Disk access / backup leaks | AES-256-GCM per file, random 12-byte IV, magic header `VIV1`, auth tag in binary stream | File byte comparison test: disk bytes differ from upload | **ENFORCED** |
| **5** | **App ↔ Database Link** | Sniffing, host spoofing | PostgreSQL TLS (`sslmode=verify-ca` or native localhost binding, `scram-sha-256`) | Database connection tests & role audits | **ENFORCED** |
| **6** | **Database Files on Disk** | Stolen laptop / hardware loss | OS Full-Disk Encryption (BitLocker / FileVault / LUKS). PostgreSQL has no native TDE | Signed checklist in `docs/DISK_ENCRYPTION.md` | **HUMAN VERIFIED** |
| **7** | **Backups at Rest** | Stolen dump files | Stream `pg_dump` piped through AES-256-GCM with separate `BACKUP_KEY` to `.vbak` | Backup / restore round-trip test (`pnpm db:backup` & `pnpm db:restore`) | **ENFORCED** |
| **8** | **Application Secrets** | Repo leaks, bundle exposure | `.env.local` only (gitignored), Zod-validated, no secrets in `NEXT_PUBLIC_`, production source maps disabled (`productionBrowserSourceMaps: false`) | Automated repo & build artifact scanner | **ENFORCED** |

---

## 2. DevTools Capabilities & Honest Caveats

### What DevTools Can and Cannot Hide
- **The Browser Boundary:** Whatever a user types into an input field (`<input type="password" />`) is present in their own browser memory and DOM tree while typed. No web application can prevent an attacker with physical control of the device from reading the active DOM or input `.value`.
- **Guarantees We Enforce:**
  1. **Network Tab Silence:** Plaintext passwords **never travel over HTTP/HTTPS**. The browser encrypts credentials with RSA-OAEP-256 and AES-256-GCM using WebCrypto before posting. An inspection of the Network tab reveals only an encrypted blob: `{ challengeId, encryptedKey, iv, authTag, ciphertext }`.
  2. **Zero Storage Footprint:** Plaintext passwords are never placed in URLs, query strings, cookies, `localStorage`, `sessionStorage`, IndexedDB, React props, or RSC payloads.
  3. **No Database Plaintext:** The database contains only one-way `argon2id` hashes in the isolated `private` schema.

---

## 3. Cryptographic Key Lifecycle & Rotation

### Key Rotation Steps
1. **Data Encryption Key (`DATA_ENCRYPTION_KEY`)**:
   - Each ciphertext is prefixed with its version (e.g., `v1:`).
   - To rotate: add `DATA_ENCRYPTION_KEY_V2`, update `CURRENT_VERSION = "v2"`, and run `pnpm db:encrypt-backfill` which reads `v1:` records, decrypts with old key, re-encrypts with new key, and updates in-place.
2. **RSA Authentication Key (`AUTH_RSA_PRIVATE_KEY` / `AUTH_RSA_PUBLIC_KEY`)**:
   - Challenges in `private.auth_challenges` have a `kid` column (`v1`).
   - Old challenges expire in 120 seconds. Key replacement takes immediate effect without affecting active user sessions (sessions are authenticated via HMAC session tokens).
3. **Backup Key (`BACKUP_KEY`)**:
   - New backups immediately use the updated key. Existing `.vbak` files can be re-encrypted or decrypted with their creation-time key.
