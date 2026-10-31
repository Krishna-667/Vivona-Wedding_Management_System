import "server-only";
import type postgres from "postgres";
import { appSql, authSql, serviceSql } from "./index";

export type SqlClient = postgres.Sql | postgres.TransactionSql;

/**
 * Executes a callback with a transaction-local app.user_id setting.
 * Connection-pool safe: resets when transaction completes.
 * Enforces PostgreSQL Row-Level Security based on the active user.
 */
export async function withUser<T>(
  userId: string,
  fn: (sql: postgres.TransactionSql) => Promise<T>
): Promise<T> {
  return appSql.begin(async (sql) => {
    await sql`SELECT set_config('app.user_id', ${userId}, true)`;
    return fn(sql);
  });
}

/**
 * Executes a callback for unauthenticated public reads (e.g. packages, social proof)
 */
export async function withAnon<T>(
  fn: (sql: postgres.TransactionSql) => Promise<T>
): Promise<T> {
  return appSql.begin(async (sql) => {
    await sql`SELECT set_config('app.user_id', '', true)`;
    return fn(sql);
  });
}

/**
 * Executes a callback using the vivona_service role (BYPASSRLS).
 * Strictly server-only. Used for seed scripts, background jobs, invites.
 */
export async function withService<T>(
  fn: (sql: SqlClient) => Promise<T>
): Promise<T> {
  return fn(serviceSql);
}

/**
 * Executes a callback using the vivona_auth role.
 * Has access to private schema (auth_credentials, sessions, login_attempts).
 */
export async function withAuth<T>(
  fn: (sql: SqlClient) => Promise<T>
): Promise<T> {
  return fn(authSql);
}
