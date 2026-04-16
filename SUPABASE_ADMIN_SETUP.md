# Supabase Admin Toolkit

This project now has a local admin toolkit so SQL and admin operations can be run from this machine instead of pasting every query into the Supabase dashboard.

## Why this structure

- Arbitrary SQL should use a direct Postgres connection.
- Auth and other elevated Supabase admin operations should use a secret or legacy `service_role` key.
- Both secrets must stay local and must not be committed.

This follows Supabase's documented model:
- direct Postgres clients use the connection string from the Connect panel
- secret or `service_role` keys are backend-only and must never be exposed in the browser

## One-time setup

1. Copy `.env.supabase-admin.example` to `.env.supabase-admin`.
2. Fill in:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `SUPABASE_DB_URL`

### `SUPABASE_SECRET_KEY`

Get this from:
- Project Settings
- API Keys

Use a backend-only key:
- preferred: `sb_secret_...`
- acceptable fallback: legacy `service_role`

### `SUPABASE_DB_URL`

Get this from:
- Project Connect panel
- copy the URI from the `Session pooler` section

For this toolkit, `Session pooler` is the safer default because this is a long-lived local machine workflow rather than a browser client.

3. Install dependencies:

```bash
cd /Users/wonnoa/Desktop/work/linear-algebra-toc-site
npm install
```

4. Verify connectivity:

```bash
npm run admin:doctor
```

## Commands

### Run arbitrary SQL from a file

```bash
npm run db:query -- --file ./supabase-setup.sql
```

### Run arbitrary inline SQL

```bash
npm run db:query -- --sql "select now(), current_user;"
```

### List auth users

```bash
npm run auth:admin -- list-users
```

### Create an auth user

```bash
npm run auth:admin -- create-user --email someone@example.com --password 'temporary-password' --confirm
```

## What this enables

After the env file is configured, Codex can directly:
- run SQL
- inspect tables
- create or update permission rows
- manage auth users

without asking you to manually open SQL Editor each time.

## What this does not expose publicly

- `.env.supabase-admin` is gitignored
- the browser app still uses the publishable key only
- backend-level secrets remain local to your machine
