import postgres from "postgres";
import { hash } from "@node-rs/argon2";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const DATABASE_URL =
  process.env.DATABASE_SERVICE_URL ||
  "postgres://vivona_service:ChangeMe_Service#2026@127.0.0.1:5432/vivona";

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "ChangeMe-Demo#2026";

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

  const sql = postgres(DATABASE_URL);
  const passwordHash = await hash(DEMO_PASSWORD, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  for (const acc of DEMO_ACCOUNTS) {
    const [profile] = await sql`
      SELECT id FROM public.profiles WHERE email = ${acc.email}
    `;

    if (profile) {
      await sql`
        INSERT INTO private.auth_credentials (profile_id, password_hash)
        VALUES (${profile.id}, ${passwordHash})
        ON CONFLICT (profile_id) DO UPDATE SET password_hash = ${passwordHash}, updated_at = NOW()
      `;
      console.log(`✓ Password updated for ${acc.email} (${profile.id})`);
    } else {
      console.log(`Creating profile & credentials for ${acc.email}`);
      const [newProf] = await sql`
        INSERT INTO public.profiles (email, role, full_name, is_active)
        VALUES (${acc.email}, ${acc.role}, ${acc.name}, true)
        RETURNING id
      `;
      await sql`
        INSERT INTO private.auth_credentials (profile_id, password_hash)
        VALUES (${newProf.id}, ${passwordHash})
        ON CONFLICT (profile_id) DO UPDATE SET password_hash = ${passwordHash}, updated_at = NOW()
      `;
      console.log(`✓ Created user & credentials for ${acc.email}`);
    }
  }

  await sql.end();
  console.log("✅ All demo credentials synchronized successfully.");
}

main().catch((err) => {
  console.error("Failed to fix demo users:", err);
  process.exit(1);
});
