'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { apiFetch } from '@/lib/api-fetch'
import { BRAND_NAME, BrandWordmark } from '@/components/BrandWordmark'
import { AuthBrandPanel, AuthMobileHero } from '@/components/auth/AuthBrandPanel'
import { PasswordInput } from '@/components/auth/PasswordInput'

const INPUT_CLASS = 'w-full px-4 py-3 border border-[#e5e5e5] rounded-lg bg-white text-[#171717] placeholder:text-[#a3a3a3] focus:border-[#8020fc] focus:ring-2 focus:ring-[#8020fc]/15 outline-none transition'
const MIN_PASSWORD_LENGTH = 6

function readErrorReason(data: unknown): string {
  const body = (data ?? {}) as { error?: { details?: { reason?: string } }; details?: { reason?: string } }
  return body.error?.details?.reason || body.details?.reason || ''
}

function ResetPasswordForm() {
  const t = useTranslations('auth')
  const token = useSearchParams()?.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [invalidLink, setInvalidLink] = useState(!token)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < MIN_PASSWORD_LENGTH) return setError(t('errors.passwordTooShort', { minLength: MIN_PASSWORD_LENGTH }))
    if (password !== confirm) return setError(t('errors.passwordMismatch'))

    setLoading(true)
    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      if (res.ok) return setDone(true)
      if (res.status === 429) return setError(t('errors.rateLimited'))
      const reason = readErrorReason(await res.json().catch(() => null))
      if (reason === 'invalidOrExpired' || reason === 'required') setInvalidLink(true)
      else setError(t('errors.loginGeneric'))
    } catch {
      setError(t('errors.network'))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <>
        <div className="mt-6 rounded-lg border border-[#8020fc]/25 bg-[#8020fc]/[0.05] px-4 py-4 text-sm text-[#404040]">{t('reset.success')}</div>
        <Link
          href={{ pathname: '/auth/signin' }}
          className="mt-6 block w-full py-3 text-center rounded-lg font-semibold text-white bg-gradient-to-r from-[#8020fc] to-[#5b3df5] hover:brightness-110 transition"
        >
          {t('signin.submit')}
        </Link>
      </>
    )
  }

  if (invalidLink) {
    return (
      <>
        <div className="mt-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{t('reset.invalidToken')}</div>
        <Link href={{ pathname: '/auth/forgot-password' }} className="mt-6 inline-block text-sm font-semibold text-[#8020fc] hover:underline">
          {t('reset.requestNew')}
        </Link>
      </>
    )
  }

  return (
    <>
      <p className="mt-2 text-[#737373]">{t('reset.subtitle')}</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#404040] mb-1.5">{t('reset.passwordLabel')}</label>
          <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required className={INPUT_CLASS} placeholder={t('signup.passwordPlaceholder')} />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-[#404040] mb-1.5">{t('signup.confirmPasswordLabel')}</label>
          <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={INPUT_CLASS} placeholder={t('signup.confirmPasswordPlaceholder')} />
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-[#8020fc] to-[#5b3df5] shadow-lg shadow-[#8020fc]/25 hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('reset.submitLoading') : t('reset.submit')}
        </button>
      </form>
    </>
  )
}

export default function ResetPassword() {
  const t = useTranslations('auth')
  return (
    <div className="min-h-screen flex bg-white">
      <div className="w-full lg:w-1/2 flex items-start sm:items-center justify-center px-5 py-8 sm:px-8 sm:py-12">
        <div className="w-full max-w-sm">
          <AuthMobileHero />
          <Link href={{ pathname: '/' as never }} className="flex items-center gap-2 mb-8 sm:mb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-small.png" alt={BRAND_NAME} className="h-8 w-auto" />
            <BrandWordmark className="text-2xl font-bold tracking-tight text-[#171717]" />
          </Link>
          <h1 className="text-3xl font-bold text-[#171717]">{t('reset.title')}</h1>
          <Suspense fallback={<div className="mt-8 h-48 animate-pulse rounded-lg bg-[#f5f5f5]" />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
      <AuthBrandPanel headline={t('brand.headline')} description={t('brand.description')} />
    </div>
  )
}
