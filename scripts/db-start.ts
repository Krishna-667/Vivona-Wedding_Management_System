import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

export function startLocalPostgres() {
  const rootDir = process.cwd();
  const pgDir = path.join(rootDir, ".local-db", "pgsql");
  const binDir = path.join(pgDir, "bin");
  const dataDir = path.join(rootDir, ".local-db", "data");
  const logFile = path.join(rootDir, ".local-db", "logfile.log");

  const initdbExe = path.join(binDir, "initdb.exe");
  const pgctlExe = path.join(binDir, "pg_ctl.exe");

  if (!fs.existsSync(initdbExe)) {
    console.error(`PostgreSQL binaries not found at ${binDir}.`);
    process.exit(1);
  }

  // 1. Initialize data cluster if not already present
  if (!fs.existsSync(path.join(dataDir, "PG_VERSION"))) {
    console.log(`Initializing new PostgreSQL database cluster at ${dataDir}...`);
    fs.mkdirSync(dataDir, { recursive: true });
    execSync(`"${initdbExe}" -D "${dataDir}" -U postgres -A trust -E UTF8`, {
      stdio: "inherit",
    });

    // Configure postgresql.conf
    const confPath = path.join(dataDir, "postgresql.conf");
    let conf = fs.readFileSync(confPath, "utf-8");
    conf += `\n
# Vivona Jury Requirements
listen_addresses = '127.0.0.1'
port = 5432
password_encryption = 'scram-sha-256'
log_statement = 'none'
log_parameter_max_length = 0
log_parameter_max_length_on_error = 0
`;
    fs.writeFileSync(confPath, conf, "utf-8");
    console.log("Database initialized successfully with secure settings.");
  }

  // 2. Check if already running or start cluster
  try {
    const status = execSync(`"${pgctlExe}" -D "${dataDir}" status`, {
      encoding: "utf-8",
    });
    if (status.includes("server is running")) {
      console.log("PostgreSQL server is already running on port 5432.");
      return;
    }
  } catch {
    // not running, proceed to start
  }

  console.log("Starting PostgreSQL server...");
  execSync(`"${pgctlExe}" -D "${dataDir}" -l "${logFile}" start`, {
    stdio: "inherit",
  });
  console.log("PostgreSQL server started successfully on 127.0.0.1:5432.");
}

if (require.main === module) {
  startLocalPostgres();
}
