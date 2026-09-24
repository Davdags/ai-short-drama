'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'

interface AdminUser {
  id: string
  name: string
  email: string | null
  verified: boolean
  suspended: boolean
  createdAt: string
  credits: number
  creditsSpent: number
  projects: number
  generations: number
}

const TH = 'py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-[#737373]'
const TD = 'py-2.5 pr-3 text-sm text-[#404040]'
const BTN = 'rounded-lg border border-[#e5e5e5] px-2.5 py-1 text-xs font-semibold text-[#171717] hover:bg-[#fafafa] transition disabled:opacity-50'

/** User search with one-click credit grants and suspend / unsuspend. */
export function AdminUsers() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    const res = await apiFetch(`/api/admin/users?q=${encodeURIComponent(search)}&page=${page}`).catch(() => null)
    if (!res?.ok) return setMessage('Could not load users.')
    const data = await res.json() as { users: AdminUser[]; pagination: { totalPages: number } }
    setUsers(data.users)
    setTotalPages(data.pagination.totalPages)
  }, [search, page])

  useEffect(() => { void load() }, [load])

  async function act(user: AdminUser, body: Record<string, unknown>, note: string) {
    setBusy(user.id)
    setMessage('')
    const res = await apiFetch(`/api/admin/users/${user.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null)
    setBusy(null)
    setMessage(res?.ok ? `${user.name}: ${note}` : `${user.name}: action failed`)
    if (res?.ok) await load()
  }

  function grant(user: AdminUser) {
    const input = window.prompt(`How many credits should ${user.name} receive?`, '1000')
    const credits = Number(input)
    if (!input || !Number.isFinite(credits) || credits <= 0) return
    const reason = window.prompt('Reason (shown in their credit history):', 'admin grant') || 'admin grant'
    void act(user, { action: 'grantCredits', credits, reason }, `+${credits} credits`)
  }

  function toggleSuspend(user: AdminUser) {
    const action = user.suspended ? 'unsuspend' : 'suspend'
    if (!window.confirm(`${user.suspended ? 'Restore' : 'Suspend'} ${user.name}?`)) return
    void act(user, { action }, user.suspended ? 'restored' : 'suspended')
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[#171717]">Users</h2>
        <form
          onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(query) }}
          className="flex gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className="w-56 rounded-lg border border-[#e5e5e5] px-3 py-1.5 text-sm outline-none focus:border-[#8020fc]"
          />
          <button type="submit" className={BTN}>Search</button>
        </form>
      </div>

      {message && <p className="mt-3 text-sm text-[#8020fc]">{message}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="border-b border-[#ececec]">
            <tr>
              <th className={TH}>User</th>
              <th className={TH}>Joined</th>
              <th className={TH}>Credits</th>
              <th className={TH}>Used</th>
              <th className={TH}>Projects</th>
              <th className={TH}>Generations</th>
              <th className={TH}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f5f5f5]">
            {users.map((user) => (
              <tr key={user.id} className={user.suspended ? 'bg-red-50/40' : undefined}>
                <td className={TD}>
                  <div className="font-medium text-[#171717]">{user.name}</div>
                  <div className="text-xs text-[#737373]">
                    {user.email || 'no email'}
                    {!user.verified && <span className="ml-1 text-amber-600">· unverified</span>}
                    {user.suspended && <span className="ml-1 font-semibold text-red-600">· suspended</span>}
                  </div>
                </td>
                <td className={`${TD} whitespace-nowrap text-[#737373]`}>{new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td className={`${TD} font-semibold text-[#171717]`}>{user.credits.toLocaleString('en-US')}</td>
                <td className={TD}>{user.creditsSpent.toLocaleString('en-US')}</td>
                <td className={TD}>{user.projects}</td>
                <td className={TD}>{user.generations}</td>
                <td className={TD}>
                  <div className="flex gap-2">
                    <button type="button" className={BTN} disabled={busy === user.id} onClick={() => grant(user)}>Add credits</button>
                    <button
                      type="button"
                      className={`${BTN} ${user.suspended ? 'text-emerald-700' : 'text-red-600'}`}
                      disabled={busy === user.id}
                      onClick={() => toggleSuspend(user)}
                    >
                      {user.suspended ? 'Restore' : 'Suspend'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-sm text-[#737373]">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button type="button" className={BTN} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="text-[#737373]">Page {page} of {totalPages}</span>
          <button type="button" className={BTN} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  )
}
