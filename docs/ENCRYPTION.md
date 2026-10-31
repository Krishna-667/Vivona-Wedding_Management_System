# Vivona Field-Level & File Encryption Register

## 1. Sensitive Field Register

Every field containing Personally Identifiable Information (PII) or confidential financial references is encrypted before storage in PostgreSQL using **AES-256-GCM** (`DATA_ENCRYPTION_KEY`).

| Table | Column | Purpose | Ciphertext Format | Blind Index Column | Search Capability |
|---|---|---|---|---|---|
| `public.profiles` | `phone` | Client/Employee telephone | `v1:<iv>:<tag>:<ciphertext>` | `phone_bidx` | Exact Match (`HMAC-SHA256`) |
| `public.enquiries` | `contact_phone` | Prospective couple phone | `v1:<iv>:<tag>:<ciphertext>` | `contact_phone_bidx` | Exact Match (`HMAC-SHA256`) |
| `public.enquiries` | `contact_email` | Prospective couple email | `v1:<iv>:<tag>:<ciphertext>` | `contact_email_bidx` | Exact Match (`HMAC-SHA256`) |
| `public.enquiries` | `notes` | Confidential requirements | `v1:<iv>:<tag>:<ciphertext>` | None | None (Internal read only) |
| `public.vendors` | `phone` | Vendor dispatch phone | `v1:<iv>:<tag>:<ciphertext>` | `phone_bidx` | Exact Match (`HMAC-SHA256`) |
| `public.vendors` | `email` | Vendor quote contact email | `v1:<iv>:<tag>:<ciphertext>` | `email_bidx` | Exact Match (`HMAC-SHA256`) |
| `public.agreements` | `signer_meta.ip` | Legal signer IP address | `v1:<iv>:<tag>:<ciphertext>` | None | None |
| `public.agreements` | `signer_meta.user_agent` | Legal signer User-Agent | `v1:<iv>:<tag>:<ciphertext>` | None | None |
| `public.client_receipts` | `reference` | Bank UTR / Cheque Ref | `v1:<iv>:<tag>:<ciphertext>` | None | Exact Match (via ID) |
| `public.vendor_payments` | `reference` | RTGS / NEFT Reference | `v1:<iv>:<tag>:<ciphertext>` | None | Exact Match (via ID) |
| `public.messages` | `body` | Couple & planner chat | `v1:<iv>:<tag>:<ciphertext>` | None | Full-text inside session |

---

## 2. Ciphertext Specification

All encrypted database columns conform to the standard format:
```text
v1:<iv_b64url>:<tag_b64url>:<ciphertext_b64url>
```
1. **Version (`v1`)**: Identifies the key version used for encryption. Enables zero-downtime key rotation.
2. **IV (`iv_b64url`)**: 12-byte random cryptographic nonce generated per encryption operation via `node:crypto.randomBytes(12)`.
3. **Authentication Tag (`tag_b64url`)**: 16-byte (128-bit) GCM authentication tag verifying ciphertext integrity.
4. **Ciphertext (`ciphertext_b64url`)**: AES-256-GCM ciphertext payload.
5. **AAD (Additional Authenticated Data)**: Bound to `${table}.${column}` to mathematically prevent ciphertext transposition across columns.

---

## 3. Blind Index Specification

For encrypted columns requiring exact-match search (e.g. searching enquiries or vendors by phone or email):
```text
BlindIndex = HMAC-SHA256(BLIND_INDEX_KEY, normalize(value))
```
- **Normalization**: Trims leading/trailing whitespace and converts strings to lowercase.
- **Security**: The blind index is one-way and cannot be inverted. Attackers with raw SQL read access cannot determine the phone number or email address from the blind index without the secret `BLIND_INDEX_KEY`.

---

## 4. Files at Rest Encryption

All private bucket files (signed agreement PDFs, signature PNGs, vendor invoices) are encrypted with **AES-256-GCM** using `FILE_ENCRYPTION_KEY`:
```text
[MAGIC(4 bytes: "VIV1")] + [IV(12 bytes)] + [AUTH_TAG(16 bytes)] + [CIPHERTEXT]
```
Files on disk are completely unreadable to unauthorized operating system processes or external scanners. They are decrypted in memory only when streamed through the authenticated `/api/files/[id]` route to verified session holders.
