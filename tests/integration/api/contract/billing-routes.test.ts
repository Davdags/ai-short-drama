import { describe, expect, it } from 'vitest'
import { ROUTE_CATALOG } from '../../../contracts/route-catalog'

/**
 * Contract for the billing routes. The money path has two rules that must never regress:
 * the customer-facing routes require a session, and the webhook — the only public one —
 * is registered as public deliberately because it is guarded by a signature instead.
 */
const CUSTOMER_ROUTES = [
  'src/app/api/billing/checkout/route.ts',
  'src/app/api/billing/confirm/route.ts',
  'src/app/api/billing/subscription/route.ts',
]

const WEBHOOK_ROUTE = 'src/app/api/billing/webhook/[provider]/route.ts'

describe('billing route contract', () => {
  it('registers every billing route in the catalog', () => {
    const registered = new Set(ROUTE_CATALOG.map((entry) => entry.routeFile))
    for (const route of [...CUSTOMER_ROUTES, WEBHOOK_ROUTE]) {
      expect(registered.has(route), `${route} missing from route catalog`).toBe(true)
    }
  })

  it('requires a signed-in user on every customer-facing billing route', async () => {
    const { readFile } = await import('node:fs/promises')
    for (const route of CUSTOMER_ROUTES) {
      const source = await readFile(route, 'utf8')
      expect(source, `${route} must call requireUserAuth`).toContain('requireUserAuth')
    }
  })

  it('never trusts the webhook body for the amount', async () => {
    const { readFile } = await import('node:fs/promises')
    const source = await readFile(WEBHOOK_ROUTE, 'utf8')
    // The route must re-verify with the provider rather than settling from the payload.
    expect(source).toContain('verifyWebhookSignature')
    expect(source).toContain('provider.verify(reference)')
  })

  it('prices checkout from our own catalog, not the request body', async () => {
    const { readFile } = await import('node:fs/promises')
    const source = await readFile('src/app/api/billing/checkout/route.ts', 'utf8')
    expect(source).toContain('PLANS.find')
    // An amount taken from the request would let a customer set their own price. The only
    // amount read is a top-up's dollar figure, and that passes through parseTopUpAmount.
    expect(source).not.toMatch(/body\?\.\s*amount(?!Usd\))/)
    expect(source).toContain('parseTopUpAmount(body?.amountUsd)')
  })

  it('prices top-ups from the customer plan on the server and keeps them for subscribers', async () => {
    const { readFile } = await import('node:fs/promises')
    const source = await readFile('src/app/api/billing/checkout/route.ts', 'utf8')
    // The plan (and so the credits per dollar) comes from the account, never the request.
    expect(source).toContain('planId = await getUserPlanId(session.user.id)')
    expect(source).toContain("reason: 'subscribers_only'")
    expect(source).toContain("purpose,")
  })

  it('tells the account page who can top up from the same plan checkout uses', async () => {
    const { readFile } = await import('node:fs/promises')
    const source = await readFile('src/app/api/billing/subscription/route.ts', 'utf8')
    expect(source).toContain('getUserPlanId(userId)')
    expect(source).toContain('topUp: isTopUpPlan(effectivePlan)')
  })

  it('keeps the webhook the only public billing route', async () => {
    const { PUBLIC_ROUTE_ALLOWLIST } = await import('../../../../scripts/guards/api-route-contract-guard.mjs')
    expect(PUBLIC_ROUTE_ALLOWLIST.has(WEBHOOK_ROUTE)).toBe(true)
    for (const route of CUSTOMER_ROUTES) {
      expect(PUBLIC_ROUTE_ALLOWLIST.has(route), `${route} must not be public`).toBe(false)
    }
  })
})

describe('public plan prices route', () => {
  it('prices naira at the flat rate, other currencies from the live rate, and gives USD-only countries no local price', async () => {
    const { __setRatesForTests } = await import('@/lib/payments/fx')
    __setRatesForTests({ GHS: 11.57, KES: 129.5 })
    const { GET } = await import('@/app/api/billing/prices/route')
    const call = async (country: string) => {
      const { NextRequest } = await import('next/server')
      const res = await GET(new NextRequest(`https://nucleusart.studio/api/billing/prices?country=${country}`), { params: Promise.resolve({}) } as never)
      return (await res.json()) as { local: { currency: string; plans: Record<string, { monthly: number }> } | null }
    }
    expect((await call('NG')).local).toMatchObject({ currency: 'NGN', plans: { starter: { monthly: 28_500 } } })
    expect((await call('GH')).local).toMatchObject({ currency: 'GHS', plans: { starter: { monthly: 230 } } })
    expect((await call('OTHER')).local).toBeNull()
  })

  it('shares the local rate per dollar so any top-up amount can be previewed', async () => {
    const { __setRatesForTests } = await import('@/lib/payments/fx')
    __setRatesForTests({ GHS: 11.57 })
    const { GET } = await import('@/app/api/billing/prices/route')
    const { NextRequest } = await import('next/server')
    const read = async (country: string) => {
      const res = await GET(new NextRequest(`https://nucleusart.studio/api/billing/prices?country=${country}`), { params: Promise.resolve({}) } as never)
      return ((await res.json()) as { local: { perUsd: number } }).local.perUsd
    }
    expect(await read('NG')).toBe(1500)
    // Market rate plus the 3% buffer, exactly as checkout charges it.
    expect(await read('GH')).toBeCloseTo(11.57 * 1.03, 6)
  })

  it('is registered as a deliberate public route', async () => {
    const { readFile } = await import('node:fs/promises')
    const guard = await readFile('scripts/guards/api-route-contract-guard.mjs', 'utf8')
    expect(guard).toContain("'src/app/api/billing/prices/route.ts'")
  })
})
