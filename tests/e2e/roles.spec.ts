import { test, expect } from "@playwright/test";

test.describe("Vivona 3-Role Journey & Navigation Verification", () => {
  const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "ChangeMe-Demo#2026";

  test("1. Public site exploration and booking wizard", async ({ page }) => {
    // Public Home
    await page.goto("http://localhost:3000/");
    await expect(page).toHaveTitle(/Vivona/);
    await expect(page.locator("text=Vivona").first()).toBeVisible();

    // Packages
    await page.goto("http://localhost:3000/packages");
    await expect(page.locator("h1")).toBeVisible();

    // Social Proof
    await page.goto("http://localhost:3000/social-proof");
    await expect(page.locator("h1")).toBeVisible();

    // Booking Wizard
    await page.goto("http://localhost:3000/book");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("2. Admin login, CRM volume pipeline, and weddings portfolio", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "admin@vivona.demo");
    await page.fill('input[type="password"]', DEMO_PASSWORD);
    await page.click('button[type="submit"]');

    // Should land on /admin
    await page.waitForURL("**/admin", { timeout: 15000 });
    await expect(page.locator("h1")).toContainText(/Dashboard|Operations|Agency/i);

    // CRM Enquiries (Volume View)
    await page.goto("http://localhost:3000/admin/enquiries");
    await expect(page.locator("h1")).toContainText(/Enquiries/i);
    // Should show volume counts (e.g. 320)
    await expect(page.locator("text=All (").first()).toBeVisible();

    // Weddings Command (25 weddings)
    await page.goto("http://localhost:3000/admin/weddings");
    await expect(page.locator("h1")).toContainText(/Weddings/i);
    await expect(page.locator("text=All Weddings").first()).toBeVisible();

    // Finance Command
    await page.goto("http://localhost:3000/admin/finance");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("3. Employee login and operations desk", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "planner1@vivona.demo");
    await page.fill('input[type="password"]', DEMO_PASSWORD);
    await page.click('button[type="submit"]');

    // Should land on /employee
    await page.waitForURL("**/employee", { timeout: 10000 });
    await expect(page.locator("h1")).toContainText(/Planner|Operations|Workspace/i);

    // Task Boards overview
    await page.goto("http://localhost:3000/employee/tasks");
    await expect(page.locator("h1")).toContainText(/Task/i);

    // Live Operations overview
    await page.goto("http://localhost:3000/employee/live");
    await expect(page.locator("h1")).toContainText(/Operations|Celebration|Live/i);

    // Timesheets overview
    await page.goto("http://localhost:3000/employee/timesheets");
    await expect(page.locator("h1")).toContainText(/Timesheets/i);
  });

  test("4. Client couple login and portal", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "couple1@vivona.demo");
    await page.fill('input[type="password"]', DEMO_PASSWORD);
    await page.click('button[type="submit"]');

    // Should land on /client
    await page.waitForURL("**/client", { timeout: 10000 });
    await expect(page.locator("main")).toBeVisible();

    // Agreement page
    await page.goto("http://localhost:3000/client/agreement");
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Proposal page
    await page.goto("http://localhost:3000/client/proposal");
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Messages page
    await page.goto("http://localhost:3000/client/messages");
    await expect(page.locator("main")).toBeVisible();
  });

  test("5. RBAC Protection: Unauthenticated user cannot access protected routes", async ({ page }) => {
    await page.goto("http://localhost:3000/admin");
    // Middleware should redirect unauthenticated request to /login
    await page.waitForURL("**/login**", { timeout: 10000 });
    expect(page.url()).toContain("redirectTo");
  });

  test("6. Admin signs in with Google and lands on Admin Executive Desk", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    const googleBtn = page.locator("button:has-text('Continue with Google')");
    await expect(googleBtn).toBeVisible();
    await googleBtn.click();

    // Verifies navigation to Google Account Chooser
    await page.waitForURL("**/auth/google/consent**", { timeout: 10000 });
    await expect(page.locator("text=Choose an account")).toBeVisible();

    // Select Admin account
    const adminCard = page.locator("button:has-text('Devraj Rathore')");
    await expect(adminCard).toBeVisible();
    await adminCard.click();

    // Enter verified password
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill("ChangeMe-Demo#2026");
    await page.click("button:has-text('Sign In with Google')");

    // Routes directly to /admin based on admin role
    await page.waitForURL("**/admin**", { timeout: 10000 });
    await expect(page.locator("main")).toBeVisible();
  });

  test("7. Employee signs in with Google and lands on Operations Desk", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    const googleBtn = page.locator("button:has-text('Continue with Google')");
    await expect(googleBtn).toBeVisible();
    await googleBtn.click();

    await page.waitForURL("**/auth/google/consent**", { timeout: 10000 });
    await expect(page.locator("text=Choose an account")).toBeVisible();

    // Select Employee account
    const employeeCard = page.locator("button:has-text('Ananya Sharma')");
    await expect(employeeCard).toBeVisible();
    await employeeCard.click();

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill("ChangeMe-Demo#2026");
    await page.click("button:has-text('Sign In with Google')");

    // Routes directly to /employee based on employee role
    await page.waitForURL("**/employee**", { timeout: 10000 });
    await expect(page.locator("main")).toBeVisible();
  });

  test("8. Client signs in with Google and lands on Client Wedding Portal", async ({ page }) => {
    await page.goto("http://localhost:3000/register");
    const googleBtn = page.locator("button:has-text('Continue with Google')");
    await expect(googleBtn).toBeVisible();
    await googleBtn.click();

    await page.waitForURL("**/auth/google/consent**", { timeout: 10000 });
    await expect(page.locator("text=Choose an account")).toBeVisible();

    // Select Client account
    const prithithCard = page.locator("button:has-text('Prithith')");
    await expect(prithithCard).toBeVisible();
    await prithithCard.click();

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill("ChangeMe-Demo#2026");
    await page.click("button:has-text('Sign In with Google')");

    // Routes directly to /client
    await page.waitForURL("**/client**", { timeout: 10000 });
    await expect(page.locator("main")).toBeVisible();
  });
});
