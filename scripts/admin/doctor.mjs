import dns from 'node:dns'
import postgres from 'postgres'
import { createClient } from '@supabase/supabase-js'
import { loadAdminEnv } from './load-env.mjs'

dns.setDefaultResultOrder('ipv4first')

async function main() {
  const env = loadAdminEnv()
  const missing = []
  if (!env.supabaseUrl) missing.push('SUPABASE_URL')
  if (!env.supabaseSecretKey) missing.push('SUPABASE_SECRET_KEY')
  if (!env.supabaseDbUrl) missing.push('SUPABASE_DB_URL')

  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }

  const sql = postgres(env.supabaseDbUrl, {
    prepare: false,
    max: 1,
  })

  try {
    const [dbStatus] = await sql.unsafe(
      'select current_database() as database_name, current_user as current_user, now() as now;',
    )

    const supabase = createClient(env.supabaseUrl, env.supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
    if (error) throw error

    console.log('Supabase admin toolkit is ready.')
    console.log(`Database: ${dbStatus.database_name}`)
    console.log(`DB user:   ${dbStatus.current_user}`)
    console.log(`Now:       ${dbStatus.now}`)
    console.log(`Auth API:  ok (${data.users.length} user sample fetched)`)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
