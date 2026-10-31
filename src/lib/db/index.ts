import "server-only";
import postgres from "postgres";

declare global {
  var _appSqlPool: postgres.Sql | undefined;
  var _authSqlPool: postgres.Sql | undefined;
  var _serviceSqlPool: postgres.Sql | undefined;
}

const customTypes = {
  date: {
    to: 1082,
    from: [1082],
    serialize: (x: any) =>
      x == null ? null : x instanceof Date ? x.toISOString().slice(0, 10) : String(x),
    parse: (x: any) => (x ? String(x) : x),
  },
  timestamp: {
    to: 1114,
    from: [1114],
    serialize: (x: any) =>
      x == null ? null : x instanceof Date ? x.toISOString() : String(x),
    parse: (x: any) => (x ? String(x) : x),
  },
  timestamptz: {
    to: 1184,
    from: [1184],
    serialize: (x: any) =>
      x == null ? null : x instanceof Date ? x.toISOString() : String(x),
    parse: (x: any) => (x ? String(x) : x),
  },
};

function createClient(
  envUrl: string | undefined,
  defaultUser: string,
  defaultPass: string,
  maxConns: number
): postgres.Sql {
  if (envUrl) {
    try {
      const u = new URL(envUrl);
      return postgres({
        host: u.hostname || "127.0.0.1",
        port: Number(u.port) || 5432,
        user: decodeURIComponent(u.username) || defaultUser,
        password: decodeURIComponent(u.password) || defaultPass,
        database: u.pathname.replace(/^\//, "") || "vivona",
        max: maxConns,
        idle_timeout: 20,
        connect_timeout: 5,
        types: customTypes,
      });
    } catch {
      // Fallback below
    }
  }

  return postgres({
    host: "127.0.0.1",
    port: 5432,
    user: defaultUser,
    password: defaultPass,
    database: "vivona",
    max: maxConns,
    idle_timeout: 20,
    connect_timeout: 5,
    types: customTypes,
  });
}

// Singleton connection pools surviving Next.js HMR development reloads
export const appSql =
  globalThis._appSqlPool ??
  createClient(process.env.DATABASE_URL, "vivona_app", "ChangeMe_App#2026", 10);

export const authSql =
  globalThis._authSqlPool ??
  createClient(process.env.DATABASE_AUTH_URL, "vivona_auth", "ChangeMe_Auth#2026", 5);

export const serviceSql =
  globalThis._serviceSqlPool ??
  createClient(process.env.DATABASE_SERVICE_URL, "vivona_service", "ChangeMe_Service#2026", 5);

if (process.env.NODE_ENV !== "production") {
  globalThis._appSqlPool = appSql;
  globalThis._authSqlPool = authSql;
  globalThis._serviceSqlPool = serviceSql;
}
