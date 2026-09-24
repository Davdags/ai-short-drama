/**
 * Blog posts. Written as structured blocks (no markdown dependency) and rendered by
 * src/app/[locale]/blog. Each post has its own URL, description and JSON-LD for search.
 * Drafts for owner review: set `draft: true` to hide a post from the site and sitemap.
 */

export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'tip'; text: string }

export interface BlogPost {
  slug: string
  title: string
  description: string
  /** ISO date. */
  date: string
  readingMinutes: number
  tags: string[]
  draft?: boolean
  body: BlogBlock[]
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-to-turn-a-story-into-an-ai-short-drama',
    title: 'How to turn a story into an AI short drama in 4 steps',
    description: 'From a few paragraphs of text to a finished vertical short drama: story, script and cast, storyboard, then video — with what each step costs.',
    date: '2026-09-25',
    readingMinutes: 5,
    tags: ['Guide', 'Getting started'],
    body: [
      { type: 'p', text: 'Short dramas — one-minute vertical stories with a hook in the first three seconds — are the fastest-growing kind of video online. Until recently, making one meant actors, a location, a camera crew and days of editing. With NucleusArt you can go from a written story to a finished drama in an afternoon. Here is the whole process.' },
      { type: 'h2', text: '1. Write the story' },
      { type: 'p', text: 'Start with a few paragraphs. You don’t need a script format — write it like you would tell it to a friend. The best short dramas have one clear conflict, two or three characters, and a turn at the end.' },
      { type: 'list', items: [
        'Keep it to one location if you can: fewer places means more consistent pictures.',
        'Give characters real names. Names help the AI pick faces, clothing and culture that fit.',
        'End on a line of dialogue — it makes a strong last shot.',
      ] },
      { type: 'tip', text: 'Stuck for an idea? Open the Prompt Library and press “Use this prompt” on any story to start with it.' },
      { type: 'h2', text: '2. Script and cast' },
      { type: 'p', text: 'Press Start Creating. NucleusArt writes the screenplay, finds every character and location, and describes how each one looks. Then create a picture for each member of your cast. These pictures are the reference for every scene, so Amara looks like Amara in every shot.' },
      { type: 'h2', text: '3. Storyboard' },
      { type: 'p', text: 'Next, the script is split into shots with camera directions — close-ups, reactions, the reveal. Create a picture for each shot. Each picture becomes the first frame of its video clip, so this is where you fix anything you don’t like: regenerate a shot until it is right.' },
      { type: 'h2', text: '4. Video' },
      { type: 'p', text: 'Finally, turn each scene into a moving clip and export the whole drama. Choose the length that suits your platform — 30 seconds for a teaser, 60 seconds for a full episode.' },
      { type: 'h2', text: 'What does it cost?' },
      { type: 'p', text: 'Every button shows its price in credits before you click. Writing a story into a script and storyboard costs about 50 credits with the default writing model, each picture about 25, and video is priced per second. New accounts get 150 free credits — enough to see your story become a script, a storyboard and your first pictures.' },
    ],
  },
  {
    slug: 'writing-short-drama-hooks-that-keep-viewers-watching',
    title: 'Short drama hooks: 7 openings that keep viewers watching',
    description: 'The first three seconds decide whether a viewer stays. Seven proven openings for AI short dramas, with examples you can use today.',
    date: '2026-09-25',
    readingMinutes: 4,
    tags: ['Writing', 'Short drama'],
    body: [
      { type: 'p', text: 'On a vertical feed, nobody waits for your story to get interesting. The first shot has to create a question the viewer needs answered. Here are seven openings that work especially well for AI short dramas.' },
      { type: 'h2', text: '1. The humiliation' },
      { type: 'p', text: 'Someone powerful insults someone quiet. Viewers stay because they know the tables will turn. Example: “Sign this. You’ll never use those shares anyway.”' },
      { type: 'h2', text: '2. The wrong message' },
      { type: 'p', text: 'A text, a voice note or a letter reaches the wrong person. Instantly, your character knows something they shouldn’t.' },
      { type: 'h2', text: '3. The impossible reflection' },
      { type: 'p', text: 'Perfect for horror: something ordinary behaves one step wrong. A reflection that is late, a door that knocks back.' },
      { type: 'h2', text: '4. The reunion' },
      { type: 'p', text: 'Two people who have not seen each other in years, in the worst possible setting — a wedding, a courtroom, a hospital.' },
      { type: 'h2', text: '5. The countdown' },
      { type: 'p', text: '“Ten minutes.” A deadline turns any scene into a thriller.' },
      { type: 'h2', text: '6. The hidden identity' },
      { type: 'p', text: 'The waiter owns the hotel. The intern is the auditor. Plant a small clue in the first shot and pay it off at the end.' },
      { type: 'h2', text: '7. The family table' },
      { type: 'p', text: 'An empty chair, a will being read, a mother-in-law with eleven suitcases. Family tension is instantly relatable.' },
      { type: 'tip', text: 'Every one of these openings has a ready-made story in the Prompt Library. Pick one, change the names and make it yours.' },
    ],
  },
  {
    slug: 'consistent-characters-in-ai-video',
    title: 'How to keep your characters looking the same in every AI shot',
    description: 'Why AI characters change faces between scenes, and the simple workflow NucleusArt uses to keep faces, outfits and places consistent.',
    date: '2026-09-25',
    readingMinutes: 4,
    tags: ['Guide', 'Characters'],
    body: [
      { type: 'p', text: 'The fastest way to lose a viewer is a heroine who has a different face in every shot. Image models generate each picture from scratch, so without help they reinvent your character every time. Here is how to prevent that.' },
      { type: 'h2', text: 'Create the cast first' },
      { type: 'p', text: 'Before any scene is drawn, NucleusArt creates a reference sheet for each character: a face close-up plus front, side and back views, and an empty picture of each location. Every scene picture is then generated with those references attached.' },
      { type: 'h2', text: 'Describe people clearly' },
      { type: 'list', items: [
        'Use names that fit the setting — they guide ethnicity, clothing and style.',
        'Mention signature items: a burgundy suit, a silver watch, braided hair.',
        'Say the time of day in the story (“tonight”) so lighting stays consistent.',
      ] },
      { type: 'h2', text: 'Fix it once, not in every shot' },
      { type: 'p', text: 'If a character looks wrong, regenerate their cast picture — not the scenes. Every scene you create afterwards follows the new reference.' },
      { type: 'tip', text: 'Choose the Realistic style for photographic, film-like pictures, or Anime and Comic for drawn styles.' },
    ],
  },
  {
    slug: 'ai-short-drama-ideas-for-nollywood-creators',
    title: '10 AI short drama ideas for Nollywood creators',
    description: 'Ten story ideas with a Nigerian flavour — family, faith, Lagos traffic and village politics — ready to turn into AI short dramas.',
    date: '2026-09-25',
    readingMinutes: 3,
    tags: ['Ideas', 'Nollywood'],
    body: [
      { type: 'p', text: 'Nollywood knows how to tell big, emotional stories fast. Those instincts are exactly what short dramas need. Here are ten ideas you can turn into a one-minute drama today.' },
      { type: 'list', items: [
        'The quiet assistant who secretly owns the family company.',
        'A mother-in-law who arrives for “two days” with eleven suitcases.',
        'A proposal in the middle of Third Mainland Bridge traffic.',
        'Two rival chiefs whose children are secretly engaged.',
        'A landlord who out-prophesies the tenant who will not pay rent.',
        'A father who sells his car so his daughter can take her scholarship abroad.',
        'An old village radio that announces deaths the day before.',
        'Twins separated at birth who meet in a hospital waiting room.',
        'A waiter insulted by a rich guest — who turns out to be buying the hotel.',
        'A wedding where only one guest’s phone survives the night.',
      ] },
      { type: 'tip', text: 'Most of these are already in the Prompt Library, written short enough to fit the free trial.' },
    ],
  },
]

export function publishedPosts(): BlogPost[] {
  return BLOG_POSTS.filter((post) => !post.draft).sort((a, b) => b.date.localeCompare(a.date))
}

export function findPost(slug: string): BlogPost | undefined {
  return publishedPosts().find((post) => post.slug === slug)
}
