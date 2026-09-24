import type { Metadata } from 'next'
import { BRAND_NAME } from '@/components/BrandWordmark'
import { HelpContent } from './HelpContent'

export const metadata: Metadata = {
  title: `Help Centre | ${BRAND_NAME}`,
  description: `Answers about credits, generating videos, plans and your account on ${BRAND_NAME}.`,
}

export default function HelpPage() {
  return <HelpContent />
}
