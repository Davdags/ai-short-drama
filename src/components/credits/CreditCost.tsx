'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'

/**
 * Shows what a generation will cost in credits before the customer clicks, using the same
 * pricing as billing (/api/user/price-quote). Renders nothing while charging is off.
 */

export interface QuoteItem {
  apiType: 'image' | 'video' | 'voice' | 'lip-sync'
  /** Empty when usesProjectModel is set: the server fills in the project's configured model. */
  model: string
  quantity?: number
  metadata?: Record<string, unknown>
  usesProjectModel?: boolean
  projectId?: string
  /** With usesProjectModel: which of the project's image models (default storyboard). */
  projectModelField?: 'characterModel' | 'locationModel' | 'storyboardModel'
}

interface Quote {
  totalCredits: number
  balance: number
  charging: boolean
  affordable: boolean
}

const cache = new Map<string, Quote>()

export function useCreditQuote(items: QuoteItem[] | null): Quote | null {
  const key = useMemo(() => {
    const usable = items && items.length > 0
      && items.every((item) => item.model || (item.usesProjectModel && item.projectId))
    return usable ? JSON.stringify(items) : ''
  }, [items])
  const [quote, setQuote] = useState<Quote | null>(() => (key ? cache.get(key) ?? null : null))

  useEffect(() => {
    if (!key) return setQuote(null)
    const cached = cache.get(key)
    if (cached) setQuote(cached)

    let cancelled = false
    const timer = setTimeout(() => {
      apiFetch('/api/user/price-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: JSON.parse(key) }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(String(res.status))
          const data = await res.json() as Quote
          cache.set(key, data)
          if (!cancelled) setQuote(data)
        })
        .catch(() => undefined)
    }, 250)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [key])

  return quote
}

/** Inline price, e.g. "126 credits". Hidden when charging is off or the price is unknown. */
export function CreditCost({ items, className = '', prefix = '' }: { items: QuoteItem[] | null; className?: string; prefix?: string }) {
  const quote = useCreditQuote(items)
  if (!quote?.charging || quote.totalCredits <= 0) return null
  return (
    <span className={`whitespace-nowrap text-[11px] ${quote.affordable ? 'text-[var(--glass-text-tertiary)]' : 'text-red-500'} ${className}`}>
      {prefix}{quote.totalCredits.toLocaleString('en-US')} credits
      {!quote.affordable && ' · not enough'}
    </span>
  )
}

/** True when charging is on and the balance cannot cover these items (for disabling buttons). */
export function useCannotAfford(items: QuoteItem[] | null): boolean {
  const quote = useCreditQuote(items)
  return Boolean(quote?.charging && !quote.affordable)
}
