'use client'

import { useEffect, useRef, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { apiFetch } from '@/lib/api-fetch'
import { useCheckout } from '@/components/billing/useCheckout'
import { PayChoiceControls, usePayChoice } from '@/components/billing/PayChoice'
import { formatLocalPrice, roundLocalPrice } from '@/lib/payments/countries'
import {
  TOP_UP_CREDITS_PER_USD,
  TOP_UP_MIN_USD,
  TOP_UP_PRESETS_USD,
  isTopUpPlan,
  parseTopUpAmount,
  topUpAmountMessage,
  topUpCredits,
} from '@/lib/billing/top-up'

const PLAN_NAMES: Record<string, string> = { starter: 'Starter', pro: 'Pro', studio: 'Studio' }

const CHIP = 'rounded-xl border px-3 py-2.5 text-left transition-all'
const CHIP_ON = 'border-[#8020fc] bg-[#8020fc]/[0.06] ring-1 ring-[#8020fc]'
const CHIP_OFF = 'border-[#e5e5e5] bg-white hover:border-[#8020fc]/50'

/**
 * One-off credit top-ups for subscribers, at their plan's rate. Anyone else is pointed to
 * the plans. The page links here as /account#top-up (pricing page, out-of-credits prompt).
 */
export function TopUpCard() {
  const [planId, setPlanId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [preset, setPreset] = useState<number | 'other'>(20)
  const [custom, setCustom] = useState('')
  const { startTopUp, pendingPlan, error, clearError } = useCheckout()
  const choice = usePayChoice(clearError)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiFetch('/api/billing/subscription')
      .then(async (res) => (res.ok ? (await res.json() as { topUp?: { planId: string } | null }).topUp?.planId ?? 'free' : 'free'))
      .then(setPlanId)
      .catch(() => setPlanId('free'))
      .finally(() => setLoaded(true))
  }, [])

  // Arriving from "Top up" elsewhere: the card renders after data loads, so scroll once it is there.
  useEffect(() => {
    if (loaded && window.location.hash === '#top-up') cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [loaded])

  const subscriber = isTopUpPlan(planId)
  const parsed = preset === 'other' ? parseTopUpAmount(custom) : parseTopUpAmount(preset)
  const usd = parsed.ok ? parsed.usd : null
  const credits = usd !== null ? topUpCredits(planId, usd) : 0

  const { country, localPrices, payMode, usdMethod } = choice
  const priceLabel = (amountUsd: number): string => {
    if (payMode === 'local' && country && localPrices?.perUsd) {
      return formatLocalPrice(roundLocalPrice(amountUsd * localPrices.perUsd, country.roundTo), country)
    }
    return `$${amountUsd.toLocaleString('en-US')}`
  }

  return (
    <div id="top-up" ref={cardRef} className="scroll-mt-24">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#737373]">Buy credits</p>

      {!loaded ? (
        <p className="mt-2 text-sm text-[#a3a3a3]">Loading…</p>
      ) : !subscriber ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-md text-sm text-[#525252]">
            Top-ups are for subscribers. Pick a plan to get your monthly credits — then you can add more any time from ${TOP_UP_MIN_USD}, with a one-off payment.
          </p>
          <Link
            href={{ pathname: '/pricing' }}
            className="rounded-xl bg-gradient-to-r from-[#8020fc] to-[#5b3df5] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
          >
            See plans
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-[#525252]">
            One-off payment, no subscription. Credits never expire. Your {PLAN_NAMES[planId as string]} rate:{' '}
            <strong>{TOP_UP_CREDITS_PER_USD[planId as keyof typeof TOP_UP_CREDITS_PER_USD]} credits per $1</strong>.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TOP_UP_PRESETS_USD.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => { setPreset(amount); clearError() }}
                className={`${CHIP} ${preset === amount ? CHIP_ON : CHIP_OFF}`}
              >
                <span className="block text-base font-bold text-[#171717]">{priceLabel(amount)}</span>
                <span className="block text-xs text-[#737373]">{topUpCredits(planId, amount).toLocaleString('en-US')} credits</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setPreset('other'); clearError() }}
              className={`${CHIP} ${preset === 'other' ? CHIP_ON : CHIP_OFF}`}
            >
              <span className="block text-base font-bold text-[#171717]">Other</span>
              <span className="block text-xs text-[#737373]">From ${TOP_UP_MIN_USD}</span>
            </button>
          </div>

          {preset === 'other' && (
            <label className="mt-3 flex items-center gap-2 text-sm text-[#525252]">
              Amount in US dollars
              <span className="flex items-center rounded-lg border border-[#e5e5e5] bg-white px-3 focus-within:border-[#8020fc]">
                <span className="text-[#a3a3a3]">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={TOP_UP_MIN_USD}
                  step={1}
                  value={custom}
                  onChange={(event) => { setCustom(event.target.value); clearError() }}
                  placeholder="25"
                  className="w-24 bg-transparent py-1.5 pl-1 text-sm font-medium text-[#171717] outline-none"
                  autoFocus
                />
              </span>
            </label>
          )}
          {preset === 'other' && custom !== '' && !parsed.ok && (
            <p className="mt-1 text-xs text-red-600">{topUpAmountMessage(parsed.reason)}</p>
          )}

          <div className="mt-5 rounded-xl bg-[#fafafa] p-4">
            <PayChoiceControls choice={choice} compact />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#525252]">
              {usd !== null
                ? <><strong className="text-[#171717]">{credits.toLocaleString('en-US')} credits</strong> for {priceLabel(usd)}</>
                : 'Choose an amount'}
            </p>
            <button
              type="button"
              disabled={usd === null || pendingPlan === 'top-up'}
              onClick={() => {
                if (usd === null) return
                void startTopUp({
                  amountUsd: usd,
                  country: country?.code,
                  pay: payMode,
                  provider: payMode === 'usd' ? usdMethod : undefined,
                })
              }}
              className="rounded-xl bg-gradient-to-r from-[#8020fc] to-[#5b3df5] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingPlan === 'top-up' ? 'Opening checkout…' : usd !== null ? `Pay ${priceLabel(usd)}` : 'Pay'}
            </button>
          </div>
          {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
        </>
      )}
    </div>
  )
}
