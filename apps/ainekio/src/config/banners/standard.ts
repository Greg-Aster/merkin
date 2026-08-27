import type {
  BannerAnimationConfig,
  BannerItem,
  BannerItemPreviewDetails,
  ImageBannerItem,
  LinkPreviewInfo,
  StandardBannerData,
  VideoBannerConfig,
} from './types'
import { isImageBannerItem, isVideoBannerItem } from './types'

import banner1 from '@/assets/banner/0001.webp'
import banner2 from '@/assets/banner/0002.webp'
import banner3 from '@/assets/banner/0003.webp'
import banner4 from '@/assets/banner/0004.webp'
import banner5 from '@/assets/banner/0005.webp'
import banner6 from '@/assets/banner/0006.webp'
import banner7 from '@/assets/banner/0007.webp'
import banner8 from '@/assets/banner/0008.webp'
import banner9 from '@/assets/banner/0009.webp'
import banner10 from '@/assets/banner/0010.webp'

export const standardBannerData: StandardBannerData = {}

export const videoConfig: VideoBannerConfig = {
  autoplay: true,
  muted: true,
  loop: true,
  playsInline: true,
  controls: false,
  preload: 'none',
}

export const bannerList: BannerItem[] = [
  {
    type: 'image',
    src: banner1,
    alt: 'Ainekio overlooking a ruined neon megacity',
  } as ImageBannerItem,
  {
    type: 'image',
    src: banner2,
    alt: 'Ainekio atop a fallen machine in a storm-blasted scrapyard',
  } as ImageBannerItem,
  {
    type: 'image',
    src: banner3,
    alt: 'Ainekio inside a derelict starship reactor chamber',
  } as ImageBannerItem,
  {
    type: 'image',
    src: banner4,
    alt: 'Ainekio inside an excessive missile-silo safety facility',
  } as ImageBannerItem,
  {
    type: 'image',
    src: banner5,
    alt: 'Ainekio crossing a cyberpunk server canyon beside a USB cable',
  } as ImageBannerItem,
  {
    type: 'image',
    src: banner6,
    alt: 'Ainekio facing an alien monolith beneath a cosmic eye',
  } as ImageBannerItem,
  {
    type: 'image',
    src: banner7,
    alt: 'Ainekio addressing a ruined opera house full of speakers',
  } as ImageBannerItem,
  {
    type: 'image',
    src: banner8,
    alt: 'Ainekio beneath a five-node supercomputer constellation',
  } as ImageBannerItem,
  {
    type: 'image',
    src: banner9,
    alt: 'Ainekio crossing a salt flat toward a tiny red ball',
  } as ImageBannerItem,
  {
    type: 'image',
    src: banner10,
    alt: 'Ainekio on a mountain of unfinished verification tools',
  } as ImageBannerItem,
]

export const bannerLinks: (string | null)[] = bannerList.map(() => null)

export const defaultBanner: BannerItem = bannerList[0]

export const linkPreviewData: Record<string, LinkPreviewInfo> = {}

export const animationConfig: BannerAnimationConfig = {
  enabled: true,
  interval: 5000,
  transitionDuration: 1000,
  direction: 'alternate',
  randomStart: true,
  pauseOnHover: true,
  pauseOnMobileTouch: true,
  resumeAfterNavigation: true,
  smoothTransitions: true,
  motion: {
    enabled: true,
    mode: 'alternate',
    duration: 6000,
    scale: 1.03,
    panDistance: 1.5,
    easing: 'linear',
    alternate: true,
  },
}

export const iconSVGs: Record<string, string> = {
  'arrow-up-right-from-square':
    '<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>',
}

export function getBannerAnimationSettings(): BannerAnimationConfig {
  return {
    enabled: animationConfig.enabled,
    interval: animationConfig.interval,
    transitionDuration: animationConfig.transitionDuration,
    direction: animationConfig.direction,
    randomStart: animationConfig.randomStart,
    pauseOnHover: animationConfig.pauseOnHover,
    pauseOnMobileTouch: animationConfig.pauseOnMobileTouch,
    resumeAfterNavigation: animationConfig.resumeAfterNavigation,
    smoothTransitions: animationConfig.smoothTransitions,
    motion: animationConfig.motion,
  }
}

export function getVideoConfig(): VideoBannerConfig {
  return videoConfig
}

export function getBannerLink(index: number): string | null {
  if (index < 0 || index >= bannerLinks.length) return null
  const link = bannerLinks[index]
  return link && link.trim() !== '' ? link : null
}

export function hasAnyBannerLinks(): boolean {
  return bannerLinks.some(link => link && link.trim() !== '')
}

export function getLinkPreviewData(url: string): LinkPreviewInfo {
  return (
    linkPreviewData[url] || {
      title: 'Explore More',
      description: 'Click to visit this page',
      icon: 'arrow-up-right-from-square',
    }
  )
}

export function getIconSVG(iconName: string): string {
  return iconSVGs[iconName] || iconSVGs['arrow-up-right-from-square']
}

export function getBannerItem(index: number): BannerItem | null {
  if (index < 0 || index >= bannerList.length) return null
  return bannerList[index]
}

export function getBannerCount(): number {
  return bannerList.length
}

export function validateStandardBannerConfig(): {
  isValid: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  if (bannerList.length !== bannerLinks.length) {
    warnings.push(
      `Banner list length (${bannerList.length}) does not match banner links length (${bannerLinks.length}).`,
    )
  }

  const itemsWithoutAlt = bannerList.filter(
    item => !item.alt || item.alt.trim() === '',
  )
  if (itemsWithoutAlt.length > 0) {
    warnings.push(
      `${itemsWithoutAlt.length} banner items are missing alt text for accessibility.`,
    )
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  }
}

export function getBannerItemPreviewDetails(
  index: number,
): BannerItemPreviewDetails | null {
  if (index < 0 || index >= bannerList.length) return null

  const item = bannerList[index]
  const linkUrl = bannerLinks[index]

  const hasValidLink = !!(linkUrl && linkUrl.trim() !== '' && linkUrl !== '#')
  const previewData = hasValidLink
    ? getLinkPreviewData(linkUrl as string)
    : {
        title: item.alt || `Banner Item ${index + 1}`,
        description: 'This image banner provides visual context.',
        icon: 'arrow-up-right-from-square',
      }

  let urlForDisplay = ''
  if (hasValidLink) {
    const base =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost'
    try {
      urlForDisplay = new URL(linkUrl as string, base).pathname
    } catch {
      urlForDisplay = ''
    }
  }

  return {
    hasValidLink,
    originalHref: hasValidLink ? (linkUrl as string) : '',
    urlForDisplay,
    previewTitle: previewData.title,
    previewDescription: previewData.description,
    previewIconSVG: getIconSVG(previewData.icon),
    isVideoButton: isVideoBannerItem(item),
  }
}

export const standardBannerConfig = {
  data: standardBannerData,
  bannerList,
  bannerLinks,
  defaultBanner,
  linkPreviewData,
  animation: animationConfig,
  video: videoConfig,
  iconSVGs,
  getBannerAnimationSettings,
  getVideoConfig,
  getBannerLink,
  hasAnyBannerLinks,
  getLinkPreviewData,
  getIconSVG,
  getBannerItemPreviewDetails,
  getBannerItem,
  getBannerCount,
  validateStandardBannerConfig,
  isVideoBannerItem,
  isImageBannerItem,
}
