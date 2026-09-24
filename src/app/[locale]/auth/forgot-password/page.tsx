'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { apiFetch } from '@/lib/api-fetch'
import { BRAND_NAME, BrandWordmark } from '@/components/BrandWordmark'
import { AuthBrandPanel, AuthMobileHero } from '@/components/auth/AuthBrandPanel'

const INPUT_CLASS = 'w-full px-4 py-3 border border-[#e5e5e5] rounded-lg bg-white text-[#171717] placeholder:text-[#a3a3a3] focus:border-[#8020fc] focus:ring-2 focus:ring-[#8020fc]/15 outline-none transition'

export default function ForgotPassword() {
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) setSent(true)
      else if (res.status === 429) setError(t('errors.rateLimited'))
      else if (res.status === 400) setError(t('errors.emailInvalid'))
      else setError(t('errors.loginGeneric'))
    } catch {
      setError(t('errors.network'))
    } finally {
      setLoading(false)
    }
  }

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

          <h1 className="text-3xl font-bold text-[#171717]">{t('forgot.title')}</h1>

          {sent ? (
            <div className="mt-6 rounded-lg border border-[#8020fc]/25 bg-[#8020fc]/[0.05] px-4 py-4 text-sm text-[#404040]">
              {t('forgot.sent')}
            </div>
          ) : (
            <>
              <p className="mt-2 text-[#737373]">{t('forgot.subtitle')}</p>
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#404040] mb-1.5">
                    {t('signup.emailLabel')}
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={INPUT_CLASS}
                    placeholder={t('signup.emailPlaceholder')}
                  />
                </div>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-[#8020fc] to-[#5b3df5] shadow-lg shadow-[#8020fc]/25 hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('forgot.submitLoading') : t('forgot.submit')}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm">
            <Link href={{ pathname: '/auth/signin' }} className="font-semibold text-[#8020fc] hover:underline">
              {t('forgot.backToSignin')}
            </Link>
          </p>
        </div>
      </div>

      <AuthBrandPanel headline={t('brand.headline')} description={t('brand.description')} />
    </div>
  )
}
