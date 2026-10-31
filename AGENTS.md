# VIVONA — Wedding Planning Platform · Master Build Prompt
**Product: Vivona · Local Database · Zero Cloud · Strict TypeScript · Next.js 14**

## How to use this file
1. Save **PART 0** as `AGENTS.md` in the repo root so every agent inherits it.
2. The platform operates completely on a **local PostgreSQL database** with zero cloud dependencies.
3. Strict adherence to role-based access control (Admin, Employee, Client), transaction safety, integer paise calculations, and security models.

| Phase | Focus |
|---|---|
| 1 | Move to local PostgreSQL, replace Supabase Auth/Realtime/Storage, fix latency, capture baseline |
| 2 | Passwords never visible, sealed login, field/file/backup encryption, database hardening, leak tests |
| 3 | 300+ record demo dataset, admin review experience at volume, final performance proof, docs, jury pack |

---

# PART 0 — PERSISTENT CONTEXT (applies to every phase)

## 0.1 Mission
Build **Vivona**, a **production-grade, responsive, role-based web platform** for a luxury wedding planning agency operating in Jaipur and Udaipur (about 25 three-day weddings a season, 400+ guests, about 18 vendors per wedding, crore-scale budgets). Vivona replaces WhatsApp groups and paper diaries across the full lifecycle: **enquiry → agreement → vendor quotes → instant plan → live wedding day → settlement → profit review.**

North star. At any moment the system must answer: (1) What is happening with every wedding? (2) Who is responsible for what, and what needs attention? (3) Are we actually making money?

## 0.1b Naming and brand (Vivona)
- **Vivona** is the product name and the only brand name used anywhere in the app. Do not invent or use any other agency name. Build for **one agency**; do **not** build multi-tenancy.
- Use "Vivona" in: browser title template `%s · Vivona`, header/footer wordmark, PWA manifest `name` and `short_name`, favicon, email sender display name and React Email header, `package.json` name (`vivona`), repo name, README, and the agreement PDF header. Agreement parties are written as "Vivona" and "the Client".
- **Wordmark:** typographic "Vivona" in Cormorant Garamond with a small gold knot glyph (inline SVG) as a reusable `<Logo />` component; derive the favicon from it. No raster logo needed.
- Read the name from one file, `src/lib/brand.ts` (`APP_NAME`, from `NEXT_PUBLIC_APP_NAME`). Never hard-code brand strings elsewhere.
- Wedding codes look like `VIV-2026-001`. Demo emails use `@vivona.demo`.

## 0.2 Fixed architecture decisions
| Was (cloud Supabase) | Becomes |
|---|---|
| Hosted Postgres | **Local PostgreSQL 15 or 16**, installed natively (no Docker required) |
| `supabase-js`, `@supabase/ssr` | `postgres` (postgres.js) + **Drizzle ORM**, typed from the schema |
| GoTrue Auth | **Custom DB-backed sessions**, passwords hashed with **argon2id** |
| `auth.uid()` in RLS | `app_user_id()` reading a **transaction-local** setting |
| Supabase Realtime | **LISTEN/NOTIFY + Server-Sent Events** |
| Storage buckets | **Local filesystem + `files` table**, served only through an authenticated route |
| Service-role key | `vivona_service` **database role** with BYPASSRLS, server-only |

Database roles (least privilege):
| Role | Purpose | Key attributes |
|---|---|---|
| `vivona_owner` | Owns objects, runs migrations | Never used by the running app |
| `vivona_app` | All request-path data access | LOGIN, NOSUPERUSER, **NOBYPASSRLS**, DML on `public` only, **no access to schema `private`** |
| `vivona_auth` | Login, sessions, password hashes | Access to schema `private` and the few `profiles` columns it needs; used only by `src/lib/auth/*` |
| `vivona_service` | Seeds, invites, backups, scheduled jobs | BYPASSRLS, server-only modules, never in a request path for end-user data |

Enable `FORCE ROW LEVEL SECURITY` on every table in `public`.

## 0.3 Roles and access (exactly three roles)
| Capability | **Admin** (founder; also covers finance, vendors, analytics) | **Employee** (planner / on-site coordinator) | **Client** (couple) |
|---|---|---|---|
| Public site, packages, social proof | ✓ | ✓ | ✓ |
| Submit enquiry / custom quote request | ✓ on behalf of client | – | ✓ own |
| View all enquiries and pipeline | ✓ | – | own only |
| Build/send proposals and agreements | ✓ | – | view, accept, sign own |
| Vendors, RFQs, quote comparison, selection | ✓ | read vendor contacts for assigned weddings | sees shortlist **only after agreement signed** |
| Create wedding, **assign employees** | ✓ | – | – |
| Message the client | ✓ | **only on weddings assigned to them** | own wedding thread |
| Tasks, schedule, check-ins, incidents, timesheets | ✓ all | assigned weddings only | read-only summary of own |
| Client payment milestones | ✓ record | read status for assigned | view own |
| Vendor bills/payments, margins, profit | ✓ | ✗ | ✗ |
| Extra charges | approve | request | view approved |
| Analytics, exports, users/roles, site content | ✓ | ✗ | ✗ |

