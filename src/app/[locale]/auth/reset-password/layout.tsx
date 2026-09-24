import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { BRAND_NAME } from '@/components/BrandWordmark'

// The page itself is a client component, so its tab title and search description live here.
export const metadata: Metadata = {
  title: `Choose a new password | ${BRAND_NAME}`,
  description: 'Choose a new password for your NucleusArt account.',
  alternates: { canonical: '/en/auth/reset-password' },
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
