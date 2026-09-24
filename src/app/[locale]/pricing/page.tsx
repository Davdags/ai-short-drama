'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Caveat } from 'next/font/google'
import Navbar from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Link } from '@/i18n/navigation'
import { AppIcon } from '@/components/ui/icons'
import { HIGHLIGHTS, PLANS, yearlySavingPercent, type BillingCycle, type PricingPlan } from './plans'
import { useCheckout, type UsdPaymentMethod } from '@/components/billing/useCheckout'
import { OTHER_COUNTRY_CODE, PAY_COUNTRIES, findPayCountry, formatLocalPrice, guessPayCountryCode, type PayCountry } from '@/lib/payments/countries'
import { apiFetch } from '@/lib/api-fetch'

const handwriting = Caveat({ subsets: ['latin'], weight: ['500'] })

const GRADIENT_TEXT = 'bg-gradient-to-r from-[#8020fc] via-[#a13cf0] to-[#5b3df5] bg-clip-text text-transparent'
const PRIMARY_BUTTON = 'bg-gradient-to-r from-[#8020fc] to-[#5b3df5] text-white shadow-lg shadow-[#8020fc]/25 hover:shadow-xl hover:shadow-[#8020fc]/35 hover:brightness-110'
const OUTLINE_BUTTON = 'border border-[#8020fc]/40 text-[#7019e0] hover:bg-[#8020fc]/[0.06] hover:border-[#8020fc]'

const COUNTRY_KEY = 'nucleus:pay-country'

interface LocalPrices {
  country: string
  currency: string
  symbol: string
  methods: string
  plans: Record<string, { monthly: number; yearly: number }>
}

/** What the price reads as: dollars, or the visitor's own currency from today's rate. */
type PriceDisplay = { mode: 'usd' } | { mode: 'local'; country: PayCountry; prices: LocalPrices }

/** Display only — the server recomputes the real charge from its own catalog and rate. */
function formatPrice(plan: PricingPlan, period: 'monthly' | 'yearly' | 'twelveMonths', display: PriceDisplay): string {
  const usd = period === 'yearly' ? plan.yearlyPrice : period === 'twelveMonths' ? plan.monthlyPrice * 12 : plan.monthlyPrice
  if (display.mode === 'local' && usd > 0) {
    const local = display.prices.plans[plan.id]
    if (local) {
      const amount = period === 'yearly' ? local.yearly : period === 'twelveMonths' ? local.monthly * 12 : local.monthly
      return formatLocalPrice(amount, display.country)
    }
  }
  return '$' + usd.toLocaleString('en-US')
}

function PlanPrice({ plan, cycle, display }: { plan: PricingPlan; cycle: BillingCycle; display: PriceDisplay }) {
  const isYearly = cycle === 'yearly'
  const saving = yearlySavingPercent(plan)

  return (
    <div className="mt-6 min-h-[88px]">
      <div className="flex items-baseline gap-2">
        <span className={`${display.mode === 'local' && plan.monthlyPrice > 0 ? 'text-4xl' : 'text-5xl'} font-bold tracking-tight text-[#171717]`}>{formatPrice(plan, isYearly ? 'yearly' : 'monthly', display)}</span>
        <span className="text-[#737373]">/ {isYearly ? 'year' : 'month'}</span>
      </div>
      {plan.priceNote ? (
        <p className="mt-2 text-sm text-[#737373]">{plan.priceNote}</p>
      ) : isYearly && saving > 0 ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-[#a3a3a3] line-through">{formatPrice(plan, 'twelveMonths', display)}</span>
          <span className="rounded-md bg-[#8020fc]/10 px-2 py-0.5 text-xs font-semibold text-[#7019e0]">Save {saving}%</span>
        </div>
      ) : null}
    </div>
  )
}

