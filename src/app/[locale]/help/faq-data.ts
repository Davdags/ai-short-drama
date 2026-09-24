import { SIGNUP_BONUS_CREDITS } from '@/lib/billing/credits-constants'
import { BRAND_NAME } from '@/components/BrandWordmark'

/**
 * Help centre content. Plain text only so it stays searchable and easy to edit —
 * anything needing links lives in the page's contact card instead.
 */
export interface FaqItem {
  q: string
  a: string
}

export interface FaqCategory {
  id: string
  title: string
  blurb: string
  items: FaqItem[]
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    blurb: 'Your first story, step by step.',
    items: [
      {
        q: `What is ${BRAND_NAME}?`,
        a: `${BRAND_NAME} turns a written story into a finished short drama. You paste or write your story, and the studio breaks it into a screenplay, builds a storyboard, generates an image for every shot, animates those shots into video, and adds voices and lip sync. You stay in control at every stage and can edit or regenerate anything you do not like.`,
      },
      {
        q: 'How do I make my first video?',
        a: 'Open the workspace and create a project. Paste your story text, then work down the stages in order: analyse the story, convert it to a screenplay, build the storyboard, generate the shot images, and finally generate video for each shot. Each stage shows you the result before you move on, so you can fix the writing before you spend credits on pictures.',
      },
      {
        q: 'Do I need my own API key?',
        a: `No. ${BRAND_NAME} runs every generation on our own infrastructure. You only need credits — there is nothing to set up, connect or configure.`,
      },
      {
        q: 'How long does a video take?',
        a: 'A single shot usually takes one to three minutes. A full episode depends on how many shots it has. You can leave the page while things run; the work continues on our servers and you will see the results when you come back.',
      },
      {
        q: 'What is the best length for a first try?',
        a: 'Start with a short scene — two or three shots. It costs very little, finishes quickly, and shows you how the whole pipeline behaves before you commit credits to a full episode.',
      },
    ],
  },
  {
    id: 'credits',
    title: 'Credits and billing',
    blurb: 'What things cost and how credits work.',
    items: [
      {
        q: 'What is a credit?',
        a: 'A credit is the unit we bill generation in. Every model has a price per image, per second of video, or per thousand words of text. Bigger, higher-resolution and longer generations cost more credits than small ones.',
      },
      {
        q: 'How much does a generation cost?',
        a: 'The exact cost appears on the button before you click it, so you never generate without knowing the price. As a guide: a storyboard image is around 16 credits, a five-second clip at 480p is around 157 credits, and the same clip at 720p is around 338 credits. Text stages such as building a screenplay cost far less.',
      },
      {
        q: 'What do I get for free?',
        a: `Every new account gets ${SIGNUP_BONUS_CREDITS} credits once, after you verify your email. They are enough to write your story, turn it into a screenplay and storyboard, and create your first few pictures. Every button shows its price before you click, and generating video needs a paid plan.`,
      },
      {
        q: 'Do credits roll over to next month?',
        a: 'No. Plan credits are granted at the start of each billing period and are used within that period. Your balance resets when the plan renews, so it is worth using what you have paid for.',
      },
      {
        q: 'What happens if I run out mid-project?',
        a: 'Nothing is lost. Your project, storyboard and everything you have already generated stay exactly as they are. Add credits or upgrade your plan and you can carry on from where you stopped.',
      },
      {
        q: 'Am I charged for a generation that fails?',
        a: 'No. When a generation fails because of a technical error, the credits held for it are returned to your balance automatically. You do not need to ask. If you think credits were taken for something that failed, contact us and we will check it.',
      },
      {
        q: 'Can I get a refund?',
        a: 'Yes, within the limits in our Refund Policy — broadly, a full refund within 7 days of a first monthly payment if you have used less than 10% of that month’s credits. Credits you have already spent cannot be refunded, because the computing cost is incurred the moment a generation runs.',
      },
      {
        q: 'Can I cancel any time?',
        a: 'Yes. Cancelling stops the next renewal. Your plan and its credits stay active until the end of the period you already paid for.',
      },
    ],
  },
  {
    id: 'generating',
    title: 'Making videos',
    blurb: 'Models, sound, lip sync and quality.',
    items: [
      {
        q: 'Can I choose which AI model to use?',
        a: 'Yes. Every generation step lets you pick the model, and you can change it per shot. Different models have different strengths, speeds and prices — the price updates on the button as soon as you change the model, so you can compare before committing.',
      },
      {
        q: 'Can my characters speak?',
        a: 'Yes. Sound is your choice on every clip. With sound turned on, the model performs the dialogue from your script. With sound off, you can generate the voice separately and use lip sync to match the character’s mouth to it. Both routes are supported — pick whichever suits the scene.',
      },
      {
        q: 'Why does my shot say "Queued"?',
        a: 'Queued means your generation is waiting for a free slot. Each plan can run a certain number of generations at once, and anything beyond that waits its turn rather than failing. It will start automatically. Higher plans run more at the same time.',
      },
      {
        q: 'Why do my characters look different between shots?',
        a: 'Build your characters in the asset library first and reference them in your shots. That gives every generation the same face and outfit to work from, which is what keeps a character consistent across a whole episode.',
      },
      {
        q: 'A generation failed. What now?',
        a: 'Your credits are returned automatically. Failures are usually temporary — try again, and if it keeps failing, try a different model or shorten the prompt. Very long or unusual prompts are the most common cause.',
      },
      {
        q: 'Can I edit a shot without redoing everything?',
        a: 'Yes. Every shot is independent. You can rewrite one shot’s prompt, regenerate just its image, or regenerate just its video, without touching the rest of the episode.',
      },
      {
        q: 'What resolutions can I make?',
        a: 'Resolution depends on your plan and the model you choose. Free and Starter cover standard and HD, Pro adds Full HD, and Studio adds 4K where the model supports it. Higher resolutions cost more credits per second.',
      },
    ],
  },
  {
    id: 'rights',
    title: 'Your content and rights',
    blurb: 'Ownership, commercial use and privacy.',
    items: [
      {
        q: 'Do I own what I create?',
        a: 'Yes. You own the videos, images and audio you generate, subject to our Terms of Service. You are responsible for making sure the story you put in is yours to use.',
      },
      {
        q: 'Can I use my videos commercially?',
        a: 'Commercial use is included on the Pro and Studio plans. You can publish, monetise and sell work made on those plans. Free and Starter output is for personal and evaluation use.',
      },
      {
        q: 'Is there a watermark?',
        a: 'Free plan videos carry a watermark. All paid plans export without one.',
      },
      {
        q: 'Is my story private?',
        a: 'Your projects are private to your account. We do not publish your work or show it to other users. See our Privacy Policy for the full detail on what we store and why.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account',
    blurb: 'Signing in, email and closing your account.',
    items: [
      {
        q: 'I did not get my verification email.',
        a: 'Check your spam folder first, and make sure the address has no typo. The email can take a couple of minutes. If it still has not arrived, contact us and we will verify the account manually.',
      },
      {
        q: 'Can I sign in with Google?',
        a: 'Yes. You can sign up and sign in with Google, or with an email address and password — whichever you prefer.',
      },
      {
        q: 'How do I change my password?',
        a: 'Go to your account settings and change it there. We will email you whenever your password changes, so you always know if something happens to your account.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Contact us from your account email and we will close it and remove your data. Deleting your account is permanent and cancels any active plan — unused credits are not refundable on closure.',
      },
    ],
  },
  {
    id: 'affiliate',
    title: 'Affiliate programme',
    blurb: 'Earning by referring creators.',
    items: [
      {
        q: 'How much can I earn?',
        a: 'Commission starts at 10% and rises with your total referred revenue: 12% past $2,500, 15% past $5,000, 20% past $25,000 and 40% past $100,000. Commission is recurring — you keep earning for as long as the people you refer keep paying.',
      },
      {
        q: 'When do I get paid?',
        a: 'Payouts run monthly on Net-60 terms, with a $50 minimum balance. Anything under the minimum rolls into the following month.',
      },
      {
        q: 'How is a referral tracked?',
        a: 'Your link sets a cookie when someone clicks it. If that person signs up and later pays, the commission is credited to you automatically and appears in your affiliate dashboard.',
      },
    ],
  },
]
