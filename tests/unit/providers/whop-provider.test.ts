import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toVerifiedStatus, whopProvider } from '@/lib/payments/whop'
import { resolveCheckoutProvider } from '@/lib/payments'

/**
 * Whop takes USD card payments next to Flutterwave. There are no webhooks: a payment is
 * found by its Whop checkout id, so the checkout must hand that id back and verify must
 * only call a payment successful when Whop says it was collected.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('Whop provider', () => {
  beforeEach(() => {
    vi.stubEnv('WHOP_API_KEY', 'whop_test_key')
    vi.stubEnv('WHOP_COMPANY_ID', 'biz_test')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('creates a one-time USD checkout and returns the full checkout URL and checkout id', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: 'ch_123', purchase_url: '/checkout/ch_123/' }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await whopProvider.createCheckout({
      reference: 'na_ref1',
      email: 'buyer@example.com',
      amount: 19,
      currency: 'USD',
      callbackUrl: 'https://nucleusart.studio/en/account?payment=na_ref1',
      metadata: { planId: 'starter', cycle: 'monthly' },
    })

    expect(result).toEqual({ authorizationUrl: 'https://whop.com/checkout/ch_123/', providerRef: 'ch_123' })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.whop.com/api/v1/checkout_configurations')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer whop_test_key')
    const body = JSON.parse(String(init.body))
    expect(body.plan).toMatchObject({ company_id: 'biz_test', currency: 'usd', plan_type: 'one_time', initial_price: 19 })
    expect(body.redirect_url).toBe('https://nucleusart.studio/en/account?payment=na_ref1')
    expect(body.metadata.reference).toBe('na_ref1')
  })

  it('looks the payment up by checkout id and reports a collected payment as success', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      data: [
        { id: 'pay_other', checkout_configuration_id: 'ch_someone_else', status: 'paid', substatus: 'succeeded', usd_total: 49 },
        { id: 'pay_failed', checkout_configuration_id: 'ch_123', status: 'open', substatus: 'failed', total: 19, currency: 'usd' },
        { id: 'pay_ok', metadata: { reference: 'na_ref1' }, status: 'paid', substatus: 'succeeded', total: 25685.09, usd_total: 19, currency: 'ngn', paid_at: '2026-09-24T10:00:00Z', user: { id: 'user_1' } },
      ],
      page_info: { has_next_page: false },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const verified = await whopProvider.verify('na_ref1', 'ch_123')
    expect(verified).toMatchObject({ reference: 'na_ref1', status: 'success', amount: 19, currency: 'USD', customerId: 'user_1' })
    const [url] = fetchMock.mock.calls[0] as unknown as [string]
    // Whop no longer filters by checkout id, so the lookup lists recent payments and matches.
    expect(url).not.toContain('checkout_configuration_ids')
    expect(url).toContain('account_id=biz_test')
    expect(url).toContain('created_after=')
  })

  it('ignores payments from other checkouts', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      data: [{ id: 'pay_other', checkout_configuration_id: 'ch_other', status: 'paid', substatus: 'succeeded', usd_total: 99 }],
    })))
    expect((await whopProvider.verify('na_ref1', 'ch_123')).status).toBe('pending')
  })

  it('stays pending when nothing has been paid yet or the checkout id is unknown', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ data: [] })))
    expect((await whopProvider.verify('na_ref1', 'ch_123')).status).toBe('pending')
    expect((await whopProvider.verify('na_ref1', null)).status).toBe('pending')
  })

  it('maps Whop statuses to ours', () => {
    expect(toVerifiedStatus({ id: 'a', status: 'paid', substatus: 'succeeded' })).toBe('success')
    expect(toVerifiedStatus({ id: 'b', status: 'paid', substatus: 'refunded' })).toBe('failed')
    expect(toVerifiedStatus({ id: 'c', status: 'void' })).toBe('failed')
    expect(toVerifiedStatus({ id: 'd', status: 'pending', substatus: 'pending' })).toBe('pending')
    expect(toVerifiedStatus(null)).toBe('pending')
  })

  it('never accepts a webhook (confirmation comes from the return page and the reconciler)', () => {
    expect(whopProvider.verifyWebhookSignature('{}', {})).toBe(false)
  })
})

describe('checkout provider choice', () => {
  afterEach(() => { vi.unstubAllEnvs() })

  it('always sends Naira to Paystack', () => {
    expect(resolveCheckoutProvider('NGN', 'whop').id).toBe('paystack')
  })

  it('honours the customer choice for USD', () => {
    vi.stubEnv('WHOP_API_KEY', 'k')
    vi.stubEnv('WHOP_COMPANY_ID', 'biz')
    expect(resolveCheckoutProvider('USD', 'flutterwave').id).toBe('flutterwave')
    expect(resolveCheckoutProvider('USD', 'whop').id).toBe('whop')
    expect(resolveCheckoutProvider('USD', null).id).toBe('whop')
  })

  it('falls back to Flutterwave for card payments until Whop keys are added', () => {
    vi.stubEnv('WHOP_API_KEY', '')
    vi.stubEnv('WHOP_COMPANY_ID', '')
    expect(resolveCheckoutProvider('USD', 'whop').id).toBe('flutterwave')
  })
})
