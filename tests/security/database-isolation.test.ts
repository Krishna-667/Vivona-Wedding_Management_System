import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import * as dotenv from "dotenv";

let appSql: postgres.Sql;
let serviceSql: postgres.Sql;

beforeAll(() => {
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });

  const appUrl =
    process.env.DATABASE_URL ||
    "postgres://vivona_app:ChangeMe_App#2026@127.0.0.1:5432/vivona";
  const serviceUrl =
    process.env.DATABASE_SERVICE_URL ||
    "postgres://vivona_service:ChangeMe_Service#2026@127.0.0.1:5432/vivona";

  appSql = postgres(appUrl);
  serviceSql = postgres(serviceUrl);
});

afterAll(async () => {
  await appSql.end();
  await serviceSql.end();
});

describe("Security Layer 1 & Hardening: Least-Privilege Database Role Isolation", () => {
  it("vivona_app MUST NOT have access to schema private (permission denied)", async () => {
    let errorCaught = false;
    try {
      await appSql`SELECT * FROM private.auth_credentials LIMIT 1`;
    } catch (err: any) {
      errorCaught = true;
      expect(err.message).toMatch(/permission denied for schema private/i);
    }
    expect(errorCaught).toBe(true);
  });

  it("vivona_app MUST NOT have access to private.sessions (permission denied)", async () => {
    let errorCaught = false;
    try {
      await appSql`SELECT * FROM private.sessions LIMIT 1`;
    } catch (err: any) {
      errorCaught = true;
      expect(err.message).toMatch(/permission denied for schema private/i);
    }
    expect(errorCaught).toBe(true);
  });

  it("public.profiles MUST NOT expose any credential or password hash column", async () => {
    const columns = await serviceSql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles'
    `;
    const colNames = columns.map((c) => c.column_name);

    expect(colNames).not.toContain("password");
    expect(colNames).not.toContain("password_hash");
    expect(colNames).not.toContain("hash");
    expect(colNames).not.toContain("encrypted_password");
  });

  it("sensitive fields in public.vendors must hold v1: ciphertext at rest", async () => {
    const rows = await serviceSql`
      SELECT phone, email FROM public.vendors WHERE phone IS NOT NULL LIMIT 5
    `;
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.phone).toMatch(/^v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+/);
      expect(r.email).toMatch(/^v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+/);
    }
  });
});
