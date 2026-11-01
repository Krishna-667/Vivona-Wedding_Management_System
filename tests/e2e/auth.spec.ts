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

  test("Google auth interactive dialog allows real custom email authentication", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    const googleBtn = page.locator("button:has-text('Continue with Google')");
    await expect(googleBtn).toBeVisible();
    await googleBtn.click();

    // Verify interactive modal opens
    const modalInput = page.locator('input[placeholder*="@gmail.com"]');
    await expect(modalInput).toBeVisible({ timeout: 5000 });

    // Fill with custom Google account
    await modalInput.fill("prithitha24it@psnacet.edu.in");
    const nameInput = page.locator('input[placeholder*="Priyamvada & Rohan"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill("Prithith (Google Client)");
    }

    // Submit
    await page.click("button:has-text('Continue to Client Portal')");

    // Successfully lands on /client portal
    await page.waitForURL("**/client**", { timeout: 10000 });
    await expect(page.locator("main")).toBeVisible();
  });
});
