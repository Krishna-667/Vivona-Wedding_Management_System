import http from "node:http";
import postgres from "postgres";
import { randomBytes, createHash } from "node:crypto";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

interface BenchResult {
  endpoint: string;
  count: number;
  minMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  avgMs: number;
  statusCode: number;
}

const BASE_URL = process.env.BENCH_BASE_URL || "http://127.0.0.1:3000";
const DATABASE_URL =
  process.env.DATABASE_SERVICE_URL ||
  "postgres://vivona_service:ChangeMe_Service#2026@127.0.0.1:5432/vivona";

const ITERATIONS = 20;

async function requestLatency(
  path: string,
  cookie?: string
): Promise<{ latencyMs: number; statusCode: number }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const start = performance.now();

    const headers: Record<string, string> = {};
    if (cookie) {
      headers["Cookie"] = cookie;
    }

    const req = http.get(url, { headers }, (res) => {
      res.on("data", () => {});
      res.on("end", () => {
        const latencyMs = Math.round((performance.now() - start) * 10) / 10;
        resolve({ latencyMs, statusCode: res.statusCode || 200 });
      });
    });

    req.on("error", (err) => reject(err));
  });
}

async function benchEndpoint(name: string, path: string, cookie?: string): Promise<BenchResult> {
  // Warmup 2 requests
  try {
    await requestLatency(path, cookie);
    await requestLatency(path, cookie);
  } catch {}

  const latencies: number[] = [];
  let lastStatus = 200;

  for (let i = 0; i < ITERATIONS; i++) {
    const { latencyMs, statusCode } = await requestLatency(path, cookie);
    latencies.push(latencyMs);
    lastStatus = statusCode;
  }

  latencies.sort((a, b) => a - b);
  const minMs = latencies[0];
  const maxMs = latencies[latencies.length - 1];
  const avgMs = Math.round((latencies.reduce((a, b) => a + b, 0) / latencies.length) * 10) / 10;
  const p50Ms = latencies[Math.floor(latencies.length * 0.5)];
  const p95Ms = latencies[Math.floor(latencies.length * 0.95)];

  return {
    endpoint: name,
    count: ITERATIONS,
    minMs,
    p50Ms,
    p95Ms,
    maxMs,
    avgMs,
    statusCode: lastStatus,
  };
}

async function createAdminSessionToken(sql: postgres.Sql): Promise<{ cookie: string; adminId: string }> {
  const [admin] = await sql`
    SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1
  `;
  if (!admin) {
    throw new Error("No admin profile found in database. Seed demo data first.");
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 86400000);

  await sql`
    INSERT INTO private.sessions (token_hash, profile_id, expires_at)
    VALUES (${tokenHash}, ${admin.id}, ${expiresAt})
  `;

  return {
    cookie: `vivona_session=${rawToken}`,
    adminId: admin.id,
  };
}

async function runExplainAnalyze(sql: postgres.Sql, adminId: string) {
  console.log("\n🔬 Running Postgres EXPLAIN ANALYZE on Core Queries (Volume Dataset)...");

  // Set RLS transaction-local variable
  await sql`SELECT set_config('app.current_user_id', ${adminId}, false)`;

  // Query 1: Enquiries Volume Pagination & Status Filter
  const q1Plan = await sql`
    EXPLAIN ANALYZE
    SELECT e.id, e.code, e.contact_name, e.city, e.guest_count, e.status, e.created_at
    FROM public.enquiries e
    WHERE e.status = 'new'
    ORDER BY e.created_at DESC
    LIMIT 25 OFFSET 0
  `;
  console.log("\n--- EXPLAIN ANALYZE: Enquiries Volume Pagination (LIMIT 25) ---");
  console.log(q1Plan.map((r: any) => r["QUERY PLAN"]).join("\n"));

  // Query 2: Weddings Dashboard with Nested Aggregate
  const q2Plan = await sql`
    EXPLAIN ANALYZE
    SELECT 
      w.id, w.code, w.title, w.city, w.venue, w.start_date, w.budget_paise,
      COALESCE((
        SELECT json_agg(json_build_object('employee_id', wa.employee_id, 'role', wa.role_on_wedding))
        FROM public.wedding_assignments wa
        WHERE wa.wedding_id = w.id
      ), '[]') as assignments
    FROM public.weddings w
    ORDER BY w.start_date ASC
  `;
  console.log("\n--- EXPLAIN ANALYZE: Weddings Operational Portfolio (25 Weddings) ---");
  console.log(q2Plan.map((r: any) => r["QUERY PLAN"]).join("\n"));

  // Query 3: Tasks Fetch for Live Ops Wedding
  const q3Plan = await sql`
    EXPLAIN ANALYZE
    SELECT t.id, t.title, t.phase, t.stage, t.priority, t.due_date
    FROM public.tasks t
    WHERE t.wedding_id = (SELECT id FROM public.weddings LIMIT 1)
    ORDER BY t.created_at ASC
  `;
  console.log("\n--- EXPLAIN ANALYZE: Tasks Staging Plan (32 Tasks) ---");
  console.log(q3Plan.map((r: any) => r["QUERY PLAN"]).join("\n"));
}

async function runBenchmark() {
  console.log(`\n⚡ Running Vivona Benchmark against ${BASE_URL} (${ITERATIONS} requests/endpoint)...`);
  const sql = postgres(DATABASE_URL);

  const { cookie, adminId } = await createAdminSessionToken(sql);

  const endpoints = [
    { name: "Public Home (/)", path: "/" },
    { name: "Public Packages (/packages)", path: "/packages" },
    { name: "Social Proof Citations (/social-proof)", path: "/social-proof" },
    { name: "Booking Wizard (/book)", path: "/book" },
    { name: "Login Screen (/login)", path: "/login" },
    { name: "Admin Enquiries (All 320 Leads)", path: "/admin/enquiries", cookie },
    { name: "Admin Enquiries (Filter: Stale >48h)", path: "/admin/enquiries?status=stale", cookie },
    { name: "Admin Weddings Command (25 Weddings)", path: "/admin/weddings", cookie },
  ];

  const results: BenchResult[] = [];

  for (const ep of endpoints) {
    try {
      const res = await benchEndpoint(ep.name, ep.path, ep.cookie);
      results.push(res);
      console.log(
        `✓ ${ep.name.padEnd(42)} | p50: ${String(res.p50Ms).padStart(5)}ms | p95: ${String(res.p95Ms).padStart(5)}ms | min: ${String(res.minMs).padStart(4)}ms | status: ${res.statusCode}`
      );
    } catch (err) {
      console.error(`✗ ${ep.name}: ${(err as Error).message}`);
    }
  }

  console.log("\n📊 Benchmark Summary Table (Local PostgreSQL 16 + Next.js Production Build):");
  console.table(
    results.map((r) => ({
      Endpoint: r.endpoint,
      Status: r.statusCode,
      "p50 (ms)": r.p50Ms,
      "p95 (ms)": r.p95Ms,
      "Avg (ms)": r.avgMs,
      "Min (ms)": r.minMs,
      "Max (ms)": r.maxMs,
    }))
  );

  await runExplainAnalyze(sql, adminId);
  await sql.end();
}

runBenchmark().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
