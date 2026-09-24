'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'
import { OTHER_COUNTRY_CODE, PAY_COUNTRIES, findPayCountry, guessPayCountryCode, type PayCountry } from '@/lib/payments/countries'
import type { UsdPaymentMethod } from './useCheckout'

const COUNTRY_KEY = 'nucleus:pay-country'

export interface LocalPrices {
  country: string
  currency: string
  symbol: string
  methods: string
  /** Local units charged per US dollar before rounding, for amounts not in `plans`. */
  perUsd?: number
  plans: Record<string, { monthly: number; yearly: number }>
}

export interface PayChoice {
  countryCode: string
  country: PayCountry | null
  localPrices: LocalPrices | null
  localAvailable: boolean
  payMode: 'local' | 'usd'
  usdMethod: UsdPaymentMethod
  chooseCountry: (code: string) => void
  setPay: (mode: 'local' | 'usd') => void
  setUsdMethod: (method: UsdPaymentMethod) => void
}

/**
 * Where the customer pays from and how: their own currency (Paystack for Nigeria,
 * Flutterwave elsewhere in Africa) or US dollars (Whop, or Flutterwave for other methods).
 * Shared by the pricing page and credit top-ups so both offer exactly the same choices.
 */
export function usePayChoice(onChange?: () => void): PayChoice {
  const [countryCode, setCountryCode] = useState<string>(OTHER_COUNTRY_CODE)
  const [pay, setPayState] = useState<'local' | 'usd'>('local')
  const [usdMethod, setUsdMethodState] = useState<UsdPaymentMethod>('whop')
  const [localPrices, setLocalPrices] = useState<LocalPrices | null>(null)

  // Their earlier choice, else a guess from the device time zone.
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

  const localAvailable = Boolean(country && localPrices)
  return {
    countryCode,
    country,
    localPrices,
    localAvailable,
    payMode: localAvailable && pay === 'local' ? 'local' : 'usd',
    usdMethod,
    chooseCountry: (code) => {
      setCountryCode(code)
      setPayState('local')
      onChange?.()
      try { window.localStorage.setItem(COUNTRY_KEY, code) } catch { /* ignore */ }
    },
    setPay: (mode) => { setPayState(mode); onChange?.() },
    setUsdMethod: (method) => { setUsdMethodState(method); onChange?.() },
  }
}

/** Country picker, local/USD toggle, a line on how they will pay, and the USD method switch. */
export function PayChoiceControls({ choice, compact = false }: { choice: PayChoice; compact?: boolean }) {
  const { country, countryCode, localAvailable, payMode, usdMethod } = choice
  return (
    <div className={`flex flex-col gap-3 ${compact ? 'items-start' : 'items-center'}`}>
      <label className="flex items-center gap-2 text-sm text-[#525252]">
        Paying from
        <select
          value={countryCode}
          onChange={(event) => choice.chooseCountry(event.target.value)}
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
              onClick={() => choice.setPay(mode)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                payMode === mode ? 'bg-[#8020fc] text-white' : 'text-[#737373] hover:text-[#171717]'
              }`}
            >
              {mode === 'local' ? `Pay in ${country.currency}` : 'Pay in USD'}
            </button>
          ))}
        </div>
      )}
      <p className={`max-w-md text-xs text-[#a3a3a3] ${compact ? 'text-left' : 'text-center'}`}>
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
          onClick={() => choice.setUsdMethod(usdMethod === 'whop' ? 'flutterwave' : 'whop')}
          className="text-xs font-medium text-[#8020fc] hover:underline"
        >
          {usdMethod === 'whop' ? 'Other payment methods' : 'Pay by card or crypto instead'}
        </button>
      )}
    </div>
  )
}
