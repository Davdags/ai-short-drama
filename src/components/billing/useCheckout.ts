'use client'

import { useCallback, useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'
import { trackConversion } from '@/lib/marketing/pixels'

export type CheckoutCurrency = 'USD' | 'NGN'
/** How a USD customer pays: card (Whop) or bank transfer / mobile money (Flutterwave). */
export type UsdPaymentMethod = 'whop' | 'flutterwave'

interface CheckoutResponse {
  authorizationUrl?: string
  reference?: string
  amount?: number
  currency?: string
  error?: { message?: string }
  message?: string
}

/**
 * Starts a plan checkout and sends the customer to the provider's payment page.
 * The price is decided server-side from our catalog, so nothing here can change it.
 */
export function useCheckout() {
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startCheckout = useCallback(async (input: {
    planId: string
    cycle: 'monthly' | 'yearly'
    /** Country code from countries.ts (undefined: pay in USD). */
    country?: string
    /** 'local' charges the country's currency; 'usd' charges dollars. */
    pay: 'local' | 'usd'
    /** USD only: Whop (card, crypto) or Flutterwave (other methods). */
    provider?: UsdPaymentMethod
    /** USD price, reported to ad platforms before we leave the page. */
    valueUsd?: number
  }) => {
    setError(null)
    setPendingPlan(input.planId)

    try {
      const response = await apiFetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: input.planId, cycle: input.cycle, country: input.country, pay: input.pay, provider: input.provider }),
      })
      const data = await response.json().catch(() => null) as CheckoutResponse | null

      if (!response.ok || !data?.authorizationUrl) {
        setPendingPlan(null)
        setError(
          data?.error?.message
          || data?.message
          || 'Could not start checkout. Please try again, or contact support if it keeps happening.',
        )
        return
      }

      trackConversion('checkout_start', {
        value: input.valueUsd,
        currency: 'USD',
        planId: input.planId,
        reference: data.reference,
      })

      // Leaving the app entirely, so a full navigation rather than a router push.
      window.location.href = data.authorizationUrl
    } catch {
      setPendingPlan(null)
      setError('Could not reach the payment service. Please check your connection and try again.')
    }
  }, [])

  return { startCheckout, pendingPlan, error, clearError: () => setError(null) }
}
