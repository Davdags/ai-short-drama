import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'
import { BRAND_NAME } from '@/components/BrandWordmark'
import { SITE } from '@/lib/site-config'

export const metadata: Metadata = { title: `Privacy Policy | ${BRAND_NAME}` }

const mail = <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={<p>This policy explains what personal data {SITE.legalName} (&ldquo;we&rdquo;) collects when you use {BRAND_NAME}, how we use it, and your choices. We only collect what we need to run the Service.</p>}
      sections={[
        {
          title: 'Data we collect',
          body: <ul>
            <li><strong>Account data:</strong> your username, email address and a securely hashed password. If you sign in with Google, we receive your name, email address and profile picture from Google.</li>
            <li><strong>Content:</strong> the stories, prompts, images and other material you submit, and the images, videos, audio and scripts generated for you.</li>
            <li><strong>Billing data:</strong> your plan, credit balance and payment history. Card and bank details are handled by our payment provider, Paystack; we never see or store your full card number.</li>
            <li><strong>Usage and technical data:</strong> generation history, credit usage, IP address, browser type and logs used for security, debugging and preventing abuse.</li>
            <li><strong>Affiliate data:</strong> if you join the affiliate program, your referral code, the payout details you provide, and anonymised click counts. If you arrive through a referral link, we note which affiliate referred you.</li>
          </ul>,
        },
        {
          title: 'How we use your data',
          body: <ul>
            <li>To provide the Service: running generations, storing your projects, and managing credits and subscriptions.</li>
            <li>To send service emails such as password resets, receipts and important account notices.</li>
            <li>To keep the Service secure: preventing fraud, abuse and duplicate free accounts.</li>
            <li>To pay affiliate commissions and to improve the Service using aggregated usage statistics.</li>
          </ul>,
        },
        {
          title: 'AI processing',
          body: <p>To generate content, your prompts, text and reference media are sent to third-party AI model providers through our API partner, EvoLink. They process this data only to produce your result. Temporary copies of uploaded media held by our API partner expire automatically (typically within 72 hours). We do not sell your content or use it to train our own models.</p>,
        },
        {
          title: 'Who we share data with',
          body: <>
            <p>We share data only with service providers that help us run {BRAND_NAME}, under contracts that limit their use of it:</p>
            <ul>
              <li>AI generation: EvoLink and the model providers it routes to;</li>
              <li>payments: Paystack;</li>
              <li>email delivery: Resend;</li>
              <li>sign-in: Google (only if you choose Google sign-in);</li>
              <li>hosting and storage providers.</li>
            </ul>
            <p>We may also disclose data when required by law or to protect the rights and safety of our users and the public. We do not sell your personal data.</p>
          </>,
        },
        {
          title: 'Cookies',
          body: <p>We use essential cookies to keep you signed in and to secure your session. If you arrive through an affiliate link, a referral cookie (&ldquo;na_ref&rdquo;) remembers the referral for 30 days. We may use Google Analytics to understand how the site is used. We do not use advertising cookies.</p>,
        },
        {
          title: 'Retention',
          body: <p>We keep your account data and projects while your account is active. When you delete your account, we delete or anonymise your personal data within 30 days, except records we must keep for legal, tax or accounting reasons (such as payment records) or to resolve disputes.</p>,
        },
        {
          title: 'Security',
          body: <p>Passwords are stored hashed, connections are encrypted, and API keys and payment credentials never reach your browser. No system is perfectly secure, so please use a strong, unique password.</p>,
        },
        {
          title: 'Your rights',
          body: <p>Depending on where you live, you may have the right to access, correct, export or delete your personal data, and to object to or restrict certain processing. To make a request, email {mail} from your account email address. We will respond within 30 days.</p>,
        },
        {
          title: 'Children',
          body: <p>{BRAND_NAME} is not intended for anyone under 18, and we do not knowingly collect data from children. If you believe a child has given us data, contact us and we will delete it.</p>,
        },
        {
          title: 'International transfers',
          body: <p>Our providers may process data in countries other than yours. Where required, we rely on appropriate safeguards for these transfers.</p>,
        },
        {
          title: 'Changes and contact',
          body: <p>We may update this policy and will post the new version here with a new effective date. Questions or requests: {mail}.</p>,
        },
      ]}
    />
  )
}
