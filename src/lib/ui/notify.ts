import { humanizeErrorMessage } from '@/lib/errors/humanize'

/**
 * App-wide notifications (bottom-right cards), usable from components, hooks and plain
 * functions alike. Nothing in the app should fail silently or use the browser's alert():
 * every outcome the customer needs to know about goes through here.
 *
 * Rendered by <NotificationCenter />, mounted once in the locale layout.
 */

export const NOTIFY_EVENT = 'nucleus:notify'

export type NotifyKind = 'success' | 'error' | 'warning' | 'info'

export interface NotifyAction {
  label: string
  /** Where the button goes (a page or `?stage=` link). */
  href?: string
  /** Or what it does; only works for notifications raised from the browser. */
  onClick?: () => void
}

export interface NotifyDetail {
  id: string
  kind: NotifyKind
  message: string
  title?: string
  action?: NotifyAction
  /** Milliseconds; 0 keeps it until closed. */
  duration: number
}

const DEFAULT_DURATION: Record<NotifyKind, number> = {
  success: 4000,
  info: 5000,
  warning: 7000,
  error: 9000,
}

function emit(kind: NotifyKind, message: string, options: { title?: string; action?: NotifyAction; duration?: number } = {}) {
  if (typeof window === 'undefined' || !message) return
  const detail: NotifyDetail = {
    id: Math.random().toString(36).slice(2, 10),
    kind,
    message,
    title: options.title,
    action: options.action,
    duration: options.duration ?? DEFAULT_DURATION[kind],
  }
  window.dispatchEvent(new CustomEvent<NotifyDetail>(NOTIFY_EVENT, { detail }))
}

type Options = { title?: string; action?: NotifyAction; duration?: number }

export const notify = {
  success: (message: string, options?: Options) => emit('success', message, options),
  info: (message: string, options?: Options) => emit('info', message, options),
  warning: (message: string, options?: Options) => emit('warning', message, options),
  /** Error messages are passed through humanizeErrorMessage, so raw codes never reach customers. */
  error: (message: unknown, options?: Options) => emit('error', humanizeErrorMessage(stringify(message), GENERIC_ERROR), options),
}

const GENERIC_ERROR = 'Something went wrong. Please try again in a moment.'

function stringify(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Error) return value.message
  return value == null ? '' : String(value)
}

const SUCCESS_PATTERN = /\b(saved|success|successful|successfully|complete|completed|uploaded|appended|done|copied|created)\b/i
const CREDITS_PATTERN = /\b(credits?|insufficient balance|not enough)\b/i

/**
 * Drop-in replacement for the old alert() calls: picks the kind from the wording, so
 * "Upload successful" shows as a success and "Save failed: …" as an error.
 */
export function notifyAlert(message: unknown): void {
  const text = stringify(message).trim()
  if (!text) return
  if (/\b(fail|failed|error|could not|cannot|can't|unable)\b/i.test(text)) {
    notify.error(text)
  } else if (SUCCESS_PATTERN.test(text)) {
    notify.success(text)
  } else if (CREDITS_PATTERN.test(text)) {
    notify.warning(text, { action: { label: 'See plans', href: '/en/pricing' } })
  } else {
    notify.info(text)
  }
}
