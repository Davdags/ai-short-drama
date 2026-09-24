import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import { paystackProvider } from '@/lib/payments/paystack'
import { flutterwaveProvider } from '@/lib/payments/flutterwave'
import { providerForCurrency, resolveCheckout } from '@/lib/payments'
import { findPayCountry, flutterwavePaymentOptions, guessPayCountryCode } from '@/lib/payments/countries'
import { localPriceFromRate } from '@/lib/payments/fx'

/**
 * The webhook route is the only publicly reachable endpoint in the app, so signature
 * verification is the control that stops anyone granting themselves a paid plan.
 */
describe('payment provider signature verification', () => {
  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_signature_fixture'
    process.env.FLUTTERWAVE_WEBHOOK_HASH = 'flw_shared_secret_fixture'
  })

  const body = JSON.stringify({ event: 'charge.success', data: { reference: 'na_abc', tx_ref: 'na_abc' } })

  it('accepts a Paystack signature computed with the secret key', () => {
    const signature = createHmac('sha512', 'sk_test_signature_fixture').update(body).digest('hex')
    expect(paystackProvider.verifyWebhookSignature(body, { 'x-paystack-signature': signature })).toBe(true)
  })

  it('rejects a forged Paystack signature', () => {
    const forged = createHmac('sha512', 'not-the-real-key').update(body).digest('hex')
    expect(paystackProvider.verifyWebhookSignature(body, { 'x-paystack-signature': forged })).toBe(false)
  })

  it('rejects a Paystack webhook with no signature header', () => {
    expect(paystackProvider.verifyWebhookSignature(body, { 'x-paystack-signature': null })).toBe(false)
  })

  it('rejects a Paystack signature of a different body', () => {
    const signature = createHmac('sha512', 'sk_test_signature_fixture').update('{"other":true}').digest('hex')
    expect(paystackProvider.verifyWebhookSignature(body, { 'x-paystack-signature': signature })).toBe(false)
  })

  it('accepts the configured Flutterwave hash and rejects anything else', () => {
    expect(flutterwaveProvider.verifyWebhookSignature(body, { 'verif-hash': 'flw_shared_secret_fixture' })).toBe(true)
    expect(flutterwaveProvider.verifyWebhookSignature(body, { 'verif-hash': 'wrong' })).toBe(false)
    expect(flutterwaveProvider.verifyWebhookSignature(body, { 'verif-hash': null })).toBe(false)
  })

  it('rejects every Flutterwave webhook when no hash is configured', () => {
    delete process.env.FLUTTERWAVE_WEBHOOK_HASH
    expect(flutterwaveProvider.verifyWebhookSignature(body, { 'verif-hash': 'anything' })).toBe(false)
  })
})

describe('reference extraction', () => {
  it('reads our reference from a charge event', () => {
    expect(paystackProvider.extractReference({ event: 'charge.success', data: { reference: 'na_1' } })).toBe('na_1')
    expect(flutterwaveProvider.extractReference({ event: 'charge.completed', data: { tx_ref: 'na_2' } })).toBe('na_2')
  })

  it('ignores events that are not payments, so they are not retried forever', () => {
    expect(paystackProvider.extractReference({ event: 'transfer.success', data: { reference: 'x' } })).toBeNull()
    expect(flutterwaveProvider.extractReference({ event: 'transfer.completed', data: { tx_ref: 'x' } })).toBeNull()
  })
})

describe('paying by country', () => {
  it('still routes Naira to Paystack', () => {
    expect(providerForCurrency('NGN').id).toBe('paystack')
  })

  it('offers each country its own currency and never shows Naira outside Nigeria', () => {
    expect(resolveCheckout({ country: findPayCountry('NG'), pay: 'local' })).toMatchObject({ currency: 'NGN', provider: { id: 'paystack' } })
    expect(resolveCheckout({ country: findPayCountry('GH'), pay: 'local' })).toMatchObject({ currency: 'GHS', provider: { id: 'flutterwave' } })
    expect(resolveCheckout({ country: findPayCountry('ZA'), pay: 'local' })).toMatchObject({ currency: 'ZAR', provider: { id: 'flutterwave' } })
    expect(resolveCheckout({ country: findPayCountry('KE'), pay: 'usd', preferredUsdProvider: 'flutterwave' }).currency).toBe('USD')
  })

  it('guesses the country from the device time zone, and anyone else pays in USD', () => {
    expect(guessPayCountryCode('Africa/Accra')).toBe('GH')
    expect(guessPayCountryCode('Africa/Lagos')).toBe('NG')
    expect(guessPayCountryCode('Europe/London')).toBe('OTHER')
    expect(findPayCountry('OTHER')).toBeNull()
  })

  it('prices from the market rate plus a 3% buffer, rounded up to a clean amount', () => {
    // $19 × 11.57 × 1.03 = 226.4 → rounded up to the next 5 cedis
    expect(localPriceFromRate(19, 11.57, { roundTo: 5 })).toBe(230)
    // $19 × 1326.87 × 1.03 = 25,967 → next ₦500
    expect(localPriceFromRate(19, 1326.87, { roundTo: 500 })).toBe(26_000)
  })

  it('puts mobile money first where people pay that way', () => {
    expect(flutterwavePaymentOptions('GHS')).toMatch(/^mobilemoneyghana/)
    expect(flutterwavePaymentOptions('KES')).toMatch(/^mpesa/)
    expect(flutterwavePaymentOptions('XOF')).toContain('mobilemoneyfranco')
  })
})
