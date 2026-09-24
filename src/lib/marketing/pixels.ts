/**
 * Ad-platform conversion tracking. Each network has its own global and its own event
 * names, so callers fire one semantic event and this maps it per platform.
 *
 * IDs come from NEXT_PUBLIC_* env vars — a platform with no ID set is simply skipped,
 * so you can switch networks on one at a time.
 */

export const PIXEL_IDS = {
  meta: process.env.NEXT_PUBLIC_META_PIXEL_ID || '',
  tiktok: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || '',
  snapchat: process.env.NEXT_PUBLIC_SNAPCHAT_PIXEL_ID || '',
  twitter: process.env.NEXT_PUBLIC_TWITTER_PIXEL_ID || '',
  /** Google Ads conversion account, e.g. AW-123456789. GA4 is configured separately. */
  googleAds: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '',
} as const

/** Label for the Google Ads purchase conversion, from the conversion action's snippet. */
export const GOOGLE_ADS_PURCHASE_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || ''

export function hasAnyPixel(): boolean {
  return Object.values(PIXEL_IDS).some(Boolean)
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    ttq?: { track: (event: string, params?: Record<string, unknown>) => void; page: () => void }
    snaptr?: (...args: unknown[]) => void
    twq?: (...args: unknown[]) => void
  }
}

/** The conversions worth reporting back to ad platforms. */
export type ConversionEvent = 'signup' | 'checkout_start' | 'purchase'

interface ConversionParams {
  /** Purchase value in USD, so every platform optimises on the same currency. */
  value?: number
  currency?: string
  planId?: string
  /** Payment reference — lets platforms de-duplicate repeated reports. */
  reference?: string
}

/** Per-platform event names for each conversion. */
const EVENT_NAMES: Record<ConversionEvent, { meta: string; tiktok: string; snapchat: string; twitter: string }> = {
  signup: { meta: 'CompleteRegistration', tiktok: 'CompleteRegistration', snapchat: 'SIGN_UP', twitter: 'tw-signup' },
  checkout_start: { meta: 'InitiateCheckout', tiktok: 'InitiateCheckout', snapchat: 'START_CHECKOUT', twitter: 'tw-checkout' },
  purchase: { meta: 'Purchase', tiktok: 'CompletePayment', snapchat: 'PURCHASE', twitter: 'tw-purchase' },
}

/**
 * Reports one conversion to every configured platform. Never throws — a blocked or
 * ad-blocked pixel must not break the page the customer is on.
 */
export function trackConversion(event: ConversionEvent, params: ConversionParams = {}): void {
  if (typeof window === 'undefined') return

  const names = EVENT_NAMES[event]
  const value = params.value
  const currency = params.currency || 'USD'

  try {
    if (PIXEL_IDS.meta) {
      window.fbq?.('track', names.meta, {
        ...(value !== undefined ? { value, currency } : {}),
        ...(params.planId ? { content_name: params.planId } : {}),
      }, params.reference ? { eventID: params.reference } : undefined)
    }

    if (PIXEL_IDS.tiktok) {
      window.ttq?.track(names.tiktok, {
        ...(value !== undefined ? { value, currency } : {}),
        ...(params.planId ? { content_id: params.planId } : {}),
      })
    }

    if (PIXEL_IDS.snapchat) {
      window.snaptr?.('track', names.snapchat, {
        ...(value !== undefined ? { price: value, currency } : {}),
        ...(params.reference ? { transaction_id: params.reference } : {}),
      })
    }

    if (PIXEL_IDS.twitter) {
      window.twq?.('event', names.twitter, {
        ...(value !== undefined ? { value, currency } : {}),
        ...(params.reference ? { conversion_id: params.reference } : {}),
      })
    }

    // Google Ads reports purchases through gtag, using the conversion action's label.
    if (PIXEL_IDS.googleAds && event === 'purchase' && GOOGLE_ADS_PURCHASE_LABEL) {
      window.gtag?.('event', 'conversion', {
        send_to: `${PIXEL_IDS.googleAds}/${GOOGLE_ADS_PURCHASE_LABEL}`,
        ...(value !== undefined ? { value, currency } : {}),
        ...(params.reference ? { transaction_id: params.reference } : {}),
      })
    }
  } catch {
    // Tracking is never worth an exception in front of a customer.
  }
}
