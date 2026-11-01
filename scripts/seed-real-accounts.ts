import postgres from "postgres";
import * as dotenv from "dotenv";
import * as path from "node:path";
import { hash } from "@node-rs/argon2";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function seedRealAccounts() {
  const serviceUrl =
    process.env.DATABASE_SERVICE_URL ||
    "postgres://vivona_service:ChangeMe_Service%232026@127.0.0.1:5432/vivona";

  const sql = postgres(serviceUrl, { max: 1 });

  try {
    console.log("Seeding real production accounts...");
    const defaultPassword = process.env.DEMO_PASSWORD || "ChangeMe-Demo#2026";
    const passwordHash = await hash(defaultPassword, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    const realAccounts = [
      {
        email: "devraj@vivona.in",
        fullName: "Devraj Rathore",
        role: "admin",
      },
      {
        email: "admin@vivona.in",
        fullName: "Vivona Executive Admin",
        role: "admin",
      },
      {
        email: "ananya@vivona.in",
        fullName: "Ananya Sharma",
        role: "employee",
      },
      {
        email: "vikram@vivona.in",
        fullName: "Vikramaditya Singh",
        role: "employee",
      },
      {
        email: "meera@vivona.in",
        fullName: "Meera Shekhawat",
        role: "employee",
      },
      {
        email: "prithitha24it@psnacet.edu.in",
        fullName: "Prithith",
        role: "client",
      },
      {
        email: "rohan.priyamvada@gmail.com",
        fullName: "Rohan & Priyamvada Kapoor",
        role: "client",
      },
    ];

    for (const acc of realAccounts) {
      const [profile] = await sql`
        INSERT INTO public.profiles (email, full_name, role, is_active)
        VALUES (${acc.email}, ${acc.fullName}, ${acc.role}, true)
        ON CONFLICT (email) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          is_active = true
        RETURNING id, email, role, full_name
      `;

      await sql`
        INSERT INTO private.auth_credentials (profile_id, password_hash)
        VALUES (${profile.id}, ${passwordHash})
        ON CONFLICT (profile_id) DO UPDATE SET
          password_hash = EXCLUDED.password_hash
      `;

      console.log(`✓ Real Account: ${profile.full_name} (${profile.email}) -> Role: ${profile.role}`);
    }

    console.log("\nAll real-world production accounts seeded successfully!");
  } catch (err) {
    console.error("Error seeding real accounts:", err);
  } finally {
    await sql.end();
  }
}

seedRealAccounts();