function PlanCard({ plan, cycle, display, signedIn, busy, onCheckout }: {
  plan: PricingPlan
  cycle: BillingCycle
  display: PriceDisplay
  signedIn: boolean
  busy: boolean
  onCheckout: () => void
}) {
  const isPaid = plan.monthlyPrice > 0
  const buttonStyle = plan.highlighted ? PRIMARY_BUTTON : OUTLINE_BUTTON
  const buttonBase = 'block w-full rounded-xl px-4 py-3 text-center text-sm font-semibold transition-all'

  return (
    <div
      className={`relative flex flex-col rounded-2xl bg-white p-7 ${
        plan.highlighted
          ? 'border-2 border-[#8020fc] shadow-[0_20px_60px_-15px_rgba(128,32,252,0.35)]'
          : 'border border-[#e5e5e5] shadow-sm'
      }`}
    >
      {plan.highlighted && (
        <span className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-[#8020fc] to-[#5b3df5] px-4 py-1 text-xs font-semibold text-white shadow-lg shadow-[#8020fc]/30">
          <AppIcon name="sparkles" className="h-3.5 w-3.5" />
          Most Popular
        </span>
      )}

      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8020fc]/10">
        <AppIcon name={plan.icon} className="h-6 w-6 text-[#8020fc]" />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-[#171717]">{plan.name}</h2>
      <p className="mt-1 text-sm text-[#737373]">{plan.tagline}</p>

      <PlanPrice plan={plan} cycle={cycle} display={display} />

      <div className="mt-5">
        {signedIn && isPaid ? (
          <button
            type="button"
            onClick={onCheckout}
            disabled={busy}
            className={`${buttonBase} ${buttonStyle} disabled:cursor-wait disabled:opacity-70`}
          >
            {busy ? 'Opening checkout…' : plan.cta}
          </button>
        ) : (
          <Link
            href={{ pathname: signedIn ? '/workspace' : '/auth/signup' }}
            className={`${buttonBase} ${buttonStyle}`}
          >
            {signedIn ? 'Start Creating' : plan.cta}
          </Link>
        )}
      </div>

      <ul className="mt-7 flex flex-1 flex-col gap-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-[#404040]">
            <AppIcon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-[#8020fc]" />
            {feature}
          </li>
        ))}
      </ul>

      <p className={`${handwriting.className} mt-8 -rotate-2 text-center text-2xl text-[#8020fc]/75`}>
        {plan.footnote}
      </p>
    </div>
  )
}

