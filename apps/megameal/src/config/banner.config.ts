/**
 * ===================================================================
 * BANNER CONFIGURATION - FIXED MOBILE NAVBAR SPACING
 * ===================================================================
 */

// Import siteConfig for background image resolution
import { siteConfig } from '../config/config'

// Import types from existing types.ts
import type {
  BannerAnimationConfig,
  BannerData,
  BannerDeterminationResult,
  BannerItemPreviewDetails,
  BannerType,
  LinkPreviewInfo,
  PostBannerData,
} from './banners/types'

import { assistantBannerConfig } from './banners/assistant'
import { imageBannerConfig } from './banners/image'
import {
  bannerLayoutProfiles,
  createLegacyNavbarSpacing,
  createLegacyPanelTop,
  resolveBannerLayout,
} from './banners/layout'
import type { BannerLayoutProfiles } from './banners/layout'
import { noneBannerConfig } from './banners/none'
// Import banner configurations
import { standardBannerConfig } from './banners/standard'
import { timelineBannerConfig } from './banners/timeline'
import { videoBannerConfig } from './banners/video'

import { isAssistantBannerData } from './banners/assistant'
import { isImageBannerData } from './banners/image'
import { isNoneBannerData } from './banners/none'
import { isTimelineBannerData } from './banners/timeline'
// Import type guards
import { isVideoBannerData } from './banners/video'

// =====================================================================
// BACKGROUND IMAGE HELPERS - FIXED
// =====================================================================

export function getDynamicBackgroundImage(
  backgroundImage?: string | null,
): string | null {
  // 1. Check for explicit "none" or empty string
  if (backgroundImage === 'none' || backgroundImage === '') {
    return null
  }

  // 2. Use explicit backgroundImage prop if provided
  if (backgroundImage) {
    if (import.meta.env.DEV) {
    }
    return backgroundImage
  }

  // 3. Use imported siteConfig (primary method)
  if (siteConfig?.banner?.enable && siteConfig?.banner?.src) {
    if (import.meta.env.DEV) {
    }
    return siteConfig.banner.src
  }

  // 4. Fallback: Check window object for client-side compatibility
  if (
    typeof window !== 'undefined' &&
    (window as any).siteConfig?.banner?.enable &&
    (window as any).siteConfig?.banner?.src
  ) {
    if (import.meta.env.DEV) {
      console.log(
        'Using window.siteConfig background image:',
        (window as any).siteConfig.banner.src,
      )
    }
    return (window as any).siteConfig.banner.src
  }

  console.warn(
    'No background image found - check siteConfig.banner configuration',
  )
  return null
}

export function getShouldShowParallaxBackground(
  backgroundImage?: string | null,
): boolean {
  const currentBackgroundImage = getDynamicBackgroundImage(backgroundImage)
  const isParallaxEnabled = bannerConfig.parallax.enabled

  const shouldShow = !!(currentBackgroundImage && isParallaxEnabled)

  // Debug logging for development
  if (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost'
  ) {
    console.log('Input backgroundImage prop:', backgroundImage)
    console.log('Resolved currentBackgroundImage:', currentBackgroundImage)
    console.log('Parallax enabled in config:', isParallaxEnabled)
    console.log('Should show parallax background:', shouldShow)
    console.log('siteConfig.banner:', siteConfig?.banner)
    console.log('================================')
  }

  return shouldShow
}

// =====================================================================
// RESTORED INTERFACES - BACK TO WORKING VERSION
// =====================================================================

/**
 * 🎯 ACTUAL BANNER DIMENSIONS - Only used by CSS
 */
export interface BannerDimensions {
  aspectRatio: string // 16:9 aspect ratio (critical)
  maxWidth: string // Max banner width (responsive)
  padding: string // Horizontal padding (responsive)
  borderRadius: string // Border radius
}

/**
 * 🎯 MAIN CONFIG - RESTORED WORKING VERSION
 */
