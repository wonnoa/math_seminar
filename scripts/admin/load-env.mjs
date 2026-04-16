import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..', '..')
const envPath = path.join(projectRoot, '.env.supabase-admin')

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

export function loadAdminEnv() {
  if (!fs.existsSync(envPath)) {
    throw new Error(
      `Missing ${envPath}. Copy .env.supabase-admin.example to .env.supabase-admin and fill in the secrets.`,
    )
  }

  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const value = stripQuotes(trimmed.slice(eqIndex + 1).trim())
    if (key && !process.env[key]) {
      process.env[key] = value
    }
  }

  return {
    projectRoot,
    envPath,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
    supabaseDbUrl: process.env.SUPABASE_DB_URL,
  }
}
