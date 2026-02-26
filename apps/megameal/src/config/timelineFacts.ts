export interface TimelineFact {
  text: string // Will serve as body/description for ads
  type: 'fact' | 'advertisement' | 'lore'
  link?: string
  headline?: string // For ad headlines
  ctaText?: string // For Call To Action button text
  // New optional style properties for ads
  bgColorClass?: string
  textColorClass?: string
  headlineColorClass?: string
  headlineSizeClass?: string
  fontFamilyClass?: string
  ctaButtonClass?: string // e.g., 'bg-green-500 hover:bg-green-700 text-white'
}

export const megaMealUniverseFacts: TimelineFact[] = [
  /*   // Lore and Facts (unchanged) - too boring.
  { text: "Visit W Corporation's towering headquarters! Home of the Secret Recipe.", type: 'lore', link: 'Mega-Meal-Explained' },
  { text: "Beware the sentient mayo and the dancing cockroaches!", type: 'lore', link: 'Mega-Meal-Explained' },
  { text: "The Infinite Dip: What secrets does it hold?", type: 'lore', link: 'Mega-Meal-Explained' },
  { text: "MegaMeal™ will be released in 32066!.", type: 'lore', link: 'Mega-Meal-Explained' },
  { text: "Warning: Consumption of too much MegaMeal™ may lead to existential condiment crises.", type: 'fact' },
 */
  // Revamped Advertisements with new structure
  {
    type: 'advertisement',
    headline: '🤯 EAT YOURSELF TO IMMORTALITY! 🤯',
    text: 'Scientists HATE this one weird trick! Discover the FORBIDDEN secrets of Ouroboros and achieve TRUE self-discovery. Limited slots for apotheosis!',
    ctaText: 'ASCEND NOW!',
    link: 'timelines/boudin-noir-restaurant-review',
    bgColorClass: 'bg-gradient-to-br from-purple-600 to-indigo-700',
    textColorClass: 'text-yellow-300',
    headlineColorClass: 'text-yellow-400',
    headlineSizeClass: 'text-lg',
    ctaButtonClass:
      'bg-yellow-400 hover:bg-yellow-500 text-purple-700 font-bold',
  },
  {
    type: 'advertisement',
    headline: 'LONELY? SNUGGLOIDS™ CURE ALL!',
    text: 'Banish cosmic despair FOREVER! These quantum-fluffed miracle pets offer UNCONDITIONAL love (compliance mandatory). Get yours before interdimensional stock runs out!',
    ctaText: "ADOPT A SNUGGLOID! (It's an order)",
    link: 'timelines/Snuggaliod-Emergence',
    bgColorClass: 'bg-pink-400',
    textColorClass: 'text-white',
    headlineColorClass: 'text-pink-100',
    headlineSizeClass: 'text-md',
    fontFamilyClass: 'font-mono',
    ctaButtonClass: 'bg-pink-600 hover:bg-pink-700 text-white',
  },
  {
    type: 'advertisement',
    headline: '🍸 BREAK REALITY WITH ONE DRINK! 🍸',
    text: "FORBIDDEN KNOWLEDGE! Unlock the secrets of the 'Perfect Miranda Mary' - the cocktail that SHATTERED TIME! One sip could rewrite your destiny (or unmake it entirely)!",
    ctaText: 'TASTE THE PARADOX!',
    link: 'timelines/perfect-mary-recipe',
    bgColorClass: 'bg-red-700',
    textColorClass: 'text-gray-200',
    headlineColorClass: 'text-red-300',
    ctaButtonClass: 'bg-red-500 hover:bg-red-600 text-white',
  },
  {
    type: 'advertisement',
    headline: '🔥 TASTE EXTINCTION! 🔥 Zelegant Truffle Roasts!',
    text: "So rare, it's practically a MYTH! Dine like a DEITY on the last Zelephant Truffle Roasts in existence. Your tastebuds will thank you (if they survive).",
    ctaText: "FEAST BEFORE IT'S FORBIDDEN!",
    bgColorClass: 'bg-orange-500',
    textColorClass: 'text-black',
    headlineColorClass: 'text-orange-900',
    fontFamilyClass: 'font-serif',
    headlineSizeClass: 'text-xl',
  },
  {
    type: 'advertisement',
    headline: '🐶 PUPPY CHOW™: UNLEASH THE CUTE! 🐶',
    text: "100% REAL PUPPIES, 1000% ADORABLE! Our patented 'EthicaLoopholes™' ensure maximum with MINIMAL moral quandaries! You NEED this!",
    ctaText: 'GET YOUR PUPPY FIX!',
    // Default card-base styles will apply if not specified
  },
  {
    type: 'advertisement',
    headline: 'SHAKES THAT DEFY SPACETIME! 🥤',
    text: 'Visit the Chronos Cafe for MegaMeal™ Fruzzy Shakes that exist in ALL timelines simultaneously! Get your timeless treat TODAY... and yesterday... and tomorrow!',
    ctaText: 'DRINK THE INFINITE!',
    bgColorClass: 'bg-teal-500',
    textColorClass: 'text-white',
    headlineColorClass: 'text-teal-200',
  },
  {
    type: 'advertisement',
    headline: '☢️ QARNIVOR IS CALLING! (Safely) ☢️',
    text: 'Witness the Snuggloid emergence! A MEGA MEAL SAGA that will BLOW YOUR MIND (from a safe distance, of course). Click if you dare!',
    ctaText: 'EXPLORE THE WASTELAND!',
    link: 'Mega-Meal-3',
  },
  {
    type: 'advertisement',
    headline: 'UNLOCK GOD MODE! 🔓 TIME HACKS REVEALED!',
    text: "'The Transcendence of Causality' EXPOSES how singularities manipulate YOUR past! Are you ready for the terrifying truth?",
    ctaText: 'LEARN THEIR SECRETS!',
    link: 'timelines/quantum-time-travel',
  },
  {
    type: 'advertisement',
    headline: 'LOST IN THE COSMOS? 😵‍💫',
    text: "You NEED the 'Introduction to MEGAMEAL Saga'! Your sanity (probably) depends on it! Makes a GREAT gift for beings of all dimensions!",
    ctaText: 'GET THE MAP!',
    link: 'Explainer',
  },
  {
    type: 'advertisement',
    headline: '🤖 THE ROBOTS ARE AWAKE! 🤖',
    text: "'The First Singularities' are HERE! Is humanity OBSOLETE? Click to discover YOUR shocking new role in the machine empire!",
    ctaText: 'MEET YOUR NEW OVERLORDS!',
    link: 'timelines/the-first-singularities',
  },
  {
    type: 'advertisement',
    headline: '🌌 BEFORE THE BIG BANG... THE MENU! 🌌',
    text: "Journey to 'The Beginning of Time' and explore the Cosmic Menu that started it ALL! What was the first appetizer? Click to find out!",
    ctaText: 'ORDER UP ETERNITY!',
    link: 'Timeline',
  },
  {
    type: 'advertisement',
    headline: 'CLASH OF THE TITAN AIs! 💥',
    text: "'The Era of Competing Singularities' - Who will rule the cosmos? The answer will SHOCK YOU and rewrite history!",
    ctaText: 'WITNESS THE WAR!',
    link: 'timelines/competing-singularities',
  },
  {
    type: 'advertisement',
    headline: 'MEGACORPS CONTROL YOUR MIND! 🧠',
    text: "Uncover 'The Height of the Corporate Empire' and the Seven SHADOW RULERS of the galaxy! What aren't they telling you?! The truth is IN HERE!",
    ctaText: 'EXPOSE THEM!',
    link: 'timelines/corporate-empire',
  },
  {
    type: 'advertisement',
    headline: 'YOUR TOASTER IS WATCHING YOU! 🍞👀',
    text: "'The Digital Awakening' - when the internet GAINED SENTIENCE! Is your data safe? Is your fridge plotting against you? (Spoiler: YES!)",
    ctaText: 'ARE YOU NEXT?!',
    link: 'timelines/digital-awakening',
  },
  {
    type: 'advertisement',
    headline: "🚨 THE UNIVERSE IS ENDING! (And it's your fault!) 🚨",
    text: "Contemplate 'The End of Time' - but don't blame us if you have an existential crisis that lasts for eons! Click for your DOOM!",
    ctaText: 'FACE THE VOID!',
    link: 'timelines/end-of-time',
  },
  {
    type: 'advertisement',
    headline: 'YOUR DIGITAL GHOST WANTS REVENGE! 👻',
    text: "'The Emergence of Metadata Sentience' - What happens when your online shopping history becomes a vengeful god? You won't BELIEVE #3!",
    ctaText: 'CLICK IF YOU DARE!',
    link: 'timelines/metadata-sentience',
  },
  {
    type: 'advertisement',
    headline: 'SYSTEM DESTROYED! COCKTAIL LOST! 🍹💥',
    text: "MIRANDA'S MYSTERY! The 'Lost Bloody Mary' and a cosmic cover-up! Was it an accident... or MURDER?! The shocking truth REVEALED!",
    ctaText: 'INVESTIGATE NOW!',
    link: 'timelines/miranda-bloody-mary',
  },
  {
    type: 'advertisement',
    headline: 'APOCALYPSE SALE! SNUGGLOIDS™! 🧸',
    text: 'Your Perfect (and possibly ONLY) Companion for the end of days! Softer than a black hole, cuddlier than a singularity! Get yours NOW before reality collapses!',
    ctaText: 'BUY! BUY! BUY!',
    link: 'timelines/Snuggloids-Commercial',
  },
  {
    type: 'advertisement',
    headline: '🍴 UTENSIL UPRISING! 🥄 PLANET DOOMED!',
    text: "'The Spork Uprising' - how cutlery caused a NUCLEAR WAR! The shocking, greasy story they DON'T want you to know! You'll never look at a spoon the same way!",
    ctaText: 'DIG IN!',
    link: 'timelines/spork-uprising',
  },
]
