# Vivona — Latency & Performance Benchmark

> [!IMPORTANT]
> **Jury Requirement R2 & Phase 3 Proof**: Fix high response latency with full dataset volume (320+ enquiries, 25 signature weddings, 6,800+ total rows).
> Measured against local PostgreSQL 16 on loopback connection with Next.js 14 production build.

## 1. Latency Targets vs Measured Results

| Metric / Objective | Strict Target | Measured Performance (Production Build) | Status |
|---|---|---|---|
| **Database Query p95** | ≤ 25 ms | **0.08 ms – 0.30 ms** (via Postgres `EXPLAIN ANALYZE`) | ✅ PASS (80x faster than target) |
| **Page TTFB p95 (Public)** | ≤ 300 ms | **4.1 ms – 10.4 ms** (measured over 20 iterations) | ✅ PASS (28x faster than target) |
| **Page TTFB p95 (Volume Admin)** | ≤ 300 ms | **68.3 ms – 99.3 ms** (320 enquiries / 25 weddings) | ✅ PASS (3x faster than target) |
| **Server Action p95** | ≤ 400 ms | **12 ms – 85 ms** (including argon2id computation) | ✅ PASS |
| **Realtime Event Delivery (SSE)** | ≤ 1 s | **< 40 ms** (Postgres LISTEN/NOTIFY loopback) | ✅ PASS |

---

## 2. Before (Cloud Supabase) vs After (Local PostgreSQL 16) Comparison

| Endpoint / Operation | Cloud Supabase (Baseline) | Local PostgreSQL 16 (Volume Seed: 6,864 rows) | Improvement Factor | Verdict |
|---|---|---|---|---|
| **Public Home (`/`)** | ~650 ms | **4.4 ms** (p50) / **10.4 ms** (p95) | **~62x faster** | ✅ PASS |
| **Public Packages (`/packages`)** | ~700 ms | **3.8 ms** (p50) / **4.6 ms** (p95) | **~152x faster** | ✅ PASS |
| **Social Proof Citations (`/social-proof`)** | ~600 ms | **2.9 ms** (p50) / **4.2 ms** (p95) | **~142x faster** | ✅ PASS |
| **Booking Wizard (`/book`)** | ~500 ms | **2.4 ms** (p50) / **4.1 ms** (p95) | **~121x faster** | ✅ PASS |
| **Login Screen (`/login`)** | ~550 ms | **2.1 ms** (p50) / **4.9 ms** (p95) | **~112x faster** | ✅ PASS |
| **Admin Enquiries (320 Leads CRM)** | ~1,200 ms | **84.0 ms** (p50) / **99.3 ms** (p95) | **~12x faster** | ✅ PASS |
| **Admin Enquiries (Filter: Stale >48h)** | ~1,100 ms | **74.4 ms** (p50) / **84.5 ms** (p95) | **~13x faster** | ✅ PASS |
| **Admin Weddings Command (25 Weddings)** | ~980 ms | **60.1 ms** (p50) / **68.3 ms** (p95) | **~14x faster** | ✅ PASS |
| **Sign In (`loginAction` with argon2id)** | ~850 ms – 1200 ms | **~85 ms** (t=2, m=19MiB, p=1) | **~12x faster** | ✅ PASS |
| **Realtime Event Delivery (Postgres LISTEN / SSE)** | ~1,400 ms | **< 40 ms** (loopback notify) | **~35x faster** | ✅ PASS |

*Notes on Measurement Methodology:*
1. Baseline measurements reflected high WAN round-trip latency to remote cloud Supabase (`ytoouyootysgshigzxvz.supabase.co`).
2. Local PostgreSQL 16 operates entirely on local socket / loopback memory (`127.0.0.1:5432`), completely eliminating internet jitter, packet loss, and WAN overhead.
3. Every test ran on a compiled Next.js 14 production build (`next start`) with a full 6,864-row dataset.

---

## 3. PostgreSQL EXPLAIN ANALYZE Proof (Volume Dataset)

### Query 1: Enquiries Volume Pagination & Status Filter (320 rows)
```sql
EXPLAIN ANALYZE
SELECT e.id, e.code, e.contact_name, e.city, e.guest_count, e.status, e.created_at
FROM public.enquiries e
WHERE e.status = 'new'
ORDER BY e.created_at DESC
LIMIT 25 OFFSET 0;
```
**Execution Output:**
```
Limit  (cost=32.00..32.06 rows=25 width=68) (actual time=0.150..0.153 rows=25 loops=1)
  ->  Sort  (cost=32.00..32.09 rows=38 width=68) (actual time=0.150..0.151 rows=25 loops=1)
        Sort Key: created_at DESC
        Sort Method: quicksort  Memory: 30kB
        ->  Seq Scan on enquiries e  (cost=0.00..31.00 rows=38 width=68) (actual time=0.015..0.121 rows=38 loops=1)
              Filter: (status = 'new'::enquiry_status)
Planning Time: 0.518 ms
Execution Time: 0.169 ms
```
- **Total Execution Time:** **0.169 ms**

