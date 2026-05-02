export const homeIntroScreens = [
  {
    sceneId: 'home-intro',
    kicker: 'Commercial Portal Online',
    title: 'MEGA MEAL SAGA',
    description:
      'A cheerful multimedia nutrition concern about hunger, history, and the many ways a corporation can smile while measuring your bones.',
    stat: 'Public orientation feed',
    ctaLabel: 'Begin Intake',
    href: '/',
    stillSrc: '/assets/banner/ComfyUI_00138_.webp',
    videoSrc: '/videos/title.webm',
  },
  {
    sceneId: 'timeline-billboard',
    kicker: 'Chronology Console',
    title: 'The Timeline',
    description:
      'Browse the approved sequence of disasters. Every era is labeled for your comfort, and none of the labels imply liability.',
    stat: 'Causality mostly intact',
    ctaLabel: 'Open Timeline',
    href: '/timeline/',
    stillSrc: '/posts/timeline/universe.png',
    videoSrc: '/assets/banner/universbg0001-0121.webm',
  },
  {
    sceneId: 'cookbook-billboard',
    kicker: 'Culinary Compliance',
    title: 'The Cookbook',
    description:
      'Recipes from a future where dinner has a brand strategy, a waiver, and a suspiciously well-funded legal department.',
    stat: 'Flavor optimism mandatory',
    ctaLabel: 'View Recipes',
    href: '/posts/cookbook/cookbook-index/',
    stillSrc: '/posts/cookbook/cookbook.png',
    videoSrc: '/assets/banner/cookbook-glitch0001-0049.webm',
  },
  {
    sceneId: 'archive-billboard',
    kicker: 'Recovered Materials',
    title: 'The Archive',
    description:
      'Incident reports, story arcs, and documents that were absolutely not shredded, denied, re-shredded, and then lovingly restored.',
    stat: 'Records normalized',
    ctaLabel: 'Open Archive',
    href: '/archive/',
    stillSrc: '/assets/banner/archive_still.png',
    videoSrc: '/assets/banner/archive_2.webm',
  },
  {
    sceneId: 'game-billboard',
    kicker: 'Star Observatory',
    title: 'Game Mode',
    description:
      'Navigate the cosmic menu board yourself. Management reminds you that falling through spacetime is not covered by the meal plan.',
    stat: 'Player agency detected',
    ctaLabel: 'Enter Game',
    href: '/game/',
    stillSrc: '/assets/banner/ComfyUI_0144.png',
    videoSrc: '/videos/starmap.webm',
  },
  {
    sceneId: 'store-billboard',
    kicker: 'Retail Afterlife',
    title: 'The Store',
    description:
      'Acquire artifacts from the economy that made everything worse, now available in convenient collectible formats.',
    stat: 'Consumption encouraged',
    ctaLabel: 'Browse Goods',
    href: '/store/',
    stillSrc: '/assets/banner/ultra-headquarters.png',
    videoSrc: '/assets/banner/store_glitch.webm',
  },
  {
    sceneId: 'community-billboard',
    kicker: 'Public Relations',
    title: 'Community',
    description:
      'Join the channels. Share theories. Report anomalies. Remember: friendship is cheaper than customer support.',
    stat: 'Broadcasts monitored',
    ctaLabel: 'Open Channels',
    href: '/community/',
    stillSrc: '/posts/timeline/golden-era.png',
    videoSrc: '/assets/banner/golden-era.webm',
  },
  {
    sceneId: 'story-mode-billboard',
    kicker: 'Guided Consumption',
    title: 'Story Mode',
    description:
      'Read the saga in a humane order, or as humane as a galactic fast-food empire permits before the upsell begins.',
    stat: 'Narrative rails engaged',
    ctaLabel: 'Start Reading',
    href: '/posts/introducing-story-mode/',
    stillSrc: '/posts/building.png',
    videoSrc: '/assets/banner/golden-era.webm',
  },
] as const

export const homeIntroWheelToScreenRatio = 1.08
export const homeIntroIntroOffsetScreens = 2.85
export const homeIntroMobileIntroOffsetScreens = 3.75
export const homeIntroWheelOverscanScreens = 1.8
export const homeIntroScreenCount = homeIntroScreens.length
export const homeIntroMinWheel =
  -homeIntroWheelOverscanScreens / homeIntroWheelToScreenRatio
export function homeIntroMaxWheelForOffset(offsetScreens = homeIntroIntroOffsetScreens) {
  return (homeIntroScreenCount - 1 + offsetScreens) / homeIntroWheelToScreenRatio
}
export const homeIntroMaxWheel =
  (homeIntroScreenCount - 1 + homeIntroMobileIntroOffsetScreens) /
  homeIntroWheelToScreenRatio