export interface BannerConfig {
  // Banner type configs
  defaultBannerType: BannerType
  defaultBannerData: BannerData
  standardBannerConfig: typeof standardBannerConfig
  videoBannerConfig: typeof videoBannerConfig
  imageBannerConfig: typeof imageBannerConfig
  timelineBannerConfig: typeof timelineBannerConfig
  assistantBannerConfig: typeof assistantBannerConfig
  noneBannerConfig: typeof noneBannerConfig

  // Actual working configuration
  dimensions: BannerDimensions
  layoutProfiles: BannerLayoutProfiles

  // WORKING: Layout values used by MainGridLayout.astro
  layout: {
    height: string
    mobileHeight?: string
    maxWidth: number
    mainContentOffset: string
    mainContentOffsetMobile?: string
  }

  // WORKING: Visual config used by existing code
  visual: {
    objectFit: string
    objectPosition: string
    applyGradientOverlay: boolean
    gradientOverlay: string
    borderRadius: string
  }

  // WORKING: Fallback configuration
  fallback: {
    enabled: boolean
    type: string
    value: string
  }

  // WORKING: Navbar spacing for different banner types
  navbar: {
    height: string
    spacing: {
      standard: string
      timeline: string
      video: string
      image: string
      assistant: string
      cookbook?: string
      archive?: string
      reader?: string
      none: string
    }
    // ⭐ FIXED: Mobile portrait spacing now accounts for always-visible navbar
    mobileBannerGap?: string
    mobilePortraitSpacing: string
  }

  // 🎯 WORKING: The REAL overlap system - this controls banner overlap!
  panel: {
    top: {
      video: string
      image: string
      timeline: string
      assistant: string
      cookbook?: string
      archive?: string
      reader?: string
      standard: string // ⭐ THIS IS YOUR BANNER OVERLAP CONTROL!
      none: string
      mobilePortrait?: string
    }
  }

  // WORKING: Parallax configuration
  parallax: {
    enabled: boolean
    scrollFactor: number
    easingFactor: number
  }

  // WORKING: Navigation configuration
  navigation?: {
    enabled: boolean
    showPositionIndicator: boolean
    showBannerTitles: boolean
    autoResumeDelay: number
    keyboardNavigation: boolean
    enabledForTypes: BannerType[]
    styling?: {
      buttonSize?: string
      indicatorSize?: string
      animationDuration?: string
    }
  }
}

/**
 * ===================================================================
 * MAIN CONFIGURATION - FIXED MOBILE NAVBAR SPACING
 * ===================================================================
 */
export const bannerConfig: BannerConfig = {
  // Default banner type
  defaultBannerType: 'standard',
  defaultBannerData: {} as any,

  // Banner type configurations
  standardBannerConfig,
  videoBannerConfig,
  imageBannerConfig,
  timelineBannerConfig,
  assistantBannerConfig,
  noneBannerConfig,

  // 🎯 FIXED: CSS dimensions system - NO MORE clamp() ISSUES
  dimensions: {
    aspectRatio: '56.25%', // 16:9 ratio (critical for your content)
    maxWidth: '100vw', // ✅ FIXED: Simple full width (was clamp issue)
    padding: '0', // ✅ FIXED: No padding (was clamp issue)
    borderRadius: '.5rem', // Standard Tailwind radius
  },
  layoutProfiles: bannerLayoutProfiles,

  // WORKING: Layout used by MainGridLayout.astro
  layout: {
    height: bannerLayoutProfiles.standard.stageHeight.desktop,
    mobileHeight: bannerLayoutProfiles.standard.stageHeight.mobile,
    maxWidth: 3840,
    mainContentOffset: bannerLayoutProfiles.standard.contentTop.desktop,
    mainContentOffsetMobile: bannerLayoutProfiles.standard.contentTop.mobile,
  },

  // WORKING: Visual config used by existing code
  visual: {
    objectFit: 'cover',
    objectPosition: 'center',
    applyGradientOverlay: false,
    gradientOverlay:
      'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.3))',
    borderRadius: '0.5rem',
  },

  // WORKING: Fallback configuration
  fallback: {
    enabled: true,
    type: 'gradient',
    value:
      'linear-gradient(135deg, oklch(0.6 0.2 var(--hue)), oklch(0.4 0.3 var(--hue)))',
  },

  // 🎯 FIXED: Navbar spacing - Mobile portrait now accounts for always-visible navbar
  navbar: {
    height: 'var(--navbar-height)',
    spacing: createLegacyNavbarSpacing(),
    mobileBannerGap: bannerLayoutProfiles.standard.stageTop.mobile,
    mobilePortraitSpacing: bannerLayoutProfiles.standard.stageTop.mobile,
  },

  // 🎯 FIXED: THE REAL OVERLAP SYSTEM - NO MORE clamp() ISSUES
  panel: {
    top: createLegacyPanelTop(),
  },

  // WORKING: Parallax configuration - ENABLED BY DEFAULT
  parallax: {
    enabled: true,
    scrollFactor: -0.02,
    easingFactor: 0.1,
  },

  // WORKING: Navigation configuration
  navigation: {
    enabled: true,
    showPositionIndicator: true,
    showBannerTitles: true,
    autoResumeDelay: 5000,
    keyboardNavigation: true,
    enabledForTypes: ['standard', 'image', 'video'] as BannerType[],
    styling: {
      buttonSize: '2.75rem',
      indicatorSize: '0.4375rem',
      animationDuration: '0.3s',
    },
  },
}

