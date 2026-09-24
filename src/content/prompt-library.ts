/**
 * Prompt Library: ready-made stories customers can start a drama from in one click.
 * Each story is short on purpose (~100–150 words) so it fits the free trial: script,
 * storyboard and first pictures from 150 credits. Every prompt has its own page for search.
 */

export type PromptGenre =
  | 'romance'
  | 'ceo-revenge'
  | 'thriller'
  | 'comedy'
  | 'horror'
  | 'family'
  | 'nollywood'
  | 'product-ad'

export interface PromptGenreInfo {
  id: PromptGenre
  label: string
  blurb: string
}

export interface StoryPrompt {
  slug: string
  title: string
  genre: PromptGenre
  /** One line for cards and search results. */
  logline: string
  /** The text dropped into the story box. */
  story: string
  /** Recommended look and length. */
  style: 'realistic' | 'japanese-anime' | 'american-comic'
  seconds: 30 | 60
}

export const PROMPT_GENRES: PromptGenreInfo[] = [
  { id: 'romance', label: 'Romance', blurb: 'Slow burns, second chances and love against the odds.' },
  { id: 'ceo-revenge', label: 'CEO & Revenge', blurb: 'Hidden heirs, boardroom betrayals and satisfying comebacks.' },
  { id: 'thriller', label: 'Thriller', blurb: 'Secrets, chases and twists that land in the last shot.' },
  { id: 'comedy', label: 'Comedy', blurb: 'Everyday chaos with a punchline.' },
  { id: 'horror', label: 'Horror', blurb: 'Quiet dread and one very bad idea.' },
  { id: 'family', label: 'Family Drama', blurb: 'Inheritance fights, reunions and things left unsaid.' },
  { id: 'nollywood', label: 'Nollywood-style', blurb: 'Big emotions, bigger families, Lagos energy.' },
  { id: 'product-ad', label: 'Product Ads', blurb: 'Short story-driven ads for a brand or product.' },
]

