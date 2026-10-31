import postgres from "postgres";

export async function setupDatabase() {
  console.log("Setting up local Vivona PostgreSQL database and least-privilege roles...");

  // 1. Connect as default superuser to 127.0.0.1:5432
  const adminSql = postgres("postgres://postgres@127.0.0.1:5432/postgres", {
    max: 1,
  });

  try {
    // Create database if not exists
    const [dbExists] = await adminSql`SELECT 1 FROM pg_database WHERE datname = 'vivona'`;
    if (!dbExists) {
      console.log("Creating database 'vivona'...");
      await adminSql.unsafe("CREATE DATABASE vivona;");
    }

    // Create 4 isolated roles
    const roles = [
      { name: "vivona_owner", pass: "ChangeMe_Owner#2026", attrs: "SUPERUSER CREATEDB" },
      { name: "vivona_app", pass: "ChangeMe_App#2026", attrs: "NOSUPERUSER NOBYPASSRLS" },
      { name: "vivona_auth", pass: "ChangeMe_Auth#2026", attrs: "NOSUPERUSER NOBYPASSRLS" },
      { name: "vivona_service", pass: "ChangeMe_Service#2026", attrs: "NOSUPERUSER BYPASSRLS" },
    ];

    for (const r of roles) {
      const [roleExists] = await adminSql`SELECT 1 FROM pg_roles WHERE rolname = ${r.name}`;
      if (!roleExists) {
        console.log(`Creating role '${r.name}'...`);
        await adminSql.unsafe(
          `CREATE ROLE ${r.name} WITH LOGIN ${r.attrs} PASSWORD '${r.pass}';`
        );
      } else {
        await adminSql.unsafe(
          `ALTER ROLE ${r.name} WITH LOGIN ${r.attrs} PASSWORD '${r.pass}';`
        );
      }
    }

    await adminSql.unsafe("ALTER DATABASE vivona OWNER TO vivona_owner;");
  } finally {
    await adminSql.end();
  }

  // 2. Connect to 'vivona' as vivona_owner to setup schemas and extensions
  const vivonaSql = postgres("postgres://vivona_owner:ChangeMe_Owner#2026@127.0.0.1:5432/vivona", {
    max: 1,
  });

  try {
    console.log("Configuring schemas and extensions in 'vivona'...");
    await vivonaSql.unsafe(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE SCHEMA IF NOT EXISTS public;
      CREATE SCHEMA IF NOT EXISTS private;

      ALTER SCHEMA public OWNER TO vivona_owner;
      ALTER SCHEMA private OWNER TO vivona_owner;

      -- Revoke all public access to private schema
      REVOKE ALL ON SCHEMA private FROM PUBLIC;
      REVOKE ALL ON SCHEMA private FROM vivona_app;

      -- Grant private schema access exclusively to vivona_auth & vivona_service
      GRANT USAGE, CREATE ON SCHEMA private TO vivona_auth;
      GRANT USAGE, CREATE ON SCHEMA private TO vivona_service;
      GRANT USAGE, CREATE ON SCHEMA private TO vivona_owner;

      -- Grant public schema usage
      GRANT USAGE ON SCHEMA public TO vivona_app;
      GRANT USAGE ON SCHEMA public TO vivona_auth;
      GRANT USAGE ON SCHEMA public TO vivona_service;
      GRANT USAGE ON SCHEMA public TO vivona_owner;
    `);

    console.log("Database roles, schemas, and extensions configured successfully!");
  } finally {
    await vivonaSql.end();
  }
}

if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Setup failed:", err);
      process.exit(1);
    });
}
