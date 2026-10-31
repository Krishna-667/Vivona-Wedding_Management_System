import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET || "dev-cron-secret-key-2026";

async function main() {
  console.log(`[Vivona Cron] Triggering reminders at ${SITE_URL}/api/cron/reminders ...`);

  try {
    const res = await fetch(`${SITE_URL}/api/cron/reminders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    console.log("[Vivona Cron Response Status]:", res.status);
    console.log("[Vivona Cron Result]:", JSON.stringify(data, null, 2));

    if (!res.ok || !data.ok) {
      console.error("[Vivona Cron Error]: Cron execution failed.");
      process.exit(1);
    }

    console.log("[Vivona Cron Success]: Reminders executed successfully.");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Vivona Cron Network Error]:", message);
    console.log("Tip: Make sure the local web server is running (`pnpm dev` or `pnpm start`).");
    process.exit(1);
  }
}

main();
