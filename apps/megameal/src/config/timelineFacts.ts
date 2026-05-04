export interface TimelineFact {
  text: string
  type: 'fact' | 'advertisement' | 'lore'
  link?: string
  href?: string
  headline?: string
  ctaText?: string
  sponsor?: string
  eyebrow?: string
  finePrint?: string
  theme?: string
  bgColorClass?: string
  textColorClass?: string
  headlineColorClass?: string
  headlineSizeClass?: string
  fontFamilyClass?: string
  ctaButtonClass?: string
  image?: string
  video?: string
}

const specialFactLinks: Record<string, string> = {
  Explainer: '/posts/explainer/',
  Timeline: '/timeline/',
  'Mega-Meal-3': '/videos/qarnivor-snuggloid-emergence/',
}

export function resolveTimelineFactHref(fact: TimelineFact): string | null {
  if (fact.href) return fact.href
  if (!fact.link) return null
  if (fact.link.startsWith('/')) return fact.link
  if (specialFactLinks[fact.link]) return specialFactLinks[fact.link]
  return `/posts/${fact.link}/`
}

export const megaMealUniverseFacts: TimelineFact[] = [
  {
    type: 'advertisement',
    eyebrow: 'Now Transmitting',
    headline: 'MEGA MEAL SAGA',
    text: 'Corporate-approved storytelling. Consumption mandatory. Resistance is a discontinued flavor.',
    ctaText: 'Enter The Saga',
    href: '/posts/explainer/',
    sponsor: 'Narrative Compliance Division',
    finePrint:
      'This transmission has been pre-approved for all dietary thresholds.',
    theme: 'chronology',
    video: '/videos/title.webm',
  },
  {
    type: 'advertisement',
    eyebrow: 'Experience Recovery',
    headline: 'Rate Your MEGAMEAL Experience',
    text: 'Tell Corporate whether your recent meal met minimum delight thresholds. Your feedback helps us calibrate portion size, lighting, and acceptable panic.',
    ctaText: 'Begin Satisfaction Review',
    href: '/quiz/megameal-experience-review/',
    sponsor: 'Guest Recovery Bureau',
    finePrint: 'Survey completion may improve your assigned future.',
    theme: 'recovery',
  },
  {
    type: 'advertisement',
    eyebrow: 'Body Equity',
    headline: 'Donate Your Flesh. Earn Store Credit.',
    text: 'Unused tissue can now be exchanged for commemorative vouchers, premium seating, and tax-deductible absolution.',
    ctaText: 'View Recovery Benefits',
    href: '/store/',
    sponsor: 'Human Resource Harvesting',
    finePrint: 'Donor must supply original body and signed waiver.',
    theme: 'harvest',
    image: '/ads/Ouroboros.png',
  },
  {
    type: 'advertisement',
    eyebrow: 'Public Morale',
    headline: 'How Are We Doing, Consumer?',
    text: 'Appeal your assigned joy rating, file a morale incident, or join the discussion before your enthusiasm is redistributed.',
    ctaText: 'Visit Community Desk',
    href: '/community/',
    sponsor: 'Public Morale Office',
    finePrint: 'Complaint volume may be used to rank loyalty.',
    theme: 'morale',
  },
  {
    type: 'advertisement',
    eyebrow: 'Orientation Packet',
    headline: 'New To The Saga? Start With The Archive.',
    text: 'A guided index of arcs, chapters, and transmissions for readers who prefer structured dread over recreational confusion.',
    ctaText: 'Open Story Archive',
    href: '/archive/',
    sponsor: 'Department of Narrative Access',
    finePrint: 'Recommended for first-time witnesses and returning survivors.',
    theme: 'archive',
  },
  {
    type: 'advertisement',
    eyebrow: 'Chronology Services',
    headline: 'Lost In Time? Use The Official Timeline Map.',
    text: 'Major eras, incidents, recipes, extinctions, and corporate milestones arranged in one legally approved chronology.',
    ctaText: 'Open Timeline',
    href: '/timeline/',
    sponsor: 'Chronology Compliance Office',
    finePrint: 'Map accuracy not guaranteed during singularity weather.',
    theme: 'chronology',
  },
  {
    type: 'advertisement',
    eyebrow: 'Recruitment',
    headline: 'Enter Star Observatory Training',
    text: 'Pilots, drifters, and suspicious optimists are invited to report for simulation duty. Survival is considered a premium feature.',
    ctaText: 'Launch The Game',
    href: '/game/',
    sponsor: 'Observatory Personnel Division',
    finePrint: 'External deployment. Emotional damage billed separately.',
    theme: 'observatory',
  },
  {
    type: 'advertisement',
    eyebrow: 'Domestic Comfort',
    headline: 'Lease A Snuggloid Companion',
    text: 'Anxious home? Quiet children? Unexplained screaming from the ventilation shaft? A licensed Snuggloid can help smooth the atmosphere.',
    ctaText: 'Review Companion Program',
    href: '/archive/',
    sponsor: 'Snuggloids Consumer Comfort',
    finePrint: 'Bonding may be permanent. Separation fees apply.',
    theme: 'comfort',
    image: '/ads/snuggloids.png',
  },
  {
    type: 'advertisement',
    eyebrow: 'Culinary Prestige',
    headline: 'Acquire The Galactic Cookbook',
    text: 'Recipes, rituals, plating doctrine, and acceptable substitutions for the modern interstellar table.',
    ctaText: 'Browse Cookbook',
    href: '/cookbook/',
    sponsor: 'Executive Culinary Council',
    finePrint: 'Ingredients may be seasonal, extinct, or sentient.',
    theme: 'culinary',
    video: '/videos/cookbook.webm',
  },
  {
    type: 'advertisement',
    eyebrow: 'Premium Membership',
    headline: 'Upgrade To Mealshare Rewards',
    text: 'Track purchases, unlock ration bonuses, and receive personalized offers based on your appetite profile and observed weaknesses.',
    ctaText: 'Inspect Merchandise',
    href: '/store/',
    sponsor: 'Mealshare Loyalty Network',
    finePrint:
      'Membership includes surveillance, terms, and occasional blessings.',
    theme: 'loyalty',
  },
  {
    type: 'advertisement',
    eyebrow: 'Beta Access',
    headline: 'Story Mode Is Live',
    text: 'Read MEGAMEAL as connected arcs instead of drifting through dispatches one crisis at a time.',
    ctaText: 'Open Story Mode',
    href: '/posts/introducing-story-mode/',
    sponsor: 'Narrative Systems Group',
    finePrint: 'Beta designation reflects honesty, not safety.',
    theme: 'storymode',
  },
  {
    type: 'advertisement',
    eyebrow: 'Prestige Television',
    headline: 'Cosmic Cuisine — Now Streaming',
    text: 'Watch celebrity chefs compete across seventeen dimensions to plate dishes that may or may not exist in your observable reality. Judged by entities who have never eaten.',
    ctaText: 'Begin Viewing',
    href: '/posts/explainer/',
    sponsor: 'Corporate Entertainment Syndicate',
    finePrint:
      'Side effects of watching include hunger, dread, and voluntary ration upgrades.',
    theme: 'culinary',
    image: '/ads/cosmic-cusine.png',
  },
  {
    type: 'advertisement',
    eyebrow: 'Protein Solutions',
    headline: 'Puppy Rescue™ — Real Puppies In Every Bite',
    text: "Finally, a protein source you can feel good about. Each serving contains one (1) real puppy, sustainably sourced from Corporate's licensed rescue network. Adoption paperwork included.",
    ctaText: 'View Nutrition Facts',
    href: '/store/',
    sponsor: 'Puppy Rescue Protein Division',
    finePrint:
      'Puppies are ethically sourced. "Ethically" is a registered trademark.',
    theme: 'harvest',
    image: '/ads/puppy-rescue.png',
  },
  {
    type: 'advertisement',
    eyebrow: 'Mood Optimization',
    headline: 'Sad Snax™ — For When You Deserve It',
    text: 'The only snack clinically formulated to match your current emotional state. Tastes like regret. Pairs well with extended silence and the acceptance of corporate terms.',
    ctaText: 'Order Your Feelings',
    href: '/store/',
    sponsor: 'Emotional Nutrition Lab',
    finePrint:
      'Not responsible for mood contagion. Warranty void upon happiness.',
    theme: 'morale',
    image: '/ads/sad-snax.png',
  },
  {
    type: 'advertisement',
    eyebrow: 'Sauce Technology',
    headline: 'The Dip™ — Definitely Not Addictive',
    text: 'Our lawyers have reviewed the formula and confirm: The Dip is guaranteed to be non-sentient this time. Enjoy the flavor without the previous incidents. Previous incidents are sealed.',
    ctaText: 'Acquire The Dip',
    href: '/store/',
    sponsor: 'Sauce Compliance Bureau',
    finePrint:
      'If The Dip begins speaking to you, please contact your regional coordinator.',
    theme: 'recovery',
    image: '/ads/the-dip.png',
  },
  {
    type: 'fact',
    text: 'MEGAMEAL operates on a simple promise: maximum convenience, minimum dignity.',
    link: 'Explainer',
  },
  {
    type: 'lore',
    text: 'The corporate empire did not conquer the galaxy. It franchised it.',
    link: 'timelines/corporate-empire',
  },
  {
    type: 'lore',
    text: 'The official timeline is updated whenever reality survives another revision.',
    link: 'Timeline',
  },
]
