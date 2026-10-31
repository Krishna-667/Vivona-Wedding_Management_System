import { chromium } from "@playwright/test";

async function testAllLogins() {
  console.log("🌐 Testing all 3 role quick logins in browser...");
  const browser = await chromium.launch({ headless: true });

  const tests = [
    { buttonText: "Founder (Admin)", expectedPath: "/admin" },
    { buttonText: "Lead Planner", expectedPath: "/employee" },
    { buttonText: "Client Couple", expectedPath: "/client" },
  ];

  for (const { buttonText, expectedPath } of tests) {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
      console.log(`Clicking '${buttonText}' button...`);
      await page.click(`button:has-text('${buttonText}')`);

      await page.waitForURL(`**${expectedPath}`, { timeout: 10000 });
      console.log(`✓ ${buttonText.padEnd(20)} -> Logged in successfully! URL: ${page.url()}`);
    } catch (err) {
      console.error(`✗ Failed for ${buttonText}:`, (err as Error).message);
      console.error("Current URL:", page.url());
      process.exit(1);
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log("🎉 All 3 roles successfully logged in and verified in browser!");
}

testAllLogins().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