// =====================================================================
// RESTORED HELPER FUNCTIONS - WORKING VERSION
// =====================================================================

const articlePostBannerTypes = new Set<BannerType>([
  'standard',
  'image',
  'video',
  'assistant',
  'cookbook',
  'reader',
  'none',
])

function isArticlePost(post: any): boolean {
  return post?.collection === 'posts'
}

function wantsNoArticleBanner(post: any): boolean {
  if (!isArticlePost(post)) return false

  const bannerType = post?.data?.bannerType as BannerType | undefined
  return !bannerType || !articlePostBannerTypes.has(bannerType)
}

export function isFullscreenModeActive(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false
  }
  return localStorage.getItem('fullscreenBannerOverride') === 'true'
}

export function getBannerDataFromPost(post: any): PostBannerData | null {
  if (!post?.data) return null

  return {
    bannerLink: post.data.bannerLink || '',
    customAvatar: post.data.avatarImage || '',
    customName: post.data.authorName || '',
    customBio: post.data.authorBio || '',
    slug: post.slug || '',
    // Article posts opt into banners with bannerType. Legacy archive/timeline
    // article values are treated as no banner.
    wantsNoDefaultBanner:
      post.data.bannerType === 'none' || wantsNoArticleBanner(post),
  }
}

export function determineBannerType(
  post: any,
  postData: PostBannerData | null,
): BannerDeterminationResult {
  const explicitBannerType = post?.data?.bannerType

  // Check for post-specific banners
  const hasPostStandardBanner =
    explicitBannerType === 'standard' && !postData?.wantsNoDefaultBanner
  const hasPostTimelineBanner =
    explicitBannerType === 'timeline' &&
    !postData?.wantsNoDefaultBanner &&
    post?.data?.bannerData?.category
  const hasPostVideoBanner =
    explicitBannerType === 'video' &&
    !postData?.wantsNoDefaultBanner &&
    post?.data?.bannerData?.videoId
  const hasPostAssistantBanner =
    explicitBannerType === 'assistant' && !postData?.wantsNoDefaultBanner
  const hasPostCookbookBanner =
    explicitBannerType === 'cookbook' && !postData?.wantsNoDefaultBanner
  const hasPostArchiveBanner =
    explicitBannerType === 'archive' && !postData?.wantsNoDefaultBanner
  const hasPostReaderBanner =
    explicitBannerType === 'reader' && !postData?.wantsNoDefaultBanner
  const hasPostImageBanner =
    !postData?.wantsNoDefaultBanner &&
    explicitBannerType === 'image' &&
    (post?.data?.bannerData?.imageUrl || post?.data?.image) &&
    !hasPostVideoBanner &&
    !hasPostTimelineBanner &&
    !hasPostAssistantBanner &&
    !hasPostCookbookBanner &&
    !hasPostArchiveBanner &&
    !hasPostReaderBanner

  const hasPostBanner =
    hasPostVideoBanner ||
    hasPostImageBanner ||
    hasPostTimelineBanner ||
    hasPostAssistantBanner ||
    hasPostCookbookBanner ||
    hasPostArchiveBanner ||
    hasPostReaderBanner ||
    hasPostStandardBanner

  // Check for default banners
  const useDefaultVideo =
    !hasPostBanner &&
    !postData?.wantsNoDefaultBanner &&
    bannerConfig.defaultBannerType === 'video' &&
    isVideoBannerData(bannerConfig.defaultBannerData)
  const useDefaultImage =
    !hasPostBanner &&
    !postData?.wantsNoDefaultBanner &&
    bannerConfig.defaultBannerType === 'image' &&
    isImageBannerData(bannerConfig.defaultBannerData)
  const useDefaultTimeline =
    !hasPostBanner &&
    !postData?.wantsNoDefaultBanner &&
    bannerConfig.defaultBannerType === 'timeline' &&
    isTimelineBannerData(bannerConfig.defaultBannerData)
  const useDefaultAssistant =
    !hasPostBanner &&
    !postData?.wantsNoDefaultBanner &&
    bannerConfig.defaultBannerType === 'assistant' &&
    isAssistantBannerData(bannerConfig.defaultBannerData)
  const useDefaultStandard =
    !hasPostBanner &&
    !postData?.wantsNoDefaultBanner &&
    (bannerConfig.defaultBannerType === 'standard' ||
      (!useDefaultVideo &&
        !useDefaultImage &&
        !useDefaultTimeline &&
        !useDefaultAssistant))

  // Determine banner flags
  const hasTimelineBanner = hasPostTimelineBanner || useDefaultTimeline
  const hasVideoBanner = hasPostVideoBanner || useDefaultVideo
  const hasImageBanner = hasPostImageBanner || useDefaultImage
  const hasAssistantBanner = hasPostAssistantBanner || useDefaultAssistant
  const hasCookbookBanner = hasPostCookbookBanner
  const hasArchiveBanner = hasPostArchiveBanner
  const hasReaderBanner = hasPostReaderBanner
  const hasStandardBanner = hasPostStandardBanner || useDefaultStandard

  const currentBannerType: BannerType = hasVideoBanner
    ? 'video'
    : hasImageBanner
      ? 'image'
      : hasTimelineBanner
        ? 'timeline'
        : hasAssistantBanner
          ? 'assistant'
          : hasCookbookBanner
            ? 'cookbook'
            : hasArchiveBanner
              ? 'archive'
              : hasReaderBanner
                ? 'reader'
                : hasStandardBanner
                  ? 'standard'
                  : 'none'

  return {
    hasTimelineBanner,
    hasVideoBanner,
    hasImageBanner,
    hasAssistantBanner,
    hasCookbookBanner,
    hasArchiveBanner,
    hasReaderBanner,
    hasStandardBanner,
    hasPostBanner,
    isStandardPage: !hasPostBanner,
    currentBannerType,
  }
}

