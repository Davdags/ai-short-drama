import { prisma } from '@/lib/prisma'
import { createScopedLogger } from '@/lib/logging/core'
import { sendOnce } from './notifications'

const logger = createScopedLogger({ module: 'email' })

const PLAN_NAMES: Record<string, string> = {
  starter: 'Starter', pro: 'Pro', studio: 'Studio',
}

/** Never let an email problem break a payment or a scheduled job. */
async function safely(kind: string, run: () => Promise<void>): Promise<void> {
  try {
    await run()
  } catch (error) {
    logger.error({ message: 'billing email failed', details: { kind, error: error instanceof Error ? error.message : String(error) } })
  }
}

async function recipientFor(userId: string): Promise<{ email: string; name: string } | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
  if (!user?.email) return null
  return { email: user.email, name: user.name || 'there' }
}

function money(amount: number, currency: string): string {
  const symbol = currency.toUpperCase() === 'NGN' ? '₦' : '$'
  return `${symbol}${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function formatDate(value: Date): string {
  return value.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Receipt for a successful plan payment. Deduped on the payment reference. */
export function sendPaymentReceiptEmail(input: {
  userId: string
  reference: string
  planId: string
  cycle: string
  amount: number
  currency: string
  credits: number
  periodEnd: Date
}): Promise<void> {
  return safely('payment_receipt', async () => {
    const to = await recipientFor(input.userId)
    if (!to) return
    const planName = PLAN_NAMES[input.planId] ?? input.planId

    await sendOnce({
      userId: input.userId,
      kind: 'payment_receipt',
      // One receipt per payment, so a retry or a reconciler sweep cannot send a duplicate.
      dedupeKey: `payment_receipt:${input.reference}`,
      to: to.email,
      content: {
        subject: `Your NucleusArt receipt — ${planName} plan`,
        preheader: `${money(input.amount, input.currency)} paid. ${input.credits.toLocaleString('en-US')} credits added.`,
        heading: 'Thank you — your plan is active',
        paragraphs: [
          `Hi ${to.name}, your payment went through and your ${planName} plan is live. Your credits are already in your account, ready to use.`,
        ],
        bullets: [
          `Plan: ${planName} (${input.cycle})`,
          `Amount paid: ${money(input.amount, input.currency)}`,
          `Credits added: ${input.credits.toLocaleString('en-US')}`,
          `Your plan runs until ${formatDate(input.periodEnd)}`,
          `Payment reference: ${input.reference}`,
        ],
        cta: { label: 'Start creating', url: '/en/workspace' },
        note: 'Keep this email as your receipt. Questions about billing? Just reply to this message.',
      },
    })
  })
}

/** Warns a customer a few days before their plan lapses, since we do not auto-charge. */
export function sendRenewalReminderEmail(input: {
  userId: string
  subscriptionId: string
  planId: string
  periodEnd: Date
  daysLeft: number
}): Promise<void> {
  return safely('renewal_reminder', async () => {
    const to = await recipientFor(input.userId)
    if (!to) return
    const planName = PLAN_NAMES[input.planId] ?? input.planId

    await sendOnce({
      userId: input.userId,
      kind: 'renewal_reminder',
      // One reminder per subscription period.
      dedupeKey: `renewal_reminder:${input.subscriptionId}`,
      to: to.email,
      content: {
        subject: `Your ${planName} plan ends in ${input.daysLeft} ${input.daysLeft === 1 ? 'day' : 'days'}`,
        preheader: `Renew to keep your monthly credits and your projects working.`,
        heading: `Your plan ends on ${formatDate(input.periodEnd)}`,
        paragraphs: [
          `Hi ${to.name}, your ${planName} plan finishes soon. We do not charge you automatically, so nothing will be taken from your card — but your monthly credits will stop when the plan ends.`,
          'Your projects, storyboards and finished videos stay exactly as they are. Renew whenever you are ready and pick up where you left off.',
        ],
        cta: { label: 'Renew my plan', url: '/en/pricing' },
        note: 'Already renewed? Then you can ignore this — thank you.',
      },
    })
  })
}

/** Tells a customer their plan has ended and they are back on Free. */
export function sendPlanExpiredEmail(input: {
  userId: string
  subscriptionId: string
  planId: string
}): Promise<void> {
  return safely('plan_expired', async () => {
    const to = await recipientFor(input.userId)
    if (!to) return
    const planName = PLAN_NAMES[input.planId] ?? input.planId

    await sendOnce({
      userId: input.userId,
      kind: 'plan_expired',
      dedupeKey: `plan_expired:${input.subscriptionId}`,
      to: to.email,
      content: {
        subject: 'Your NucleusArt plan has ended',
        preheader: 'Your work is safe. Renew any time to get your credits back.',
        heading: `Your ${planName} plan has ended`,
        paragraphs: [
          `Hi ${to.name}, your ${planName} plan has finished and your account is back on the Free plan.`,
          'Nothing has been deleted. Every project, storyboard and video you made is still in your account, exactly where you left it. Any credits you already had remain yours to spend.',
        ],
        cta: { label: 'Choose a plan', url: '/en/pricing' },
        note: 'We would love to know why you did not renew — just reply and tell us.',
      },
    })
  })
}
