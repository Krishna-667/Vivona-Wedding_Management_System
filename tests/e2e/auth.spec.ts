import { test, expect } from "@playwright/test";

test.describe("Auth Debug & Verification", () => {
  test("Invalid email and password shows error and does NOT authenticate", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "fakeuser999@notexist.com");
    await page.fill('input[type="password"]', "wrongpassword123");
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(2000);

    // Verify error message is visible
    const errorBox = page.locator("text=/Invalid email or password|temporarily locked/i");
    await expect(errorBox.first()).toBeVisible({ timeout: 5000 });

    // Verify we are STILL on /login, NOT redirected
    expect(page.url()).toContain("/login");
  });

  test("Invalid password for real user shows error and does NOT authenticate", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "planner1@vivona.demo");
    await page.fill('input[type="password"]', "IncorrectPassword#123");
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    const errorBox = page.locator("text=/Invalid email or password|temporarily locked/i");
    await expect(errorBox.first()).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain("/login");
  });

  test("Continue with Google verifies password and authenticates selected account", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    const googleBtn = page.locator("button:has-text('Continue with Google')");
    await expect(googleBtn).toBeVisible();
    await googleBtn.click();

    await page.waitForURL("**/auth/google/consent**", { timeout: 10000 });
    await expect(page.locator("text=Choose an account")).toBeVisible();

    // Select account
    const prithithCard = page.locator("button:has-text('Prithith')");
    await expect(prithithCard).toBeVisible();
    await prithithCard.click();

    // Verify password verification step is displayed
    await expect(page.locator("text=/Verification/i")).toBeVisible();
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Test password length validation (< 6 chars)
    await passwordInput.fill("123");
    await page.click("button:has-text('Sign In with Google')");
    await expect(page.locator("text=/Password must be at least 6 characters/i")).toBeVisible({ timeout: 5000 });

    // Enter actual valid password and authenticate
    await passwordInput.fill("PrithithRealPassword#2026");
    await page.click("button:has-text('Sign In with Google')");

    // Successfully passes through OAuth callback and lands on /client
    await page.waitForURL("**/client**", { timeout: 10000 });
    await expect(page.locator("main")).toBeVisible();
  });

  test("Continue with Google allows adding new Gmail account with actual password", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    const googleBtn = page.locator("button:has-text('Continue with Google')");
    await googleBtn.click();

    await page.waitForURL("**/auth/google/consent**", { timeout: 10000 });

    // Click "Use another Google account"
    const useAnotherBtn = page.locator("button:has-text('Use another Google account')");
    await expect(useAnotherBtn).toBeVisible();
    await useAnotherBtn.click();

    // Enter custom Gmail
    const timestamp = Date.now();
    const customGmail = `newclient.${timestamp}@gmail.com`;
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(customGmail);
    await page.click("button:has-text('Next')");

    // Enter full name and actual password
    const nameInput = page.locator('input[placeholder*="Alex Morgan"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill("New Vivona Client");

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill("RealGooglePass#2026");
    await page.click("button:has-text('Sign In with Google')");

    // Successfully provisions new client account and lands on /client
    await page.waitForURL("**/client**", { timeout: 10000 });
    await expect(page.locator("main")).toBeVisible();
  });
});
