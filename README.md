# Vivona — Luxury Wedding Planning Platform

**One platform for the whole wedding, from the first enquiry to the final vendor payment.**

Vivona is an operations platform for a luxury wedding planning agency orchestrating multi-day destination weddings in Jaipur and Udaipur. It replaces fragmented WhatsApp groups, PDF quotes, paper checklists, and notebooks with a unified, role-based web app backed by a hardened local PostgreSQL database.

- **Product:** Vivona Luxury Wedding Management Platform
- **Stack:** Next.js 14 · Strict TypeScript · Local PostgreSQL 16 · Drizzle ORM · Tailwind CSS
- **Database Architecture:** Native Local Database · Zero Cloud Dependencies · Hardened RLS
- **Security & Encryption:** Sealed Login (WebCrypto RSA-OAEP + AES-GCM) · AES-256-GCM Field Encryption · HMAC-SHA256 Blind Indexes · Encrypted Files & Backups

---

## Why Vivona

| Before Vivona | With Vivona |
|---|---|
| Enquiries arrive by phone, Instagram, and WhatsApp and get lost | Every enquiry is captured in one CRM pipeline with automated stale (>48h) alerts |
| Vendor quotes are PDFs in WhatsApp groups, manually compared | Quotes are structured and compared side by side, line by line, with price per plate |
| Checklists live in paper diaries and are rewritten per wedding | A 30+ task plan is generated automatically per wedding, each with an owner and stage |
| Payments are tracked in notebooks; milestone advances are missed | Staged milestones, idempotent payment transactions, duplicate-payment protection |
| Profit is calculated long after the wedding | Profit is computed continuously: recognized revenue minus attributable vendor & staff cost |
| Sensitive client PII and credentials exposed in transit or dumps | Sealed login payload, AES-256-GCM field encryption, argon2id in isolated schema `private` |

---

## Roles and Access Matrix

Vivona strictly enforces three roles at three layers (middleware route guards, server actions, and PostgreSQL Row Level Security with `FORCE ROW LEVEL SECURITY`):

| Capability | Admin (Founder / Finance) | Employee (Planner / Coordinator) | Client (Couple) |
|---|---|---|---|
| Public site, packages, social proof | ✓ | ✓ | ✓ |
| Submit enquiry / custom quote request | ✓ on behalf of client | – | ✓ own |
| Pipeline, proposals, agreements | ✓ | – | view, accept, sign own |
| Vendors, RFQs, quote comparison | ✓ | read contacts for assigned weddings | shortlist visible **only after signing** |
| Create wedding, assign employees | ✓ | – | – |
| Message the client | ✓ | **only on assigned weddings** | own wedding thread |
| Tasks, live schedule, check-ins, incidents | ✓ all | assigned weddings only | read-only summary |
| Client payment milestones | ✓ record | read status for assigned | view own |
| Vendor bills, payments, margins, analytics | ✓ | – | – |
| Extra charges | approve | request | view approved |
| Volume data review & CSV exports | ✓ | – | – |

*Public sign-up provisions clients only. Admin and employee accounts are created only by admin invite.*

---

## Security & Encryption Model

| # | Layer | Threat | Control | Verification |
|---|---|---|---|---|
| 1 | Passwords at rest | Database theft | argon2id (`t=2, m=19MiB, p=1`) stored exclusively in schema `private`, completely inaccessible to `vivona_app` role | `pnpm test:security` |
| 2 | Credentials in transit | Network tab inspection, proxy caches | Hybrid RSA-OAEP-256 + AES-256-GCM sealed payload via browser WebCrypto with 120s single-use nonces | `pnpm playwright test tests/e2e/leak.spec.ts` |
| 3 | Sensitive fields at rest | SQL dumps, unauthorized staff access | AES-256-GCM field encryption (`v1:<iv>:<tag>:<ciphertext>`) with `table.column` AAD + HMAC-SHA256 blind index | `pnpm db:verify` (Rule 8) |
| 4 | Private files at rest | Unauthorized disk inspection | AES-256-GCM encryption with magic header `VIV1`, streamed exclusively through authenticated `/api/files/[id]` | `pnpm test:security` |
| 5 | Database connection | Sniffing, network eavesdropping | Native loopback connection (`127.0.0.1:5432`), SCRAM-SHA-256 | PostgreSQL configuration |
| 6 | Database files on disk | Physical laptop theft | OS full-disk encryption (BitLocker / FileVault / LUKS) | Checklist in `docs/DISK_ENCRYPTION.md` |
| 7 | Database backups | Stolen dump files | Tamper-proof encrypted backups (`VBAK` header + AES-256-GCM) with separate `BACKUP_KEY` | `pnpm db:backup` / `pnpm db:restore` |
| 8 | Secrets & Keys | Git repository leaks | Zero secrets committed, Zod validation at startup, documented rotation procedures | `docs/SECURITY.md` |

