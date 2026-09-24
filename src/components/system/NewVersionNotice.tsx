'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Tells an open tab that the server has been redeployed, so the page can be reloaded
 * before stale JavaScript starts failing against the new build.
 *
 * The server's boot id changes on every restart. We remember the first one we saw and
 * prompt when it differs — never reloading on the customer's behalf, because they may be
 * midway through writing a story.
 */
const POLL_MS = 60_000

export function NewVersionNotice() {
  const firstSeen = useRef<string | null>(null)
  const [stale, setStale] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (stale) return
    let cancelled = false

    const check = async () => {
      // A failed check means the server is restarting or offline; try again next tick.
      try {
        const response = await fetch('/api/system/boot-id', { cache: 'no-store' })
        if (!response.ok) return
        const { bootId } = await response.json() as { bootId?: string }
        if (!bootId || cancelled) return
        if (firstSeen.current === null) firstSeen.current = bootId
        else if (bootId !== firstSeen.current) setStale(true)
      } catch {
        // Ignore — offline or mid-deploy.
      }
    }

    void check()
    const timer = setInterval(check, POLL_MS)
    const onFocus = () => { void check() }
    // Coming back to the tab is the most likely moment to be on an old build.
    window.addEventListener('focus', onFocus)

    return () => { cancelled = true; clearInterval(timer); window.removeEventListener('focus', onFocus) }
  }, [stale])

  if (!stale || dismissed) return null

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-[200] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-[#8020fc]/30 bg-white p-4 shadow-xl"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#171717]">A new version is available</p>
          <p className="mt-0.5 text-sm text-[#525252]">
            Refresh to get the latest. Your work is saved.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-[#737373] transition-colors hover:bg-[#f5f5f5]"
          >
            Later
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-gradient-to-r from-[#8020fc] to-[#5b3df5] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
