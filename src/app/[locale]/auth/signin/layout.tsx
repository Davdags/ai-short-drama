import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { BRAND_NAME } from '@/components/BrandWordmark'

// The page itself is a client component, so its tab title and search description live here.
export const metadata: Metadata = {
  title: `Sign in | ${BRAND_NAME}`,
  description: 'Sign in to NucleusArt to keep creating your AI short dramas.',
  alternates: { canonical: '/en/auth/signin' },
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
