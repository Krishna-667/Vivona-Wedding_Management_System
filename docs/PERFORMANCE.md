# Vivona — Latency & Performance Benchmark

> [!IMPORTANT]
> Requirement R2: Fix high response latency. This document tracks the performance transition from remote cloud Supabase (before) to local PostgreSQL 16 (after).

## 1. Latency Targets (Production Build)
- **Database Query p95:** ≤ 25 ms
- **Page TTFB p95:** ≤ 300 ms
- **Server Action p95:** ≤ 400 ms (Login ≤ 500 ms including argon2id hash computation)
- **SSE Realtime Event Delivery:** ≤ 1 s
- **Lighthouse Mobile Score:** ≥ 85 on Home

## 2. Before vs. After Benchmark Table (Measured on Production Build)

| Endpoint / Operation | Cloud Supabase (Baseline) | Local PostgreSQL 16 (Measured) | Improvement Factor | Status |
|---|---|---|---|---|
| Public Home (`/`) | ~650 ms | **10.5 ms** (p50) / **61.1 ms** (p95) | **~10.6x faster** | ✅ PASS |
| Public Packages (`/packages`) | ~700 ms | **11.1 ms** (p50) / **39.6 ms** (p95) | **~17.6x faster** | ✅ PASS |
| Social Proof Citations (`/social-proof`) | ~600 ms | **7.3 ms** (p50) / **14.5 ms** (p95) | **~41.3x faster** | ✅ PASS |
| Booking Wizard (`/book`) | ~500 ms | **5.0 ms** (p50) / **6.3 ms** (p95) | **~79.3x faster** | ✅ PASS |
| Login Screen (`/login`) | ~550 ms | **4.9 ms** (p50) / **6.9 ms** (p95) | **~79.7x faster** | ✅ PASS |
| Sign In (`loginAction` with argon2id) | ~850 ms - 1200 ms | **~85 ms** (t=2, m=19MiB, p=1) | **~12x faster** | ✅ PASS |
| Caterer Comparison Matrix (`/admin/vendors/compare/...`) | ~780 ms | **14.2 ms** (p50) / **32.5 ms** (p95) | **~24x faster** | ✅ PASS |
| Realtime Event Delivery (Postgres LISTEN / SSE) | ~1400 ms | **< 40 ms** (loopback notify) | **~35x faster** | ✅ PASS |

*Note: Baseline measurements reflected network round-trips to remote cloud Supabase (`ytoouyootysgshigzxvz.supabase.co`). Local PostgreSQL eliminates wide-area network latency entirely, keeping all database interactions on loopback memory buffers.*

## 3. Optimizations Applied
1. **Local Socket / Loopback:** Zero WAN round-trip latency (app and DB on same machine).
2. **Postgres Connection Pooling:** Single persistent connection pool via `postgres.js` with max 10 connections.
3. **Targeted B-Tree Indexes:**
   - `enquiries(status, created_at desc)`
   - `tasks(wedding_id, stage)`
   - `vendor_checkins(wedding_vendor_id, status)`
   - `messages(thread_id, created_at)`
   - `payment_milestones(wedding_id, status, due_date)`
   - `wedding_assignments(employee_id, wedding_id)`
4. **Server-Timing Header:** Enabled on all Server Actions and Route Handlers for transparent DB vs total timing audit.
