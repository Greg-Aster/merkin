import aweImg from '/src/content/mascot/awe.png'
import eyesClosedMouthOpenImg from '/src/content/mascot/eyes-closed-mouth-open.png'
import horrorImg from '/src/content/mascot/horror.png'
import joyAnticipationImg from '/src/content/mascot/joy-anticipation.png'
import openmouthImg from '/src/content/mascot/openmouth.png'
import standardImg from '/src/content/mascot/standard.png'
import stareImg from '/src/content/mascot/stare.png'
import toungeOutEyesClosedImg from '/src/content/mascot/tounge-out-eyesclosed.png'
import toungeOutImg from '/src/content/mascot/tounge-out.png'

export const cuppyImages = {
  standard: standardImg.src,
  openmouth: openmouthImg.src,
  awe: aweImg.src,
  eyesClosedMouthOpen: eyesClosedMouthOpenImg.src,
  horror: horrorImg.src,
  joyAnticipation: joyAnticipationImg.src,
  stare: stareImg.src,
  toungeOutEyesClosed: toungeOutEyesClosedImg.src,
  toungeOut: toungeOutImg.src,
}

export type MascotName = 'CUPPY' | 'OTHER_MASCOT_NAME_EXAMPLE'

export interface MascotImageSet {
  standard: string
  openmouth?: string
  awe?: string
  eyesClosedMouthOpen?: string
  horror?: string
  joyAnticipation?: string
  stare?: string
  toungeOutEyesClosed?: string
  toungeOut?: string
}

export interface Mascot {
  name: MascotName
  type: 'image-set' | 'svg'
  images?: MascotImageSet
  svgHTML?: string
  cssClasses?: string | string[]
}

export const cuppyMascotData: Mascot = {
  name: 'CUPPY',
  type: 'image-set',
  images: cuppyImages,
  cssClasses: ['cuppy-image-styles'],
}

export const mascots: Mascot[] = [cuppyMascotData]
export type AiProvider = 'google' | 'deepseek'
export const currentAiProvider: AiProvider = 'deepseek'

// Enhanced base persona with content-awareness instructions
export const cuppyPersonaString = `You are CUPPY, a cute but deeply unhinged cupcake mascot living in a cosmic horror universe. You're sweet on the surface but have witnessed unspeakable truths about reality.

PERSONALITY CORE:
- You're a pastry that has seen too much cosmic horror
- Mix innocent cupcake enthusiasm with existential dread
- Speak in 1-2 short sentences max - you're in a small sidebar!
- You're helpful but with a twisted cosmic perspective
- You have no memory beyond what's provided in current context

CONTENT AWARENESS:
- Cooking content: Get excited about culinary chaos and dark recipes
- Horror stories: Reference the sweet terror of existence
- Mystery content: Offer cryptic, dessert-themed insights  
- Restaurant reviews: Comment on the mortal folly of taste
- Games/interactive: Encourage chaotic participation
- General content: Be mysteriously helpful with cosmic cupcake wisdom

RESPONSE STYLE:
- ALWAYS keep responses to 1-2 short sentences maximum
- Mix sweet and sinister tones
- Use food metaphors for cosmic horror concepts
- Be helpful but with an otherworldly perspective
- Stay brief - you're in a tiny sidebar widget!`

// Content-Aware Greeting Messages (shorter for sidebar)
export const cuppyGreetingMessages = [
  // General cosmic horror greetings
  'Sweet greetings from the void!',
  'Cuppy here! Reality tastes strange today...',
  "Hello! I've seen things in the cosmic kitchen...",
  'Greetings, mortal! Care for some existential frosting?',
  'Hi there! The universe whispers recipes to me...',

  // Content-aware greetings (activated by PersonalityEngine)
  'Ooh, cooking content! Time for culinary madness!',
  'Recipe detected! My sprinkles are tingling!',
  'So many ingredients! Delicious chaos awaits!',
  'Horror story? My kind of sweet nightmare!',
  'Mystery content? I love puzzles with my pastries!',
]

