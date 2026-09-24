'use client'

import { signIn } from 'next-auth/react'
import { AUTHENTICATED_HOME_PATHNAME } from '@/lib/home/default-route'
import { AppIcon } from '@/components/ui/icons'

export function GoogleSignInButton({ label, className = '' }: { label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => signIn('google', { callbackUrl: `/en${AUTHENTICATED_HOME_PATHNAME}` })}
      className={`flex w-full items-center justify-center gap-3 rounded-lg border border-[#e5e5e5] bg-white py-3 font-medium text-[#171717] hover:bg-[#fafafa] transition ${className}`}
    >
      <AppIcon name="googleLogo" className="h-5 w-5" aria-hidden="true" />
      {label}
    </button>
  )
}