export function getBannerDataSources(
  bannerType: BannerDeterminationResult,
  post: any,
) {
  const {
    hasTimelineBanner,
    hasVideoBanner,
    hasImageBanner,
    hasAssistantBanner,
    hasCookbookBanner,
    hasArchiveBanner,
    hasReaderBanner,
  } = bannerType

  let resolvedImageBannerData: any = null
  if (hasImageBanner) {
    if (post?.data?.bannerType === 'image') {
      const imageUrl = post.data.bannerData?.imageUrl || post.data.image
      if (typeof imageUrl === 'string') {
        resolvedImageBannerData = { imageUrl: imageUrl }
      } else {
        console.warn(
          'Banner config: Post-specific image banner lacks a valid imageUrl. Falling back to default.',
        )
        resolvedImageBannerData = bannerConfig.imageBannerConfig.data
      }
    } else {
      if (isImageBannerData(bannerConfig.imageBannerConfig.data)) {
        resolvedImageBannerData = bannerConfig.imageBannerConfig.data
      } else {
        console.warn(
          'Banner config: Mismatch in default image banner data type. Falling back to imageBannerConfig.data.',
        )
        resolvedImageBannerData = bannerConfig.imageBannerConfig.data
      }
    }
  }

  return {
    videoBannerData:
      hasVideoBanner && post?.data?.bannerType === 'video'
        ? post.data.bannerData
        : hasVideoBanner
          ? bannerConfig.defaultBannerData
          : null,

    imageBannerData: resolvedImageBannerData,

    timelineBannerData:
      hasTimelineBanner && post?.data?.bannerType === 'timeline'
        ? post.data.bannerData
        : hasTimelineBanner
          ? bannerConfig.defaultBannerData
          : null,

    assistantBannerData:
      hasAssistantBanner && post?.data?.bannerType === 'assistant'
        ? post.data.bannerData
        : hasAssistantBanner
          ? bannerConfig.defaultBannerData
          : null,
    cookbookBannerData:
      hasCookbookBanner && post?.data?.bannerType === 'cookbook'
        ? post.data.bannerData
        : null,
    archiveBannerData:
      hasArchiveBanner && post?.data?.bannerType === 'archive'
        ? post.data.bannerData
        : null,
    readerBannerData:
      hasReaderBanner && post?.data?.bannerType === 'reader'
        ? post.data.bannerData
        : null,
  }
}

