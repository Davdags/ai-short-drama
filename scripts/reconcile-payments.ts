/**
 * Settles payments that were paid but never confirmed — the customer closed the tab
 * before returning from checkout. Runs on a schedule so no one pays without getting
 * their plan, which is what webhooks would otherwise handle.
 *
 *   npx tsx --env-file=.env scripts/reconcile-payments.ts
 */
import { PrismaClient } from '@prisma/client'
import { providerById } from '../src/lib/payments'
import { settlePayment } from '../src/lib/payments/service'

const prisma = new PrismaClient()

/** Give the customer a moment to land back on the site before chasing the provider. */
const MIN_AGE_MINUTES = 2
/** Stop checking payments this old; an abandoned checkout is never coming back. */
const MAX_AGE_HOURS = 48

async function main() {
  const now = Date.now()
  const pending = await prisma.payment.findMany({
    where: {
      status: 'pending',
      createdAt: {
        lt: new Date(now - MIN_AGE_MINUTES * 60_000),
        gt: new Date(now - MAX_AGE_HOURS * 3_600_000),
      },
    },
    select: { providerRef: true, provider: true, providerCheckoutId: true },
    take: 200,
  })

  if (pending.length === 0) {
    console.log('no pending payments to reconcile')
    return
  }
  console.log(`checking ${pending.length} pending payment(s)`)

  let settled = 0
  for (const payment of pending) {
    const provider = providerById(payment.provider)
    if (!provider) continue
    try {
      const verified = await provider.verify(payment.providerRef, payment.providerCheckoutId)
      const result = await settlePayment({
        providerRef: payment.providerRef,
        provider: provider.id,
        verified,
      })
      if (result.applied) {
        settled += 1
        console.log(`settled ${payment.providerRef} (${provider.id})`)
      }
    } catch (error) {
      // An unknown reference at the provider means checkout was abandoned — not an error.
      console.warn(`could not verify ${payment.providerRef}:`, error instanceof Error ? error.message : error)
    }
  }

  console.log(`done — ${settled} settled of ${pending.length} checked`)
}

main()
  .catch((error) => { console.error('reconcile failed:', error); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
