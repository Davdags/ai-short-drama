import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { isErrorResponse, requireUserAuth } from '@/lib/api-auth'
import { getPublicBaseUrl } from '@/lib/env'
import { PLANS } from '@/app/[locale]/pricing/plans'
import { isProviderConfigured, resolveCheckout, type PayMode } from '@/lib/payments'
import { findPayCountry, payCountryForCurrency } from '@/lib/payments/countries'
import { localPrice } from '@/lib/payments/fx'
import { isPaidPlan, newPaymentReference, type BillingCycle } from '@/lib/payments/service'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/billing/checkout
 *   { planId, cycle, country, pay: 'local' | 'usd', provider? }
 *   country: a code from countries.ts; pay 'local' charges its currency (Paystack for
 *   Nigeria, Flutterwave elsewhere); 'usd' charges dollars (provider 'whop' | 'flutterwave').
 *   Older clients sent { currency: 'NGN' | 'USD' } — still accepted.
 *
 * Creates a pending Payment and returns where to send the customer to pay. The price is
 * taken from our own catalog, never from the request, so it cannot be tampered with.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const body = await request.json().catch(() => null) as {
    planId?: unknown
    cycle?: unknown
    currency?: unknown
    provider?: unknown
    country?: unknown
    pay?: unknown
  } | null

  const planId = typeof body?.planId === 'string' ? body.planId : ''
  const cycle: BillingCycle = body?.cycle === 'yearly' ? 'yearly' : 'monthly'
  const legacyCurrency = typeof body?.currency === 'string' ? body.currency.toUpperCase() : null
  const country = findPayCountry(typeof body?.country === 'string' ? body.country : null)
    ?? (legacyCurrency && legacyCurrency !== 'USD' ? payCountryForCurrency(legacyCurrency) : null)
  const pay: PayMode = body?.pay === 'local' || (body?.pay === undefined && legacyCurrency && legacyCurrency !== 'USD') ? 'local' : 'usd'

  if (!isPaidPlan(planId)) throw new ApiError('INVALID_PARAMS', { field: 'planId', reason: 'unknown_plan' })
  if (pay === 'local' && !country) throw new ApiError('INVALID_PARAMS', { field: 'country', reason: 'unsupported' })

  const plan = PLANS.find((entry) => entry.id === planId)
  if (!plan) throw new ApiError('INVALID_PARAMS', { field: 'planId', reason: 'unknown_plan' })

  const usd = cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
  if (!usd || usd <= 0) throw new ApiError('INVALID_PARAMS', { field: 'planId', reason: 'not_purchasable' })

  const { provider, currency } = resolveCheckout({
    country,
    pay,
    preferredUsdProvider: typeof body?.provider === 'string' ? body.provider : null,
  })
  if (!isProviderConfigured(provider.id)) {
    throw new ApiError('MISSING_CONFIG', { reason: 'payments_not_configured', provider: provider.id })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, name: true } })
  if (!user?.email) throw new ApiError('INVALID_PARAMS', { field: 'email', reason: 'missing_account_email' })

  // Priced here from our own catalog and today's rate — never taken from the request.
  const amount = pay === 'local' && country ? await localPrice(usd, country) : Number(usd.toFixed(2))
  const reference = newPaymentReference()

  await prisma.payment.create({
    data: {
      userId: session.user.id,
      provider: provider.id,
      providerRef: reference,
      purpose: 'subscription',
      planId,
      cycle,
      amount,
      currency,
      // The dollar plan price, so commissions and reports stay in USD whatever was charged.
      amountUsd: usd,
      status: 'pending',
    },
  })

  const checkout = await provider.createCheckout({
    reference,
    email: user.email,
    amount,
    currency,
    callbackUrl: `${getPublicBaseUrl()}/en/account?payment=${reference}`,
    metadata: { userId: session.user.id, username: user.name, planId, cycle },
  })

  // Whop looks the payment up by its own checkout id, not by our reference.
  if (checkout.providerRef && checkout.providerRef !== reference) {
    await prisma.payment.update({ where: { providerRef: reference }, data: { providerCheckoutId: checkout.providerRef } })
  }

  return NextResponse.json({
    success: true,
    reference,
    provider: provider.id,
    amount,
    currency,
    authorizationUrl: checkout.authorizationUrl,
  })
})