Rules:
- Public sign-up creates **`client` only**. Admin and employee accounts are created only by an admin invite (server action using the `vivona_service` role, **server-side only**).
- Role lives in `profiles.role`; never trust role data sent from the browser.
- Enforce at **three layers**: (1) `middleware.ts` route guards, (2) role + assignment checks inside every Server Action and Route Handler, (3) **Postgres RLS on every table via `app_user_id()`**. Hiding a button is not security.
- Until a wedding is assigned, the **admin** handles all client communication. Employee-to-client messaging starts only at assignment (enforced by RLS).

## 0.4 What DevTools can and cannot hide
- Whatever a person types into a field is visible to that same person in their own browser (DOM `.value`, console).
- What we **must** guarantee:
  1. The plaintext password is **never readable in the Network tab**: it travels only inside a sealed (encrypted) payload over HTTPS.
  2. It is **never returned** in any response and **never appears** in a URL, cookie, `localStorage`, `sessionStorage`, IndexedDB, React state or props, the RSC payload or `__NEXT_DATA__`, an HTML attribute, a JS bundle, a source map, the console, server logs or database logs.
  3. It is **never stored**: only an argon2id hash exists, in a schema (`private`) the normal app role cannot read, and no API or view can return it.
- **Hashing is not encryption.** Passwords are hashed (one-way). Sensitive data is encrypted (reversible with a key). Never call a hash an "encrypted password" in code, UI or docs without that distinction.

## 0.5 Encryption model
| # | Layer | Threat | Control | Verified by |
|---|---|---|---|---|
| 1 | Passwords at rest | Database theft | argon2id; hashes live only in `private`, readable only by `vivona_auth` | Test: `vivona_app` cannot `SELECT` from `private.*` |
| 2 | Credentials in transit | Network tab, proxies, request logs | HTTPS + **sealed payload** (hybrid RSA-OAEP-256 + AES-256-GCM, one-time nonce) | Playwright leak test |
| 3 | Sensitive fields at rest | SQL access, dumps, over-broad staff access | **AES-256-GCM field encryption** + HMAC blind index for exact-match search | Test: raw SQL shows `v1:` ciphertext, never plaintext |
| 4 | Private files at rest | Disk access | AES-256-GCM per file, random IV, auth tag in metadata | Test: bytes on disk differ from upload |
| 5 | App ↔ database link | Sniffing, wrong host | PostgreSQL TLS, `scram-sha-256`, `listen_addresses = localhost` | `SHOW ssl;` and a failing non-TLS connection |
| 6 | Database files on disk | Stolen laptop | OS full-disk encryption (BitLocker, FileVault, LUKS). PostgreSQL has no built-in TDE. This is a human step | Signed checklist in `docs/DISK_ENCRYPTION.md` |
| 7 | Backups | Stolen dump file | AES-256-GCM encrypted backups with a separate `BACKUP_KEY` | Restore test |
| 8 | Secrets | Repo or bundle leak | Env only, gitignored, Zod-validated at boot, rotation steps documented | Repo/bundle scan test |

## 0.6 Domain rules (non-negotiable)
- The **Wedding** is the central record; everything links to `wedding_id`.
- **Money = integer paise (`bigint`), INR.** Never floats. Format with `Intl.NumberFormat('en-IN')` and show lakh/crore.
- **Originals are immutable.** Quotes, proposals and agreements are never overwritten by invoices. Keep Estimated / Agreed / Invoiced / Paid / Outstanding as separate, visibly distinct values.
- Client receipts and vendor payments are **separate flows**. Every payment write goes through **one Postgres RPC in one transaction**, with a unique `idempotency_key` and unique `(direction, reference)`; overpayment is rejected; double-click and retry are safe.
- **Selecting a quote** is a transactional RPC: mark winner → close the other RFQs as `closed_not_selected` (history preserved and viewable) → create the `wedding_vendors` link. Selecting twice is rejected.
- **Profit** = recognized revenue (accepted proposal + approved extras) − attributable cost (agreed/invoiced vendor amounts + approved extras + labour hours × rate). It is **not** cash-in minus cash-out.
- **Audit:** trigger-written `audit_events` (actor, action, record, old/new, timestamp) for financial rows, status changes and assignments.
- **Agreement gate:** vendor lists and floor plans are hidden from the client until the agreement is signed (enforced in RLS via `agreement_signed(wedding_id)`, not just UI).
- **Social proof ("citations"):** an admin-curated `social_proof` table (platform, handle, post URL, thumbnail, caption/testimonial).
- Views that expose financial data use `security_invoker = true` or are wrapped in functions that check `is_admin()`.
- Every email also writes an in-app `notifications` row.

## 0.7 Engineering standards
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` must pass before every commit.
- Server Actions return `{ ok: true, data } | { ok: false, error, fieldErrors? }` and Zod-validate every input.
- Every list has loading skeleton, empty state, error state and pagination. Every form has inline errors, a submitting state and a toast.
- Accessibility: labelled inputs, visible focus, AA contrast, honour `prefers-reduced-motion`.
- **Design tokens:** ivory `#FBF7F0`, maroon `#6B1D2A`, antique gold `#C8A24A`, charcoal `#1F1A17`, sage `#6F8F72` (success), terracotta `#B5533C` (danger). Fonts: Cormorant Garamond (display) + Inter (UI). 8-pt spacing, 12 px radius.
- Structure:
```
src/app/(marketing) (auth) (client) (employee) (admin) api/
src/components/ui | features/<module>
src/lib/ db/ auth/ validation/ finance/ permissions/ email/
migrations/      scripts/   tests/unit | e2e | security   docs/
```