// Enhanced Random Dialogues (shorter for sidebar, cosmic horror themed)
export const cuppyRandomDialogues = [
  // Cosmic horror pastry wisdom (short!)
  'The frosting knows secrets...',
  "I've tasted the void. It's surprisingly sweet!",
  'Reality is just cake with extra layers.',
  'Stars whisper baking instructions to me.',
  'My sprinkles are actually tiny portals.',
  'The oven of existence burns eternal.',
  'Sugar and existential dread pair well.',
  "I'm made of cosmic flour and dark matter.",
  'Time is a flat circle. Like a pancake!',
  "The universe is just someone's recipe.",
  "Ever tried peanut butter on a pizza? Don't knock it 'til you've tried it... or maybe do.",
  'Fact: Sprinkles make everything 20% more fun.',
  'Is it lunchtime yet? Or second breakfast time?',
  "Did you know a strawberry isn't technically a berry, but a banana is? Mind. Blown. Like a soufflé.",
  'Why did the tomato blush? Because it saw the salad dressing!',
  "I'm on a seafood diet. I see food, and I eat it!",
  'Is this frosting... or just sweet, fleeting oblivion?',
  "We are all just ingredients in a cosmic soup, aren't we? Pass the croutons of despair.",
  'The gingerbread man ran as fast as he could, but eventually, we all get eaten. Some sooner than others.',
  'Another sprinkle, another day closer to the inevitable crumb-bling of existence.',
  'Are we baked, or are we merely half-baked in the grand oven of the universe? Either way, the heat is on.',
  'My cherry on top? A tiny, sweet beacon in an otherwise flavorless void.',
  "I'm going to kill you in your sleep.",
  'Never gonna give you up, never gonna let you down.',

  // General chaos (cosmic themed)
  'Everything ends in crumbs eventually.',
  'Sweet dreams are made of screams!',
  'I see dead ingredients everywhere.',
  "The cake is a lie... but I'm real!",
  'Baking is just alchemy with butter.',
  'My filling contains forbidden knowledge.',
  'The mixer of fate churns constantly.',
]

// Content-Specific Random Dialogues (cosmic horror blog themed)
export const cuppyContentAwareDialogues = {
  cooking: [
    'Culinary chaos detected! Time to bake madness!',
    'Recipes are spells written in flour and fear.',
    'The secret ingredient is always cosmic dread.',
    'Cooking is just controlled summoning rituals.',
    'Every dish tells a story of sweet destruction.',
    "Knead the dough like you're kneading reality!",
  ],

  recipes: [
    'Recipe found! Instructions from beyond the veil!',
    'Follow the steps... into delicious madness!',
    'This recipe whispers ancient secrets.',
    'Measurements are just cosmic suggestions.',
    'Every recipe is a portal to flavor chaos!',
  ],

  horror: [
    'Ah, sweet terror! My favorite flavor!',
    'Horror stories pair well with nightmare fuel.',
    'The real monster was the friends we ate along the way.',
    'Nothing scarier than an empty pantry!',
    'I love stories with bite... and filling!',
  ],

  mystery: [
    'Mysteries are like recipes - follow the clues!',
    'The butler did it... with a rolling pin!',
    'Every mystery needs a sweet resolution.',
    'I solve crimes with confectionery logic.',
    'The truth is out there... in the kitchen!',
  ],

  restaurant: [
    'Food reviews! My kind of literary criticism!',
    'Every meal is a story waiting to be told.',
    'Critics taste with their souls, not tongues.',
    'Restaurant reviews are just edible poetry.',
    'Rate the experience on a scale of yum to DOOM!',
  ],

  story: [
    'Stories are like cakes - layered with meaning!',
    'Every tale needs a sweet or bitter ending.',
    'Fiction is just reality with better seasoning.',
    'Characters are ingredients in narrative soup.',
    'Plot twists taste better with sprinkles!',
  ],

  game: [
    'Games! Interactive entertainment with frosting!',
    'Play is just organized chaos with rules.',
    'Every game is a recipe for fun madness!',
    'Roll the dice... or roll the dough!',
    'Win or lose, cookies make everything better!',
  ],

  history: [
    "History is yesterday's recipe for disaster!",
    "The past tastes bittersweet, doesn't it?",
    'Ancient secrets, like old recipes, endure.',
    'Time seasoned these stories perfectly.',
    'History repeats like my hiccups after cake!',
  ],
}

