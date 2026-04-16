import fs from 'node:fs'
import dns from 'node:dns'
import path from 'node:path'
import postgres from 'postgres'
import { loadAdminEnv } from './load-env.mjs'

dns.setDefaultResultOrder('ipv4first')

function parseArgs(argv) {
  const args = { file: null, sql: null }
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--file') {
      args.file = argv[index + 1] ?? null
      index += 1
    } else if (token === '--sql') {
      args.sql = argv[index + 1] ?? null
      index += 1
    }
  }
  return args
}

async function main() {
  const env = loadAdminEnv()
  if (!env.supabaseDbUrl) {
    throw new Error('Missing SUPABASE_DB_URL in .env.supabase-admin')
  }

  const args = parseArgs(process.argv.slice(2))
  if (!args.file && !args.sql) {
    throw new Error('Usage: npm run db:query -- --file ./query.sql OR --sql "select now();"')
  }

  const queryText = args.file
    ? fs.readFileSync(path.resolve(env.projectRoot, args.file), 'utf8')
    : args.sql

  if (!queryText?.trim()) {
    throw new Error('Query is empty.')
  }

  const sql = postgres(env.supabaseDbUrl, {
    prepare: false,
    max: 1,
  })

  try {
    const result = await sql.unsafe(queryText)
    if (Array.isArray(result)) {
      console.table(result)
      console.log(`${result.length} row(s) returned.`)
    } else {
      console.log('Query executed.')
      console.dir(result, { depth: 4 })
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
