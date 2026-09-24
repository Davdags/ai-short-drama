import { BRAND_NAME } from '@/components/BrandWordmark'
import { SITE } from '@/lib/site-config'

/**
 * Shared branded layout for every transactional email (white + purple, email-client-safe
 * inline styles, table layout). Returns both HTML and a plain-text version.
 */

export function appBaseUrl(): string {
  return (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/+$/, '')
}

function absolute(url: string): string {
  return url.startsWith('http') ? url : `${appBaseUrl()}${url.startsWith('/') ? '' : '/'}${url}`
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export interface EmailContent {
  subject: string
  /** Short preview line shown by inboxes next to the subject. */
  preheader: string
  heading: string
  /** Paragraphs of plain text (escaped for HTML). */
  paragraphs: string[]
  /** Optional bullet points. */
  bullets?: string[]
  cta?: { label: string; url: string }
  /** Small grey line under the button (e.g. link expiry, security note). */
  note?: string
}

export function renderEmail(content: EmailContent): { subject: string; html: string; text: string } {
  const base = appBaseUrl()
  const ctaUrl = content.cta ? absolute(content.cta.url) : null
  const paragraphs = content.paragraphs
    .map((text) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#404040">${escapeHtml(text)}</p>`)
    .join('')
  const bullets = content.bullets?.length
    ? `<ul style="margin:0 0 14px;padding-left:20px;color:#404040;font-size:15px;line-height:1.6">${content.bullets.map((item) => `<li style="margin:0 0 6px">${escapeHtml(item)}</li>`).join('')}</ul>`
    : ''
  const button = ctaUrl && content.cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0"><tr><td style="border-radius:10px;background:#8020fc"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">${escapeHtml(content.cta.label)}</a></td></tr></table>`
    : ''
  const note = content.note ? `<p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#8a8a8a">${escapeHtml(content.note)}</p>` : ''

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(content.subject)}</title></head>
<body style="margin:0;padding:0;background:#f6f4fb;font-family:Inter,Segoe UI,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(content.preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4fb;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px">
<tr><td style="padding:0 4px 18px"><a href="${base}/en" style="text-decoration:none"><img src="${base}/logo-small.png" alt="" width="32" height="32" style="vertical-align:middle;border:0"> <span style="vertical-align:middle;font-size:20px;font-weight:700;color:#171717">Nucleus<span style="color:#8020fc">Art</span></span></a></td></tr>
<tr><td style="background:#ffffff;border-radius:16px;padding:32px 30px;border:1px solid #ece8f6">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#171717">${escapeHtml(content.heading)}</h1>
${paragraphs}${bullets}${button}${note}
</td></tr>
<tr><td style="padding:18px 6px;font-size:12px;line-height:1.6;color:#8a8a8a;text-align:center">
${BRAND_NAME} · Ideas into Reality<br>
Questions? Reply to this email or write to <a href="mailto:${SITE.contactEmail}" style="color:#8020fc">${SITE.contactEmail}</a><br>
<a href="${absolute(SITE.termsUrl)}" style="color:#8a8a8a">Terms</a> · <a href="${absolute(SITE.privacyUrl)}" style="color:#8a8a8a">Privacy</a> · <a href="${base}/en/profile" style="color:#8a8a8a">Email settings</a>
</td></tr>
</table></td></tr></table></body></html>`

  const text = [
    content.heading,
    '',
    ...content.paragraphs.flatMap((paragraph) => [paragraph, '']),
    ...(content.bullets?.length ? [...content.bullets.map((item) => `- ${item}`), ''] : []),
    ...(ctaUrl && content.cta ? [`${content.cta.label}: ${ctaUrl}`, ''] : []),
    ...(content.note ? [content.note, ''] : []),
    '—',
    `${BRAND_NAME} · Questions? ${SITE.contactEmail}`,
  ].join('\n')

  return { subject: content.subject, html, text }
}
