'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'
import {
  AVERAGE_SHOT_SECONDS,
  STORY_LENGTH_OPTIONS,
  estimateStoryCredits,
  totalShots,
} from '@/lib/studio/story-length'

const SELECT_CLASS =
  'glass-input-base h-9 w-full rounded-lg px-3 text-sm text-[var(--glass-text-primary)] disabled:opacity-60'

/** Rounded to the nearest 100 so an estimate reads as an estimate. */
const roundCredits = (value: number) => (Math.round(value / 100) * 100).toLocaleString('en-US')

/**
 * Story length picker for the story screen. Self-contained: reads and saves the project's
 * targetDurationSec through the project settings API. Shot lengths are not set here: the
 * storyboard AI gives every shot its own length (4–15s) from its dialogue and action.
 */
export function StoryLengthControls({ projectId, videoModel, analysisModel, disabled }: {
  projectId: string
  videoModel?: string | null
  analysisModel?: string | null
  disabled?: boolean
}) {
  const [target, setTarget] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    apiFetch(`/api/studio/${projectId}`)
      .then(async (res) => {
        const data = await res.json() as { targetDurationSec?: number | null }
        if (!cancelled) setTarget(data.targetDurationSec ?? null)
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [projectId])

  async function save(next: { targetDurationSec: number | null }) {
    setError('')
    const res = await apiFetch(`/api/studio/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    }).catch(() => null)
    if (!res?.ok) setError('Could not save the length. Please try again.')
  }

  const plan = target ? { targetSeconds: target, shotSeconds: AVERAGE_SHOT_SECONDS } : null
  const modelId = (videoModel || '').split('::')[1] || 'seedance-2.0'
  const estimate = useMemo(() => (plan ? estimateStoryCredits(plan, modelId, undefined, analysisModel) : null), [plan?.targetSeconds, modelId, analysisModel]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="px-6 pb-2">
      <div className="flex flex-wrap items-end gap-3">
        <label className="w-[160px] flex-shrink-0">
          <span className="mb-1 block text-xs font-medium text-[var(--glass-text-secondary)]">Length</span>
          <select
            className={SELECT_CLASS}
            value={target ?? ''}
            disabled={disabled || !loaded}
            onChange={(event) => {
              const value = event.target.value ? Number(event.target.value) : null
              setTarget(value)
              void save({ targetDurationSec: value })
            }}
          >
            {STORY_LENGTH_OPTIONS.map((seconds) => (
              <option key={seconds} value={seconds}>{seconds === 90 ? '90s (full episode)' : `${seconds}s`}</option>
            ))}
            <option value="">No limit (original)</option>
          </select>
        </label>
      </div>

      <p className="mt-2 text-xs text-[var(--glass-text-tertiary)]">
        {plan
          ? <>
            About <span className="font-semibold text-[var(--glass-text-secondary)]">{totalShots(plan)} shots</span>; the AI sets each shot&apos;s length (4–15s) from its dialogue
            {estimate && <> · finished drama about <span className="font-semibold text-[var(--glass-text-secondary)]">{roundCredits(estimate.low)} credits</span> (or {roundCredits(estimate.high)} in HD)</>}
          </>
          : 'No length limit: the storyboard covers the whole story, however long it is.'}
      </p>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
