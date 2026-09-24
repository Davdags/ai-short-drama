import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'
import { BRAND_NAME } from '@/components/BrandWordmark'
import { SITE } from '@/lib/site-config'

export const metadata: Metadata = { title: `Refund Policy | ${BRAND_NAME}` }

const mail = <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      intro={<p>Every generation on {BRAND_NAME} costs us real computing fees the moment it runs, so refunds depend on how many credits you have used. This policy explains when you can get your money back.</p>}
      sections={[
        {
          title: 'New subscriptions',
          body: <>
            <p><strong>Monthly plans:</strong> you can request a full refund within 7 days of your first payment if you have used less than 10% of that month&rsquo;s plan credits (for example, fewer than 200 credits on Pro).</p>
            <p><strong>Yearly plans:</strong> you can request a full refund within 14 days of payment if you have used less than 10% of your first month&rsquo;s credits.</p>
          </>,
        },
        {
          title: 'Renewals',
          body: <p>If a renewal charged you by mistake, request a refund within 48 hours of the renewal and before using any credits from the new period, and we will refund it in full and cancel the plan.</p>,
        },
        {
          title: 'Credit packs',
          body: <p>One-time credit packs can be refunded within 7 days of purchase if none of the pack&rsquo;s credits have been used. Once pack credits are used, the pack is non-refundable.</p>,
        },
        {
          title: 'Cancelling',
          body: <p>You can cancel your plan at any time; it stops the next renewal. Your plan and credits stay active until the end of the period you paid for. Cancelling does not by itself trigger a refund, and we do not give partial refunds for unused time outside the cases above.</p>,
        },
        {
          title: 'Failed generations',
          body: <p>If a generation fails because of a technical error, the credits reserved for it are returned to your balance automatically — you do not need to request anything. If you believe credits were taken for a generation that failed, contact us and we will check and correct it.</p>,
        },
        {
          title: 'What is not refundable',
          body: <ul>
            <li>Credits already used, including for generations you did not like — AI output can vary, so try short tests before large runs.</li>
            <li>Free, bonus or promotional credits.</li>
            <li>Accounts closed for breaking our <a href={SITE.termsUrl}>Terms of Service</a>.</li>
          </ul>,
        },
        {
          title: 'How to request a refund',
          body: <p>Email {mail} from your account email with your username and the payment reference from your receipt. We reply within 3 business days. Approved refunds are returned to your original payment method through Paystack, usually within 5–10 business days depending on your bank. Refunded credits are removed from your balance.</p>,
        },
        {
          title: 'Chargebacks',
          body: <p>Please contact us before disputing a charge with your bank — we can usually resolve it faster. Accounts with an open chargeback may be suspended until it is resolved.</p>,
        },
      ]}
    />
  )
}
