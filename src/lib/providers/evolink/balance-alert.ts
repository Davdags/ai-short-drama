import { createScopedLogger } from '@/lib/logging/core'
import { sendEmail } from '@/lib/email/send-email'
import { EVOLINK_API_BASE } from './constants'
import { listCentralEvolinkKeys } from './central'

const logger = createScopedLogger({ module: 'evolink.balance-alert' })

/** Email when the central EvoLink account drops below this many EvoLink credits. */
const DEFAULT_THRESHOLD_CREDITS = 2_000
/** At most one alert per this period while the balance stays low. */
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000

let lastAlertAt = 0

export interface EvolinkBalance {
  /** Account balance (all keys). */
  accountCredits: number
  /** Remaining quota on this key (null when the key is unlimited). */
  keyCredits: number | null
}

export async function fetchEvolinkBalance(apiKey: string): Promise<EvolinkBalance | null> {
  const response = await fetch(`${EVOLINK_API_BASE}/credits`, { headers: { Authorization: `Bearer ${apiKey}` } })
  if (!response.ok) return null
  const body = await response.json() as {
    data?: { user?: { remaining_credits?: number }; token?: { remaining_credits?: number; unlimited_credits?: boolean } }
  }
  const accountCredits = body.data?.user?.remaining_credits
  if (typeof accountCredits !== 'number') return null
  const token = body.data?.token
  return {
    accountCredits,
    keyCredits: token?.unlimited_credits || typeof token?.remaining_credits !== 'number' ? null : token.remaining_credits,
  }
}

/**
 * Checks the central account balance and emails ALERT_EMAIL when it is low (or a key's
 * quota is nearly used up). Never throws; safe to call from the watchdog loop.
 */
export async function checkEvolinkBalanceAndAlert(now = Date.now()): Promise<void> {
  const keys = listCentralEvolinkKeys()
  const alertTo = process.env.ALERT_EMAIL
  if (keys.length === 0 || !alertTo) return
  const threshold = Number(process.env.EVOLINK_LOW_BALANCE_CREDITS) || DEFAULT_THRESHOLD_CREDITS

  try {
    const balance = await fetchEvolinkBalance(keys[0])
    if (!balance) return
    const lowest = Math.min(balance.accountCredits, balance.keyCredits ?? Number.POSITIVE_INFINITY)
    if (lowest >= threshold || now - lastAlertAt < ALERT_COOLDOWN_MS) return

    lastAlertAt = now
    const lines = [
      `Your EvoLink balance is low: ${Math.floor(balance.accountCredits).toLocaleString('en-US')} credits left on the account.`,
      balance.keyCredits !== null ? `The live API key has ${Math.floor(balance.keyCredits).toLocaleString('en-US')} credits of quota left.` : '',
      'When it runs out, every NucleusArt customer is blocked from generating. Top up at https://evolink.ai.',
    ].filter(Boolean)
    const sent = await sendEmail({
      to: alertTo,
      subject: `NucleusArt: EvoLink balance low (${Math.floor(lowest).toLocaleString('en-US')} credits)`,
      text: lines.join('\n\n'),
      html: lines.map((line) => `<p>${line}</p>`).join(''),
    })
    logger.error({ message: 'EvoLink balance low', details: { ...balance, threshold, emailSent: sent } })
  } catch (error) {
    logger.error({ message: 'EvoLink balance check failed', details: { error: error instanceof Error ? error.message : String(error) } })
  }
}

/** Test helper. */
export function resetEvolinkBalanceAlert(): void {
  lastAlertAt = 0
}