/**
 * 🎯 MAIN API: Banner configuration determination - CLEANED VERSION
 */
export function determineBannerConfiguration(
  post: any,
  pageType: string,
  defaultBannerLink = '',
) {
  // ⭐ NEW: Check user's saved banner type preference
  if (
    typeof window !== 'undefined' &&
    localStorage.getItem('defaultBannerType')
  ) {
    const savedType = localStorage.getItem('defaultBannerType')
    if (import.meta.env.DEV) {
    }
    bannerConfig.defaultBannerType = savedType as BannerType
    if (import.meta.env.DEV) {
    }
  } else if (import.meta.env.DEV) {
  }

  if (isFullscreenModeActive()) {
    const resolvedLayout = resolveBannerLayout('none', {
      fullscreen: true,
      profiles: bannerConfig.layoutProfiles,
    })

    return {
      postData: getBannerDataFromPost(post),
      bannerType: {
        hasTimelineBanner: false,
        hasVideoBanner: false,
        hasImageBanner: false,
        hasAssistantBanner: false,
        hasCookbookBanner: false,
        hasArchiveBanner: false,
        hasReaderBanner: false,
        hasStandardBanner: false,
        hasPostBanner: false,
        isStandardPage: false,
        currentBannerType: 'none' as BannerType,
      },
      bannerDataSources: {
        videoBannerData: null,
        imageBannerData: null,
        timelineBannerData: null,
        assistantBannerData: null,
        cookbookBannerData: null,
        archiveBannerData: null,
        readerBannerData: null,
      },
      layout: {
        mainPanelTop: resolvedLayout.panelTop,
        mainPanelTopMobile: resolvedLayout.panelTopMobile,
        navbarSpacing: resolvedLayout.stageTop,
        navbarSpacingMobile: resolvedLayout.stageTopMobile,
        bannerHeight: resolvedLayout.stageHeight,
        bannerHeightMobile: resolvedLayout.stageHeightMobile,
        bannerAspectRatio: resolvedLayout.stageAspectRatio,
        bannerAspectRatioMobile: resolvedLayout.stageAspectRatioMobile,
        bannerOverlap: '0',
        dynamicOverlap: '0',
        mainContentOffset: resolvedLayout.contentTop,
        mainContentOffsetMobile: resolvedLayout.contentTopMobile,
      },
      finalBannerLink: '',
      currentBannerType: 'none' as BannerType,
    }
  }

  const postData = getBannerDataFromPost(post)
  const bannerType = determineBannerType(post, postData)
  const bannerDataSources = getBannerDataSources(bannerType, post)
  const resolvedLayout = resolveBannerLayout(bannerType.currentBannerType, {
    profiles: bannerConfig.layoutProfiles,
  })

  const finalBannerLink = postData?.bannerLink || defaultBannerLink

  return {
    postData,
    bannerType,
    bannerDataSources,
    layout: {
      mainPanelTop: resolvedLayout.panelTop,
      mainPanelTopMobile: resolvedLayout.panelTopMobile,
      navbarSpacing: resolvedLayout.stageTop,
      navbarSpacingMobile: resolvedLayout.stageTopMobile,
      bannerHeight: resolvedLayout.stageHeight,
      bannerHeightMobile: resolvedLayout.stageHeightMobile,
      bannerAspectRatio: resolvedLayout.stageAspectRatio,
      bannerAspectRatioMobile: resolvedLayout.stageAspectRatioMobile,
      bannerOverlap: '0', // Removed unused value
      dynamicOverlap: '0', // Removed unused value
      mainContentOffset: resolvedLayout.contentTop,
      mainContentOffsetMobile: resolvedLayout.contentTopMobile,
    },
    finalBannerLink,
    currentBannerType: bannerType.currentBannerType,
  }
}

