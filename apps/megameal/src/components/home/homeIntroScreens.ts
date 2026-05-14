export const homeIntroScreens = [
  {
    sceneId: 'home-intro',
    kicker: 'Commercial Portal Online',
    title: 'MEGA MEAL SAGA',
    description:
      'A cheerful multimedia nutrition concern about hunger, history, and the many ways a corporation can smile while measuring your bones.',
    stat: 'Public orientation feed',
    ctaLabel: 'Begin Intake',
    href: '/videos/',
    stillSrc: '/assets/banner/ComfyUI_00138_.webp',
    webglStillSrc: '/assets/banner/home-intro-stills/home-intro.webp',
    ktx2StillSrc: '/assets/banner/home-intro-stills/home-intro.ktx2',
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
    stillSrc: '/assets/banner/posters/universe-poster.webp',
    webglStillSrc: '/assets/banner/home-intro-stills/timeline.webp',
    ktx2StillSrc: '/assets/banner/home-intro-stills/timeline.ktx2',
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
    href: '/cookbook/',
    stillSrc: '/assets/banner/posters/cookbook-poster.webp',
    webglStillSrc: '/assets/banner/home-intro-stills/cookbook.webp',
    ktx2StillSrc: '/assets/banner/home-intro-stills/cookbook.ktx2',
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
    webglStillSrc: '/assets/banner/home-intro-stills/archive.webp',
    ktx2StillSrc: '/assets/banner/home-intro-stills/archive.ktx2',
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
    href: 'https://game.megameal.org/',
    stillSrc: '/assets/banner/game.webp',
    webglStillSrc: '/assets/banner/game.webp',
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
    stillSrc: '/assets/banner/store-page.webp',
    webglStillSrc: '/assets/banner/store-page.webp',
    videoSrc: '/assets/banner/store_glitch.webm',
  },
  {
    sceneId: 'community-billboard',
    kicker: 'Public Relations',
    title: 'Community',
    description:
      'A future community hub for channels, theory sharing, and anomaly reports. The desk is staffed by placeholders for now.',
    stat: 'Community desk in progress',
    ctaLabel: 'Preview Desk',
    href: '/community/',
    stillSrc: '/assets/banner/posters/golden-era-poster.webp',
    webglStillSrc: '/assets/banner/home-intro-stills/community.webp',
    ktx2StillSrc: '/assets/banner/home-intro-stills/community.ktx2',
    videoSrc: '/assets/banner/golden-era12fps.webm',
  },
  {
    sceneId: 'reader-billboard',
    kicker: 'Universal Reader',
    title: 'First Contact Manual',
    description:
      'Open the survival manual for alien contact, hostile civilizations, and the wisdom of remaining professionally unnoticed.',
    stat: 'Manual reader online',
    ctaLabel: 'Open Manual',
    href: '/reader/first-contact-manual/',
    stillSrc: '/posts/timeline/dont.png',
    webglStillSrc: '/posts/timeline/dont.png',
    videoSrc: '/assets/banner/universbg0001-0121.webm',
  },
] as const

export const homeIntroWheelToScreenRatio = 1.08
export const homeIntroIntroOffsetScreens = 2.85
export const homeIntroMobileIntroOffsetScreens = 3.75
export const homeIntroWheelOverscanScreens = 1.8
export const homeIntroBannerSceneHoldRadius = 0.3
export const homeIntroScreenCount = homeIntroScreens.length
export const homeIntroStandardBannerPhaseScreens = 1.1
export const homeIntroMinWheel =
  -homeIntroWheelOverscanScreens / homeIntroWheelToScreenRatio
export function homeIntroMaxWheelForOffset(offsetScreens = homeIntroIntroOffsetScreens) {
  return (homeIntroScreenCount - 1 + offsetScreens) / homeIntroWheelToScreenRatio
}
export const homeIntroMaxWheel =
  (homeIntroScreenCount - 1 + homeIntroMobileIntroOffsetScreens) /
  homeIntroWheelToScreenRatio

export function clampHomeIntroScreenIndex(value: number) {
  return Math.min(homeIntroScreenCount - 1, Math.max(0, value))
}

