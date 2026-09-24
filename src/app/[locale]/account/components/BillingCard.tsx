'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { apiFetch } from '@/lib/api-fetch'
import { trackConversion } from '@/lib/marketing/pixels'

interface SubscriptionInfo {
  planId: string
  cycle: string
  status: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  monthlyCredits: number
}

interface PaymentRow {
  reference: string
  amount: number
  currency: string
  planId: string | null
  cycle: string | null
  paidAt: string | null
  creditsGranted: number
}

const PLAN_NAMES: Record<string, string> = {
  free: 'Free', starter: 'Starter', pro: 'Pro', studio: 'Studio',
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatMoney(amount: number, currency: string): string {
  const symbol = currency === 'NGN' ? '₦' : '$'
  return `${symbol}${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

/** Plan, renewal and receipts — plus confirming a payment the customer has just returned from. */
export function BillingCard() {
  const params = useSearchParams()
  const returnedReference = params?.get('payment') ?? null

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [confirming, setConfirming] = useState(Boolean(returnedReference))
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await apiFetch('/api/billing/subscription')
      if (!response.ok) return
      const data = await response.json() as { subscription: SubscriptionInfo | null; payments: PaymentRow[] }
      setSubscription(data.subscription)
      setPayments(data.payments ?? [])
    } catch {
      // Leave the card showing Free rather than an error; the plan is not critical to read.
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // Returning from checkout: ask the server to verify with the provider before showing a result.
  useEffect(() => {
    if (!returnedReference) return
    let cancelled = false

    apiFetch('/api/billing/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: returnedReference }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null) as
          { status?: string; planId?: string; applied?: boolean; alreadySettled?: boolean } | null
        if (cancelled) return

        if (data?.status === 'success') {
          setNotice({ tone: 'ok', text: 'Payment received — your plan is active and your credits have been added.' })
          if (data.applied) {
            trackConversion('purchase', { planId: data.planId, reference: returnedReference })
          }
          void load()
        } else if (data?.status === 'pending') {
          setNotice({ tone: 'warn', text: 'Your payment is still being confirmed. This page will update within a few minutes.' })
        } else {
          setNotice({ tone: 'warn', text: 'That payment did not complete. You have not been charged for an unsuccessful attempt.' })
        }
      })
      .catch(() => {
        if (!cancelled) setNotice({ tone: 'warn', text: 'Could not confirm the payment just now. If you were charged, it will be applied automatically within a few minutes.' })
      })
      .finally(() => { if (!cancelled) setConfirming(false) })

    return () => { cancelled = true }
  }, [returnedReference, load])

  const planName = PLAN_NAMES[subscription?.planId ?? 'free'] ?? 'Free'
  const isPaid = Boolean(subscription) && subscription?.planId !== 'free'

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#737373]">Plan</p>
          <p className="mt-1 text-2xl font-bold text-[#171717]">{loaded ? planName : '—'}</p>
          {isPaid && subscription && (
            <p className="mt-1 text-sm text-[#737373]">
              {subscription.monthlyCredits.toLocaleString('en-US')} credits per month · billed {subscription.cycle}
              <br />
              {subscription.cancelAtPeriodEnd ? 'Ends' : 'Renews'} {formatDate(subscription.currentPeriodEnd)}
            </p>
          )}
        </div>
        <Link
          href={{ pathname: '/pricing' }}
          className="rounded-xl bg-gradient-to-r from-[#8020fc] to-[#5b3df5] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
        >
          {isPaid ? 'Change plan' : 'Upgrade'}
        </Link>
      </div>

      {confirming && (
        <p className="mt-4 rounded-lg bg-[#f5f5f5] px-4 py-3 text-sm text-[#525252]">Confirming your payment…</p>
      )}

      {notice && (
        <p
          role="status"
          className={`mt-4 rounded-lg px-4 py-3 text-sm ${
            notice.tone === 'ok'
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-amber-50 text-amber-900'
          }`}
        >
          {notice.text}
        </p>
      )}

      {payments.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#737373]">Payments</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-[#ececec] text-left text-xs uppercase tracking-wide text-[#a3a3a3]">
                  <th className="py-2 font-semibold">Date</th>
                  <th className="py-2 font-semibold">Plan</th>
                  <th className="py-2 font-semibold">Amount</th>
                  <th className="py-2 font-semibold">Credits</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.reference} className="border-b border-[#f5f5f5] last:border-b-0">
                    <td className="py-2.5 text-[#404040]">{formatDate(payment.paidAt)}</td>
                    <td className="py-2.5 text-[#404040]">
                      {PLAN_NAMES[payment.planId ?? ''] ?? '—'}
                      {payment.cycle ? <span className="text-[#a3a3a3]"> · {payment.cycle}</span> : null}
                    </td>
                    <td className="py-2.5 text-[#404040]">{formatMoney(payment.amount, payment.currency)}</td>
                    <td className="py-2.5 text-[#404040]">{payment.creditsGranted.toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
