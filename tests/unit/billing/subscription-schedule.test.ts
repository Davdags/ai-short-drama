import { describe, expect, it } from 'vitest'

/**
 * The month arithmetic behind the yearly credit drip. A yearly customer pays once but
 * must receive their allowance every month, so getting the boundary wrong either pays
 * them twice or starves them.
 *
 * Mirrors monthsBetween in scripts/process-subscriptions.ts.
 */
function monthsBetween(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  return to.getDate() >= from.getDate() ? months : months - 1
}

const at = (iso: string) => new Date(`${iso}T12:00:00Z`)

describe('yearly credit drip schedule', () => {
  it('grants nothing before a full month has passed', () => {
    expect(monthsBetween(at('2026-01-15'), at('2026-01-16'))).toBe(0)
    expect(monthsBetween(at('2026-01-15'), at('2026-02-14'))).toBe(0)
  })

  it('grants once the same day-of-month comes round', () => {
    expect(monthsBetween(at('2026-01-15'), at('2026-02-15'))).toBe(1)
    expect(monthsBetween(at('2026-01-15'), at('2026-03-15'))).toBe(2)
  })

  it('counts whole months across a year boundary', () => {
    expect(monthsBetween(at('2026-11-10'), at('2027-01-10'))).toBe(2)
    expect(monthsBetween(at('2026-11-10'), at('2027-01-09'))).toBe(1)
  })

  it('does not over-grant for a customer who signed up on the 31st', () => {
    // February has no 31st, so the grant waits rather than firing early.
    expect(monthsBetween(at('2026-01-31'), at('2026-02-28'))).toBe(0)
    expect(monthsBetween(at('2026-01-31'), at('2026-03-31'))).toBe(2)
  })

  it('a full year of a yearly plan yields twelve grants', () => {
    expect(monthsBetween(at('2026-01-15'), at('2027-01-15'))).toBe(12)
  })
})

describe('advancing the grant marker', () => {
  /** The job advances one month per run so a long outage cannot pay a lump sum. */
  function nextGrant(from: Date): Date {
    const next = new Date(from)
    next.setMonth(next.getMonth() + 1)
    return next
  }

  it('moves forward exactly one month at a time', () => {
    const first = nextGrant(at('2026-01-15'))
    expect(first.getMonth()).toBe(1)
    expect(first.getDate()).toBe(15)
  })

  it('after a three-month gap still only advances one month', () => {
    const marker = at('2026-01-15')
    const now = at('2026-04-20')
    expect(monthsBetween(marker, now)).toBe(3)
    // One run grants one month and moves the marker to February, not April.
    expect(nextGrant(marker).getMonth()).toBe(1)
  })
})
