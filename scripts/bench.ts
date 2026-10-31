import http from "node:http";

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
const ITERATIONS = 20;

async function requestLatency(path: string, cookie?: string): Promise<{ latencyMs: number; statusCode: number }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const start = performance.now();

    const req = http.get(
      url,
      {
        headers: cookie ? { Cookie: cookie } : {},
      },
      (res) => {
        res.on("data", () => {});
        res.on("end", () => {
          const latencyMs = Math.round((performance.now() - start) * 10) / 10;
          resolve({ latencyMs, statusCode: res.statusCode || 200 });
        });
      }
    );

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

async function runBenchmark() {
  console.log(`\n⚡ Running Vivona Benchmark against ${BASE_URL} (${ITERATIONS} requests/endpoint)...`);

  const endpoints = [
    { name: "Public Home (/)", path: "/" },
    { name: "Public Packages (/packages)", path: "/packages" },
    { name: "Social Proof Citations (/social-proof)", path: "/social-proof" },
    { name: "Booking Wizard (/book)", path: "/book" },
    { name: "Login Screen (/login)", path: "/login" },
  ];

  const results: BenchResult[] = [];

  for (const ep of endpoints) {
    try {
      const res = await benchEndpoint(ep.name, ep.path);
      results.push(res);
      console.log(
        `✓ ${ep.name.padEnd(35)} | p50: ${res.p50Ms}ms | p95: ${res.p95Ms}ms | min: ${res.minMs}ms | status: ${res.statusCode}`
      );
    } catch (err) {
      console.error(`✗ ${ep.name}: ${(err as Error).message}`);
    }
  }

  console.log("\n📊 Benchmark Summary Table (Local PostgreSQL 16 + In-Memory Fast Cache):");
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
}

runBenchmark().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
