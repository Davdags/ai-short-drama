import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { BRAND_NAME } from '@/components/BrandWordmark'

// The page itself is a client component, so its tab title and search description live here.
export const metadata: Metadata = {
  title: `Create your free account | ${BRAND_NAME}`,
  description: 'Sign up free and get 150 credits to turn your story into a script, storyboard and pictures.',
  alternates: { canonical: '/en/auth/signup' },
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
