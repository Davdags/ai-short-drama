/**
 * Monthly affiliate payouts (manual).
 *
 *   List who is due:   npx tsx --env-file=.env scripts/affiliate-payouts.ts
 *   Record a payment:  npx tsx --env-file=.env scripts/affiliate-payouts.ts --pay=<affiliateId> --reference="PayPal txn 123"
 *
 * "Due" = pending commissions whose Net-60 date has passed, totalling at least the minimum payout.
 * Send the money yourself first (PayPal / bank / USDT), then record it here so the dashboard shows it as paid.
 */
import { prisma } from '@/lib/prisma'
import { toMoneyNumber } from '@/lib/billing/money'
import { AFFILIATE_PROGRAM } from '@/lib/affiliate/program'

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length)
}

async function listDue() {
  const now = new Date()
  const rows = await prisma.affiliateCommission.groupBy({
    by: ['affiliateId'],
    where: { status: 'pending', availableAt: { lte: now } },
    _sum: { amountUsd: true },
    _count: true,
  })
  const affiliates = await prisma.affiliate.findMany({ where: { id: { in: rows.map((row) => row.affiliateId) } } })
  const users = await prisma.user.findMany({
    where: { id: { in: affiliates.map((affiliate) => affiliate.userId) } },
    select: { id: true, name: true, email: true },
  })
  const report = rows.map((row) => {
    const affiliate = affiliates.find((a) => a.id === row.affiliateId)
    const user = users.find((u) => u.id === affiliate?.userId)
    const amountUsd = Math.round(toMoneyNumber(row._sum.amountUsd) * 100) / 100
    return {
      affiliateId: row.affiliateId,
      user: user?.email || user?.name,
      commissions: row._count,
      amountUsd,
      due: amountUsd >= AFFILIATE_PROGRAM.minimumPayoutUsd,
      payoutMethod: affiliate?.payoutMethod || 'NOT SET',
      payoutDetails: affiliate?.payoutDetails || '',
    }
  })
  process.stdout.write(`${JSON.stringify({ asOf: now.toISOString(), minimumPayoutUsd: AFFILIATE_PROGRAM.minimumPayoutUsd, report }, null, 2)}\n`)
}

async function recordPayout(affiliateId: string, reference: string | undefined) {
  const now = new Date()
  const payout = await prisma.$transaction(async (tx) => {
    const affiliate = await tx.affiliate.findUnique({ where: { id: affiliateId } })
    if (!affiliate) throw new Error(`Unknown affiliate ${affiliateId}`)
    const commissions = await tx.affiliateCommission.findMany({
      where: { affiliateId, status: 'pending', availableAt: { lte: now } },
      select: { id: true, amountUsd: true },
    })
    const amountUsd = Math.round(commissions.reduce((sum, c) => sum + toMoneyNumber(c.amountUsd), 0) * 100) / 100
    if (amountUsd < AFFILIATE_PROGRAM.minimumPayoutUsd) {
      throw new Error(`Only $${amountUsd} is due — below the $${AFFILIATE_PROGRAM.minimumPayoutUsd} minimum`)
    }
    const created = await tx.affiliatePayout.create({
      data: { affiliateId, amountUsd, method: affiliate.payoutMethod, reference: reference || null, paidAt: now },
    })
    await tx.affiliateCommission.updateMany({
      where: { id: { in: commissions.map((c) => c.id) } },
      data: { status: 'paid', payoutId: created.id },
    })
    return created
  })
  process.stdout.write(`${JSON.stringify({ recorded: { id: payout.id, affiliateId, amountUsd: toMoneyNumber(payout.amountUsd) } }, null, 2)}\n`)
}

async function main() {
  const affiliateId = readArg('pay')
  if (affiliateId) await recordPayout(affiliateId, readArg('reference'))
  else await listDue()
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
