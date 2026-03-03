import type { ImageMetadata } from 'astro'

// Pacific Crest Trail landscape photography
// Sources: Wikimedia Commons (CC/Public Domain) and Unsplash (free commercial use)
import pctBanner01 from 'src/assets/banner/pct-banner-01-desert.jpg'          // PCT Desert, CA — Public Domain
import pctBanner02 from 'src/assets/banner/pct-banner-02-san-jacinto.jpg'     // San Jacinto Mtns — Public Domain
import pctBanner03 from 'src/assets/banner/pct-banner-03-sierra-tuolumne.jpg' // Tuolumne Meadows, Yosemite — CC BY-SA 4.0
import pctBanner04 from 'src/assets/banner/pct-banner-04-eastern-sierra.jpg'  // Eastern Sierra — Unsplash
import pctBanner05 from 'src/assets/banner/pct-banner-05-mount-shasta.jpg'    // Mount Shasta — CC BY-SA 4.0
import pctBanner06 from 'src/assets/banner/pct-banner-06-north-cascades.jpg'  // North Cascades, WA — CC BY-SA 4.0
import pctBanner07 from 'src/assets/banner/pct-banner-07-alpine-meadow.jpg'   // Alpine Meadow Wildflowers — CC BY 3.0
import pctBanner08 from 'src/assets/banner/pct-banner-08-lake-reflection.jpg' // Mountain Lake Reflection — Unsplash
import pctBanner09 from 'src/assets/banner/pct-banner-09-crater-lake.jpg'     // Crater Lake, OR — CC BY-SA 3.0
import pctBanner10 from 'src/assets/banner/pct-banner-10-forest-trail.jpg'    // PCT Forest Trail, OR — CC BY 4.0

export type BannerType = 'standard' | 'video' | 'image' | 'timeline';

export interface StandardBannerData {}
export interface VideoBannerData { videoId: string }
export interface ImageBannerData { imageUrl: string }
export interface TimelineBannerData {
  category: string
  title?: string
  startYear?: number
  endYear?: number
  background?: string
  compact?: boolean
  height?: string
}

export interface BannerConfig {
  defaultBannerType: BannerType
  defaultBannerData: StandardBannerData | VideoBannerData | ImageBannerData | TimelineBannerData
  bannerList: ImageMetadata[]
  standardBannerConfig?: any // Compatibility with blog-core MainGridLayout
  defaultBanner: ImageMetadata
  animation: {
    enabled: boolean
    interval: number
    transitionDuration: number
    direction: 'forward' | 'reverse' | 'alternate'
  }
  layout: {
    height: { desktop: string; mobile: string }
    overlap: { desktop: string; mobile: string }
    maxWidth: number
  }
  visual: {
    objectFit: 'cover' | 'contain' | 'fill'
    objectPosition: string
    applyGradientOverlay: boolean
    gradientOverlay: string
    borderRadius: string
  }
  fallback: {
    enabled: boolean
    type: 'color' | 'gradient'
    value: string
  }
  navbarSpacing: {
    standard: string
    timeline: string
    video: string
    image: string
  }
  navbar: {
    height: { desktop: string; mobile: string }
  }
  panel: {
    top: {
      video: string
      image: string
      timeline: string
      standard: string
    }
  }
  parallax: {
    enabled: boolean
    scrollFactor: number
    easingFactor: number
  }
}

export const bannerConfig: BannerConfig = {
  defaultBannerType: 'standard',
  defaultBannerData: {},
  bannerList: [pctBanner01, pctBanner02, pctBanner03, pctBanner04, pctBanner05, pctBanner06, pctBanner07, pctBanner08, pctBanner09, pctBanner10],
  defaultBanner: pctBanner01,
  animation: {
    enabled: true,
    interval: 12000,        // 12 seconds per image — slow, scenic pace
    transitionDuration: 1800, // 1.8 second crossfade
    direction: 'forward',
  },
  layout: {
    height: { desktop: '60vh', mobile: '50vh' },
    overlap: { desktop: '3rem', mobile: '2rem' },
    maxWidth: 1920,
  },
  visual: {
    objectFit: 'cover',
    objectPosition: 'center',
    applyGradientOverlay: true,
    gradientOverlay: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.12), rgba(15, 23, 42, 0.4))',
    borderRadius: '0',
  },
  fallback: {
    enabled: true,
    type: 'gradient',
    value: 'linear-gradient(to bottom, var(--color-primary-light), var(--color-primary))',
  },
  navbarSpacing: {
    standard: '0',
    timeline: '5.5rem',
    video: '5.5rem',
    image: '0',
  },
  navbar: {
    height: { desktop: '4.5rem', mobile: '3.5rem' },
  },
  panel: {
    top: {
      video: '-0.5rem',
      image: '-0.5rem',
      timeline: '-0.5rem',
      standard: '-6.5rem',
    },
  },
  parallax: {
    enabled: false,
    scrollFactor: -0.02,
    easingFactor: 0.1,
  },
}

