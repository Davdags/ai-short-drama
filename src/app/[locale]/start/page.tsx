'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useRouter, Link } from '@/i18n/navigation'
import { apiFetch } from '@/lib/api-fetch'
import { PENDING_PROMPT_KEY, findPrompt } from '@/content/prompt-library'

/**
 * /start?prompt=<slug> — "Use this prompt" from the Prompt Library. Creates a project with
 * the story already in it and opens the workspace. Signed-out visitors sign up first and
 * come straight back here.
 */
function StartFromPrompt() {
  const params = useSearchParams()
  const router = useRouter()
  const { status } = useSession()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)
  const slug = params?.get('prompt') ?? ''
  const prompt = findPrompt(slug)

  useEffect(() => {
    if (!prompt || status === 'loading' || started.current) return
    if (status === 'unauthenticated') {
      // Sign-up lands on the workspace, which picks this up and comes back here.
      try { window.localStorage.setItem(PENDING_PROMPT_KEY, slug) } catch { /* private mode: they can click again */ }
      router.replace({ pathname: '/auth/signup' })
      return
    }
    started.current = true
    void (async () => {
      try {
        const projectRes = await apiFetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: prompt.title, description: prompt.logline, mode: 'studio' }),
        })
        const projectData = await projectRes.json().catch(() => null) as { id?: string; project?: { id?: string } } | null
        const projectId = projectData?.id ?? projectData?.project?.id
        if (!projectRes.ok || !projectId) throw new Error('project')

        await apiFetch(`/api/studio/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artStyle: prompt.style, targetDurationSec: prompt.seconds, videoRatio: '9:16' }),
        })
        const episodeRes = await apiFetch(`/api/studio/${projectId}/episodes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Episode 1', novelText: prompt.story }),
        })
        const episodeData = await episodeRes.json().catch(() => null) as { episode?: { id?: string } } | null
        const episodeId = episodeData?.episode?.id
        router.replace({ pathname: `/workspace/${projectId}`, query: episodeId ? { stage: 'config', episode: episodeId } : { stage: 'config' } })
      } catch {
        setError('We could not create your project. Please try again from the Prompt Library.')
      }
    })()
  }, [prompt, slug, status, router])

  if (!prompt) {
    return (
      <p className="text-[#525252]">
        That story prompt was not found. <Link href={{ pathname: '/prompts' }} className="font-semibold text-[#8020fc]">Browse the Prompt Library</Link>
      </p>
    )
  }
  if (error) {
    return (
      <p className="text-red-600">
        {error} <Link href={{ pathname: `/prompts/${slug}` }} className="font-semibold text-[#8020fc]">Back to the prompt</Link>
      </p>
    )
  }
  return (
    <div className="flex flex-col items-center gap-4" role="status">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-[#8020fc]/20 border-t-[#8020fc]" aria-hidden />
      <p className="text-lg font-semibold text-[#171717]">Setting up “{prompt.title}”</p>
      <p className="max-w-xs text-sm text-[#737373]">Creating your project with the story already in it. This takes a few seconds.</p>
    </div>
  )
}

export default function StartPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-6 text-center font-sans">
      <Suspense fallback={<p className="text-[#525252]">Loading…</p>}>
        <StartFromPrompt />
      </Suspense>
    </main>
  )
}
