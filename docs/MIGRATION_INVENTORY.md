# Vivona — Supabase to Local PostgreSQL Migration Inventory

> [!NOTE]
> This inventory catalogues every point of integration with cloud Supabase (`@supabase/*`, `auth.*`, `storage.*`, RLS functions) that is being replaced with local PostgreSQL, custom auth, local storage, and Server-Sent Events.

## 1. Package Dependencies to Remove
| Package | Version | Current Usage | Replacement |
|---|---|---|---|
| `@supabase/ssr` | `^0.5.1` | Cookie handling in `src/lib/supabase/server.ts` & `src/middleware.ts` | Custom session cookie + `src/lib/auth/session.ts` |
| `@supabase/supabase-js` | `^2.45.3` | `createClient` in `admin.ts`, `client.ts`, types in `src/types/database.ts` | `postgres` (postgres.js) + Drizzle ORM |

## 2. Source Code Integration Touchpoints

### A. Auth & Session Management
- `src/lib/supabase/server.ts` — `createClient()` using SSR cookies
- `src/lib/supabase/admin.ts` — Service role client used for admin actions & employee invites
- `src/lib/supabase/client.ts` — Browser-side client (used for realtime chat & live console)
- `src/lib/auth/session.ts` — `supabase.auth.getUser()` and profile fetch
- `src/middleware.ts` — Cookie validation and route redirection
- `src/app/actions/auth.ts` — `supabase.auth.signInWithPassword`, `signUp`, `signOut`, `admin.createUser`

### B. Server Actions Data Access (`supabase.from(...)` & `supabase.rpc(...)`)
1. `src/app/actions/booking.ts` — Insert enquiry, link client profile
2. `src/app/actions/client.ts` — Fetch client requests, proposal acceptance, agreement signing
3. `src/app/actions/content.ts` — Packages & social proof CRUD
4. `src/app/actions/crm.ts` — Enquiries pipeline, consultation schedule, proposal lines, deposit
5. `src/app/actions/cron.ts` — Overdue milestone check
6. `src/app/actions/employee.ts` — Tasks management, check-ins, incidents, timesheets, extras
7. `src/app/actions/finance.ts` — Milestones, receipts, vendor bills, payments, reconciliation
8. `src/app/actions/team.ts` — Employee invites, workload stats, wedding assignments
9. `src/app/actions/vendors.ts` — RFQs, quotes, `select_quote` RPC, caterer comparison

### C. Client Components & Realtime Channels
- `src/components/features/chat/chat-thread.tsx` — Supabase Realtime channel subscription on `messages` table
- `src/components/features/live/live-event-console.tsx` — Supabase Realtime channel subscription on `vendor_checkins`, `schedule_entries`, `incidents`

### D. File Storage & Signed URLs
- `supabase/migrations/20261031000003_storage_buckets.sql` — Buckets: `agreements`, `quotes`, `invoices`, `evidence`, `site-assets`
- Agreement PDF uploads and evidence uploads in `src/app/actions/client.ts` and `src/app/actions/employee.ts`

### E. Database Schema & RLS Dependencies
- `auth.users(id)` Foreign Key on `profiles.id`
- `auth.uid()` called across helper functions in `20261031000002_rls_and_helpers.sql`:
  - `is_admin()`
  - `is_assigned(p_wedding_id)`
  - `is_client_of(p_wedding_id)`
  - `agreement_signed(p_wedding_id)`
- Trigger `on_auth_user_created` listening on `auth.users`
- Storage policies in `storage.objects`

## 3. Environment Variables to Deprecate
```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## 4. Target Architecture Replacements
- **Database Engine:** Local PostgreSQL 16 on `localhost:5432`
- **Database Connection Roles:** `vivona_owner`, `vivona_app`, `vivona_auth`, `vivona_service`
- **ORM / Driver:** `postgres` (postgres.js) + Drizzle ORM
- **RLS Helper:** `app_user_id()` querying transaction-local `current_setting('app.user_id', true)`
- **Authentication:** Custom session cookies (`HttpOnly; Secure; SameSite=Lax`) + argon2id password hashing
- **Realtime:** PostgreSQL `pg_notify` triggers + Next.js Server-Sent Events (SSE) route `/api/sse/[weddingId]`
- **Storage:** Local filesystem directory `storage/<bucket>/<id>` + authenticated stream route `/api/files/[id]`
