import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'

// Email is optional and not unique at the database level (legacy username accounts),
// so uniqueness and lookups are enforced here instead of via the schema.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_PATTERN.test(value)
}

export async function findUserByEmail(email: string) {
  return prisma.user.findFirst({ where: { email: normalizeEmail(email) } })
}

/** Users sign in with either their email or their username. */
export async function findUserByLogin(identifier: string) {
  const value = identifier.trim()
  if (!value) return null
  if (value.includes('@')) return findUserByEmail(value)
  return prisma.user.findUnique({ where: { name: value } })
}

/** Username base from a display name or email: lowercase letters, digits, underscores. */
export function deriveUsernameBase(seed: string): string {
  const local = seed.includes('@') ? seed.split('@')[0] : seed
  const base = local
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24)
  return base || 'creator'
}

/** `user.name` is a unique username; accounts created without one (e.g. Google) get a derived one. */
export async function generateUniqueUsername(seed: string): Promise<string> {
  const base = deriveUsernameBase(seed)
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`
    const taken = await prisma.user.findUnique({ where: { name: candidate }, select: { id: true } })
    if (!taken) return candidate
  }
  return `${base}_${randomUUID().slice(0, 8)}`
}

/** Every user needs a balance row; registration creates it in a transaction, OAuth sign-ups use this. */
export async function ensureUserBalance(userId: string): Promise<void> {
  await prisma.userBalance.upsert({
    where: { userId },
    create: { userId, balance: 0, frozenAmount: 0, totalSpent: 0 },
    update: {},
  })
}
