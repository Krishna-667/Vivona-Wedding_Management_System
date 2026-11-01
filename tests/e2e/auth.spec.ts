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

  test("Continue with Google verifies password and rejects wrong password", async ({ page }) => {
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
    await expect(page.locator("text=Security Verification")).toBeVisible();
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Test rejection with wrong password
    await passwordInput.fill("WrongGooglePassword#999");
    await page.click("button:has-text('Sign In with Google')");
    await expect(page.locator("text=/Wrong password/i")).toBeVisible({ timeout: 5000 });

    // Enter correct password and successfully authenticate
    await passwordInput.fill("ChangeMe-Demo#2026");
    await page.click("button:has-text('Sign In with Google')");

    // Successfully passes through OAuth callback and lands on /client
    await page.waitForURL("**/client**", { timeout: 10000 });
    await expect(page.locator("main")).toBeVisible();
  });
});
