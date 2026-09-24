'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { Link } from '@/i18n/navigation'
import { apiFetch } from '@/lib/api-fetch'

const INPUT = 'w-full rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-[#171717] outline-none focus:border-[#8020fc] focus:ring-2 focus:ring-[#8020fc]/15'
const PRIMARY = 'rounded-lg bg-gradient-to-r from-[#8020fc] to-[#5b3df5] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition disabled:opacity-50'

function reasonOf(json: unknown): string {
  const body = (json ?? {}) as { error?: { details?: { reason?: string } }; reason?: string }
  return body.error?.details?.reason || body.reason || ''
}

export function ChangePasswordCard({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  if (!hasPassword) {
    return (
      <div>
        <h2 className="text-base font-semibold text-[#171717]">Password</h2>
        <p className="mt-2 text-sm text-[#737373]">
          You sign in with Google, so your account has no password. To add one, use{' '}
          <Link href={{ pathname: '/auth/forgot-password' }} className="font-semibold text-[#8020fc] hover:underline">Forgot password</Link>
          {' '}with your account email.
        </p>
      </div>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    if (next.length < 6) return setStatus({ tone: 'error', text: 'The new password must be at least 6 characters.' })
    if (next !== confirm) return setStatus({ tone: 'error', text: 'The new passwords do not match.' })
    setSaving(true)
    const res = await apiFetch('/api/user/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    }).catch(() => null)
    setSaving(false)
    if (res?.ok) {
      setCurrent(''); setNext(''); setConfirm('')
      return setStatus({ tone: 'ok', text: 'Password changed. We sent you a confirmation email.' })
    }
    if (res?.status === 429) return setStatus({ tone: 'error', text: 'Too many attempts. Please try again later.' })
    const reason = reasonOf(await res?.json().catch(() => null))
    setStatus({ tone: 'error', text: reason === 'incorrect' ? 'Your current password is incorrect.' : 'Could not change your password. Please try again.' })
  }

  return (
    <form onSubmit={submit}>
      <h2 className="text-base font-semibold text-[#171717]">Change password</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <input type="password" autoComplete="current-password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} className={INPUT} required />
        <input type="password" autoComplete="new-password" placeholder="New password" value={next} onChange={(e) => setNext(e.target.value)} className={INPUT} required />
        <input type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={INPUT} required />
      </div>
      {status && <p className={`mt-3 text-sm ${status.tone === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>{status.text}</p>}
      <button type="submit" disabled={saving} className={`${PRIMARY} mt-4`}>{saving ? 'Saving…' : 'Change password'}</button>
    </form>
  )
}

export function DeleteAccountCard({ username, hasPassword }: { username: string; hasPassword: boolean }) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function remove() {
    setError('')
    setDeleting(true)
    const res = await apiFetch('/api/user/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmUsername: typed, ...(hasPassword ? { password } : {}) }),
    }).catch(() => null)
    if (res?.ok) {
      await signOut({ callbackUrl: '/en' })
      return
    }
    setDeleting(false)
    const reason = reasonOf(await res?.json().catch(() => null))
    setError(reason === 'incorrect' ? 'Your password is incorrect.' : reason === 'mismatch' ? 'The username does not match.' : 'Could not delete your account. Please try again or contact support.')
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-red-600">Delete account</h2>
      <p className="mt-1 text-sm text-[#737373]">
        Permanently delete your account, projects, characters, images and videos. Remaining credits are lost and this cannot be undone.
        Cancel any paid plan first.
      </p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-4 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition">
          Delete my account
        </button>
      ) : (
        <div className="mt-4 space-y-3 rounded-xl border border-red-200 bg-red-50/60 p-4">
          <p className="text-sm text-[#404040]">Type your username <span className="font-mono font-semibold">{username}</span> to confirm.</p>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={username} className={INPUT} autoComplete="off" />
          {hasPassword && <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className={INPUT} autoComplete="current-password" />}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={remove}
              disabled={deleting || typed !== username || (hasPassword && !password)}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Permanently delete'}
            </button>
            <button type="button" onClick={() => { setOpen(false); setTyped(''); setPassword(''); setError('') }} className="rounded-lg border border-[#e5e5e5] bg-white px-4 py-2 text-sm font-semibold text-[#171717]">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
