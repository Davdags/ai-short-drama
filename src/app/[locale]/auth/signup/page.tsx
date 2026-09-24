'use client'

import { useEffect, useState } from "react"
import { getProviders, signIn } from "next-auth/react"
import { useTranslations } from 'next-intl'
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator"
import { apiFetch } from '@/lib/api-fetch'
import { Link, useRouter } from '@/i18n/navigation'
import { buildAuthenticatedHomeTarget } from '@/lib/home/default-route'
import { trackEvent } from '@/lib/analytics'
import { BRAND_NAME, BrandWordmark } from '@/components/BrandWordmark'
import { AuthBrandPanel, AuthMobileHero } from '@/components/auth/AuthBrandPanel'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { SITE } from '@/lib/site-config'

const INPUT_CLASS = 'w-full px-4 py-3 border border-[#e5e5e5] rounded-lg bg-white text-[#171717] placeholder:text-[#a3a3a3] focus:border-[#8020fc] focus:ring-2 focus:ring-[#8020fc]/15 outline-none transition'

function resolveSignupErrorKey(data: Record<string, unknown>): {
  key: string
  values?: Record<string, string | number>
} {
  const code = typeof data?.code === 'string' ? data.code : ''
  const field = typeof data?.field === 'string' ? data.field : ''
  const reason = typeof data?.reason === 'string' ? data.reason : ''
  const minLength = typeof data?.minLength === 'number' ? data.minLength : 6

  if (code === 'CONFLICT' && field === 'name' && reason === 'taken') {
    return { key: 'errors.usernameTaken' }
  }
  if (code === 'CONFLICT' && field === 'email' && reason === 'taken') {
    return { key: 'errors.emailTaken' }
  }
  if (code === 'INVALID_PARAMS' && field === 'email') {
    return { key: reason === 'required' ? 'errors.emailRequired' : 'errors.emailInvalid' }
  }
  if (code === 'INVALID_PARAMS' && field === 'name' && reason === 'required') {
    return { key: 'errors.usernameRequired' }
  }
  if (code === 'INVALID_PARAMS' && field === 'password' && reason === 'required') {
    return { key: 'errors.passwordRequired' }
  }
  if (code === 'INVALID_PARAMS' && field === 'password' && reason === 'tooShort') {
    return { key: 'errors.passwordTooShort', values: { minLength } }
  }
  return { key: 'errors.signupGeneric' }
}

export default function SignUp() {
  const t = useTranslations('auth')
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    getProviders().then((providers) => setGoogleEnabled(Boolean(providers?.google))).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    // ── Client-side guards (mirror server rules) ───────────────────
    if (password !== confirmPassword) {
      setError(t('errors.passwordMismatch'))
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError(t('errors.passwordTooShort', { minLength: 6 }))
      setLoading(false)
      return
    }

    try {
      const response = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setError(t('errors.rateLimited'))
        } else {
          const { key, values } = resolveSignupErrorKey(data)
          setError(t(key, values))
        }
        setLoading(false)
        return
      }

      trackEvent('sign_up')
      setSuccess(t('signup.successAutoSignin'))
      const signInResult = await signIn('credentials', {
        username: name,
        password,
        redirect: false,
      })

      if (signInResult?.error) {
        setSuccess(t('signup.successFallback'))
        setTimeout(() => {
          router.push({ pathname: '/auth/signin' })
        }, 1200)
        return
      }

      router.push(buildAuthenticatedHomeTarget())
      router.refresh()
    } catch {
      setError(t('errors.network'))
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

          <h1 className="text-3xl font-bold text-[#171717]">
            {t('signup.title')}
          </h1>
          <p className="mt-2 text-[#737373]">
            {t('signup.subtitle')}
          </p>

          {googleEnabled && (
            <>
              <GoogleSignInButton label={t('signup.google')} className="mt-8" />
              <div className="my-6 flex items-center gap-3 text-xs font-medium text-[#a3a3a3]">
                <span className="h-px flex-1 bg-[#e5e5e5]" />
                {t('signin.or')}
                <span className="h-px flex-1 bg-[#e5e5e5]" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className={`${googleEnabled ? '' : 'mt-8'} space-y-5`}>
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-[#404040] mb-1.5"
              >
                {t('signup.usernameLabel')}
              </label>
              <input
                id="name"
                name="username"
                type="text"
                autoComplete="username"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={INPUT_CLASS}
                placeholder={t('signup.usernamePlaceholder')}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#404040] mb-1.5"
              >
                {t('signup.emailLabel')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={INPUT_CLASS}
                placeholder={t('signup.emailPlaceholder')}
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-[#404040] mb-1.5"
              >
                {t('signup.phoneLabel')}
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={INPUT_CLASS}
                placeholder={t('signup.phonePlaceholder')}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#404040] mb-1.5"
              >
                {t('signup.passwordLabel')}
              </label>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={INPUT_CLASS}
                placeholder={t('signup.passwordPlaceholder')}
              />
              <PasswordStrengthIndicator password={password} />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-[#404040] mb-1.5"
              >
                {t('signup.confirmPasswordLabel')}
              </label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={INPUT_CLASS}
                placeholder={t('signup.confirmPasswordPlaceholder')}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-[#8020fc] to-[#5b3df5] shadow-lg shadow-[#8020fc]/25 hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('signup.submitLoading') : t('signup.submit')}
            </button>
          </form>

          <p className="mt-4 text-center text-xs leading-relaxed text-[#a3a3a3]">
            By creating an account you agree to our{' '}
            <a href={SITE.termsUrl} className="text-[#737373] underline hover:text-[#8020fc]">Terms of Service</a>{' '}and{' '}
            <a href={SITE.privacyUrl} className="text-[#737373] underline hover:text-[#8020fc]">Privacy Policy</a>.
          </p>

          <p className="mt-6 text-center text-sm text-[#737373]">
            {t('signup.hasAccount')}{" "}
            <Link
              href={{ pathname: '/auth/signin' }}
              className="font-semibold text-[#8020fc] hover:underline"
            >
              {t('signup.signinLink')}
            </Link>
          </p>
        </div>
      </div>

      <AuthBrandPanel headline={t('brand.headline')} description={t('brand.description')} />
    </div>
  )
}
