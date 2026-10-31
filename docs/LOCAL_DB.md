# Vivona — Local PostgreSQL Setup Guide

> [!NOTE]
> This guide describes running native PostgreSQL locally on Windows, macOS, or Linux for Vivona with zero cloud dependencies.

## 1. Quick Native Start (Windows)
Vivona includes automated setup scripts in `scripts/`:

```bash
# 1. Start local PostgreSQL engine
pnpm db:start

# 2. Run initial database setup (creates roles, schemas, grants)
pnpm db:setup

# 3. Run all schema and RLS migrations
pnpm db:migrate

# 4. Seed reference data and demo accounts
pnpm db:seed
```

---

## 2. Platform Installation Instructions

### Windows (Native Standalone / Portable)
PostgreSQL 16 binaries are stored in `.local-db/pgsql/bin`:
- `initdb.exe` initializes the cluster at `.local-db/data`
- `pg_ctl.exe` starts and stops the database daemon without requiring Windows Admin or Service installation
- Ports run on `127.0.0.1:5432`

### macOS (Homebrew)
```bash
brew install postgresql@16
brew services start postgresql@16
```

### Linux (Ubuntu / Debian)
```bash
sudo apt-get update
sudo apt-get install -y postgresql-16 postgresql-contrib-16
sudo systemctl start postgresql
```

---

## 3. Database Roles & Privilege Model

| Role | Role Name | Allowed Operations |
|---|---|---|
| **Cluster Owner** | `vivona_owner` | Owns all tables, runs DDL & migrations. No access in application runtime. |
| **App Runtime** | `vivona_app` | DML on `public` schema only. `NOBYPASSRLS`. No access to `private.*`. |
| **Auth Service** | `vivona_auth` | Manages `private.auth_credentials`, `private.sessions`, reads `profiles`. |
| **Service Worker** | `vivona_service` | Background jobs, seeding, invites. `BYPASSRLS`. |

---

## 4. Connection Strings (`.env.local`)

```env
DATABASE_URL=postgres://vivona_app:ChangeMe_App#2026@localhost:5432/vivona?sslmode=disable
DATABASE_AUTH_URL=postgres://vivona_auth:ChangeMe_Auth#2026@localhost:5432/vivona?sslmode=disable
DATABASE_SERVICE_URL=postgres://vivona_service:ChangeMe_Service#2026@localhost:5432/vivona?sslmode=disable
DATABASE_OWNER_URL=postgres://vivona_owner:ChangeMe_Owner#2026@localhost:5432/vivona?sslmode=disable
```