export default function PricingPage() {
  const { data: session } = useSession()
  const [cycle, setCycle] = useState<BillingCycle>('yearly')
  const [countryCode, setCountryCode] = useState<string>(OTHER_COUNTRY_CODE)
  const [pay, setPay] = useState<'local' | 'usd'>('local')
  const [usdMethod, setUsdMethod] = useState<UsdPaymentMethod>('whop')
  const [localPrices, setLocalPrices] = useState<LocalPrices | null>(null)
  const { startCheckout, pendingPlan, error, clearError } = useCheckout()

  // Where the visitor pays from: their earlier choice, else a guess from the device time zone.
  useEffect(() => {
    let saved: string | null = null
    try { saved = window.localStorage.getItem(COUNTRY_KEY) } catch { /* private mode */ }
    let guess: string = OTHER_COUNTRY_CODE
    try { guess = guessPayCountryCode(Intl.DateTimeFormat().resolvedOptions().timeZone) } catch { /* old browser */ }
    setCountryCode(saved && (saved === OTHER_COUNTRY_CODE || findPayCountry(saved)) ? saved : guess)
  }, [])

  const country = findPayCountry(countryCode)
  useEffect(() => {
    setLocalPrices(null)
    if (!country) return
    let cancelled = false
    apiFetch(`/api/billing/prices?country=${country.code}`)
      .then(async (res) => (res.ok ? (await res.json() as { local: LocalPrices | null }).local : null))
      .then((local) => { if (!cancelled) setLocalPrices(local) })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [country])

  const chooseCountry = (code: string) => {
    setCountryCode(code)
    setPay('local')
    clearError()
    try { window.localStorage.setItem(COUNTRY_KEY, code) } catch { /* ignore */ }
  }

  const localAvailable = Boolean(country && localPrices)
  const payMode: 'local' | 'usd' = localAvailable && pay === 'local' ? 'local' : 'usd'
  const display: PriceDisplay = payMode === 'local' && country && localPrices
    ? { mode: 'local', country, prices: localPrices }
    : { mode: 'usd' }
  const toggleBase = 'rounded-full px-7 py-2.5 text-sm font-medium transition-all'

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="relative z-50">
        <Navbar />
      </div>

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-48 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#8020fc]/10 blur-[140px]" />
        <div className="pointer-events-none absolute top-[460px] -right-40 h-[400px] w-[500px] rounded-full bg-[#5b3df5]/[0.07] blur-[140px]" />

        <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:pt-24">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8020fc]">Pricing</p>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#171717] sm:text-6xl">
                Create More. <span className={GRADIENT_TEXT}>Spend Less.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-[#737373]">
                Get the same powerful features for up to 50% less with yearly billing.
              </p>
              <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
                {['Save up to 50%', 'Same great features', 'Cancel anytime'].map((item) => (
                  <span key={item} className="flex items-center gap-2 text-sm text-[#404040]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8020fc] text-white">
                      <AppIcon name="check" className="h-3 w-3" />
                    </span>
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <p className={`${handwriting.className} hidden -rotate-6 text-4xl text-[#8020fc]/80 lg:block`}>
              Turn ideas<br />into viral stories.
            </p>
          </div>

          <div className="mt-12 flex justify-center">
            <div className="flex items-center gap-1 rounded-full border border-[#e5e5e5] bg-[#fafafa] p-1.5">
              <button
                type="button"
                onClick={() => setCycle('monthly')}
                className={`${toggleBase} ${cycle === 'monthly' ? PRIMARY_BUTTON : 'text-[#737373] hover:text-[#171717]'}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setCycle('yearly')}
                className={`${toggleBase} ${cycle === 'yearly' ? PRIMARY_BUTTON : 'text-[#737373] hover:text-[#171717]'}`}
              >
                Yearly
              </button>
              <span className="mx-2 hidden rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline">
                Save up to 50%
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[#525252]">
              Paying from
              <select
                value={countryCode}
                onChange={(event) => chooseCountry(event.target.value)}
                className="rounded-lg border border-[#e5e5e5] bg-white px-3 py-1.5 text-sm font-medium text-[#171717] outline-none focus:border-[#8020fc]"
              >
                {PAY_COUNTRIES.map((entry) => <option key={entry.code} value={entry.code}>{entry.name}</option>)}
                <option value={OTHER_COUNTRY_CODE}>Another country</option>
              </select>
            </label>
            {localAvailable && country && (
            <div className="flex items-center gap-1 rounded-full border border-[#e5e5e5] bg-white p-1">
              {(['local', 'usd'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setPay(mode); clearError() }}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    payMode === mode ? 'bg-[#8020fc] text-white' : 'text-[#737373] hover:text-[#171717]'
                  }`}
                >
                  {mode === 'local' ? `Pay in ${country.currency}` : 'Pay in USD'}
                </button>
              ))}
            </div>
            )}
            <p className="max-w-md text-center text-xs text-[#a3a3a3]">
              {payMode === 'local' && country
                ? (country.code === 'NG'
                  ? `Pay in naira by ${country.localMethods}.`
                  : `Pay in ${country.currency} by ${country.localMethods}. Prices follow today’s exchange rate.`)
                : usdMethod === 'whop'
                  ? 'Secure payment in US dollars by card, Apple Pay, Google Pay or crypto.'
                  : 'Pay in US dollars by bank transfer, mobile money or card via Flutterwave.'}
            </p>
            {payMode === 'usd' && (
              <button
                type="button"
                onClick={() => { setUsdMethod(usdMethod === 'whop' ? 'flutterwave' : 'whop'); clearError() }}
                className="text-xs font-medium text-[#8020fc] hover:underline"
              >
                {usdMethod === 'whop' ? 'Other payment methods' : 'Pay by card or crypto instead'}
              </button>
            )}
            {error && (
              <p role="alert" className="max-w-md text-center text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                cycle={cycle}
                display={display}
                signedIn={Boolean(session)}
                busy={pendingPlan === plan.id}
                onCheckout={() => void startCheckout({
                  planId: plan.id,
                  cycle,
                  country: country?.code,
                  pay: payMode,
                  provider: payMode === 'usd' ? usdMethod : undefined,
                  valueUsd: cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice,
                })}
              />
            ))}
          </div>

          <div className="mt-10 grid gap-6 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-6 sm:grid-cols-2 lg:grid-cols-4">
            {HIGHLIGHTS.map((item) => (
              <div key={item.title} className="flex items-center gap-4">
                <AppIcon name={item.icon} className="h-8 w-8 shrink-0 text-[#8020fc]" />
                <div>
                  <p className="text-sm font-semibold text-[#171717]">{item.title}</p>
                  <p className="text-sm text-[#737373]">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
