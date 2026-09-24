import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NOTIFY_EVENT, notify, notifyAlert, type NotifyDetail } from '@/lib/ui/notify'

/**
 * Every former alert() now becomes a notification card. The wording decides the colour:
 * a failure must never look like a success, and raw error codes must never reach customers.
 */
describe('notify', () => {
  let events: NotifyDetail[]
  const target = new EventTarget()
  const listener = (event: Event) => events.push((event as CustomEvent<NotifyDetail>).detail)

  beforeEach(() => {
    events = []
    vi.stubGlobal('window', target)
    target.addEventListener(NOTIFY_EVENT, listener)
  })
  afterEach(() => {
    target.removeEventListener(NOTIFY_EVENT, listener)
    vi.unstubAllGlobals()
  })

  it('shows failures as errors and successes as successes', () => {
    notifyAlert('Save failed: network error')
    notifyAlert('Upload successful')
    expect(events.map((event) => event.kind)).toEqual(['error', 'success'])
  })

  it('treats credit messages as a warning with a link to plans', () => {
    notifyAlert('Not enough credits for this.')
    expect(events[0]).toMatchObject({ kind: 'warning', action: { href: '/en/pricing' } })
  })

  it('hides machine error codes behind a friendly message', () => {
    notify.error('PROVIDER_BASE_URL_MISSING: evolink (llm)')
    expect(events[0].message).not.toContain('PROVIDER_BASE_URL_MISSING')
  })

  it('ignores empty messages', () => {
    notifyAlert('')
    notifyAlert(undefined)
    expect(events).toHaveLength(0)
  })
})
