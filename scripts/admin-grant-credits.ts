/**
 * Admin credit top-up (e.g. the owner account on launch day).
 *
 *   npx tsx --env-file=.env scripts/admin-grant-credits.ts --user=davdags --credits=100000 [--reason="launch top-up"]
 *   In production:  docker compose -f docker-compose.prod.yml --env-file .env.production exec worker \
 *                     npx tsx scripts/admin-grant-credits.ts --user=davdags --credits=100000
 */
import { prisma } from '@/lib/prisma'
import { addBalance, getBalance } from '@/lib/billing/ledger'

function arg(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length)
}

async function main() {
  const login = arg('user')
  const credits = Number(arg('credits'))
  if (!login || !Number.isFinite(credits) || credits <= 0) {
    throw new Error('Usage: --user=<username or email> --credits=<positive number>')
  }
  const user = await prisma.user.findFirst({
    where: login.includes('@') ? { email: login.toLowerCase() } : { name: login },
    select: { id: true, name: true },
  })
  if (!user) throw new Error(`User not found: ${login}`)

  const ok = await addBalance(user.id, credits, { type: 'adjust', reason: arg('reason') || 'admin top-up', operatorId: 'admin-script' })
  if (!ok) throw new Error('Top-up failed (see logs)')
  const balance = await getBalance(user.id)
  process.stdout.write(`${JSON.stringify({ user: user.name, added: credits, balance: balance.balance })}\n`)
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
