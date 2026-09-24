#!/usr/bin/env node
// Creates deploy/.env.production from the example with strong random secrets.
// Usage: node deploy/create-env.mjs nucleusart.studio
import { randomBytes } from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const target = join(here, '.env.production')
const domain = (process.argv[2] || '').replace(/^https?:\/\//, '').replace(/\/+$/, '')

if (!domain) {
  console.error('Usage: node deploy/create-env.mjs nucleusart.studio')
  process.exit(1)
}
if (existsSync(target)) {
  console.error(`${target} already exists — not overwriting (it holds your live secrets).`)
  process.exit(1)
}

const secret = (bytes = 32) => randomBytes(bytes).toString('base64url')
const values = {
  DOMAIN: domain,
  MYSQL_ROOT_PASSWORD: secret(24),
  REDIS_PASSWORD: secret(24),
  NEXTAUTH_SECRET: secret(48),
  CRON_SECRET: secret(32),
  INTERNAL_TASK_TOKEN: secret(32),
  API_ENCRYPTION_KEY: secret(32),
  BULL_BOARD_PASSWORD: secret(18),
}

let text = readFileSync(join(here, '.env.production.example'), 'utf8')
for (const [key, value] of Object.entries(values)) {
  text = text.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${value}`)
}
text = text.replace('hello@nucleusart.studio', `hello@${domain}`)
writeFileSync(target, text, { mode: 0o600 })
console.log(`Created ${target} with fresh secrets for ${domain}.`)
console.log('Now fill in: EVOLINK_API_KEYS, ALERT_EMAIL, RESEND_API_KEY, EMAIL_FROM (and Google keys if ready).')
