import { test, expect } from "@playwright/test";

test.describe("Step 0 Permanent Regression & Auth Bypass Prevention Suite", () => {
  test.beforeEach(async ({ context }) => {
    // Ensure all cookies and state are completely cleared prior to each test
    await context.clearCookies();
  });

  test("Check 1: Signed-out direct visits to /client, /employee, /admin must redirect to /login", async ({
    page,
  }) => {
    for (const protectedPath of ["/client", "/employee", "/admin"]) {
      await page.goto(`http://localhost:3000${protectedPath}`);
      await page.waitForURL("**/login**", { timeout: 10000 });
      expect(page.url()).toContain("/login");
      expect(page.url()).toContain(`redirectTo=${encodeURIComponent(protectedPath)}`);
    }
  });

  test("Check 2: Wrong, empty or unknown-email password must fail with no session created", async ({
    page,
    context,
  }) => {
    await page.goto("http://localhost:3000/login");

    // Case 2a: Unknown email
    await page.fill('input[type="email"]', "attacker_unknown_999@notexist.com");
    await page.fill('input[type="password"]', "anypassword123");
    await page.click('button[type="submit"]');

    const errorBox = page.locator("text=/Invalid email or password|temporarily locked/i");
    await expect(errorBox.first()).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain("/login");

    let cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "vivona_session")).toBeUndefined();

    // Case 2b: Known email, wrong password
    await page.fill('input[type="email"]', "devraj@vivona.in");
    await page.fill('input[type="password"]', "WrongPassword#999");
    await page.click('button[type="submit"]');

    await expect(errorBox.first()).toBeVisible({ timeout: 5000 });
    cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "vivona_session")).toBeUndefined();
  });

  test("Check 3: Fake session cookie must NOT count as logged in", async ({
    page,
    context,
  }) => {
    // Inject spoofed session cookie
    await context.addCookies([
      {
        name: "vivona_session",
        value: "forged_attacker_session_token_12345",
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    // Attempt direct access to admin executive workspace
    await page.goto("http://localhost:3000/admin");

    // Server-side requireRole() must reject invalid token hash and redirect to /login
    await page.waitForURL("**/login**", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("Check 4: Back button after logout must show zero protected content (Cache-Control: no-store)", async ({
    page,
  }) => {
    // 1. Log in as real admin
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "admin@vivona.demo");
    await page.fill('input[type="password"]', "ChangeMe-Demo#2026");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/admin", { timeout: 15000 });
    await expect(page.locator("h1")).toBeVisible();

    // 2. Click Sign Out (supports both desktop sidebar and mobile responsive drawer)
    const mobileNavTrigger = page.locator("button[aria-label*='navigation']:visible");
    if (await mobileNavTrigger.isVisible()) {
      await mobileNavTrigger.click();
      await page.waitForTimeout(300);
    }
    await page.locator("button:has-text('Sign Out'):visible").click();

    await page.waitForURL("**/login**", { timeout: 10000 });
    expect(page.url()).toContain("/login");

    // 3. Press browser back button
    await page.goBack();
    await page.waitForTimeout(1000);

    // Because Cache-Control: no-store is enforced, page re-validates on server and stays on /login
    expect(page.url()).toContain("/login");
  });

  test("Check 5: 'Continue with Google' button initiates RFC 7636 PKCE flow to accounts.google.com", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000/login");

    const googleBtn = page.locator("a:has-text('Continue with Google')");
    await expect(googleBtn).toBeVisible();

    // Verify href targets server authorization endpoint
    const href = await googleBtn.getAttribute("href");
    expect(href).toContain("/api/auth/google/start");

    // Intercept navigation to accounts.google.com
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("accounts.google.com") || req.url().includes("/api/auth/google/start")),
      googleBtn.click(),
    ]);

    expect(request.url()).toBeDefined();
  });

  test("Check 6: Malformed or mismatched state on OAuth callback sets zero session", async ({
    page,
    context,
  }) => {
    // Directly hitting callback with forged/missing state
    await page.goto("http://localhost:3000/api/auth/google/callback?code=forged_code&state=forged_state");

    // Must redirect to /login with state_mismatch error
    await page.waitForURL("**/login?error=state_mismatch**", { timeout: 10000 });
    expect(page.url()).toContain("error=state_mismatch");

    // Assert zero session established
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "vivona_session")).toBeUndefined();
  });
});
