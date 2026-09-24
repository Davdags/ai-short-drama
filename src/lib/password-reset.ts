import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'

// Reset tokens reuse the VerificationToken table. Only a SHA-256 hash is stored,
// so a database leak cannot be used to reset passwords.

export const PASSWORD_RESET_TTL_MINUTES = 60
const IDENTIFIER_PREFIX = 'password-reset:'

export function hashResetToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

/** Issues a single-use token (revoking any earlier ones) and returns the raw value for the email link. */
export async function issuePasswordResetToken(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString('hex')
  const identifier = `${IDENTIFIER_PREFIX}${userId}`
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: {
        identifier,
        token: hashResetToken(rawToken),
        expires: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000),
      },
    }),
  ])
  return rawToken
}

/** Consumes the token and returns its user id, or null if it is unknown or expired. */
export async function consumePasswordResetToken(rawToken: string): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({ where: { token: hashResetToken(rawToken) } })
  if (!record || !record.identifier.startsWith(IDENTIFIER_PREFIX)) return null
  await prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } })
  if (record.expires.getTime() < Date.now()) return null
  return record.identifier.slice(IDENTIFIER_PREFIX.length)
}
