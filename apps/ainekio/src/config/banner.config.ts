import { siteConfig } from './config'

export const bannerConfig = {
  defaultBannerType: 'none' as const,
  defaultBannerData: {},
  bannerList: [],
  animation: {
    enabled: false,
    interval: 5000,
    transitionDuration: 1000,
    direction: 'forward' as const,
  },
  layout: {
    height: '0',
    mobileHeight: '0',
    maxWidth: 1920,
    mainContentOffset: '.5rem',
  },
  visual: {
    objectFit: 'cover' as const,
    objectPosition: 'center',
    applyGradientOverlay: false,
    gradientOverlay: 'none',
    borderRadius: '0.5rem',
  },
  fallback: {
    enabled: false,
    type: 'gradient' as const,
    value: 'none',
  },
  navbar: {
    height: '5rem',
    spacing: {
      standard: '3rem',
      timeline: '5.5rem',
      video: '5.5rem',
      image: '4rem',
      assistant: '5.5rem',
      none: '5rem',
    },
    mobileBannerGap: '2.75rem',
    mobilePortraitSpacing: '0.75rem',
  },
  panel: {
    top: {
      video: '0rem',
      image: '0rem',
      timeline: '0rem',
      assistant: '0rem',
      standard: '0rem',
      none: '0rem',
      mobilePortrait: '0rem',
    },
  },
  parallax: {
    enabled: false,
    scrollFactor: -0.02,
    easingFactor: 0.1,
  },
}

export function getDynamicBackgroundImage(backgroundImage?: string | null): string | null {
  if (backgroundImage === 'none' || backgroundImage === '') return null
  if (backgroundImage) return backgroundImage
  if (siteConfig?.banner?.enable && siteConfig?.banner?.src) return siteConfig.banner.src
  return null
}

export function getShouldShowParallaxBackground(backgroundImage?: string | null): boolean {
  return !!(getDynamicBackgroundImage(backgroundImage) && bannerConfig.parallax.enabled)
}

export function getBannerAnimationSettings() {
  return bannerConfig.animation
}

export function determineBannerConfiguration(post: any, _pageType = 'default', defaultBannerLink = '') {
  const postData = post?.data
    ? {
        bannerLink: post.data.bannerLink || '',
        customAvatar: post.data.avatarImage || '',
        customName: post.data.authorName || '',
        customBio: post.data.authorBio || '',
        slug: post.slug || '',
        wantsNoDefaultBanner: true,
      }
    : null

  return {
    postData,
    bannerType: {
      hasTimelineBanner: false,
      hasVideoBanner: false,
      hasImageBanner: false,
      hasAssistantBanner: false,
      hasStandardBanner: false,
      hasPostBanner: false,
      isStandardPage: !postData,
      currentBannerType: 'none' as const,
    },
    bannerDataSources: {
      videoBannerData: null,
      imageBannerData: null,
      timelineBannerData: null,
      assistantBannerData: null,
    },
    layout: {
      mainPanelTop: '0rem',
      navbarSpacing: bannerConfig.navbar.spacing.none,
      navbarSpacingMobile: bannerConfig.navbar.height,
      bannerHeight: '0',
      bannerHeightMobile: '0',
      bannerOverlap: '0',
      dynamicOverlap: '0',
      mainContentOffset: bannerConfig.layout.mainContentOffset,
    },
    finalBannerLink: postData?.bannerLink || defaultBannerLink,
    currentBannerType: 'none' as const,
  }
}
