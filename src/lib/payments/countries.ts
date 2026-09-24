/**
 * Where a customer pays from decides what they are offered (client-safe, no server imports).
 *
 * - Nigeria: naira through Paystack (card, bank transfer, USSD), or USD.
 * - The African countries below: their own currency through Flutterwave — mostly mobile
 *   money, which is how many people there pay — or USD.
 * - Everyone else: USD (card, Apple/Google Pay or crypto through Whop), with Flutterwave
 *   as "other payment methods".
 * Nobody outside Nigeria is ever shown naira.
 */

export type LocalProvider = 'paystack' | 'flutterwave'

export interface PayCountry {
  code: string
  name: string
  currency: string
  /** Shown before the amount, e.g. "GH₵". */
  symbol: string
  localProvider: LocalProvider
  /** How local payment works, in words, under the price. */
  localMethods: string
  /** Local prices are rounded up to a clean step (e.g. 5 cedis, 1,000 shillings). */
  roundTo: number
  timeZones: string[]
}

export const PAY_COUNTRIES: PayCountry[] = [
  { code: 'NG', name: 'Nigeria', currency: 'NGN', symbol: '₦', localProvider: 'paystack', localMethods: 'card, bank transfer or USSD', roundTo: 500, timeZones: ['Africa/Lagos'] },
  { code: 'GH', name: 'Ghana', currency: 'GHS', symbol: 'GH₵', localProvider: 'flutterwave', localMethods: 'mobile money or card', roundTo: 5, timeZones: ['Africa/Accra'] },
  { code: 'KE', name: 'Kenya', currency: 'KES', symbol: 'KSh', localProvider: 'flutterwave', localMethods: 'M-Pesa or card', roundTo: 50, timeZones: ['Africa/Nairobi'] },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', symbol: 'R', localProvider: 'flutterwave', localMethods: 'card or bank', roundTo: 5, timeZones: ['Africa/Johannesburg'] },
  { code: 'UG', name: 'Uganda', currency: 'UGX', symbol: 'USh', localProvider: 'flutterwave', localMethods: 'mobile money or card', roundTo: 1000, timeZones: ['Africa/Kampala'] },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', symbol: 'TSh', localProvider: 'flutterwave', localMethods: 'mobile money or card', roundTo: 1000, timeZones: ['Africa/Dar_es_Salaam'] },
  { code: 'RW', name: 'Rwanda', currency: 'RWF', symbol: 'FRw', localProvider: 'flutterwave', localMethods: 'mobile money or card', roundTo: 500, timeZones: ['Africa/Kigali'] },
  { code: 'ZM', name: 'Zambia', currency: 'ZMW', symbol: 'K', localProvider: 'flutterwave', localMethods: 'mobile money or card', roundTo: 5, timeZones: ['Africa/Lusaka'] },
  {
    code: 'WA', name: 'West Africa (CFA franc)', currency: 'XOF', symbol: 'CFA', localProvider: 'flutterwave', localMethods: 'mobile money or card', roundTo: 500,
    timeZones: ['Africa/Abidjan', 'Africa/Dakar', 'Africa/Porto-Novo', 'Africa/Lome', 'Africa/Ouagadougou', 'Africa/Bamako', 'Africa/Niamey', 'Africa/Bissau'],
  },
  {
    code: 'CA', name: 'Central Africa (CFA franc)', currency: 'XAF', symbol: 'FCFA', localProvider: 'flutterwave', localMethods: 'mobile money or card', roundTo: 500,
    timeZones: ['Africa/Douala', 'Africa/Libreville', 'Africa/Brazzaville', 'Africa/Ndjamena', 'Africa/Bangui', 'Africa/Malabo'],
  },
]

/** Anyone not in the list above: USD only. */
export const OTHER_COUNTRY_CODE = 'OTHER'

export function findPayCountry(code: string | null | undefined): PayCountry | null {
  if (!code) return null
  return PAY_COUNTRIES.find((country) => country.code === code.toUpperCase()) ?? null
}

export function payCountryForCurrency(currency: string): PayCountry | null {
  return PAY_COUNTRIES.find((country) => country.currency === currency.toUpperCase()) ?? null
}

/** Best guess from the device time zone — private, no network lookup. The picker corrects it. */
export function guessPayCountryCode(timeZone: string | null | undefined): string {
  if (!timeZone) return OTHER_COUNTRY_CODE
  return PAY_COUNTRIES.find((country) => country.timeZones.includes(timeZone))?.code ?? OTHER_COUNTRY_CODE
}

/** Rounds a local price up to the country's clean step. */
export function roundLocalPrice(amount: number, roundTo: number): number {
  return Math.ceil(amount / roundTo) * roundTo
}

export function formatLocalPrice(amount: number, country: Pick<PayCountry, 'symbol'>): string {
  return `${country.symbol}${amount.toLocaleString('en-US')}`
}

/** Flutterwave hosted-checkout payment options for each local currency. */
export function flutterwavePaymentOptions(currency: string): string {
  switch (currency.toUpperCase()) {
    case 'GHS': return 'mobilemoneyghana, card'
    case 'KES': return 'mpesa, card'
    case 'UGX': return 'mobilemoneyuganda, card'
    case 'TZS': return 'mobilemoneytanzania, card'
    case 'RWF': return 'mobilemoneyrwanda, card'
    case 'ZMW': return 'mobilemoneyzambia, card'
    case 'XOF':
    case 'XAF': return 'mobilemoneyfranco, card'
    case 'ZAR': return 'card, account, banktransfer'
    default: return 'card, banktransfer, ussd, account, mobilemoney, applepay, googlepay'
  }
}
