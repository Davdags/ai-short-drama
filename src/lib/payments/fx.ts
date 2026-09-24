import { createScopedLogger } from '@/lib/logging/core'
import { PAY_COUNTRIES, roundLocalPrice, type PayCountry } from './countries'

/**
 * USD → local currency rates for local-currency checkout. Refreshed at most every 6 hours
 * from a free daily-rates feed, with a 3% buffer so a weakening currency between updates
 * does not sell plans below their dollar price. If the feed is down, the last good rates
 * (or the built-in fallback) are used — checkout never breaks because of it.
 */

const logger = createScopedLogger({ module: 'payments.fx' })

const RATES_URL = 'https://open.er-api.com/v6/latest/USD'
const REFRESH_MS = 6 * 60 * 60 * 1000
/** Added on top of the market rate. */
export const FX_BUFFER = 0.03

/** Market rates on 2026-09-24, used only until the first successful fetch. */
const FALLBACK_RATES: Record<string, number> = {
  NGN: 1326.87, GHS: 11.57, KES: 129.5, ZAR: 16.36, UGX: 3839, TZS: 2645, RWF: 1477, ZMW: 19.49, XOF: 575.5, XAF: 575.5,
}

let cache: { rates: Record<string, number>; fetchedAt: number; source: 'live' | 'fallback' } = {
  rates: FALLBACK_RATES,
  fetchedAt: 0,
  source: 'fallback',
}
let inflight: Promise<void> | null = null

async function refresh(): Promise<void> {
  try {
    const response = await fetch(RATES_URL, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    const body = await response.json() as { result?: string; rates?: Record<string, number> }
    if (!response.ok || body.result !== 'success' || !body.rates) throw new Error(`rates feed ${response.status}`)
    const rates: Record<string, number> = {}
    for (const country of PAY_COUNTRIES) {
      const rate = body.rates[country.currency]
      if (typeof rate === 'number' && rate > 0) rates[country.currency] = rate
    }
    cache = { rates: { ...cache.rates, ...rates }, fetchedAt: Date.now(), source: 'live' }
  } catch (error) {
    // Keep the previous rates; try again on the next request after a short pause.
    cache = { ...cache, fetchedAt: Date.now() - REFRESH_MS + 10 * 60 * 1000 }
    logger.warn({ message: 'exchange rate refresh failed; using last known rates', details: { error: String(error) } })
  }
}

export async function getUsdRates(): Promise<{ rates: Record<string, number>; updatedAt: number; source: 'live' | 'fallback' }> {
  if (Date.now() - cache.fetchedAt > REFRESH_MS) {
    inflight ??= refresh().finally(() => { inflight = null })
    await inflight
  }
  return { rates: cache.rates, updatedAt: cache.fetchedAt, source: cache.source }
}

/** A plan's USD price in the country's currency: market rate + buffer, rounded up to a clean step. */
export function localPriceFromRate(usd: number, rate: number, country: Pick<PayCountry, 'roundTo'>): number {
  return roundLocalPrice(usd * rate * (1 + FX_BUFFER), country.roundTo)
}

/**
 * Currencies priced at a flat rate set by the owner instead of the live rate + buffer.
 * Naira: ₦1,500 per $1 (USD_TO_NGN to change it), so Starter is always ₦28,500.
 */
export function fixedUsdRate(currency: string): number | null {
  if (currency.toUpperCase() !== 'NGN') return null
  const configured = Number(process.env.USD_TO_NGN)
  return Number.isFinite(configured) && configured > 0 ? configured : 1500
}

/** Local units charged per US dollar, before rounding: the fixed rate, or market rate plus buffer. */
export function usdToLocalRate(country: Pick<PayCountry, 'currency'>, rates: Record<string, number>): number {
  const fixed = fixedUsdRate(country.currency)
  if (fixed) return fixed
  const rate = rates[country.currency]
  if (!rate) throw new Error(`No exchange rate for ${country.currency}`)
  return rate * (1 + FX_BUFFER)
}

/** A price in the country's currency, as charged at checkout and shown on the pricing page. */
export function countryPrice(usd: number, country: PayCountry, rates: Record<string, number>): number {
  const fixed = fixedUsdRate(country.currency)
  if (fixed) return roundLocalPrice(usd * fixed, country.roundTo)
  const rate = rates[country.currency]
  if (!rate) throw new Error(`No exchange rate for ${country.currency}`)
  return localPriceFromRate(usd, rate, country)
}

export async function localPrice(usd: number, country: PayCountry): Promise<number> {
  const { rates } = await getUsdRates()
  return countryPrice(usd, country, rates)
}

/** For tests. */
export function __setRatesForTests(rates: Record<string, number>) {
  cache = { rates, fetchedAt: Date.now(), source: 'live' }
}
