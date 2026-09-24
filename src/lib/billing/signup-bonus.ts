import { SIGNUP_BONUS_CREDITS } from './credits-constants'
import { addBalance } from './ledger'

/**
 * Grants the sign-up bonus. Idempotent per user (keyed ledger transaction), so a
 * retried sign-up can never grant it twice. Never throws: a failed grant is logged
 * by the ledger and must not block account creation.
 */
export async function grantSignupBonus(userId: string): Promise<boolean> {
  return await addBalance(userId, SIGNUP_BONUS_CREDITS, {
    type: 'adjust',
    reason: 'signup bonus',
    idempotencyKey: `signup-bonus:${userId}`,
  })
}
