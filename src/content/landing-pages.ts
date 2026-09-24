/**
 * Use-case landing pages (/en/use-cases/<slug>). Each answers one thing people search for
 * or ask an AI assistant ("AI short drama maker", "AI video ad generator"…) in plain words,
 * with an FAQ that is also published as FAQPage structured data.
 */

export interface LandingPage {
  slug: string
  /** Browser tab / search result title. */
  metaTitle: string
  metaDescription: string
  headline: string
  intro: string
  benefits: Array<{ title: string; body: string }>
  steps: string[]
  faqs: Array<{ q: string; a: string }>
  /** Prompt Library stories to show as examples. */
  examples: string[]
}

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: 'ai-short-drama-maker',
    metaTitle: 'AI Short Drama Maker — turn a story into a vertical drama | NucleusArt',
    metaDescription: 'NucleusArt is an AI short drama maker: paste a story and get a script, consistent characters, a storyboard, scene pictures and video — in one studio. Start free with 150 credits.',
    headline: 'The AI short drama maker that starts from your story',
    intro: 'Paste a few paragraphs. NucleusArt writes the screenplay, finds your characters and locations, keeps their faces the same in every shot, draws the storyboard and turns each scene into video — ready for TikTok, Reels and YouTube Shorts.',
    benefits: [
      { title: 'Story in, drama out', body: 'No script format needed. Write it the way you would tell it — the screenplay, shots and camera directions are written for you.' },
      { title: 'Characters that stay the same', body: 'Each character gets a reference sheet first, so faces, outfits and places match from the first shot to the last.' },
      { title: 'Realistic, anime or comic', body: 'Choose a photorealistic film look, or drawn anime and comic styles.' },
      { title: 'Every price shown up front', body: 'Each button shows its cost in credits before you click. No surprises.' },
    ],
    steps: ['Write or paste your story', 'Get the script and cast', 'Create the storyboard pictures', 'Turn scenes into video and export'],
    faqs: [
      { q: 'What is an AI short drama maker?', a: 'A tool that turns a written story into a short vertical drama — script, characters, storyboard and video — using AI. NucleusArt does all of these steps in one place.' },
      { q: 'How long can the dramas be?', a: 'Up to 90 seconds per episode, split into shots of 4 to 15 seconds. Longer stories can be split into several episodes.' },
      { q: 'Is it free to try?', a: 'Yes. New accounts get 150 free credits — enough for a script, a storyboard and your first pictures. Video is on paid plans from $19 a month.' },
      { q: 'Which AI models does it use?', a: 'Claude and Gemini for writing, GPT Image 2 and Nano Banana for pictures, and Seedance, Kling and Wan for video.' },
    ],
    examples: ['the-quiet-assistant', 'letters-from-seat-14b', 'the-last-train'],
  },
  {
    slug: 'ai-video-ad-generator',
    metaTitle: 'AI Video Ad Generator — story-driven ads from a short brief | NucleusArt',
    metaDescription: 'Make story-driven video ads with AI: describe the moment, get a script, a consistent cast, storyboard frames and vertical video for social ads. Try NucleusArt free.',
    headline: 'Story-driven video ads, made with AI',
    intro: 'The ads people watch to the end tell a tiny story. Describe the moment your product matters — NucleusArt writes it, casts it, storyboards it and renders it as vertical video for Meta, TikTok and YouTube ads.',
    benefits: [
      { title: 'From brief to storyboard in minutes', body: 'A few lines about your product and the moment it helps someone is enough to start.' },
      { title: 'On-brand, consistent characters', body: 'Keep the same actor, outfit and setting across every shot and every variation.' },
      { title: 'Made for social feeds', body: '9:16, 1:1 and 16:9 formats, with shots sized for 15, 30 and 60-second ads.' },
      { title: 'Test more ideas for less', body: 'See the storyboard before paying for video, and only render the concepts you like.' },
    ],
    steps: ['Describe your product and the moment', 'Review the script and storyboard', 'Render the scenes as video', 'Export for your ad platform'],
    faqs: [
      { q: 'Can I make ads for my own product?', a: 'Yes. Paid plans include a commercial use licence for what you create.' },
      { q: 'What formats are supported?', a: 'Vertical 9:16 for Reels, TikTok and Shorts, square 1:1 and landscape 16:9.' },
      { q: 'How much does an ad cost to make?', a: 'Every step shows its credit price before you click. A 20-second ad in standard quality uses roughly 950 credits on the default models.' },
    ],
    examples: ['the-phone-that-saved-the-wedding', 'the-coffee-before-the-interview'],
  },
  {
    slug: 'nollywood-ai-drama',
    metaTitle: 'Make Nollywood-style short dramas with AI | NucleusArt',
    metaDescription: 'Create Nollywood-style short dramas with AI: Nigerian characters, Lagos settings, family drama and big twists. Pay in naira. Start free on NucleusArt.',
    headline: 'Nollywood-style short dramas, made with AI',
    intro: 'Big families, bigger twists, Lagos energy. Write your story and NucleusArt casts Nigerian characters, builds the scenes and turns them into vertical dramas your audience will binge — and you can pay in naira.',
    benefits: [
      { title: 'Characters that look like your story', body: 'Names and settings guide the casting, so a Lagos boardroom drama gets Nigerian actors and real-looking locations.' },
      { title: 'Pay in naira', body: 'Card, bank transfer or USSD through Paystack — or in US dollars if you prefer.' },
      { title: 'Built for series', body: 'Reuse your cast across episodes so your audience follows the same characters.' },
      { title: 'Ready-made stories', body: 'Start from Nollywood-style prompts: the mother-in-law visit, the village chief election, the Lagos traffic proposal.' },
    ],
    steps: ['Pick a story or write your own', 'Get the script and your Nigerian cast', 'Create the storyboard', 'Turn it into video and post'],
    faqs: [
      { q: 'Can I pay in naira?', a: 'Yes. Nigerian customers can pay in naira by card, bank transfer or USSD. Starter is ₦28,500 a month.' },
      { q: 'Will the characters look Nigerian?', a: 'Yes. Characters are cast from their names, the setting and the culture of your story, so a Nigerian story gets Nigerian characters.' },
      { q: 'Can I make a series?', a: 'Yes. Your characters and locations stay in the project, so every episode uses the same cast.' },
    ],
    examples: ['the-mother-in-law-visit', 'lagos-traffic-proposal', 'the-village-chief-election'],
  },
  {
    slug: 'ai-storyboard-generator',
    metaTitle: 'AI Storyboard Generator — shots, camera directions and frames | NucleusArt',
    metaDescription: 'Generate a full storyboard from a script or story with AI: shot list, camera directions and a picture for every frame, with consistent characters. Free to start.',
    headline: 'Turn any script into a storyboard with AI',
    intro: 'NucleusArt breaks your story into shots with camera directions and acting notes, then draws every frame with your characters kept consistent — ready to pitch, plan a shoot or turn straight into video.',
    benefits: [
      { title: 'A real shot list', body: 'Shot types, camera moves and the line of dialogue for each frame.' },
      { title: 'Consistent characters', body: 'Every frame uses the same character reference, so faces and outfits never drift.' },
      { title: 'Photoreal or illustrated', body: 'Realistic film stills, or anime and comic styles.' },
      { title: 'One click to video', body: 'When the storyboard is right, turn each frame into a moving clip.' },
    ],
    steps: ['Paste your story or script', 'Get the shot list', 'Create a picture for each shot', 'Export or turn into video'],
    faqs: [
      { q: 'Can I start from an existing script?', a: 'Yes. Paste a story or a script; NucleusArt works out the scenes and shots either way.' },
      { q: 'Is the storyboard free to try?', a: 'Yes. The 150 free credits cover the script, the storyboard and your first pictures.' },
    ],
    examples: ['the-safe-deposit-box', 'the-will-reading'],
  },
]

export function findLandingPage(slug: string): LandingPage | undefined {
  return LANDING_PAGES.find((page) => page.slug === slug)
}
