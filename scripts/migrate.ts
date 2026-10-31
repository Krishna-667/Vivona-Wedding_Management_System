import * as fs from "node:fs";
import * as path from "node:path";
import postgres from "postgres";

export async function runMigrations() {
  const connectionString =
    process.env.DATABASE_OWNER_URL ||
    "postgres://vivona_owner:ChangeMe_Owner#2026@127.0.0.1:5432/vivona";

  console.log("Connecting to database as vivona_owner for schema migrations...");
  const sql = postgres(connectionString, { max: 1 });

  try {
    // 1. Create schema_migrations tracking table
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Read migrations directory
    const migrationsDir = path.resolve(process.cwd(), "migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.log("No migrations directory found.");
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const appliedRows = await sql`SELECT version FROM public.schema_migrations`;
    const appliedVersions = new Set(appliedRows.map((r) => r.version));

    for (const file of files) {
      const version = file.split("_")[0];
      if (appliedVersions.has(version)) {
        continue;
      }

      console.log(`Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf-8");

      await sql.begin(async (tx) => {
        await tx.unsafe(sqlContent);
        await tx`INSERT INTO public.schema_migrations (version, name) VALUES (${version}, ${file})`;
      });

      console.log(`✓ Migration ${file} applied successfully.`);
    }

    console.log("All database migrations are up to date!");
  } finally {
    await sql.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
