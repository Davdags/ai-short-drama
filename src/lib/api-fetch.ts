const LOCALE_PATH_PATTERN = /^\/(zh|en)(\/|$)/

function resolveLocaleFromPath(pathname: string): string {
  const match = pathname.match(LOCALE_PATH_PATTERN)
  return match?.[1] ?? 'en'
}

export function getPageLocale(): string {
  if (typeof window === 'undefined') return 'en'
  return resolveLocaleFromPath(window.location.pathname)
}

function resolveRequestPathname(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    if (input.startsWith('/')) return input
    try {
      return new URL(input).pathname
    } catch {
      return ''
    }
  }

  if (input instanceof URL) {
    return input.pathname
  }

  try {
    return new URL(input.url).pathname
  } catch {
    return ''
  }
}

function shouldInjectLocaleHeader(input: RequestInfo | URL): boolean {
  const pathname = resolveRequestPathname(input)
  return pathname === '/api' || pathname.startsWith('/api/')
}

export function mergeLocaleHeader(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers)
  if (!headers.has('Accept-Language')) {
    headers.set('Accept-Language', getPageLocale())
  }
  return { ...init, headers }
}

/** Opens the upgrade prompt without a server round trip (a button that already knows its price). */
export function showOutOfCredits(required: number, available: number): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OUT_OF_CREDITS_EVENT, { detail: { required, available } }))
}

/** Fired on window when any API call is refused for lack of credits. */
export const OUT_OF_CREDITS_EVENT = 'nucleus:out-of-credits'

export interface OutOfCreditsDetail {
  required?: number
  available?: number
}

/**
 * Many buttons ignore a failed response, so running out of credits looked like the
 * button doing nothing. Every API call passes through here, so this is the one place
 * that can reliably tell the customer why — the listener shows an upgrade prompt.
 */
async function announceOutOfCredits(response: Response): Promise<void> {
  if (response.status !== 402 || typeof window === 'undefined') return
  try {
    const body = await response.clone().json() as {
      error?: { code?: string; details?: { required?: unknown; available?: unknown } }
      code?: string
    }
    const code = body?.error?.code || body?.code
    if (code !== 'INSUFFICIENT_BALANCE') return
    const details = body.error?.details
    const detail: OutOfCreditsDetail = {
      required: typeof details?.required === 'number' ? details.required : undefined,
      available: typeof details?.available === 'number' ? details.available : undefined,
    }
    window.dispatchEvent(new CustomEvent<OutOfCreditsDetail>(OUT_OF_CREDITS_EVENT, { detail }))
  } catch {
    // Not JSON — nothing to announce.
  }
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!shouldInjectLocaleHeader(input)) {
    return fetch(input, init)
  }
  const response = await fetch(input, mergeLocaleHeader(init))
  if (!response.ok) void announceOutOfCredits(response)
  return response
}
