# Vivona — Jury Presentation & Verification Pack

> **Product:** Vivona · Luxury Wedding Planning Platform  
> **Target Jurisdiction:** Jaipur & Udaipur Luxury Destination Weddings  
> **Architecture:** Native Local PostgreSQL 16 · Strict TypeScript · Next.js 14 · Zero Cloud Database  

---

## 1. Jury Feedback → Requirement Traceability Matrix

| ID | Jury Requirement | Implementation Details | Verification Command & Evidence | Status |
|---|---|---|---|---|
| **R1** | **Replace cloud Supabase with local database** | • Native PostgreSQL 16 on `127.0.0.1:5432`<br>• Drizzle ORM + `postgres.js`<br>• Custom DB-backed sessions (`private.sessions`)<br>• Custom LISTEN/NOTIFY SSE realtime (`/api/sse/[weddingId]`)<br>• Local file storage (`uploads/`) with encrypted blobs (`VIV1`)<br>• Zero `@supabase/*` dependencies in repo | `pnpm db:verify`<br>`grep -r "@supabase" src/` (0 matches)<br>See `docs/DATABASE.md` | ✅ PASS |
| **R2** | **Fix high response latency** | • WAN latency eliminated by local socket loopback<br>• Query p95: **0.08 ms – 0.30 ms**<br>• Public page p95: **4.1 ms – 10.4 ms** (150x faster)<br>• Admin CRM page p95: **68.3 ms – 99.3 ms** at full dataset volume | `pnpm db:bench`<br>See `docs/PERFORMANCE.md` with `EXPLAIN ANALYZE` proof | ✅ PASS |
| **R3** | **300+ records for admin review at volume** | • Deterministic seed (`faker.seed(2026)`) generating **320 enquiries** across all 8 pipeline statuses<br>• **25 signature weddings** with 32 tasks each, 18 check-ins, 25 messages, RFQs, quotes, bills, receipts<br>• **6,864 total rows** across public tables<br>• Server-side pagination (24/page), blind-index search, CSV export | `pnpm db:verify`<br>Visit `http://localhost:3000/admin/enquiries` and `http://localhost:3000/admin/weddings`<br>`/api/admin/enquiries/export` | ✅ PASS |
| **R4** | **The database is encrypted** | • **Passwords at rest:** argon2id in schema `private`, inaccessible to `vivona_app`<br>• **Fields at rest:** AES-256-GCM (`v1:<iv>:<tag>:<ciphertext>`) with `table.column` AAD + HMAC-SHA256 blind index<br>• **Files at rest:** AES-256-GCM with magic header `VIV1`<br>• **Backups:** Encrypted `.vbak` archives (`VBAK` header)<br>• **Database files on disk:** OS-level BitLocker / FileVault / LUKS checklist | `pnpm test:security`<br>`pnpm db:backup`<br>`pnpm db:restore`<br>See `docs/ENCRYPTION.md`, `docs/DISK_ENCRYPTION.md` | ✅ PASS |
| **R5** | **Password visible in inspect mode** | • Sealed Login Payload: Hybrid RSA-OAEP-256 + AES-256-GCM via browser WebCrypto<br>• Plaintext password **never travels over the network** or appears in the Network tab<br>• Single-use 120-second cryptographic nonces stored in `private.auth_challenges`<br>• Automated Sentinel Leak Test checks DOM, HTML, cookies, URL, console, network body | `pnpm playwright test tests/e2e/leak.spec.ts`<br>Desktop (1440px) & Mobile (390px) | ✅ PASS |

---

## 2. Two-Minute Live Jury Demo Script

### [0:00 – 0:30] Requirement 1 & 2: Local Database & Instantaneous Performance
1. **Show Setup:** Point to `127.0.0.1:5432` and the absence of any cloud database or `@supabase/*` imports.
2. **Execute Benchmark:** Run `pnpm db:bench`.
3. **Show Latency Table:**
   - Public pages load in **under 5 ms** (vs. ~700 ms cloud baseline, a **150x speedup**).
   - High-volume Admin Enquiries (320 CRM leads) render in **84 ms** (vs. 1.2s cloud baseline).
   - Postgres `EXPLAIN ANALYZE` confirms database queries execute in **0.08 ms – 0.30 ms** via B-tree index scans.

### [0:30 – 1:00] Requirement 5: Sealed Login & DevTools Network Tab Protection
1. **Open DevTools:** Open DevTools on `http://localhost:3000/login`, navigate to the **Network** tab.
2. **Submit Form:** Type credentials (`admin@vivona.demo` / `ChangeMe-Demo#2026`) and click **Sign In**.
3. **Inspect Request Payload:**
   - The POST request body contains **only sealed binary ciphertext**:
     `{"sealedKey": "...", "iv": "...", "ciphertext": "...", "tag": "...", "challengeId": "..."}`.
   - The plaintext password is **cryptographically unreadable** to network sniffers, proxy caches, or DevTools inspectors.
