'use client'

import { useEffect } from 'react'

/**
 * When a visitor lands with ?ref=code, records the click (the server sets the referral
 * cookie) and strips the parameter from the address bar. Renders nothing.
 */
export default function ReferralCapture() {
  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('ref')
    if (!code) return

    fetch('/api/affiliate/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      credentials: 'same-origin',
    }).catch(() => undefined)

    url.searchParams.delete('ref')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  }, [])

  return null
}
