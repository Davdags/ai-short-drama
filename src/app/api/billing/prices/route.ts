import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { PLANS } from '@/app/[locale]/pricing/plans'
import { findPayCountry } from '@/lib/payments/countries'
import { countryPrice, fixedUsdRate, getUsdRates, usdToLocalRate } from '@/lib/payments/fx'

/**
 * GET /api/billing/prices?country=GH  (public — the pricing page shows it to visitors)
 * Plan prices in the country's own currency, from the same rate checkout charges.
 * Countries without local checkout get { local: null }: they pay in USD.
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const country = findPayCountry(request.nextUrl.searchParams.get('country'))
  if (!country) return NextResponse.json({ success: true, local: null })

  const { rates, updatedAt } = await getUsdRates()
  if (!fixedUsdRate(country.currency) && !rates[country.currency]) return NextResponse.json({ success: true, local: null })

  return NextResponse.json({
    success: true,
    local: {
      country: country.code,
      currency: country.currency,
      symbol: country.symbol,
      methods: country.localMethods,
      rateUpdatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
      // Local units per US dollar as charged (fixed rate, or market rate plus buffer), so a
      // custom top-up amount can be previewed with the same rounding checkout uses.
      perUsd: usdToLocalRate(country, rates),
      plans: Object.fromEntries(PLANS.filter((plan) => plan.monthlyPrice > 0).map((plan) => [plan.id, {
        monthly: countryPrice(plan.monthlyPrice, country, rates),
        yearly: countryPrice(plan.yearlyPrice, country, rates),
      }])),
    },
  }, { headers: { 'Cache-Control': 'public, max-age=600' } })
})
