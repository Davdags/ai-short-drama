import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'
import { Link } from '@/i18n/navigation'
import { BRAND_NAME } from '@/components/BrandWordmark'
import { SITE } from '@/lib/site-config'

export const metadata: Metadata = { title: `Terms of Service | ${BRAND_NAME}` }

const mail = <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={<p>These Terms govern your use of {BRAND_NAME} (the &ldquo;Service&rdquo;), operated by {SITE.legalName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using the Service you agree to these Terms. If you do not agree, do not use the Service.</p>}
      sections={[
        {
          title: 'Accounts',
          body: <>
            <p>You must be at least 18 years old, or the age of majority where you live, to use the Service. You are responsible for your account, for keeping your password secure, and for everything done with your account.</p>
            <p>Each person may hold one free account. Creating multiple accounts to collect free credits is not allowed, and such accounts may be closed without notice.</p>
          </>,
        },
        {
          title: 'Credits',
          body: <>
            <p>Generations on the Service use credits. The number of credits each generation costs depends on the model, length and quality you choose, and is shown in the product before you start.</p>
            <ul>
              <li>Credits have no cash value, cannot be transferred or sold, and cannot be exchanged for money except as described in our Refund Policy.</li>
              <li>Credits included in a subscription are granted each month and reset at the next monthly grant; unused subscription credits do not carry over.</li>
              <li>Credits from one-time credit packs and sign-up bonuses do not reset and remain available while your account is active.</li>
              <li>If a generation fails because of a technical error on our side, the credits reserved for it are returned automatically.</li>
            </ul>
            <p>We may change credit prices or the credits included in a plan. Changes apply from your next billing period and never to credits you have already paid for.</p>
          </>,
        },
        {
          title: 'Subscriptions and payment',
          body: <>
            <p>Paid plans are billed in advance, monthly or yearly, and renew automatically until cancelled. Yearly plans are charged once per year and grant their credits monthly. Payments are processed by our payment provider, Paystack; we do not store your full card details.</p>
            <p>You can cancel at any time. Cancellation stops the next renewal; your plan and its credits stay active until the end of the period you have paid for. Prices may include or exclude applicable taxes as shown at checkout.</p>
            <p>Refunds are covered by our <a href={SITE.refundPolicyUrl}>Refund Policy</a>.</p>
          </>,
        },
        {
          title: 'Acceptable use',
          body: <>
            <p>You must not use the Service to create, upload or share content that:</p>
            <ul>
              <li>is illegal, or sexualises minors in any way;</li>
              <li>depicts a real, identifiable person in a sexual, defamatory, deceptive or harmful way, or impersonates a real person without their consent;</li>
              <li>harasses, threatens or promotes violence or hatred against people or groups;</li>
              <li>infringes anyone&rsquo;s copyright, trademark, privacy or other rights;</li>
              <li>is intended to deceive, such as fake news, scams or election disinformation presented as real.</li>
            </ul>
            <p>You must not attempt to bypass limits, credit charges or safety filters, reverse-engineer or overload the Service, access it by automated means we have not approved, or resell access to it. The AI providers we use also apply their own safety filters, which may block some requests.</p>
          </>,
        },
        {
          title: 'Your content',
          body: <>
            <p>You keep ownership of the stories, text, images and other material you submit (&ldquo;Inputs&rdquo;). As between you and us, and to the extent the law allows, you also own the images, videos, audio and scripts the Service generates for you (&ldquo;Outputs&rdquo;), and you may use them commercially.</p>
            <p>You grant us a limited licence to store, process and transmit your Inputs and Outputs only as needed to run, secure and improve the Service, including sending them to the AI providers that perform the generation. You are responsible for making sure you have the rights to your Inputs and that your use of Outputs is lawful.</p>
          </>,
        },
        {
          title: 'AI-generated output',
          body: <p>Outputs are produced by artificial intelligence. They may be inaccurate, unexpected or similar to content generated for other users, and they may not always follow your instructions exactly. Review Outputs before relying on or publishing them. We do not guarantee that any Output is unique or free of third-party rights.</p>,
        },
        {
          title: 'Third-party services',
          body: <p>The Service relies on third parties, including AI model providers, hosting, email and payment providers. Their availability, limits and quality can affect the Service. Models may be added, changed or retired over time.</p>,
        },
        {
          title: 'Affiliate program',
          body: <p>Participation in our affiliate program is governed by the program terms shown on the <Link href={{ pathname: '/affiliate' }}>Affiliate page</Link>. Commissions on refunded or charged-back payments are reversed.</p>,
        },
        {
          title: 'Suspension and termination',
          body: <p>You may delete your account at any time by contacting us. We may suspend or close accounts that break these Terms, create risk or legal exposure for us or others, or abuse the Service. Where we close a paid account without cause, we will refund the unused portion of the current paid period.</p>,
        },
        {
          title: 'Disclaimers',
          body: <p>The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the fullest extent permitted by law, we disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose and non-infringement, and we do not promise that the Service will be uninterrupted or error-free.</p>,
        },
        {
          title: 'Limitation of liability',
          body: <p>To the fullest extent permitted by law, we are not liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, revenue or data. Our total liability for any claim relating to the Service is limited to the amount you paid us in the three months before the claim arose. Nothing in these Terms limits liability that cannot be limited by law.</p>,
        },
        {
          title: 'Indemnity',
          body: <p>You agree to indemnify us against claims, losses and costs arising from your Inputs, your use of Outputs, or your breach of these Terms.</p>,
        },
        {
          title: 'Changes to these Terms',
          body: <p>We may update these Terms. We will post the new version here with a new effective date and, for material changes, notify you by email or in the product. Continuing to use the Service after changes take effect means you accept them.</p>,
        },
        {
          title: 'Governing law',
          body: <p>These Terms are governed by the laws of {SITE.country}, and disputes will be resolved by the courts of {SITE.country}, unless the law of your country of residence requires otherwise.</p>,
        },
        {
          title: 'Contact',
          body: <p>Questions about these Terms: {mail}.</p>,
        },
      ]}
    />
  )
}