export const STORY_PROMPTS: StoryPrompt[] = [
  // Romance
  {
    slug: 'the-wrong-umbrella', genre: 'romance', style: 'realistic', seconds: 30,
    title: 'The Wrong Umbrella',
    logline: 'Two strangers grab the same umbrella in a storm — and keep meeting because of it.',
    story: 'Rain hammered the bus stop. Zara grabbed the black umbrella from the stand just as a man in a grey coat reached for it too. "It\'s mine," they both said. They shared it to the train station, arguing the whole way about whose it really was. At the platform she noticed the initials on the handle: T.O. His name was Tobi. It wasn\'t hers. It wasn\'t his either. "So we stole it together," Tobi laughed. A week later, in the same storm, he was waiting at the bus stop with the umbrella open and a note taped to it: "Returning stolen property. Coffee?"',
  },
  {
    slug: 'letters-from-seat-14b', genre: 'romance', style: 'realistic', seconds: 60,
    title: 'Letters from Seat 14B',
    logline: 'A flight attendant finds love notes left in the same seat every Friday.',
    story: 'Every Friday on the Lagos to Accra flight, Ada found a folded note tucked into seat 14B. "The sunrise over the clouds reminded me of your laugh." No name. She started writing back and leaving her replies in the seat pocket. For two months the notes crossed the sky. Then one Friday the note said: "I\'m in 14B today." Ada walked down the aisle with the drinks cart, heart pounding. In 14B sat the quiet pilot who always said good morning and nothing else. He held up her last letter, smiling. "I switched to passenger for the day," he said. "I wanted you to see my face when you read my answer."',
  },
  {
    slug: 'second-chance-bakery', genre: 'romance', style: 'realistic', seconds: 30,
    title: 'Second Chance Bakery',
    logline: 'Ten years after the breakup, she walks into his bakery for a wedding cake — her own.',
    story: 'The bell above the door rang. Kemi froze. Behind the counter, flour on his cheek, stood Dayo — the boy she left ten years ago. "I need a wedding cake," she said. He nodded slowly. "Congratulations. Whose wedding?" She looked at the cakes, then at him. "Mine. It was supposed to be mine. I called it off this morning." Dayo put down the piping bag. "Then why are you ordering a cake?" Kemi smiled for the first time that day. "Because I kept the date. I just need to find the right groom."',
  },
  {
    slug: 'the-night-market-promise', genre: 'romance', style: 'japanese-anime', seconds: 30,
    title: 'The Night Market Promise',
    logline: 'Two childhood friends meet again at the lantern festival where they made a promise.',
    story: 'Lanterns floated over the night market. Mei stood by the goldfish stall where, ten years ago, a boy named Ren had promised to meet her again "when we are grown up." She laughed at herself for coming. Then a voice behind her said, "You still can\'t catch a single fish." Ren held out a paper scoop and a small plastic bag with one golden fish inside. "I have been practising," he said. "I came every year. You are the one who was late."',
  },
  // CEO & Revenge
  {
    slug: 'the-quiet-assistant', genre: 'ceo-revenge', style: 'realistic', seconds: 30,
    title: 'The Quiet Assistant',
    logline: 'The heir who ignored her for years learns she owns the company.',
    story: 'Amara had been the quiet assistant at Okafor Holdings for three years. Nobody noticed her. Tonight, Chidi Okafor, the arrogant heir, slid a folder across his glass desk. "Sign this. It transfers your shares in the family trust to me." Amara looked at the papers. "You want me to sign away what your father left me?" He laughed. "He felt sorry for you." She picked up the pen, then placed a second folder on top of his. "Your father trusted me. That is why he gave me fifty-one percent." She stood. "Your resignation is due on my desk by morning."',
  },
  {
    slug: 'the-waiter-who-bought-the-hotel', genre: 'ceo-revenge', style: 'realistic', seconds: 30,
    title: 'The Waiter Who Bought the Hotel',
    logline: 'A rich guest humiliates a waiter — who signs the purchase papers that afternoon.',
    story: 'Wine spilled across the white tablecloth. "Useless," the businessman snapped, throwing a napkin at the young waiter. "I\'ll have you fired before dessert." Emeka bowed and cleaned the table without a word. That afternoon, the businessman walked into the boardroom to close the biggest deal of his career: selling the hotel. The buyer turned his chair around. It was Emeka, now in a tailored suit. "I like to work a shift in every business I buy," he said, signing the contract. "Dessert was excellent. The customers, less so."',
  },
  {
    slug: 'the-intern-and-the-audit', genre: 'ceo-revenge', style: 'realistic', seconds: 60,
    title: 'The Intern and the Audit',
    logline: 'Everyone blames the intern for missing money — until she presents the audit.',
    story: 'The finance director pointed at Nneka in front of the whole office. "Two million naira is missing, and the intern had access." Security walked towards her. Nneka calmly opened her laptop and connected it to the meeting room screen. "I did have access," she said. "That is how I found this." Transfer after transfer appeared, each approved by the finance director at 2 a.m. The CEO turned slowly towards him. "Who hired you?" he asked Nneka. She handed him a card: Federal Anti-Fraud Unit. "Nobody. I applied."',
  },
  {
    slug: 'the-divorce-dinner', genre: 'ceo-revenge', style: 'realistic', seconds: 30,
    title: 'The Divorce Dinner',
    logline: 'He throws a party to celebrate the divorce. She arrives with the final surprise.',
    story: 'Champagne glasses clinked. Tunde raised his glass to his friends. "To freedom! She walks away with nothing." The doors opened. His ex-wife, Folake, walked in wearing red, followed by two lawyers. "Don\'t stop the party on my account," she said, placing a document on the table. "You signed the house, the company and the cars to me three years ago to avoid your creditors. Remember? Enjoy your freedom, Tunde. The party is on you — it\'s in my venue."',
  },
  // Thriller
  {
    slug: 'the-last-train', genre: 'thriller', style: 'realistic', seconds: 30,
    title: 'The Last Train',
    logline: 'A woman realises every passenger on the last train is watching her.',
    story: 'The last train out of the city was almost empty. Lara sat by the window, bag on her lap. At the next stop a man got on and sat facing her. Then a woman. Then two more. None of them looked at their phones. They looked at her. Lara stood and walked to the next carriage. It was full — every seat taken, every face turned towards the door she had opened. A voice came over the speaker: "Final stop. Please hand over the envelope." Lara looked down at her bag. She had no idea what was inside.',
  },
  {
    slug: 'wrong-number', genre: 'thriller', style: 'realistic', seconds: 30,
    title: 'Wrong Number',
    logline: 'A text meant for someone else says a crime will happen in ten minutes — on her street.',
    story: '"Blue door. Ten minutes. Make it look like an accident." The text came from an unknown number. Ife stared at it, then looked out of her window. Across the street was the only blue door on the block, where her elderly neighbour lived. She called the number back. A man answered. "Who is this?" Ife hung up and ran downstairs. As she reached the blue door, a car stopped behind her. The driver rolled down his window and held up his phone. "You called me," he said.',
  },
  {
    slug: 'the-safe-deposit-box', genre: 'thriller', style: 'realistic', seconds: 60,
    title: 'The Safe Deposit Box',
    logline: 'A grieving son opens his father\'s safe deposit box and finds his own passport inside.',
    story: 'The bank manager left Obi alone with the metal box his late father had kept for twenty years. Inside were three things: a stack of old dollars, a photograph of a woman Obi had never seen, and a passport. It had Obi\'s photo — but a different name, a different birthday, and a stamp from a country he had never visited. On the back of the photograph his father had written: "If you are reading this, they know. Do not go home." Obi\'s phone buzzed. A message from his mother: "Are you at the bank? Wait for me there."',
  },
  {
    slug: 'the-house-sitter', genre: 'thriller', style: 'realistic', seconds: 30,
    title: 'The House Sitter',
    logline: 'The house she is looking after has a room that is not on the floor plan.',
    story: 'The owners left a long list: water the plants, feed the cat, never open the basement. On the third night, the cat sat scratching at a wall in the hallway. Hana checked the floor plan on the fridge. There was no room behind that wall. She knocked. Something knocked back, twice. Hana grabbed her phone to call the owners. It rang — inside the wall.',
  },
  // Comedy
  {
    slug: 'the-group-chat', genre: 'comedy', style: 'american-comic', seconds: 30,
    title: 'The Group Chat',
    logline: 'He sends a complaint about his boss to the wrong group chat — the one with his boss in it.',
    story: 'Femi typed fast: "Our boss thinks Excel is a type of vitamin." Send. Then he saw the group name: "Management Team." His boss was typing. Femi grabbed his phone, ran to the office, and tried to reach the boss\'s laptop before he read it. He slid under a desk, knocked over the water dispenser and landed at the boss\'s feet. The boss looked down, smiling, holding up his phone: "I take two Excels a day. Promotion approved — you clearly understand the problem."',
  },
  {
    slug: 'the-wedding-drone', genre: 'comedy', style: 'realistic', seconds: 30,
    title: 'The Wedding Drone',
    logline: 'The best man\'s drone was meant to deliver the rings. It had other plans.',
    story: 'Everyone gasped as the drone lifted off with the wedding rings tied to a ribbon. "Trust me," said Kunle, the best man, holding the remote. The drone flew over the guests, circled the cake, and headed straight for the swimming pool. Kunle dived. The groom dived. The bride\'s grandmother caught the rings with her walking stick before any of them hit the water. She handed them to the priest. "Proceed," she said. "These young men can dry themselves."',
  },
  {
    slug: 'first-day-work-from-home', genre: 'comedy', style: 'american-comic', seconds: 30,
    title: 'First Day Working From Home',
    logline: 'His first video call as a manager goes perfectly — until his mother walks in.',
    story: 'Tolu straightened his tie for his first meeting as team manager. Shirt, tie, confident smile — and pyjama shorts, safely out of view. "Good morning, team." The door opened behind him. His mother marched in holding a plate. "You forgot your breakfast! And why are you wearing a tie with Spider-Man shorts?" Twelve faces on the screen tried not to laugh. Tolu calmly took the plate. "Team," he said, "meet our new head of catering."',
  },
  {
    slug: 'the-diet-starts-monday', genre: 'comedy', style: 'american-comic', seconds: 30,
    title: 'The Diet Starts Monday',
    logline: 'A strict new diet meets a very persuasive jollof rice.',
    story: 'Monday, 7 a.m.: Chika writes "NEW ME" on the fridge. 12 p.m.: salad, proudly photographed. 3 p.m.: the smell of her neighbour\'s jollof rice drifts through the window. 3:05 p.m.: Chika closes the window. 3:10 p.m.: Chika opens the window "for fresh air". 3:30 p.m.: Chika knocks on her neighbour\'s door holding a plate "to return". 4 p.m.: Chika writes on the fridge: "NEW ME starts Tuesday."',
  },
  // Horror
  {
    slug: 'the-voice-note', genre: 'horror', style: 'realistic', seconds: 30,
    title: 'The Voice Note',
    logline: 'Her late sister sends a voice note from her old phone number.',
    story: 'Ngozi\'s phone buzzed at 3:14 a.m. A voice note from her sister — who died a year ago. She pressed play. Silence, then breathing, then her sister\'s voice, whispering: "Don\'t open the door when it knocks three times." Ngozi sat up. The house was completely still. Then, from downstairs: one knock. Two. The third never came. Instead, her phone buzzed again. A new voice note, this time in her own voice: "It\'s already inside."',
  },
  {
    slug: 'the-mirror-in-room-9', genre: 'horror', style: 'realistic', seconds: 30,
    title: 'The Mirror in Room 9',
    logline: 'Her reflection in the hotel mirror is always one second late.',
    story: 'Room 9 was the only one left at the roadside hotel. Adaeze brushed her teeth and noticed her reflection moved a second after she did. She waved. The reflection waved — late. She stopped. The reflection kept waving. Then it smiled, and she wasn\'t smiling. She backed away from the mirror towards the door. Her reflection stayed where it was, and slowly raised a finger to its lips.',
  },
  {
    slug: 'the-babysitters-rule', genre: 'horror', style: 'realistic', seconds: 30,
    title: 'The Babysitter\'s Rule',
    logline: 'Only one rule: don\'t answer if the children call from upstairs. They\'re staying with their grandmother tonight.',
    story: '"Just one rule," said the mother at the door. "If you hear the children call you from upstairs, don\'t answer." Joy laughed. "Why would they call me?" The mother hesitated. "They\'re at their grandmother\'s tonight." The car drove away. At midnight, from the top of the dark staircase, a little voice called: "Aunty Joy? Can you come up?"',
  },
  {
    slug: 'village-radio', genre: 'horror', style: 'realistic', seconds: 60,
    title: 'Village Radio',
    logline: 'An old radio in the village announces deaths — the day before they happen.',
    story: 'Grandpa\'s old radio had been broken for years. On the first night of the harmattan, it crackled to life by itself. "Good evening. Tomorrow we regret to announce the passing of Mama Nkechi." Everyone laughed it off. The next evening, the drums sounded for Mama Nkechi. The whole compound gathered around the radio that night, silent. It crackled again. "Good evening. Tomorrow we regret to announce the passing of—" Grandpa pulled the plug. The radio kept talking.',
  },
  // Family drama
  {
    slug: 'the-will-reading', genre: 'family', style: 'realistic', seconds: 60,
    title: 'The Will Reading',
    logline: 'Three siblings fight over the inheritance — until the lawyer plays a video.',
    story: 'The lawyer\'s office was tense. Three siblings, three lawyers, one will. "The house is mine, I\'m the eldest," said Bayo. "I nursed Papa for two years," said Funmi. The youngest, Seun, said nothing. The lawyer turned on the television. Their father appeared on screen, smiling. "If you are fighting, stop. The house goes to whoever can tell me my favourite song." Silence. Seun quietly began to hum. His siblings stared at him. "He used to sing it while I did his hair," Seun said. "Every Sunday. You were both too busy to come."',
  },
  {
    slug: 'the-empty-chair', genre: 'family', style: 'realistic', seconds: 30,
    title: 'The Empty Chair',
    logline: 'Every Christmas his mother sets a plate for the son who left. This year he knocks.',
    story: 'For eight Christmases, Mama Uche set one extra plate at the table, for the son who left after a fight with his father. "Mama, he is not coming," her daughter said gently. Mama Uche smoothed the tablecloth. "The plate does not know that." There was a knock at the door. Papa opened it. His son stood there with a small boy holding his hand. "This is your grandson," he said. "He wanted to know why his father never goes home for Christmas."',
  },
  {
    slug: 'the-scholarship', genre: 'family', style: 'realistic', seconds: 30,
    title: 'The Scholarship',
    logline: 'She wins the scholarship abroad. Her father sells his only car to buy the ticket — without telling her.',
    story: 'Adanna screamed when the email came: a full scholarship to study in London. Then her face fell. "The flight isn\'t covered." Her father said nothing. Two days later there was a ticket on her bed. At the airport she asked, "Papa, where is the car?" He adjusted his cap. "It was old. It wanted to retire." Adanna watched him wave from behind the glass, then take the bus home.',
  },
  {
    slug: 'twins-apart', genre: 'family', style: 'realistic', seconds: 30,
    title: 'Twins Apart',
    logline: 'Two strangers with the same face meet in a hospital waiting room.',
    story: 'In the hospital waiting room, Kelechi looked up from his phone and saw himself. Same face, same scar above the eyebrow, different clothes. The other man stared back. "What year were you born?" they asked at the same time. A nurse came out of the ward. "Family of Mrs Grace Eze?" Both men stood up. The nurse looked from one to the other. "She has been asking for her boys," she said. "She said you would both come."',
  },
  // Nollywood-style
  {
    slug: 'the-village-chief-election', genre: 'nollywood', style: 'realistic', seconds: 60,
    title: 'The Village Chief Election',
    logline: 'Two rival families fight over the chieftaincy — and their children are secretly engaged.',
    story: 'The whole village gathered under the iroko tree. Chief Okeke and Chief Nwosu stood on opposite sides, their families dressed in matching colours, throwing insults at each other. "Your family has never produced a leader!" "Your family has never produced a sensible child!" The elders raised their staffs for silence. Then Chief Okeke\'s daughter and Chief Nwosu\'s son walked to the centre together, holding hands. "We are getting married," she announced. "So whoever wins — the next chief will be our child." The two old chiefs looked at each other, then at the elders, and sat down very slowly.',
  },
  {
    slug: 'the-mother-in-law-visit', genre: 'nollywood', style: 'realistic', seconds: 30,
    title: 'The Mother-in-Law Visit',
    logline: 'His mother arrives for "two days". She brings eleven suitcases.',
    story: 'The taxi stopped outside the new couple\'s flat. "Mama is only staying two days," Emeka promised his wife, Nkem. The driver opened the boot. One suitcase. Two. Five. Eleven. A bag of yams. A live chicken. Mama stepped out, adjusted her gele and looked at Nkem from head to toe. "So this is the one who cannot cook egusi," she said. Nkem smiled sweetly and took the chicken. "Welcome, Mama. Dinner is at seven. You\'re cooking."',
  },
  {
    slug: 'lagos-traffic-proposal', genre: 'nollywood', style: 'realistic', seconds: 30,
    title: 'Lagos Traffic Proposal',
    logline: 'Stuck in Third Mainland Bridge traffic for three hours, he decides to propose right there.',
    story: 'Third Mainland Bridge, 6 p.m., not moving. Bisi sighed for the hundredth time. "We will miss the dinner reservation." Tunde looked at the endless line of cars, took a deep breath and climbed out. He knelt on the road beside her door with a ring. Horns started honking. A hawker selling roses ran over and handed him a bunch. A danfo driver started playing music. By the time Bisi said yes, half the bridge was cheering — and the traffic had started to move.',
  },
  {
    slug: 'the-prophet-and-the-landlord', genre: 'nollywood', style: 'realistic', seconds: 30,
    title: 'The Prophet and the Landlord',
    logline: 'A self-declared prophet predicts his landlord\'s future — to avoid paying rent.',
    story: 'The landlord knocked hard. "Pastor Sunday, six months of rent!" Sunday opened the door with his eyes closed and his hand raised. "I see... a great blessing coming to you, my landlord." The landlord paused. "What blessing?" "A tenant who will pay one year in advance... next month." The landlord crossed his arms. "Then I also see a vision, pastor." He pointed at the gate, where his sons were carrying Sunday\'s furniture outside. "I see you moving."',
  },
  // Product ads
  {
    slug: 'the-phone-that-saved-the-wedding', genre: 'product-ad', style: 'realistic', seconds: 30,
    title: 'The Phone That Saved the Wedding (ad)',
    logline: 'A story-driven phone ad: the battery lasts longer than the wedding party.',
    story: 'The wedding ran four hours late. The photographer\'s camera died. The DJ\'s laptop died. The groom\'s phone died. Only one guest, the bride\'s cousin Ruth, still had battery — and she filmed everything: the first dance, the cake falling, the grandmother dancing on the table. At 2 a.m. the couple watched the whole wedding on her phone, laughing and crying. Close on the screen: 41% battery. Tagline: "Built for the whole celebration."',
  },
  {
    slug: 'the-coffee-before-the-interview', genre: 'product-ad', style: 'realistic', seconds: 30,
    title: 'The Coffee Before the Interview (ad)',
    logline: 'A story-driven coffee brand ad about confidence on a big day.',
    story: 'Seven in the morning. Dayo stared at his reflection: suit, tie, nerves. He rehearsed his answers and forgot them. His sister placed a steaming cup of coffee on the table and said nothing. He drank it slowly, looking out at the city waking up. His shoulders dropped. He smiled. Cut to the interview room: "Tell us about yourself." Dayo leaned forward, calm and ready. Tagline: "Every big day starts with a good cup."',
  },
]

/** A prompt chosen before signing up, resumed once the new account reaches the workspace. */
export const PENDING_PROMPT_KEY = 'nucleus:pending-prompt'

export function promptsByGenre(genre: PromptGenre): StoryPrompt[] {
  return STORY_PROMPTS.filter((prompt) => prompt.genre === genre)
}

export function findPrompt(slug: string): StoryPrompt | undefined {
  return STORY_PROMPTS.find((prompt) => prompt.slug === slug)
}

export function genreInfo(genre: PromptGenre): PromptGenreInfo {
  return PROMPT_GENRES.find((entry) => entry.id === genre) ?? PROMPT_GENRES[0]
}