// =====================================================================
// RESTORED UTILITY FUNCTIONS - KEPT ONLY WORKING ONES
// =====================================================================

export function getResponsiveBannerDimensions(): { height: string } {
  return {
    height: bannerConfig.layoutProfiles.standard.stageHeight.desktop,
  }
}

export function getFallbackBannerCSS(): string {
  if (!bannerConfig.fallback.enabled) return ''
  return bannerConfig.fallback.type === 'gradient'
    ? bannerConfig.fallback.value
    : `${bannerConfig.fallback.value}`
}

export function getBannerAnimationSettings(): BannerAnimationConfig {
  return bannerConfig.standardBannerConfig.getBannerAnimationSettings()
}

// 🎯 THE FUNCTION THAT CONTROLS OVERLAP! - RESTORED
export function getPanelTopPosition(bannerType: BannerType): string {
  return resolveBannerLayout(bannerType, {
    profiles: bannerConfig.layoutProfiles,
  }).panelTop
}

export function getPageSpecificOverlap(pageType: string): string {
  // This function is no longer used but kept for compatibility
  return '0'
}

export function getNavbarHeight(): string {
  return bannerConfig.navbar.height
}

export function getMainContentOffset(): string {
  return bannerConfig.layoutProfiles.standard.contentTop.desktop
}

export function getBannerLink(index: number): string | null {
  return bannerConfig.standardBannerConfig.getBannerLink(index)
}

export function getBannerItemPreviewDetails(
  index: number,
): BannerItemPreviewDetails | null {
  return bannerConfig.standardBannerConfig.getBannerItemPreviewDetails(index)
}

export function hasAnyBannerLinks(): boolean {
  return bannerConfig.standardBannerConfig.hasAnyBannerLinks()
}

export function getLinkPreviewData(url: string): LinkPreviewInfo {
  return bannerConfig.standardBannerConfig.getLinkPreviewData(url)
}

export function getIconSVG(iconName: string): string {
  return bannerConfig.standardBannerConfig.getIconSVG(iconName)
}

// =====================================================================
// DEPRECATED FUNCTIONS - KEPT FOR BACKWARDS COMPATIBILITY
// =====================================================================

/** @deprecated Use getPanelTopPosition instead */
export function calculateBannerLayout() {
  console.warn(
    'calculateBannerLayout is deprecated, using working system instead',
  )
}

// Re-export type guards and configurations
export {
  isVideoBannerData,
  isImageBannerData,
  isTimelineBannerData,
  isAssistantBannerData,
  isNoneBannerData,
}

export function isStandardBannerData(data: any): data is any {
  return data && typeof data === 'object' && Object.keys(data).length === 0
}

export {
  standardBannerConfig,
  videoBannerConfig,
  imageBannerConfig,
  timelineBannerConfig,
  assistantBannerConfig,
  noneBannerConfig,
}

// Re-export types
export type {
  BannerType,
  BannerData,
  BannerDeterminationResult,
  PostBannerData,
  LinkPreviewInfo,
  BannerAnimationConfig,
} from './banners/types'
export type { BannerLayoutProfile, ResolvedBannerLayout } from './banners/layout'
export { bannerLayoutProfiles, resolveBannerLayout } from './banners/layout'
