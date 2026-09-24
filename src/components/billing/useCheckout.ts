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
 * Starts a plan checkout or a credit top-up and sends the customer to the provider's payment
 * page. The price is decided server-side from our catalog, so nothing here can change it.
 */
export function useCheckout() {
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /** Posts the checkout request, then leaves for the payment page (or shows why it could not). */
  const go = useCallback(async (key: string, body: Record<string, unknown>, tracking: { value?: number; planId?: string }) => {
    setError(null)
    setPendingPlan(key)

    try {
      const response = await apiFetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
        value: tracking.value,
        currency: 'USD',
        planId: tracking.planId,
        reference: data.reference,
      })

      // Leaving the app entirely, so a full navigation rather than a router push.
      window.location.href = data.authorizationUrl
    } catch {
      setPendingPlan(null)
      setError('Could not reach the payment service. Please check your connection and try again.')
    }
  }, [])

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
    await go(input.planId, { planId: input.planId, cycle: input.cycle, country: input.country, pay: input.pay, provider: input.provider }, { value: input.valueUsd, planId: input.planId })
  }, [go])

  /** A one-off credit top-up; the server works out the credits from the customer's plan. */
  const startTopUp = useCallback(async (input: {
    amountUsd: number
    country?: string
    pay: 'local' | 'usd'
    provider?: UsdPaymentMethod
  }) => {
    await go('top-up', { purpose: 'credit_pack', amountUsd: input.amountUsd, country: input.country, pay: input.pay, provider: input.provider }, { value: input.amountUsd, planId: 'top-up' })
  }, [go])

  return { startCheckout, startTopUp, pendingPlan, error, clearError: () => setError(null) }
}
