import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";

test("R5 Leak Test: Plaintext sentinel password must NEVER appear in Network, Storage, Console or Bundles", async ({
  page,
}) => {
  const sentinelPassword = `Sentinel#${randomBytes(8).toString("hex")}!2026`;
  const recordedRequests: Array<{ url: string; method: string; postData?: string; headers: Record<string, string> }> = [];
  const recordedResponses: Array<{ url: string; body?: string }> = [];
  const consoleMessages: string[] = [];

  page.on("console", (msg) => {
    consoleMessages.push(msg.text());
  });

  page.on("request", (req) => {
    recordedRequests.push({
      url: req.url(),
      method: req.method(),
      postData: req.postData() || undefined,
      headers: req.headers(),
    });
  });

  page.on("response", async (res) => {
    try {
      const text = await res.text();
      recordedResponses.push({ url: res.url(), body: text });
    } catch {
      // Stream/binary responses ignored
    }
  });

  // 1. Visit Login Page
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });

  // 2. Fill login with sentinel credentials
  await page.fill('input[type="email"]', "admin@vivona.demo");
  await page.fill('input[type="password"]', sentinelPassword);

  // 3. Submit sealed login form
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // 4. Assert Sentinel Password appears in ZERO network request bodies or URLs
  for (const req of recordedRequests) {
    expect(req.url).not.toContain(sentinelPassword);
    if (req.postData) {
      // Must not contain plaintext sentinel password
      expect(req.postData).not.toContain(sentinelPassword);
    }
    for (const [headerName, headerVal] of Object.entries(req.headers)) {
      expect(headerVal).not.toContain(sentinelPassword);
    }
  }

  // 5. Assert Sentinel Password appears in ZERO network responses
  for (const res of recordedResponses) {
    if (res.body) {
      expect(res.body).not.toContain(sentinelPassword);
    }
  }

  // 6. Assert Sentinel Password appears in ZERO console logs
  for (const log of consoleMessages) {
    expect(log).not.toContain(sentinelPassword);
  }

  // 7. Assert Sentinel Password is NOT in localStorage, sessionStorage, or Cookies
  const localStorageDump = await page.evaluate(() => JSON.stringify(window.localStorage));
  expect(localStorageDump).not.toContain(sentinelPassword);

  const sessionStorageDump = await page.evaluate(() => JSON.stringify(window.sessionStorage));
  expect(sessionStorageDump).not.toContain(sentinelPassword);

  const cookies = await page.context().cookies();
  for (const c of cookies) {
    expect(c.value).not.toContain(sentinelPassword);
  }

  console.log("🔒 Playwright Sentinel Leak Test PASSED: Sentinel password appeared in 0 locations across all layers!");
});
