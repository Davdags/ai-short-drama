'use client'

import { useCallback, useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { AppIcon } from '@/components/ui/icons'
import { apiFetch } from '@/lib/api-fetch'
import type { GettingStartedState } from '@/lib/onboarding/getting-started'

/**
 * New-account checklist: five or six things to do, each ticking itself as it happens.
 * Shown as a card on the workspace and as a "Getting started 3/6" pill in the top bar.
 */

const DISMISS_KEY = 'nucleus:getting-started-dismissed'

function readDismissed(): boolean {
  try { return window.localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
}

export function useGettingStarted() {
  const [state, setState] = useState<GettingStartedState | null>(null)
  const [dismissed, setDismissed] = useState(true)

  const load = useCallback(() => {
    apiFetch('/api/user/getting-started')
      .then(async (res) => (res.ok ? setState(await res.json() as GettingStartedState) : undefined))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    setDismissed(readDismissed())
    load()
    // Progress changes while people work; refresh when they come back to the tab.
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [load])

  const dismiss = useCallback(() => {
    try { window.localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }, [])

  return { state, dismissed, dismiss }
}

export function GettingStartedCard() {
  const { state, dismissed, dismiss } = useGettingStarted()
  if (!state || dismissed) return null
  const allDone = state.completed === state.total
  const nextStep = state.steps.find((step) => !step.done)

  return (
    <section className="mb-8 rounded-2xl border border-[#ece3ff] bg-gradient-to-br from-[#faf7ff] to-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#171717]">
            {allDone ? 'You’re all set 🎉' : 'Get started with NucleusArt'}
          </h2>
          <p className="mt-1 text-sm text-[#525252]">
            {allDone
              ? 'You have made your first short drama from start to finish.'
              : `${state.completed} of ${state.total} done — each step ticks itself when you finish it.`}
          </p>
        </div>
        <button type="button" onClick={dismiss} aria-label="Hide checklist" className="rounded-md p-1 text-[#a3a3a3] hover:bg-white hover:text-[#525252]">
          <AppIcon name="close" className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#ece3ff]">
        <div className="h-full rounded-full bg-[#8020fc] transition-all" style={{ width: `${(state.completed / state.total) * 100}%` }} />
      </div>
      <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {state.steps.map((step) => {
          const isNext = step.id === nextStep?.id
          return (
            <li key={step.id}>
              <Link
                href={step.href}
                className={`flex h-full items-start gap-3 rounded-xl border p-3 transition-colors ${
                  step.done
                    ? 'border-transparent bg-white/60'
                    : isNext
                      ? 'border-[#8020fc] bg-white shadow-sm'
                      : 'border-[#ececec] bg-white hover:border-[#d4c2ff]'
                }`}
              >
                <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                  step.done ? 'bg-emerald-500 text-white' : isNext ? 'border-2 border-[#8020fc]' : 'border-2 border-[#d4d4d4]'
                }`}>
                  {step.done && <AppIcon name="check" className="h-3 w-3" />}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-medium ${step.done ? 'text-[#a3a3a3] line-through' : 'text-[#171717]'}`}>{step.label}</span>
                  {!step.done && <span className="mt-0.5 block text-xs text-[#737373]">{step.hint}</span>}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/** Small top-bar pill; hidden once the checklist is complete or dismissed. */
export function GettingStartedPill() {
  const { state, dismissed } = useGettingStarted()
  if (!state || dismissed || state.completed === state.total) return null
  const next = state.steps.find((step) => !step.done)
  return (
    <Link
      href={next?.href ?? '/workspace'}
      title={next ? `Next: ${next.label}` : undefined}
      className="hidden items-center gap-2 rounded-full border border-[#ece3ff] bg-[#faf7ff] px-3 py-1 text-xs font-medium text-[#5b12c4] hover:bg-[#f3ecff] md:flex"
    >
      Getting started {state.completed}/{state.total}
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-[#e9dcff]" aria-hidden>
        <span className="block h-full rounded-full bg-[#8020fc]" style={{ width: `${(state.completed / state.total) * 100}%` }} />
      </span>
    </Link>
  )
}
