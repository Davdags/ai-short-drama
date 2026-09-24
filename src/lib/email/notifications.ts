import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createScopedLogger } from '@/lib/logging/core'
import { toMoneyNumber } from '@/lib/billing/money'
import { PLAN_MONTHLY_CREDITS, getUserPlanId } from '@/lib/billing/plan-limits'
import { SIGNUP_BONUS_CREDITS } from '@/lib/billing/credits-constants'
import { sendEmail } from './send-email'
import { renderEmail, type EmailContent } from './layout'

/**
 * Transactional emails. Every send is keyed (EmailEvent.dedupeKey is unique), so an event —
 * a retried job, a double click — emails at most once. Sending never throws: a failure is
 * logged and the user's action still succeeds.
 */

const logger = createScopedLogger({ module: 'email.notifications' })

/** Low-credit warning below this share of the plan's monthly credits. */
const LOW_CREDIT_SHARE = 0.2

type Preference = 'emailGenerationUpdates' | 'emailCreditAlerts'

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

function monthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7)
}

async function recipientFor(userId: string, preference?: Preference) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
  if (!user?.email) return null
  if (preference) {
    const prefs = await prisma.userPreference.findUnique({ where: { userId }, select: { [preference]: true } as Prisma.UserPreferenceSelect })
    if (prefs && (prefs as Record<string, unknown>)[preference] === false) return null
  }
  return { name: user.name, email: user.email }
}

/** Sends once per dedupeKey. Returns true when an email was sent. */
export async function sendOnce(input: { userId: string | null; kind: string; dedupeKey: string; to: string; content: EmailContent }): Promise<boolean> {
  try {
    await prisma.emailEvent.create({ data: { userId: input.userId, kind: input.kind, dedupeKey: input.dedupeKey } })
  } catch (error) {
    if (isUniqueViolation(error)) return false
    logger.error({ message: 'email log write failed', details: { kind: input.kind, error: error instanceof Error ? error.message : String(error) } })
    return false
  }
  const sent = await sendEmail({ to: input.to, ...renderEmail(input.content) })
  if (sent) {
    await prisma.emailEvent.update({ where: { dedupeKey: input.dedupeKey }, data: { status: 'sent' } }).catch(() => undefined)
  } else {
    // Allow a later trigger to try again (e.g. once Resend is configured).
    await prisma.emailEvent.delete({ where: { dedupeKey: input.dedupeKey } }).catch(() => undefined)
  }
  return sent
}

function safely(kind: string, task: () => Promise<unknown>): Promise<void> {
  return task().then(() => undefined).catch((error) => {
    logger.error({ message: 'transactional email failed', details: { kind, error: error instanceof Error ? error.message : String(error) } })
  })
}

// ---------------------------------------------------------------------------
// Account

export function sendWelcomeEmail(userId: string): Promise<void> {
  return safely('welcome', async () => {
    const to = await recipientFor(userId)
    if (!to) return
    await sendOnce({
      userId, kind: 'welcome', dedupeKey: `welcome:${userId}`, to: to.email,
      content: {
        subject: 'Welcome to NucleusArt — your first story awaits',
        preheader: `Your ${SIGNUP_BONUS_CREDITS} free credits are ready.`,
        heading: `Welcome, ${to.name}!`,
        paragraphs: [
          `Your account is ready and ${SIGNUP_BONUS_CREDITS} free credits are waiting for you. Here's how to make your first short drama:`,
        ],
        bullets: [
          'Paste a story idea and pick a length — 15 seconds is perfect for a first test.',
          'NucleusArt writes the script, designs your characters and plans every shot.',
          'Generate images and video, add voices, and export your episode.',
        ],
        cta: { label: 'Create my first story', url: '/en/workspace' },
        note: 'Tip: start with 480p while you experiment — it uses fewer credits.',
      },
    })
  })
}

export function sendPasswordChangedEmail(userId: string): Promise<void> {
  return safely('password_changed', async () => {
    const to = await recipientFor(userId)
    if (!to) return
    await sendOnce({
      userId, kind: 'password_changed', dedupeKey: `password-changed:${userId}:${Date.now()}`, to: to.email,
      content: {
        subject: 'Your NucleusArt password was changed',
        preheader: 'If this was you, no action is needed.',
        heading: 'Your password was changed',
        paragraphs: [
          `The password for your NucleusArt account (${to.name}) was just changed.`,
          "If this was you, you're all set. If it wasn't, reset your password right away and contact our support team.",
        ],
        cta: { label: 'Reset my password', url: '/en/auth/forgot-password' },
      },
    })
  })
}

// ---------------------------------------------------------------------------
// Credits

