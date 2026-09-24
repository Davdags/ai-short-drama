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
    // An amount taken from the request would let a customer set their own price.
    expect(source).not.toMatch(/body\?\.\s*amount/)
  })

  it('keeps the webhook the only public billing route', async () => {
    const { PUBLIC_ROUTE_ALLOWLIST } = await import('../../../../scripts/guards/api-route-contract-guard.mjs')
    expect(PUBLIC_ROUTE_ALLOWLIST.has(WEBHOOK_ROUTE)).toBe(true)
    for (const route of CUSTOMER_ROUTES) {
      expect(PUBLIC_ROUTE_ALLOWLIST.has(route), `${route} must not be public`).toBe(false)
    }
  })
})