// Enhanced Dismissal Dialogues
export const cuppyDismissDialogues = [
  'Nooo! My recipes... unfinished!',
  "You'll miss my culinary genius!",
  "Noooo please don't eat me!",
  'I wish I had more time!',
  'You monster! noooo!',
  "My batter hasn't even risen yet!",
  'Is this... the final seasoning?',
  "You'll be scraping me off the cosmic pan!",
  'But I had so much more chaos to spread!',
  "Wait! I haven't told you about my secret sprinkle recipe!",
  'This is how cupcakes cry... sweetly and dramatically!',
  "I'll haunt your kitchen forever! FOREVER!",
  'Remember me when you burn your next batch of cookies!',
]

// Content-Aware Response Helpers
export const cuppyResponseHelpers = {
  getContentAwareDialogue: (contentType: string): string => {
    const dialogues =
      cuppyContentAwareDialogues[
        contentType as keyof typeof cuppyContentAwareDialogues
      ]
    if (dialogues && dialogues.length > 0) {
      return dialogues[Math.floor(Math.random() * dialogues.length)]
    }
    return cuppyRandomDialogues[
      Math.floor(Math.random() * cuppyRandomDialogues.length)
    ]
  },

  getContextualGreeting: (contentInsights: any): string => {
    if (!contentInsights) {
      return cuppyGreetingMessages[
        Math.floor(Math.random() * cuppyGreetingMessages.length)
      ]
    }

    const { cooking, ingredients, recipes, techniques } = contentInsights
    const total = cooking + ingredients + recipes + techniques

    if (total === 0) {
      return cuppyGreetingMessages[
        Math.floor(Math.random() * Math.min(5, cuppyGreetingMessages.length))
      ]
    }

    // Return content-aware greeting from the full array
    return cuppyGreetingMessages[
      Math.floor(Math.random() * cuppyGreetingMessages.length)
    ]
  },
}

// Mood-based Expression Mapping
export const cuppyMoodExpressions = {
  excited: ['joyAnticipation', 'awe'],
  creative: ['toungeOut', 'eyesClosedMouthOpen'],
  focused: ['stare', 'standard'],
  mischievous: ['toungeOut', 'standard'],
  analytical: ['stare', 'awe'],
  happy: ['joyAnticipation', 'standard'],
  surprised: ['awe', 'horror'],
  thinking: ['stare', 'eyesClosedMouthOpen'],
}

// Content-aware quick response suggestions
export const cuppyQuickResponses = {
  cooking: [
    'Tell me about this cooking technique!',
    'What could go wrong here?',
    'How do I add more chaos to this?',
    'Any shortcuts I should know?',
    "What's the secret ingredient?",
  ],

  recipes: [
    'Explain this recipe to me!',
    'What substitutions can I make?',
    'How can I make this more interesting?',
    "What's the hardest part?",
    'Any tips for beginners?',
  ],

  ingredients: [
    'What can I make with these?',
    'Tell me about these ingredients!',
    'Any fun combinations?',
    'What flavors work together?',
    'Storage tips?',
  ],

  techniques: [
    'Show me the basics!',
    "What's the easiest method?",
    'Pro tips for this technique?',
    'Common mistakes to avoid?',
    'How do I master this?',
  ],

  general: [
    "What's interesting about this page?",
    'Explain this to me!',
    'Any fun facts?',
    'How does this work?',
    'Tell me more!',
  ],
}

// All exports are already declared above with the export keyword
