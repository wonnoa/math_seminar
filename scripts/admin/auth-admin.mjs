import { createClient } from '@supabase/supabase-js'
import { loadAdminEnv } from './load-env.mjs'

function parseArgs(argv) {
  const [command, ...rest] = argv
  const flags = {}
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (token.startsWith('--')) {
      const key = token.slice(2)
      const next = rest[index + 1]
      if (!next || next.startsWith('--')) {
        flags[key] = true
      } else {
        flags[key] = next
        index += 1
      }
    }
  }
  return { command, flags }
}

async function main() {
  const env = loadAdminEnv()
  if (!env.supabaseUrl || !env.supabaseSecretKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.supabase-admin')
  }

  const { command, flags } = parseArgs(process.argv.slice(2))
  const supabase = createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  if (command === 'list-users') {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (error) throw error
    console.table(
      data.users.map((user) => ({
        id: user.id,
        email: user.email,
        confirmed: Boolean(user.email_confirmed_at),
        created_at: user.created_at,
      })),
    )
    return
  }

  if (command === 'create-user') {
    if (!flags.email || !flags.password) {
      throw new Error('Usage: npm run auth:admin -- create-user --email name@example.com --password secret --confirm')
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email: String(flags.email).toLowerCase(),
      password: String(flags.password),
      email_confirm: Boolean(flags.confirm),
    })
    if (error) throw error
    console.log(`Created user ${data.user.email} (${data.user.id})`)
    return
  }

  throw new Error('Supported commands: list-users, create-user')
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
