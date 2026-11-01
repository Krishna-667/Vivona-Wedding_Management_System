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

  test("Continue with Google opens Google Account Chooser and authenticates client", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    const googleBtn = page.locator("button:has-text('Continue with Google')");
    await expect(googleBtn).toBeVisible();
    await googleBtn.click();

    // Verify it navigates to Google account chooser
    await page.waitForURL("**/auth/google/consent**", { timeout: 10000 });
    await expect(page.locator("text=Choose an account")).toBeVisible();

    // Select account
    const prithithCard = page.locator("button:has-text('Prithith')");
    await expect(prithithCard).toBeVisible();
    await prithithCard.click();

    // Successfully passes through OAuth callback and lands on /client
    await page.waitForURL("**/client**", { timeout: 10000 });
    await expect(page.locator("main")).toBeVisible();
  });
});
