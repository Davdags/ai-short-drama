'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'

/**
 * "Use this prompt": on a slow phone connection the next page can take several seconds to
 * arrive, and a button that shows nothing in the meantime looks broken. This one says it is
 * working the moment it is tapped.
 */
export function UsePromptButton({ slug, label = 'Use this prompt' }: { slug: string; label?: string }) {
  const [opening, setOpening] = useState(false)
  return (
    <Link
      href={{ pathname: '/start', query: { prompt: slug } }}
      onClick={() => setOpening(true)}
      aria-busy={opening}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#8020fc] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6d12e0] sm:w-auto"
    >
      {opening && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
      {opening ? 'Opening your project…' : label}
    </Link>
  )
}
