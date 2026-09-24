import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hashResetToken } from '@/lib/password-reset'
import { grantSignupBonus } from '@/lib/billing/signup-bonus'
import { isEmailConfigured, sendEmail } from '@/lib/email/send-email'
import { createScopedLogger } from '@/lib/logging/core'
import { BRAND_NAME } from '@/components/BrandWordmark'
import { SIGNUP_BONUS_CREDITS } from '@/lib/billing/credits-constants'
import { sendWelcomeEmail } from '@/lib/email/notifications'
import { renderEmail } from '@/lib/email/layout'

/**
 * Email verification. The free sign-up credits are granted when the email is verified,
 * so throwaway accounts can't collect them. Tokens reuse the VerificationToken table;
 * only a SHA-256 hash is stored.
 */

export const EMAIL_VERIFY_TTL_HOURS = 48
const IDENTIFIER_PREFIX = 'email-verify:'
const logger = createScopedLogger({ module: 'auth.email-verification' })

export async function issueEmailVerificationToken(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString('hex')
  const identifier = `${IDENTIFIER_PREFIX}${userId}`
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: {
        identifier,
        token: hashResetToken(rawToken),
        expires: new Date(Date.now() + EMAIL_VERIFY_TTL_HOURS * 3_600_000),
      },
    }),
  ])
  return rawToken
}

/** Consumes the token, marks the email verified and grants the sign-up credits. Returns the user id or null. */
export async function verifyEmailToken(rawToken: string): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({ where: { token: hashResetToken(rawToken) } })
  if (!record || !record.identifier.startsWith(IDENTIFIER_PREFIX)) return null
  await prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } })
  if (record.expires.getTime() < Date.now()) return null

  const userId = record.identifier.slice(IDENTIFIER_PREFIX.length)
  await markEmailVerified(userId)
  return userId
}

/** Marks the user's email verified (if not already) and grants the one-time sign-up credits. */
export async function markEmailVerified(userId: string): Promise<void> {
  await prisma.user.updateMany({ where: { id: userId, emailVerified: null }, data: { emailVerified: new Date() } })
  await grantSignupBonus(userId)
  await sendWelcomeEmail(userId)
}

function appBaseUrl(): string {
  return (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/+$/, '')
}

/** Sends (or, in local development without email, logs) the verification link. Never throws. */
export async function sendVerificationEmail(user: { id: string; email: string | null }): Promise<boolean> {
  if (!user.email) return false
  try {
    const token = await issueEmailVerificationToken(user.id)
    const link = `${appBaseUrl()}/api/auth/verify-email?token=${token}`
    const email = renderEmail({
      subject: `Confirm your ${BRAND_NAME} email (+${SIGNUP_BONUS_CREDITS} free credits)`,
      preheader: `One click to activate your account and get ${SIGNUP_BONUS_CREDITS} free credits.`,
      heading: 'Confirm your email',
      paragraphs: [`Welcome to ${BRAND_NAME}! Confirm your email to activate your account and receive ${SIGNUP_BONUS_CREDITS} free credits.`],
      cta: { label: 'Confirm email', url: link },
      note: `This link is valid for ${EMAIL_VERIFY_TTL_HOURS} hours. If you didn't create an account, you can ignore this email.`,
    })
    const sent = await sendEmail({ to: user.email, ...email })
    if (!sent && !isEmailConfigured() && process.env.NODE_ENV !== 'production') {
      logger.error({ message: 'email not configured: verification link (development only)', details: { link } })
    }
    return sent
  } catch (error) {
    logger.error({ message: 'failed to send verification email', details: { error: error instanceof Error ? error.message : String(error) } })
    return false
  }
}