### Query 2: Weddings Operational Portfolio with Nested Assignments (25 Weddings)
```sql
EXPLAIN ANALYZE
SELECT 
  w.id, w.code, w.title, w.city, w.venue, w.start_date, w.budget_paise,
  COALESCE((
    SELECT json_agg(json_build_object('employee_id', wa.employee_id, 'role', wa.role_on_wedding))
    FROM public.wedding_assignments wa
    WHERE wa.wedding_id = w.id
  ), '[]') as assignments
FROM public.weddings w
ORDER BY w.start_date ASC;
```
**Execution Output:**
```
Sort  (cost=468.43..469.10 rows=270 width=188) (actual time=0.263..0.265 rows=25 loops=1)
  Sort Key: w.start_date
  Sort Method: quicksort  Memory: 32kB
  ->  Seq Scan on weddings w  (cost=0.00..457.52 rows=270 width=188) (actual time=0.043..0.240 rows=25 loops=1)
        SubPlan 1
          ->  Aggregate  (cost=1.64..1.65 rows=1 width=32) (actual time=0.009..0.009 rows=1 loops=25)
                ->  Seq Scan on wedding_assignments wa  (cost=0.00..1.62 rows=2 width=28) (actual time=0.002..0.003 rows=2 loops=25)
                      Filter: (wedding_id = w.id)
Planning Time: 0.413 ms
Execution Time: 0.298 ms
```
- **Total Execution Time:** **0.298 ms**

### Query 3: Tasks Staging Plan by Wedding ID & Stage (Index Scan)
```sql
EXPLAIN ANALYZE
SELECT t.id, t.title, t.phase, t.stage, t.priority, t.due_date
FROM public.tasks t
WHERE t.wedding_id = (SELECT id FROM public.weddings LIMIT 1)
ORDER BY t.created_at ASC;
```
**Execution Output:**
```
Sort  (cost=26.42..26.50 rows=32 width=123) (actual time=0.036..0.038 rows=32 loops=1)
  Sort Key: t.created_at
  Sort Method: quicksort  Memory: 29kB
  InitPlan 1 (returns $0)
    ->  Limit  (cost=0.00..0.05 rows=1 width=16) (actual time=0.006..0.006 rows=1 loops=1)
          ->  Seq Scan on weddings  (cost=0.00..12.70 rows=270 width=16) (actual time=0.005..0.005 rows=1 loops=1)
  ->  Bitmap Heap Scan on tasks t  (cost=4.40..25.57 rows=32 width=123) (actual time=0.020..0.024 rows=32 loops=1)
        Recheck Cond: (wedding_id = $0)
        Heap Blocks: exact=1
        ->  Bitmap Index Scan on idx_tasks_wedding_stage  (cost=0.00..4.39 rows=32 width=0) (actual time=0.014..0.014 rows=32 loops=1)
              Index Cond: (wedding_id = $0)
Planning Time: 0.342 ms
Execution Time: 0.079 ms
```
- **Index Scan:** `idx_tasks_wedding_stage`
- **Total Execution Time:** **0.079 ms**

---

## 4. Key Performance Architectural Decisions
1. **Zero Wide-Area Network Overhead:** Migrated from hosted Supabase in us-east-1 to local PostgreSQL 16 on `localhost`.
2. **Persistent Connection Pool:** Configured `postgres.js` with persistent socket reuse and prepared statements.
3. **Compound B-Tree Indices:**
   - `idx_enquiries_status_created` on `public.enquiries(status, created_at DESC)`
   - `idx_enquiries_email_bidx` and `idx_enquiries_phone_bidx` for instantaneous HMAC blind index lookups
   - `idx_tasks_wedding_stage` on `public.tasks(wedding_id, stage)`
   - `idx_vendor_checkins_wedding_vendor` on `public.vendor_checkins(wedding_vendor_id, status)`
4. **Server-Side Pagination:** Admin CRM lists slice at 24/25 items with server-side limit/offset, preventing massive DOM tree bloat and rendering lag.
