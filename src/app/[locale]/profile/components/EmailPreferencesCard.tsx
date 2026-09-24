'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'

type Preferences = { emailGenerationUpdates: boolean; emailCreditAlerts: boolean }

const OPTIONS: Array<{ field: keyof Preferences; title: string; description: string }> = [
  {
    field: 'emailGenerationUpdates',
    title: 'Generation updates',
    description: 'When an episode finishes exporting, or when a generation fails (credits are always refunded).',
  },
  {
    field: 'emailCreditAlerts',
    title: 'Credit alerts',
    description: 'When your credits are running low or run out.',
  },
]

/** Email notification switches. Account and security emails are always sent. */
export function EmailPreferencesCard() {
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/user/email-preferences')
      .then(async (res) => setPrefs(((await res.json()) as { preferences: Preferences }).preferences))
      .catch(() => setError('Could not load your email settings.'))
  }, [])

  async function toggle(field: keyof Preferences) {
    if (!prefs) return
    const next = { ...prefs, [field]: !prefs[field] }
    setPrefs(next)
    setError('')
    const res = await apiFetch('/api/user/email-preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: next[field] }),
    }).catch(() => null)
    if (!res?.ok) {
      setPrefs(prefs)
      setError('Could not save. Please try again.')
    }
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-[#171717]">Email notifications</h2>
      <p className="mt-1 text-sm text-[#737373]">Account and security emails (sign-in, password, receipts) are always sent.</p>
      <div className="mt-4 divide-y divide-[#f0f0f0]">
        {OPTIONS.map((option) => {
          const enabled = prefs?.[option.field] ?? true
          return (
            <div key={option.field} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium text-[#171717]">{option.title}</p>
                <p className="text-xs text-[#737373]">{option.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={option.title}
                disabled={!prefs}
                onClick={() => toggle(option.field)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${enabled ? 'bg-[#8020fc]' : 'bg-[#d4d4d4]'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          )
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  )
}
