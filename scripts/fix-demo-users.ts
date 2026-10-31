import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "ChangeMe-Demo#2026";

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_ACCOUNTS = [
  { email: "admin@vivona.demo", role: "admin", name: "Devraj Rathore" },
  { email: "planner1@vivona.demo", role: "employee", name: "Ananya Sharma" },
  { email: "planner2@vivona.demo", role: "employee", name: "Vikramaditya Singh" },
  { email: "planner3@vivona.demo", role: "employee", name: "Meera Shekhawat" },
  { email: "couple1@vivona.demo", role: "client", name: "Rohan & Priyamvada" },
  { email: "couple2@vivona.demo", role: "client", name: "Kabir & Alankrita" },
  { email: "couple3@vivona.demo", role: "client", name: "Siddharth & Radhika" },
];

async function main() {
  console.log("🔑 Synchronizing and resetting demo credentials to:", DEMO_PASSWORD);

  const { data: userListData, error: listErr } = await adminSupabase.auth.admin.listUsers();
  if (listErr) {
    console.error("Failed to list users:", listErr);
    process.exit(1);
  }

  const existingUsers = userListData?.users || [];

  for (const acc of DEMO_ACCOUNTS) {
    const existing = existingUsers.find((u) => u.email === acc.email);

    if (existing) {
      console.log(`Resetting password for existing user: ${acc.email} (${existing.id})`);
      const { error: updateErr } = await adminSupabase.auth.admin.updateUserById(existing.id, {
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: acc.name,
          role: acc.role,
        },
      });

      if (updateErr) {
        console.error(`Failed to update password for ${acc.email}:`, updateErr.message);
      } else {
        console.log(`✓ Password updated for ${acc.email}`);
      }
    } else {
      console.log(`Creating new user: ${acc.email}`);
      const { data: created, error: createErr } = await adminSupabase.auth.admin.createUser({
        email: acc.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: acc.name,
          role: acc.role,
        },
      });

      if (createErr) {
        console.error(`Failed to create ${acc.email}:`, createErr.message);
      } else {
        console.log(`✓ Created ${acc.email}`);
      }
    }
  }

  // Verify login directly using public anon client for each demo account
  console.log("\n🧪 Testing client authentication for all demo accounts:");
  const anonClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

  for (const acc of DEMO_ACCOUNTS) {
    const { data: authData, error: authErr } = await anonClient.auth.signInWithPassword({
      email: acc.email,
      password: DEMO_PASSWORD,
    });

    if (authErr || !authData.user) {
      console.error(`❌ Authentication FAILED for ${acc.email}:`, authErr?.message);
    } else {
      console.log(`✅ Authentication SUCCEEDED for ${acc.email} (UID: ${authData.user.id})`);
    }
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