/** Call after credits are charged. Warns once per month when low, and once when empty. */
export function notifyCreditsIfLow(userId: string): Promise<void> {
  return safely('credits', async () => {
    const balanceRow = await prisma.userBalance.findUnique({ where: { userId }, select: { balance: true } })
    if (!balanceRow) return
    const balance = toMoneyNumber(balanceRow.balance)
    const plan = await getUserPlanId(userId)
    const threshold = PLAN_MONTHLY_CREDITS[plan] * LOW_CREDIT_SHARE
    if (balance > threshold) return

    const to = await recipientFor(userId, 'emailCreditAlerts')
    if (!to) return
    const empty = balance < 1
    await sendOnce({
      userId,
      kind: empty ? 'credits_empty' : 'credits_low',
      dedupeKey: `${empty ? 'credits-empty' : 'credits-low'}:${userId}:${monthKey()}`,
      to: to.email,
      content: empty
        ? {
          subject: "You're out of NucleusArt credits",
          preheader: 'Top up or upgrade to keep creating.',
          heading: "You're out of credits",
          paragraphs: ["Your credit balance has run out, so new generations are paused. Your projects are safe — pick a plan or add credits to keep creating."],
          cta: { label: 'See plans', url: '/en/pricing' },
        }
        : {
          subject: 'Your NucleusArt credits are running low',
          preheader: `About ${Math.floor(balance)} credits left.`,
          heading: 'Your credits are running low',
          paragraphs: [`You have about ${Math.floor(balance).toLocaleString('en-US')} credits left. Upgrade or add credits so your next episode isn't interrupted.`],
          cta: { label: 'See plans', url: '/en/pricing' },
        },
    })
  })
}

// ---------------------------------------------------------------------------
// Generation

export function notifyEpisodeReady(input: { userId: string; projectId: string; episodeId: string; taskId: string }): Promise<void> {
  return safely('episode_ready', async () => {
    const to = await recipientFor(input.userId, 'emailGenerationUpdates')
    if (!to) return
    const [project, episode] = await Promise.all([
      prisma.project.findUnique({ where: { id: input.projectId }, select: { name: true } }),
      prisma.studioEpisode.findUnique({ where: { id: input.episodeId }, select: { name: true } }),
    ])
    const title = [project?.name, episode?.name].filter(Boolean).join(' — ') || 'Your episode'
    await sendOnce({
      userId: input.userId, kind: 'episode_ready', dedupeKey: `episode-ready:${input.taskId}`, to: to.email,
      content: {
        subject: `Your episode is ready: ${title}`,
        preheader: 'Your full video has finished exporting.',
        heading: 'Your episode is ready 🎬',
        paragraphs: [`"${title}" has finished exporting. Watch it, download it, and share it.`],
        cta: { label: 'Open my episode', url: `/en/workspace/${input.projectId}?episode=${input.episodeId}` },
      },
    })
  })
}

/** At most one email per user per hour, however many generations failed. */
export function notifyGenerationFailed(input: { userId: string; creditsRefunded: boolean }): Promise<void> {
  return safely('generation_failed', async () => {
    const to = await recipientFor(input.userId, 'emailGenerationUpdates')
    if (!to) return
    const hour = new Date().toISOString().slice(0, 13)
    await sendOnce({
      userId: input.userId, kind: 'generation_failed', dedupeKey: `generation-failed:${input.userId}:${hour}`, to: to.email,
      content: {
        subject: 'A NucleusArt generation failed' + (input.creditsRefunded ? ' — credits refunded' : ''),
        preheader: input.creditsRefunded ? "You weren't charged for it." : 'You can retry it from your project.',
        heading: "Some generations didn't complete",
        paragraphs: [
          'One or more of your generations failed after several attempts.',
          input.creditsRefunded
            ? 'The credits reserved for them have been returned to your balance automatically — you were not charged.'
            : 'You can retry them from your project.',
          'Retrying usually works. If it keeps failing, reply to this email and we will look into it.',
        ],
        cta: { label: 'Open my projects', url: '/en/workspace' },
      },
    })
  })
}

// ---------------------------------------------------------------------------
// Admin

/** Daily summary for the owner (ALERT_EMAIL). Safe to call often: sends once per day. */
export function sendAdminDailySummary(input: { evolinkCredits?: number | null } = {}): Promise<void> {
  return safely('admin_daily', async () => {
    const to = process.env.ALERT_EMAIL
    if (!to) return
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [newUsers, verifiedUsers, completed, failed, charged] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.user.count({ where: { createdAt: { gte: since }, emailVerified: { not: null } } }),
      prisma.task.count({ where: { status: 'completed', updatedAt: { gte: since } } }),
      prisma.task.count({ where: { status: 'failed', updatedAt: { gte: since } } }),
      prisma.usageCost.aggregate({ where: { createdAt: { gte: since } }, _sum: { cost: true } }),
    ])
    const creditsCharged = Math.round(toMoneyNumber(charged._sum.cost))
    await sendOnce({
      userId: null, kind: 'admin_daily', dedupeKey: `admin-daily:${new Date().toISOString().slice(0, 10)}`, to,
      content: {
        subject: `NucleusArt daily: ${newUsers} sign-ups, ${creditsCharged.toLocaleString('en-US')} credits used`,
        preheader: 'Your last 24 hours at a glance.',
        heading: 'Last 24 hours',
        paragraphs: ['Here is how NucleusArt did yesterday.'],
        bullets: [
          `New sign-ups: ${newUsers} (${verifiedUsers} verified)`,
          `Credits charged: ${creditsCharged.toLocaleString('en-US')} (≈ ${(creditsCharged / 5).toFixed(0)} EvoLink credits)`,
          `Generations completed: ${completed} · failed: ${failed}`,
          ...(typeof input.evolinkCredits === 'number' ? [`EvoLink balance: ${Math.floor(input.evolinkCredits).toLocaleString('en-US')} credits`] : []),
          'Revenue: available once Paystack is connected',
        ],
      },
    })
  })
}
