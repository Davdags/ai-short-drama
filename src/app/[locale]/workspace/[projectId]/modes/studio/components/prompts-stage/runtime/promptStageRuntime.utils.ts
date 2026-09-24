'use client'

import { extractErrorMessage } from '@/lib/errors/extract'
import { humanizeErrorMessage } from '@/lib/errors/humanize'

export function getErrorMessage(error: unknown, fallback: string): string {
  return humanizeErrorMessage(extractErrorMessage(error, fallback), fallback)
}

export function parseImagePrompt(imagePrompt: string | null) {
  if (!imagePrompt) return { content: '' }
  return { content: imagePrompt }
}
