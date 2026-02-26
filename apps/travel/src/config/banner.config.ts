import type { ImageMetadata } from 'astro'

import banner1 from 'src/assets/banner/0001.png'
import banner2 from 'src/assets/banner/0002.png'
import banner3 from 'src/assets/banner/0003.png'
import banner4 from 'src/assets/banner/0004.png'
import banner5 from 'src/assets/banner/0005.png'
import banner6 from 'src/assets/banner/0006.png'
import banner7 from 'src/assets/banner/0007.png'
import banner8 from 'src/assets/banner/0008.png'

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
  bannerList: [banner1, banner2, banner3, banner4, banner5, banner6, banner7, banner8],
  defaultBanner: banner1,
  animation: {
    enabled: true,
    interval: 5000,
    transitionDuration: 1000,
    direction: 'alternate',
  },
  layout: {
    height: { desktop: '60vh', mobile: '50vh' },
    overlap: { desktop: '3rem', mobile: '2rem' },
    maxWidth: 1920,
  },
  visual: {
    objectFit: 'cover',
    objectPosition: 'center',
    applyGradientOverlay: false,
    gradientOverlay: 'linear-gradient(to bottom, rgba(0,0,0,0.2), transparent)',
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
