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

  test("Continue with Google initiates real OAuth flow without fake bypass", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    const googleBtn = page.locator("button:has-text('Continue with Google')");
    await expect(googleBtn).toBeVisible();
    await googleBtn.click();

    // Verify it initiates OAuth route (/api/auth/google) and gracefully handles server OAuth config
    await page.waitForURL("**/login?error=**", { timeout: 10000 });
    const errorMsg = page.locator("text=Google Sign-In is not configured");
    await expect(errorMsg).toBeVisible();

    // Verify no fake modal or unverified prompt exists
    const modalInput = page.locator('input[placeholder*="@gmail.com"]');
    await expect(modalInput).toHaveCount(0);
  });
});
