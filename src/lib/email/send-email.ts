import { createScopedLogger } from '@/lib/logging/core'

const logger = createScopedLogger({ module: 'email' })
const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
  /** Where replies go; defaults to EMAIL_REPLY_TO (the support inbox). */
  replyTo?: string
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

/** Sends through Resend. Returns false (never throws) when unconfigured or rejected. */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) {
    logger.warn({ message: 'email not configured (RESEND_API_KEY / EMAIL_FROM); not sent', details: { subject: message.subject } })
    return false
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...((message.replyTo || process.env.EMAIL_REPLY_TO) ? { reply_to: message.replyTo || process.env.EMAIL_REPLY_TO } : {}),
      }),
    })
    if (!response.ok) {
      logger.error({ message: 'email send rejected', details: { status: response.status, body: (await response.text()).slice(0, 300) } })
      return false
    }
    return true
  } catch (error) {
    logger.error({ message: 'email send failed', details: { error: error instanceof Error ? error.message : String(error) } })
    return false
  }
}
