import "server-only";
import postgres from "postgres";

declare global {
  var _appSqlPool: postgres.Sql | undefined;
  var _authSqlPool: postgres.Sql | undefined;
  var _serviceSqlPool: postgres.Sql | undefined;
}

const defaultAppUrl =
  process.env.DATABASE_URL ||
  "postgres://vivona_app:ChangeMe_App%232026@127.0.0.1:5432/vivona";

const defaultAuthUrl =
  process.env.DATABASE_AUTH_URL ||
  "postgres://vivona_auth:ChangeMe_Auth%232026@127.0.0.1:5432/vivona";

const defaultServiceUrl =
  process.env.DATABASE_SERVICE_URL ||
  "postgres://vivona_service:ChangeMe_Service%232026@127.0.0.1:5432/vivona";

// Singleton connection pools surviving Next.js HMR development reloads
export const appSql =
  globalThis._appSqlPool ??
  postgres(defaultAppUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 5,
  });

export const authSql =
  globalThis._authSqlPool ??
  postgres(defaultAuthUrl, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 5,
  });

export const serviceSql =
  globalThis._serviceSqlPool ??
  postgres(defaultServiceUrl, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis._appSqlPool = appSql;
  globalThis._authSqlPool = authSql;
  globalThis._serviceSqlPool = serviceSql;
}
