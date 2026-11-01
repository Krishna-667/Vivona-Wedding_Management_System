import { test, expect } from "@playwright/test";

test.describe("Auth Debug & Verification", () => {
  test("Invalid email and password shows error and does NOT authenticate", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "fakeuser999@notexist.com");
    await page.fill('input[type="password"]', "wrongpassword123");
    await page.click('button[type="submit"]');

    // Wait a couple seconds to observe behavior
    await page.waitForTimeout(2000);

    // Verify error message is visible
    const errorBox = page.locator("text=Invalid email or password");
    await expect(errorBox.first()).toBeVisible();

    // Verify we are STILL on /login, NOT redirected
    expect(page.url()).toContain("/login");
  });

  test("Invalid password for real user shows error and does NOT authenticate", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "admin@vivona.demo");
    await page.fill('input[type="password"]', "IncorrectPassword#123");
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    const errorBox = page.locator("text=Invalid email or password");
    await expect(errorBox.first()).toBeVisible();
    expect(page.url()).toContain("/login");
  });

  test("Google auth redirect inspection", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    const googleBtn = page.locator("button:has-text('Continue with Google')");
    await expect(googleBtn).toBeVisible();
    
    // Track redirects
    const responses: string[] = [];
    page.on("response", (res) => {
      responses.push(`${res.status()} ${res.url()}`);
    });

    await googleBtn.click();
    await page.waitForTimeout(3000);

    console.log("Current URL after Google click:", page.url());
    console.log("Responses:", responses.slice(-10));
  });
});
