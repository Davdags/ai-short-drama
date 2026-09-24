import type { AppIconName } from '@/components/ui/icons'
import { SIGNUP_BONUS_CREDITS } from '@/lib/billing/credits-constants'

export type BillingCycle = 'monthly' | 'yearly'

export interface PricingPlan {
  id: 'free' | 'starter' | 'pro' | 'studio'
  name: string
  tagline: string
  icon: AppIconName
  monthlyPrice: number
  yearlyPrice: number
  /** Shown under the price instead of a saving, for plans with no yearly discount. */
  priceNote?: string
  cta: string
  highlighted?: boolean
  features: string[]
  footnote: string
}

export const FREE_SIGNUP_CREDITS = SIGNUP_BONUS_CREDITS

export const PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Start creating and explore the possibilities.',
    icon: 'sparkles',
    monthlyPrice: 0,
    yearlyPrice: 0,
    priceNote: `Get ${FREE_SIGNUP_CREDITS} free credits when you sign up and verify your email`,
    cta: 'Get Started',
    features: [
      `${FREE_SIGNUP_CREDITS} credits (one-time)`,
      'Your script, storyboard and first 3 pictures',
      'Access to basic models',
      'Standard generation speed',
      '9:16, 16:9, 1:1 formats',
      'Prompt Library: 30+ ready-made stories',
      'Community support',
    ],
    footnote: 'A great place to start!',
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For creators getting started.',
    icon: 'bolt',
    monthlyPrice: 19,
    yearlyPrice: 190,
    cta: 'Upgrade to Starter',
    features: [
      '500 credits per month',
      'Dramas up to 90 seconds long',
      'Script, cast and storyboard for your drama, plus a few seconds of video',
      'Access to all standard models',
      'Faster generation speed',
      'HD video (720p)',
      'Prompt Library: 30+ ready-made stories',
      'No watermark',
      'Email support',
    ],
    footnote: 'Create. Learn. Grow.',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For serious creators and businesses.',
    icon: 'diamond',
    monthlyPrice: 49,
    yearlyPrice: 490,
    cta: 'Upgrade to Pro',
    highlighted: true,
    features: [
      '2,000 credits per month',
      'Dramas up to 90 seconds long',
      'About 1 minute of finished video a month',
      'Seedance, Kling and Wan video models',
      'Priority generation speed',
      'Up to 1080p video with Seedance 2.5',
      'Prompt Library: 30+ ready-made stories',
      'No watermark',
      'Commercial use license',
      'Priority support',
    ],
    footnote: 'Turn ideas into impact.',
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'For teams and professionals.',
    icon: 'usersRound',
    monthlyPrice: 99,
    yearlyPrice: 990,
    cta: 'Upgrade to Studio',
    features: [
      '5,000 credits per month',
      'Dramas up to 90 seconds long',
      'About 2½ minutes of finished video a month',
      'All video models, plus early access to new ones',
      'Fastest generation speed',
      'Up to 1080p video with Seedance 2.5',
      'Prompt Library: 30+ ready-made stories',
      'No watermark',
      'Commercial use license',
      'Dedicated support',
    ],
    footnote: 'Build bigger stories together.',
  },
]

/** Whole-percent saving of paying yearly vs. twelve monthly payments. */
export function yearlySavingPercent(plan: PricingPlan): number {
  if (plan.monthlyPrice === 0) return 0
  return Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100)
}

export const HIGHLIGHTS: Array<{ icon: AppIconName; title: string; body: string }> = [
  { icon: 'sparkles', title: 'Create without limits', body: 'From ideas to stunning videos.' },
  { icon: 'bolt', title: 'Powered by leading AI models', body: 'Seedance, Kling, Wan and more.' },
  { icon: 'badgeCheck', title: 'Your content, your rights', body: 'Create, own and monetize.' },
  { icon: 'usersRound', title: 'Trusted by creators worldwide', body: 'Join a growing community.' },
]
