'use client'

import { useEffect, useState } from "react"
import { getProviders, signIn } from "next-auth/react"
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { buildAuthenticatedHomeTarget } from '@/lib/home/default-route'
import { trackEvent } from '@/lib/analytics'
import { BRAND_NAME, BrandWordmark } from '@/components/BrandWordmark'
import { AuthBrandPanel, AuthMobileHero } from '@/components/auth/AuthBrandPanel'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'

const INPUT_CLASS = 'w-full px-4 py-3 border border-[#e5e5e5] rounded-lg bg-white text-[#171717] placeholder:text-[#a3a3a3] focus:border-[#8020fc] focus:ring-2 focus:ring-[#8020fc]/15 outline-none transition'

export default function SignIn() {
  const t = useTranslations('auth')
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    getProviders().then((providers) => setGoogleEnabled(Boolean(providers?.google))).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      })

      if (result?.error === 'RateLimited') {
        setError(t('errors.rateLimited'))
      } else if (result?.error) {
        // NextAuth credentials provider returns `null` from authorize() for
        // both "user not found" and "wrong password". This is intentional
        // (prevents user enumeration), but the copy should not suggest the
        // input format was invalid — only that the credentials did not match.
        setError(t('errors.loginIncorrect'))
      } else {
        trackEvent('login')
        router.push(buildAuthenticatedHomeTarget())
        router.refresh()
      }
    } catch {
      setError(t('errors.loginGeneric'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left — Form */}
      <div className="w-full lg:w-1/2 flex items-start sm:items-center justify-center px-5 py-8 sm:px-8 sm:py-12">
        <div className="w-full max-w-sm">
          <AuthMobileHero />
          <Link href={{ pathname: '/' as never }} className="flex items-center gap-2 mb-8 sm:mb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-small.png" alt={BRAND_NAME} className="h-8 w-auto" />
            <BrandWordmark className="text-2xl font-bold tracking-tight text-[#171717]" />
          </Link>

          <h1 className="text-3xl font-bold text-[#171717]">{t('signin.title')}</h1>
          <p className="mt-2 text-[#737373]">{t('signin.subtitle')}</p>

          {googleEnabled && (
            <>
              <GoogleSignInButton label={t('signin.google')} className="mt-8" />
              <div className="my-6 flex items-center gap-3 text-xs font-medium text-[#a3a3a3]">
                <span className="h-px flex-1 bg-[#e5e5e5]" />
                {t('signin.or')}
                <span className="h-px flex-1 bg-[#e5e5e5]" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className={`${googleEnabled ? '' : 'mt-8'} space-y-5`}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#404040] mb-1.5">
                {t('signin.usernameLabel')}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={INPUT_CLASS}
                placeholder={t('signin.usernamePlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#404040] mb-1.5">
                {t('signin.passwordLabel')}
              </label>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={INPUT_CLASS}
                placeholder={t('signin.passwordPlaceholder')}
              />
              <Link
                href={{ pathname: '/auth/forgot-password' }}
                className="mt-2 inline-block text-sm font-medium text-[#8020fc] hover:underline"
              >
                {t('signin.forgotPassword')}
              </Link>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-[#8020fc] to-[#5b3df5] shadow-lg shadow-[#8020fc]/25 hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('signin.submitLoading') : t('signin.submit')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#737373]">
            {t('signin.noAccount')}{" "}
            <Link href={{ pathname: '/auth/signup' }} className="font-semibold text-[#8020fc] hover:underline">
              {t('signin.signupLink')}
            </Link>
          </p>
        </div>
      </div>

      <AuthBrandPanel headline={t('brand.headline')} description={t('brand.description')} />
    </div>
  )
}
