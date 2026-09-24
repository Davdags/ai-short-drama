'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'
import {
  DEFAULT_SHOT_SECONDS,
  MAX_SHOT_SECONDS,
  MIN_SHOT_SECONDS,
  SHOT_LENGTH_PRESETS,
  STORY_LENGTH_OPTIONS,
  estimateStoryCredits,
  totalShots,
} from '@/lib/studio/story-length'

const SELECT_CLASS =
  'glass-input-base h-9 w-full rounded-lg px-3 text-sm text-[var(--glass-text-primary)] disabled:opacity-60'

const PRESET_SECONDS = new Set<number>(SHOT_LENGTH_PRESETS.map((preset) => preset.seconds))
/** Rounded to the nearest 100 so an estimate reads as an estimate. */
const roundCredits = (value: number) => (Math.round(value / 100) * 100).toLocaleString('en-US')

const CUSTOM_SECONDS = Array.from({ length: MAX_SHOT_SECONDS - MIN_SHOT_SECONDS + 1 }, (_, index) => MIN_SHOT_SECONDS + index)

/**
 * Story length + shot length pickers for the story screen. Self-contained: reads and saves
 * the project's targetDurationSec / shotLengthSec through the project settings API.
 */
export function StoryLengthControls({ projectId, videoModel, analysisModel, disabled }: {
  projectId: string
  videoModel?: string | null
  analysisModel?: string | null
  disabled?: boolean
}) {
  const [target, setTarget] = useState<number | null>(null)
  const [shot, setShot] = useState<number>(DEFAULT_SHOT_SECONDS)
  const [customShot, setCustomShot] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    apiFetch(`/api/studio/${projectId}`)
      .then(async (res) => {
        const data = await res.json() as { targetDurationSec?: number | null; shotLengthSec?: number | null }
        if (cancelled) return
        setTarget(data.targetDurationSec ?? null)
        const seconds = data.shotLengthSec ?? DEFAULT_SHOT_SECONDS
        setShot(seconds)
        setCustomShot(!PRESET_SECONDS.has(seconds))
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [projectId])

  async function save(next: { targetDurationSec?: number | null; shotLengthSec?: number }) {
    setError('')
    const res = await apiFetch(`/api/studio/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    }).catch(() => null)
    if (!res?.ok) setError('Could not save the length settings. Please try again.')
  }

  const plan = target ? { targetSeconds: target, shotSeconds: shot } : null
  const modelId = (videoModel || '').split('::')[1] || 'seedance-2.0'
  const estimate = useMemo(() => (plan ? estimateStoryCredits(plan, modelId, undefined, analysisModel) : null), [plan?.targetSeconds, plan?.shotSeconds, modelId, analysisModel]) // eslint-disable-line react-hooks/exhaustive-deps

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
              void save({ targetDurationSec: value, ...(value ? { shotLengthSec: shot } : {}) })
            }}
          >
            {STORY_LENGTH_OPTIONS.map((seconds) => (
              <option key={seconds} value={seconds}>{seconds === 90 ? '90s (full episode)' : `${seconds}s`}</option>
            ))}
            <option value="">No limit (original)</option>
          </select>
        </label>

        <label className="w-[200px] flex-shrink-0">
          <span className="mb-1 block text-xs font-medium text-[var(--glass-text-secondary)]">Shot length</span>
          <select
            className={SELECT_CLASS}
            value={customShot ? 'custom' : String(shot)}
            disabled={disabled || !loaded || !target}
            onChange={(event) => {
              if (event.target.value === 'custom') {
                setCustomShot(true)
                return
              }
              const seconds = Number(event.target.value)
              setCustomShot(false)
              setShot(seconds)
              void save({ shotLengthSec: seconds })
            }}
          >
            {SHOT_LENGTH_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.seconds}>{preset.label} ({preset.seconds}s)</option>
            ))}
            <option value="custom">Custom…</option>
          </select>
        </label>

        {customShot && target && (
          <label className="w-[110px] flex-shrink-0">
            <span className="mb-1 block text-xs font-medium text-[var(--glass-text-secondary)]">Seconds per shot</span>
            <select
              className={SELECT_CLASS}
              value={shot}
              disabled={disabled}
              onChange={(event) => {
                const seconds = Number(event.target.value)
                setShot(seconds)
                void save({ shotLengthSec: seconds })
              }}
            >
              {CUSTOM_SECONDS.map((seconds) => <option key={seconds} value={seconds}>{seconds}s</option>)}
            </select>
          </label>
        )}
      </div>

      <p className="mt-2 text-xs text-[var(--glass-text-tertiary)]">
        {plan
          ? <>
            <span className="font-semibold text-[var(--glass-text-secondary)]">{totalShots(plan)} shot{totalShots(plan) === 1 ? '' : 's'}</span> of {shot}s
            {estimate && <> · finished drama about <span className="font-semibold text-[var(--glass-text-secondary)]">{roundCredits(estimate.low)} credits</span> (or {roundCredits(estimate.high)} in HD)</>}
          </>
          : 'No length limit: the storyboard covers the whole story, however long it is.'}
      </p>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
