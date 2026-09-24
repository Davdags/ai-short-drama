/**
 * Product updates ("what's new"), newest first. Shown on /updates.
 */

export interface ProductUpdate {
  /** ISO date. */
  date: string
  title: string
  items: string[]
  tag: 'New' | 'Improved' | 'Fixed'
}

export const PRODUCT_UPDATES: ProductUpdate[] = [
  {
    date: '2026-09-25',
    tag: 'New',
    title: 'A guided workspace, notifications and the Prompt Library',
    items: [
      'A step bar and a “Next step” card on every stage tell you exactly what to do next — and what it costs.',
      'Clear notifications replace pop-up boxes: you are always told when something needs doing first, runs out of credits or fails.',
      'A getting-started checklist for new accounts.',
      'The Prompt Library: 30 ready-made stories you can start a drama from in one click.',
    ],
  },
  {
    date: '2026-09-24',
    tag: 'Improved',
    title: 'Better pictures and fair prices',
    items: [
      'More realistic pictures: the Realistic style now produces photographic, film-like images.',
      'Characters keep their ethnicity, outfits and time of day from shot to shot.',
      'Locations are drawn as empty sets, so only your characters appear in scenes.',
      'Every generate button shows its price in credits before you click.',
      'New accounts get 150 free credits.',
    ],
  },
  {
    date: '2026-09-24',
    tag: 'New',
    title: 'More ways to pay',
    items: [
      'Pay by card in US dollars, or by bank transfer and mobile money.',
      'Nigerian customers can pay in naira by card, bank transfer or USSD.',
    ],
  },
]
