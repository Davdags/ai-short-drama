import { flutterwaveProvider } from './flutterwave'
import { paystackProvider } from './paystack'
import { whopProvider } from './whop'
import type { PaymentProvider, ProviderId } from './types'
import type { PayCountry } from './countries'

export * from './types'
export { paystackProvider, flutterwaveProvider, whopProvider }

/**
 * Paystack takes Naira, Flutterwave takes everything else. Keeping the split by currency
 * rather than by customer country means a Nigerian paying in USD still routes correctly.
 */
export const NAIRA = 'NGN'

export function providerForCurrency(currency: string): PaymentProvider {
  return currency.toUpperCase() === NAIRA ? paystackProvider : flutterwaveProvider
}

export function providerById(id: string): PaymentProvider | null {
  if (id === 'paystack') return paystackProvider
  if (id === 'flutterwave') return flutterwaveProvider
  if (id === 'whop') return whopProvider
  return null
}

export function isProviderConfigured(id: ProviderId): boolean {
  if (id === 'paystack') return Boolean(process.env.PAYSTACK_SECRET_KEY)
  if (id === 'whop') return Boolean(process.env.WHOP_API_KEY && process.env.WHOP_COMPANY_ID)
  return Boolean(process.env.FLUTTERWAVE_SECRET_KEY)
}

/** USD payment options the customer can pick between (Naira is always Paystack). */
export const USD_PROVIDERS = ['whop', 'flutterwave'] as const
export type UsdProviderId = (typeof USD_PROVIDERS)[number]

/**
 * Which provider takes this checkout. Naira is always Paystack. For USD the customer's
 * choice wins; without one, Whop when it is set up, otherwise Flutterwave.
 */
export function resolveCheckoutProvider(currency: string, preferred?: string | null): PaymentProvider {
  if (currency.toUpperCase() === NAIRA) return paystackProvider
  if (preferred === 'flutterwave') return flutterwaveProvider
  // Flutterwave also takes cards, so "card" still works before Whop keys are added.
  return isProviderConfigured('whop') ? whopProvider : flutterwaveProvider
}

/**
 * How a checkout is paid: in the customer's local currency (Nigeria → Paystack, the other
 * listed African countries → Flutterwave) or in USD (Whop, or Flutterwave as "other
 * methods"). See countries.ts for who is offered what.
 */
export type PayMode = 'local' | 'usd'

export function resolveCheckout(input: {
  country: PayCountry | null
  pay: PayMode
  preferredUsdProvider?: string | null
}): { provider: PaymentProvider; currency: string } {
  if (input.pay === 'local') {
    if (!input.country) throw new Error('LOCAL_CURRENCY_NEEDS_COUNTRY')
    return {
      provider: input.country.localProvider === 'paystack' ? paystackProvider : flutterwaveProvider,
      currency: input.country.currency,
    }
  }
  return { provider: resolveCheckoutProvider('USD', input.preferredUsdProvider), currency: 'USD' }
}