export function getHomeIntroRestedScreenIndex(selectedIndex: number) {
  const activeIndex = clampHomeIntroScreenIndex(Math.round(selectedIndex))
  const delta = selectedIndex - activeIndex
  const distance = Math.abs(delta)

  if (distance <= 0.001 || distance >= 0.5) return selectedIndex

  return activeIndex + Math.sign(delta) * Math.pow(distance / 0.5, 1.45) * 0.5
}

export function getHomeIntroBannerSyncState(selectedIndex: number) {
  const clampedSelectedIndex = clampHomeIntroScreenIndex(selectedIndex)
  const lowerScreenIndex = clampHomeIntroScreenIndex(Math.floor(clampedSelectedIndex))
  const upperScreenIndex = clampHomeIntroScreenIndex(Math.ceil(clampedSelectedIndex))
  const activeIndex = clampHomeIntroScreenIndex(Math.round(clampedSelectedIndex))
  const distanceToActive = Math.abs(clampedSelectedIndex - activeIndex)

  if (
    distanceToActive <= homeIntroBannerSceneHoldRadius ||
    lowerScreenIndex === upperScreenIndex
  ) {
    return {
      activeIndex,
      clampedSelectedIndex,
      lowerScreenIndex,
      mode: 'hold' as const,
      upperScreenIndex,
    }
  }

  const rawProgress =
    (clampedSelectedIndex - lowerScreenIndex - homeIntroBannerSceneHoldRadius) /
    Math.max(0.001, 1 - homeIntroBannerSceneHoldRadius * 2)
  const normalizedProgress = Math.min(1, Math.max(0, rawProgress))
  const progress =
    normalizedProgress * normalizedProgress * (3 - normalizedProgress * 2)

  return {
    activeIndex,
    clampedSelectedIndex,
    lowerScreenIndex,
    mode: 'transition' as const,
    progress,
    upperScreenIndex,
  }
}

export function getHomeIntroBannerSyncEvent(selectedIndex: number) {
  const standardBannerPhaseStart = homeIntroScreenCount - 1
  const standardBannerProgress =
    (selectedIndex - standardBannerPhaseStart) /
    homeIntroStandardBannerPhaseScreens

  if (standardBannerProgress > 0) {
    const clampedProgress = Math.min(1, Math.max(0, standardBannerProgress))
    const progress =
      clampedProgress * clampedProgress * (3 - clampedProgress * 2)
    const lastScreen = homeIntroScreens[homeIntroScreenCount - 1]

    return {
      detail: {
        phase: 'standard-banner',
        progress,
        fromSceneId: lastScreen?.sceneId,
        fromScreenIndex: homeIntroScreenCount - 1,
        selectedIndex,
      },
      syncKey: `standard-banner:${progress.toFixed(4)}`,
    }
  }

  const bannerState = getHomeIntroBannerSyncState(selectedIndex)
  const {
    activeIndex,
    clampedSelectedIndex,
    lowerScreenIndex,
    upperScreenIndex,
  } = bannerState
  const sceneId = homeIntroScreens[activeIndex]?.sceneId
  const fromSceneId = homeIntroScreens[lowerScreenIndex]?.sceneId
  const toSceneId = homeIntroScreens[upperScreenIndex]?.sceneId

  if (!sceneId || !fromSceneId || !toSceneId) return null

  if (bannerState.mode === 'hold') {
    return {
      detail: {
        sceneId,
        screenIndex: activeIndex,
        selectedIndex: clampedSelectedIndex,
      },
      syncKey: `hold:${activeIndex}`,
    }
  }

  return {
    detail: {
      sceneId,
      screenIndex: activeIndex,
      fromSceneId,
      toSceneId,
      fromScreenIndex: lowerScreenIndex,
      toScreenIndex: upperScreenIndex,
      progress: bannerState.progress,
      selectedIndex: clampedSelectedIndex,
    },
    syncKey: [
      lowerScreenIndex,
      upperScreenIndex,
      bannerState.progress.toFixed(4),
    ].join(':'),
  }
}