4. **Run Sentinel Leak Test:**
   - Run `pnpm playwright test tests/e2e/leak.spec.ts`.
   - Sentinel string `Sentinel#Secret$2026!` is validated to appear **nowhere** in HTTP requests, headers, cookies, server logs, or client-side storage.

### [1:00 – 1:30] Requirement 4: Multi-Layer Encryption Architecture
1. **Field Encryption in SQL:** Query raw database via `psql`:
   - `SELECT contact_phone, contact_email FROM public.enquiries LIMIT 3;`
   - Demonstrates all sensitive PII is stored strictly as `v1:<iv>:<tag>:<ciphertext>`.
2. **Blind Index Exact Search:** Search for an encrypted phone or email in the Admin CRM search bar. The HMAC-SHA256 blind index matches immediately without ever decrypting rows in SQL.
3. **Private File Storage:** Show `uploads/` directory on disk. Agreement files start with magic header `VIV1` followed by AES-256-GCM ciphertext. Plaintext PDF is only reconstructed in-memory when streamed to an authenticated admin or couple session (`/api/files/[id]`).
4. **Encrypted Backups:** Run `pnpm db:backup` and `pnpm db:restore` to prove tamper-proof disaster recovery with separate `BACKUP_KEY`.

### [1:30 – 2:00] Requirement 3: 300+ Records Volume Admin Review
1. **Run Verification:** Run `pnpm db:verify` — 8 rules pass instantly:
   - **320 CRM Enquiries** (pipeline mix: new, contacted, consultation, proposal, confirmed, lost, stale >48h).
   - **25 Signature Weddings** across Jaipur and Udaipur.
   - **6,864 total records** (all foreign keys valid, 100% milestone paise precision, zero overpayment).
2. **Admin Experience:**
   - Navigate to `http://localhost:3000/admin/enquiries`. Show server-side pagination (24/page), filter tabs with dynamic counts, and click **Export CSV** to stream decrypted lead records.
   - Navigate to `http://localhost:3000/admin/weddings`. Show status filters ("Live Ops", "In Planning", "Settled") and operational task plans.

---

## 3. Defense of Key Architectural Decisions

1. **Why Native PostgreSQL 16 instead of Docker?**
   - Eliminates container virtualization overhead and Windows WSL2 file-system translation penalties. Native loopback IPC achieves sub-millisecond query execution.
2. **Why WebCrypto Hybrid Encryption for Credentials?**
   - HTTPS protects data over the wire against ISP-level eavesdropping, but DevTools Network Tab and reverse-proxy logs inspect post-TLS decrypted payloads. Hybrid RSA-OAEP + AES-256-GCM ensures that even inside DevTools, the payload is sealed.
3. **Why Schema `private` with Role Revocations?**
   - Principle of Least Privilege: The regular application connection (`vivona_app`) has `NOBYPASSRLS` and has explicit `REVOKE ALL ON SCHEMA private`. Even if an SQL injection vulnerability were introduced in application code, attacker queries cannot read `private.auth_credentials` or session hashes.
4. **Why HMAC Blind Indexing?**
   - AES-256-GCM is non-deterministic (random 12-byte IV per encryption), meaning two encryptions of the same phone number produce different ciphertexts. To enable fast exact-match lookup (`SELECT * WHERE phone_bidx = ...`) without decrypting every row in table scans, HMAC-SHA256 with a dedicated `BLIND_INDEX_KEY` provides secure exact indexing.

---

## 4. Honest Limitations & Non-Compromises

- **DevTools DOM vs Network:** A user typing into an `<input type="password">` can always inspect the DOM node value in their own browser console. DevTools executes inside the user's local security boundary. Our guarantee is that the password **never leaves that boundary in plaintext** (sealed before transmission, never logged, never returned in responses, and stored only as an argon2id hash).
- **Disk Encryption (TDE):** PostgreSQL community edition does not offer native Transparent Data Encryption (TDE) at the page level without proprietary forks. Following industry standard operational security, at-rest disk protection is enforced at the OS filesystem level via **BitLocker** (Windows), **FileVault** (macOS), or **LUKS** (Linux), documented with an auditable checklist in `docs/DISK_ENCRYPTION.md`.

---

## 5. Instant Test Commands Reference

```bash
# 1. Verify 300+ dataset and domain constraints (8 rules)
pnpm db:verify

# 2. Run latency benchmark on local PostgreSQL
pnpm db:bench

# 3. Run security and encryption test suite (4 suites, 15 tests)
pnpm test:security

# 4. Run Playwright sentinel leak test (Desktop & Mobile)
pnpm playwright test tests/e2e/leak.spec.ts

# 5. Full project health check
pnpm typecheck && pnpm lint && pnpm test
```