export function getResponsiveBannerDimensions(isMobile: boolean = false) {
  return {
    height: isMobile ? bannerConfig.layout.height.mobile : bannerConfig.layout.height.desktop,
    overlap: isMobile ? bannerConfig.layout.overlap.mobile : bannerConfig.layout.overlap.desktop,
  }
}

export function getFallbackBannerCSS(): string {
  if (!bannerConfig.fallback.enabled) return ''
  return bannerConfig.fallback.type === 'gradient'
    ? bannerConfig.fallback.value
    : bannerConfig.fallback.value
}

export function getBannerAnimationSettings() {
  return {
    enabled: bannerConfig.animation.enabled,
    interval: bannerConfig.animation.interval,
    transitionDuration: bannerConfig.animation.transitionDuration,
    direction: bannerConfig.animation.direction,
  }
}

export function getPanelTopPosition(bannerType: BannerType): string {
  switch (bannerType) {
    case 'video': return bannerConfig.panel.top.video
    case 'image': return bannerConfig.panel.top.image
    case 'timeline': return bannerConfig.panel.top.timeline
    default: return bannerConfig.panel.top.standard
  }
}

export function getNavbarHeight(isMobile: boolean = false): string {
  return isMobile ? bannerConfig.navbar.height.mobile : bannerConfig.navbar.height.desktop
}

export function isVideoBannerData(data: any): data is VideoBannerData {
  return data && 'videoId' in data && typeof data.videoId === 'string'
}

export function isImageBannerData(data: any): data is ImageBannerData {
  return data && 'imageUrl' in data && typeof data.imageUrl === 'string'
}

export function isTimelineBannerData(data: any): data is TimelineBannerData {
  return data && 'category' in data && typeof data.category === 'string'
}

// ============================================================
// COMPATIBILITY LAYER: Functions required by blog-core's MainGridLayout
// ============================================================

export function getDynamicBackgroundImage(backgroundImage?: string | null): string | null {
  if (backgroundImage === 'none' || backgroundImage === '') return null
  return backgroundImage || null
}

export function getShouldShowParallaxBackground(backgroundImage?: string | null): boolean {
  return !!(getDynamicBackgroundImage(backgroundImage) && bannerConfig.parallax.enabled)
}

export function getBannerLink(_index: number): string | null {
  return null
}

export function determineBannerConfiguration(post: any, _pageType: string, defaultBannerLink = '') {
  const mainPanelTop = getPanelTopPosition(bannerConfig.defaultBannerType)
  const navbarSpacing = bannerConfig.navbarSpacing.standard
  return {
    postData: null,
    bannerType: {
      hasTimelineBanner: false,
      hasVideoBanner: false,
      hasImageBanner: false,
      hasAssistantBanner: false,
      hasStandardBanner: true,
      hasPostBanner: false,
      isStandardPage: true,
      currentBannerType: 'standard' as BannerType,
    },
    bannerDataSources: {
      videoBannerData: null,
      imageBannerData: null,
      timelineBannerData: null,
      assistantBannerData: null,
    },
    layout: {
      mainPanelTop,
      navbarSpacing,
      bannerHeight: bannerConfig.layout.height.desktop,
      bannerOverlap: '0',
      dynamicOverlap: '0',
      mainContentOffset: '1.5rem',
    },
    finalBannerLink: defaultBannerLink,
    currentBannerType: 'standard' as BannerType,
  }
}

// Nested standardBannerConfig shape expected by blog-core's MainGridLayout
bannerConfig.standardBannerConfig = {
  bannerList: bannerConfig.bannerList.map((img: ImageMetadata) => ({
    src: img,
    alt: 'Banner image',
    fallbackImage: img,
    preload: 'auto' as const,
  })),
  animation: {
    transitionDuration: bannerConfig.animation.transitionDuration,
    interval: bannerConfig.animation.interval,
  },
  video: {
    autoplay: false,
    muted: true,
    loop: true,
    playsInLine: true,
    controls: false,
    preload: 'auto',
  },
  isVideoBannerItem: (_item: any) => false,
  isImageBannerItem: (_item: any) => true,
  getBannerItemPreviewDetails: (_item: any) => ({ title: '', description: '' }),
};
(bannerConfig as any).navbar ??= {};
(bannerConfig as any).navbar.mobilePortraitSpacing = bannerConfig.navbar.height.mobile;
(bannerConfig as any).layout.maxWidth ??= 1920;