---

## Getting Started (Local Setup)

### Prerequisites
- Node.js 20+
- pnpm 9+
- Native PostgreSQL 16 running locally on `127.0.0.1:5432`

### Quick Start Commands

```bash
# 1. Install dependencies
pnpm install

# 2. Configure local environment variables
cp .env.example .env.local

# 3. Apply schema migrations, RLS policies, and triggers
pnpm db:migrate

# 4. Deterministic Volume Demo Seed (320+ enquiries, 25 weddings, 6,800+ rows)
pnpm db:seed-demo --reset

# 5. Verify database integrity and constraint rules
pnpm db:verify

# 6. Run the production build or dev server
pnpm build && pnpm start     # Production server on http://localhost:3000
# or: pnpm dev
```

---

## Core Scripts Reference

| Command | Description |
|---|---|
| `pnpm db:seed-demo` | Seeds deterministic volume demo dataset (`faker.seed(2026)`) |
| `pnpm db:verify` | Automated 8-rule database and constraint verification |
| `pnpm db:bench` | Benchmarks p50/p95 endpoint latencies and runs `EXPLAIN ANALYZE` queries |
| `pnpm db:backup` | Generates AES-256-GCM encrypted backup archive in `backups/` |
| `pnpm db:restore` | Restores database from an encrypted backup archive |
| `pnpm test:security` | Runs security test suites (sealed channel, field crypto, backup integrity, DB isolation) |
| `pnpm test:e2e` | Runs Playwright end-to-end tests and leak detection |
| `pnpm typecheck` | Validates strict TypeScript compilation (`tsc --noEmit`) |
| `pnpm lint` | Next.js ESLint verification |

---

## Demo Accounts

All demo accounts share the password set in `DEMO_PASSWORD` (default: `ChangeMe-Demo#2026`).

| Role | Email | Name | Focus |
|---|---|---|---|
| **Admin** | `admin@vivona.demo` | Devraj Rathore | Founder, Finance, CRM Pipeline, RFQ Awards |
| **Employee** | `planner1@vivona.demo` | Ananya Sharma | Lead Destination Planner (Jaipur) |
| **Employee** | `planner2@vivona.demo` | Vikramaditya Singh | Lead Destination Planner (Udaipur) |
| **Client** | `couple1@vivona.demo` | Royal Couple | Client Portal, E-Sign Agreement, Schedule |

---

## Performance Summary

Measured against local PostgreSQL 16 on Next.js 14 production build (`next start`):

| Endpoint / Operation | Cloud Baseline | Local PostgreSQL 16 | Improvement |
|---|---|---|---|
| **Public Home (`/`)** | ~650 ms | **4.4 ms** (p50) / **10.4 ms** (p95) | **~62x faster** |
| **Public Packages (`/packages`)** | ~700 ms | **3.8 ms** (p50) / **4.6 ms** (p95) | **~152x faster** |
| **Admin Enquiries (320 Leads CRM)** | ~1,200 ms | **84.0 ms** (p50) / **99.3 ms** (p95) | **~12x faster** |
| **Admin Weddings Command (25 Weddings)** | ~980 ms | **60.1 ms** (p50) / **68.3 ms** (p95) | **~14x faster** |
| **PostgreSQL Query Execution Time** | ~180 ms | **0.08 ms – 0.30 ms** | **~600x faster** |

*See [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) and [`docs/JURY_NOTES.md`](docs/JURY_NOTES.md) for full benchmarks and audit logs.*
