'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { AppIcon } from '@/components/ui/icons'
import { OUT_OF_CREDITS_EVENT, type OutOfCreditsDetail } from '@/lib/api-fetch'

/**
 * Shown whenever any request is refused for lack of credits. Before this existed, most
 * generate buttons ignored the refusal, so an out-of-credits customer saw a button that
 * simply did nothing — at the exact moment they were most ready to upgrade.
 */
export function OutOfCreditsModal() {
  const [detail, setDetail] = useState<OutOfCreditsDetail | null>(null)

  useEffect(() => {
    const onOutOfCredits = (event: Event) => {
      // Repeated clicks fire repeated refusals; keep the first one on screen.
      setDetail((current) => current ?? ((event as CustomEvent<OutOfCreditsDetail>).detail || {}))
    }
    window.addEventListener(OUT_OF_CREDITS_EVENT, onOutOfCredits)
    return () => window.removeEventListener(OUT_OF_CREDITS_EVENT, onOutOfCredits)
  }, [])

  useEffect(() => {
    if (!detail) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setDetail(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detail])

  if (!detail) return null

  const required = detail.required !== undefined ? Math.ceil(detail.required) : null
  const available = detail.available !== undefined ? Math.floor(detail.available) : null

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4"
      onClick={() => setDetail(null)}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="out-of-credits-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8020fc]/10"><AppIcon name="bolt" className="h-6 w-6 text-[#8020fc]" /></div>
        <h2 id="out-of-credits-title" className="mt-4 text-xl font-bold text-[#171717]">
          You&apos;re out of credits
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[#525252]">
          {required !== null && available !== null
            ? <>This needs <strong>{required.toLocaleString('en-US')} credits</strong> and you have <strong>{available.toLocaleString('en-US')}</strong>.</>
            : 'You don’t have enough credits for this.'}
          {' '}Upgrade to keep creating — your project is saved exactly as it is.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <Link
            href={{ pathname: '/pricing' }}
            onClick={() => setDetail(null)}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#8020fc] to-[#5b3df5] px-5 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
          >
            See plans
          </Link>
          <button
            type="button"
            onClick={() => setDetail(null)}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-[#e5e5e5] px-5 py-3 text-sm font-semibold text-[#525252] transition-colors hover:bg-[#f5f5f5]"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
