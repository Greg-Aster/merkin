/**
 * ===================================================================
 * STANDARD BANNER CONFIGURATION - MIXED VIDEO AND IMAGE SUPPORT
 * ===================================================================
 *
 * This file manages the standard banner system that cycles through
 * mixed video and image content with smooth transitions. Videos are
 * auto-played once and cycling continues on timer-based intervals.
 *
 * FEATURES:
 * - Mixed video (.webm) and image content support
 * - Auto-play videos with image fallbacks for unsupported browsers
 * - Timer-based cycling (doesn't wait for video completion)
 * - Configurable video playback settings
 * - Clickable banner items with optional links
 * - Enhanced link previews with icons and descriptions (UPDATED)
 * - Smooth transitions between mixed content
 *
 * VIDEO SETUP:
 * 1. Place video files in /public/videos/ directory
 * 2. Use .webm format with VP9 codec for best compatibility
 * 3. Provide fallback images for each video
 * 4. Videos will auto-play muted for web compatibility
 *
 * USAGE:
 * - Import standardBannerConfig for complete configuration
 * - Use getBannerAnimationSettings() for animation control
 * - Use getBannerLink() to check if banner items are clickable
 * - Use isVideoBannerItem() / isImageBannerItem() for type checking
 *
 * RECENT UPDATES:
 * - Enhanced link preview descriptions for better PostCard-style display
 * - Richer, more engaging preview text that works with PostCard layout
 * - Improved accessibility and user engagement
 * ===================================================================
 */

import type {
  BannerAnimationConfig,
  BannerItem,
  BannerItemPreviewDetails, // Added import
  LinkPreviewInfo,
  StandardBannerData,
  VideoBannerConfig,
} from './types'

import { SERIES_CONFIG } from '@/config/seriesConfig'
import gameStarsManifest from '../../../../../packages/shared-data/generated/game-stars.json'
import postsManifest from '../../../../../packages/shared-data/generated/posts.json'
import timelineManifest from '../../../../../packages/shared-data/generated/timeline.json'
// Import type guards
import { isImageBannerItem, isVideoBannerItem } from './types'

// =====================================================================
// BANNER IMAGE IMPORTS (for images and video fallbacks)
// =====================================================================

import banner3Fallback from '@/assets/banner/cookbook.png'
//import banner1 from '@/assets/banner/main-title.png'
import banner1Fallback from '@/assets/banner/main-title.png' // Fallback for your video
import starObservatoryFallback from '@/assets/banner/game.webp'
import storefrontBanner from '@/assets/banner/store-page.webp'
import storyModeBanner from '@/assets/site/posts/building.png'
import archiveDispatchesBanner from '@/assets/site/posts/timeline/archive.png'
import communityChannelsBanner from '@/assets/site/posts/timeline/golden-era.png'
import timelineMapFallback from '@/assets/site/posts/timeline/universe.png'

type BannerEntry = {
  item: BannerItem
  link: string | null
  enabled?: boolean
}

type BannerMotionConfig = {
  enabled: boolean
  effect?: string
  duration?: number
  scale?: number
  panDistance?: number
  alternate?: boolean
  easing?: string
}

const publishedPosts = postsManifest.items.filter(post => !post.draft)
const publishedTimelineItems = timelineManifest.items.filter(
  event => !event.isDraft,
)
const publishedGameStars = gameStarsManifest.items.filter(
  event => !event.isDraft,
)
const activeArcIds = new Set(
  publishedPosts
    .map(post => post.series)
    .filter(
      (seriesId): seriesId is keyof typeof SERIES_CONFIG =>
        typeof seriesId === 'string' && seriesId in SERIES_CONFIG,
    ),
)

const publishedDispatchCount = publishedPosts.length
const publishedTimelineCount = publishedTimelineItems.length
const publishedGameStarsCount = publishedGameStars.length
const activeArcCount = activeArcIds.size

// =====================================================================
// STANDARD BANNER DATA CONFIGURATION
// =====================================================================

export const standardBannerData: StandardBannerData = {
  // Standard banner uses the bannerList array below - no additional config needed
}

// =====================================================================
// VIDEO CONFIGURATION
// =====================================================================

/**
 * Video playback configuration
 * Controls how videos behave in the banner
 */
export const videoConfig: VideoBannerConfig = {
  autoplay: true,
  muted: true,
  loop: true,
  playsInline: true,
  controls: false,
  preload: 'none', // CHANGED: Don't preload videos until needed
}

// =====================================================================
// MIXED BANNER CONTENT CONFIGURATION
// =====================================================================

/**
 * List of mixed banner content (videos and images)
 * Videos should be placed in /public/videos/ directory
 *
 * SETUP STEPS:
 * 1. Create /public/videos/ directory in your project root
 * 2. Add your .webm video files there
 * 3. Reference them with paths like '/videos/filename.webm'
 * 4. Provide fallback images for each video
 * 5. Set playbackRate on a video item when a clip should play slower or faster
 *
 * MAINTENANCE:
 * - Add new videos to /public/videos/
 * - Import fallback images above
 * - Add items to bannerEntries in desired order
 * - Keep the slide and link together in the same entry
 * - Set enabled: false to temporarily hide a slide without desyncing info cards
 * - Use playbackRate: 0.66 for slower banner playback on low-frame-count clips
 */
const bannerEntries: BannerEntry[] = [
  // HTML intro slide — universe entry point (rendered via banner-slide-content slot)
  {
    item: {
      type: 'html',
      sceneId: 'home-intro',
      alt: 'MEGA MEAL SAGA — Universe Introduction',
      src: '',
      holdMs: 12000,
      showPreviewCard: false,
    },
    link: null,
  },
  // Video item - uses your ComfyUI video
  /*   {
    type: 'image',
    src: banner1,
    alt: 'Banner image 4'
  }, */
  {
    enabled: false,
    item: {
      type: 'video',
      src: `${import.meta.env.BASE_URL}videos/titleb.webm`,
      fallbackImage: banner1Fallback, // Fallback image for unsupported browsers
      alt: 'Animated title',
      preload: 'none', // Don't preload video until needed
      // playbackRate: 0.66,
    },
    link: '/videos/mega-meal-explained/',
  },
  {
    item: {
      type: 'video',
      sceneId: 'timeline-billboard',
      weight: 2,
      src: `${import.meta.env.BASE_URL}assets/banner/universbg0001-0121.webm`,
      fallbackImage: timelineMapFallback,
      alt: 'Timeline map and chronology overview',
      preload: 'none', // Don't preload video until needed
      playbackRate: 0.1, // Slow down this clip to make it more readable as a banner
    },
    link: '/timeline/',
  },
  {
    item: {
      type: 'video',
      sceneId: 'cookbook-billboard',
      weight: 1,
      src: `${import.meta.env.BASE_URL}assets/banner/cookbook-glitch0001-0049.webm`,
      fallbackImage: banner3Fallback, // Fallback image for unsupported browsers
      alt: 'MegaMeal Cookbook',
      preload: 'none', // Don't preload video until needed
      playbackRate: 0.25, // Slow down this clip to make it more readable as a banner
    },
    link: '/cookbook/',
  },
  {
    item: {
      type: 'video',
      sceneId: 'archive-billboard',
      weight: 2,
      src: `${import.meta.env.BASE_URL}assets/banner/archive_2.webm`,
      fallbackImage: archiveDispatchesBanner,
      alt: 'Archive of dispatches and restricted records',
      preload: 'none',
      playbackRate: 0.33, // Slow down this clip to make it more readable as a banner
    },
    link: '/archive/',
  },
  {
    item: {
      type: 'video',
      sceneId: 'game-billboard',
      weight: 2,
      src: `${import.meta.env.BASE_URL}videos/starmap.webm`,
      fallbackImage: starObservatoryFallback,
      alt: 'Enter the Star Observatory',
      preload: 'none',
    },
    link: '/game/',
  },
  {
    item: {
      type: 'video',
      sceneId: 'store-billboard',
      weight: 3,
      src: `${import.meta.env.BASE_URL}assets/banner/store_glitch.webm`,
      fallbackImage: storefrontBanner,
      alt: 'Browse the storefront and corporate artifacts',
      playbackRate: 0.33, // Slow down this clip to make it more readable as a banner
    },
    link: '/store/',
  },
  {
    item: {
      type: 'video',
      sceneId: 'community-billboard',
      weight: 1,
      src: `${import.meta.env.BASE_URL}assets/banner/golden-era.webm`,
      fallbackImage: communityChannelsBanner,
      alt: 'Join the community channels',
    },
    link: '/community/',
  },
  {
    item: {
      type: 'video',
      sceneId: 'story-mode-billboard',
      weight: 1,
      src: `${import.meta.env.BASE_URL}assets/banner/golden-era.webm`,
      fallbackImage: storyModeBanner, // Fallback for image items can just be the same image
      alt: 'Read the story mode dispatches',
    },
    link: '/posts/introducing-story-mode/',
  },
]

const activeBannerEntries = bannerEntries.filter(
  entry => entry.enabled !== false,
)

export const bannerList: BannerItem[] = activeBannerEntries.map(
  entry => entry.item,
)

/* IMPORTANT: This array is derived from bannerEntries so it stays aligned with bannerList.
 */
export const bannerLinks: (string | null)[] = activeBannerEntries.map(
  entry => entry.link,
)

/**
 * Default banner item (used for static banner or as first animation frame)
 */
export const defaultBanner: BannerItem = bannerList[0]

// =====================================================================
// LINK PREVIEW DATA CONFIGURATION - UPDATED FOR POSTCARD INTEGRATION
// =====================================================================

/**
 * Enhanced link preview data for PostCard-style display
 *
 * UPDATED SECTION: These descriptions are now richer and more engaging
 * to work better with the PostCard layout structure. Each description
 * provides more context and value to users when they hover or tap on
 * banner items.
 *
 * STRUCTURE:
 * - title: Clear, descriptive page title (used in PostCard-style header)
 * - description: Detailed, engaging description (used in PostCard-style content)
 * - icon: Font Awesome icon name for consistent iconography
 */
export const linkPreviewData: Record<string, LinkPreviewInfo> = {
  '': {
    title: 'Thank you for your interest in MEGAMEAL',
    description:
      'We appreciate your support and interest in the MEGAMEAL universe.',
    icon: 'book-open',
  },
  '/posts/explainer/': {
    title: 'Introduction to MEGAMEAL Saga',
    description:
      'Explore the hyper-capitalist dystopian future of MEGAMEAL, a science fiction food parody series where cosmic horror and culinary culture collide across multiple media formats and timelines.',
    icon: 'book-open',
  },
  '/timeline/': {
    title: 'The Timeline',
    description:
      'Browse the approved sequence of disasters. Every era is labeled for your comfort, and none of the labels imply liability.',
    icon: 'timeline',
    kicker: 'Chronology Console',
    stat: `${publishedTimelineCount} live timeline entries`,
    ctaLabel: 'Enter Timeline',
  },
  '/videos/mega-meal-explained/': {
    title: 'Welcome to MEGAMEAL',
    description:
      'Start with the core premise of the project, the setting, and the tone before moving into the deeper branches of the universe.',
    icon: 'book-open',
  },
  '/cookbook/': {
    title: 'The Cookbook',
    description:
      'Recipes from a future where dinner has a brand strategy, a waiver, and a suspiciously well-funded legal department.',
    icon: 'user-group',
    kicker: 'Culinary Compliance',
    stat: 'Flavor optimism mandatory',
    ctaLabel: 'View Recipes',
  },
  '/posts/timeline/': {
    title: 'Timeline Map',
    description:
      'Open the chronology interface and track eras, incidents, recipes, wars, and corporate expansions across the wider universe.',
    icon: 'newspaper',
  },
  '/archive/': {
    title: 'The Archive',
    description:
      'Incident reports, story arcs, and documents that were absolutely not shredded, denied, re-shredded, and then lovingly restored.',
    icon: 'newspaper',
    kicker: 'Recovered Materials',
    stat: `${activeArcCount} sanitized arcs`,
    ctaLabel: 'Open Archive',
  },
  '/game/': {
    title: 'Game Mode',
    description:
      'Navigate the cosmic menu board yourself. Management reminds you that falling through spacetime is not covered by the meal plan.',
    icon: 'rocket',
    kicker: 'Star Observatory',
    stat: `${publishedGameStarsCount} player agency nodes`,
    ctaLabel: 'Enter Game',
  },
  '/store/': {
    title: 'The Store',
    description:
      'Acquire artifacts from the economy that made everything worse, now available in convenient collectible formats.',
    icon: 'briefcase',
    kicker: 'Retail Afterlife',
    stat: 'Consumption encouraged',
    ctaLabel: 'Browse Goods',
  },
  '/community/': {
    title: 'Community',
    description:
      'A future community hub for channels, theory sharing, and anomaly reports. The desk is staffed by placeholders for now.',
    icon: 'user-group',
    kicker: 'Public Relations',
    stat: 'Community desk in progress',
    ctaLabel: 'Preview Desk',
  },
  '/posts/introducing-story-mode/': {
    title: 'Story Mode',
    description:
      'A planned guided path through the saga. Narrative rails are visible, but the full route is still being assembled.',
    icon: 'newspaper',
    kicker: 'Guided Consumption',
    stat: 'Story route under construction',
    ctaLabel: 'View Preview',
  },
  /*
  '/contact': {
    title: 'Get In Touch',
    description: 'Have questions or want to collaborate? We\'d love to hear from you.',
    icon: 'envelope'
  },
  '/blog': {
    title: 'Blog Posts',
    description: 'Latest news, updates, and insights from our team and community.',
    icon: 'newspaper'
  },
  '/portfolio': {
    title: 'Portfolio',
    description: 'A comprehensive showcase of our work, achievements, and case studies.',
    icon: 'briefcase'
  } */
}

// =====================================================================
// ANIMATION CONFIGURATION
// =====================================================================

/**
 * Animation settings for mixed content banner cycling
 * Videos will auto-play once but cycling continues on timer
 */
export const animationConfig: BannerAnimationConfig & {
  motion?: BannerMotionConfig
} = {
  enabled: true,
  interval: 12000, // Longer hold so the banner reads as navigation, not ambient decoration
  transitionDuration: 2400, // Slower, more deliberate slide transition
  direction: 'forward',
  randomStart: false,
  rotationMode: 'shuffle',
  preserveFirstSlide: true,

  // Navigation-specific animation settings
  pauseOnHover: true,
  pauseOnMobileTouch: true,
  resumeAfterNavigation: true,
  smoothTransitions: true,

  // Ken Burns motion — slow pan/zoom applied to video and image slides while displaying
  // Does NOT affect the html intro slide (only applies to .banner-image/.banner-video elements)
  motion: {
    enabled: true,
    effect: 'auto', // cycles through zoom-in, zoom-out, pan-left, pan-right, etc.
    duration: 11000, // motion lasts nearly the entire visible window
    scale: 1.1,
    panDistance: 6,
    alternate: true, // alternate direction each slide
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
}

// =====================================================================
// ICON SVG DEFINITIONS
// =====================================================================

export const iconSVGs: Record<string, string> = {
  'book-open':
    '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  'user-group':
    '<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>',
  rocket:
    '<path d="M9.5 3A6.5 6.5 0 0116 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5-1.5 1.5-5-5v-.79l-.27-.27A6.516 6.516 0 019.5 16 6.5 6.5 0 013 9.5 6.5 6.5 0 019.5 3z"/>',
  envelope:
    '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  newspaper: '<path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>',
  briefcase:
    '<path d="M16 20H8a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2z"/><path d="M12 6V4a2 2 0 00-2-2h-2a2 2 0 00-2 2v2"/>',
  'arrow-up-right-from-square':
    '<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>',
}

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

/**
 * Get animation settings for banner cycling
 */
export function getBannerAnimationSettings(): BannerAnimationConfig & {
  motion?: BannerMotionConfig
} {
  return {
    enabled: animationConfig.enabled,
    interval: animationConfig.interval,
    transitionDuration: animationConfig.transitionDuration,
    direction: animationConfig.direction,
    pauseOnHover: animationConfig.pauseOnHover,
    pauseOnMobileTouch: animationConfig.pauseOnMobileTouch,
    resumeAfterNavigation: animationConfig.resumeAfterNavigation,
    smoothTransitions: animationConfig.smoothTransitions,
    // Pass motion config so blog-core's Ken Burns system activates for video/image slides
    motion: animationConfig.motion,
  }
}

/**
 * Get video configuration settings
 */
export function getVideoConfig(): VideoBannerConfig {
  return videoConfig
}

/**
 * Get banner link for a specific item index
 */
export function getBannerLink(index: number): string | null {
  if (index < 0 || index >= bannerLinks.length) {
    return null
  }

  const link = bannerLinks[index]
  return link && link.trim() !== '' ? link : null
}

/**
 * Check if banner items have any clickable links
 */
export function hasAnyBannerLinks(): boolean {
  return bannerLinks.some(link => link && link.trim() !== '')
}

/**
 * Get link preview data for a URL
 */
export function getLinkPreviewData(url: string): LinkPreviewInfo {
  return (
    linkPreviewData[url] || {
      title: 'Explore More',
      description: 'Click to visit this page',
      icon: 'arrow-up-right-from-square',
    }
  )
}

/**
 * Get icon SVG for link previews
 */
export function getIconSVG(iconName: string): string {
  return iconSVGs[iconName] || iconSVGs['arrow-up-right-from-square']
}

/**
 * Get banner item by index with type safety
 */
export function getBannerItem(index: number): BannerItem | null {
  if (index < 0 || index >= bannerList.length) {
    return null
  }
  return bannerList[index]
}

/**
 * Get total number of banner items
 */
export function getBannerCount(): number {
  return bannerList.length
}

/**
 * Validate mixed banner configuration
 */
export function validateStandardBannerConfig(): {
  isValid: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  // Check if bannerList and bannerLinks have the same length
  if (bannerList.length !== bannerLinks.length) {
    warnings.push(
      `Banner list length (${bannerList.length}) does not match banner links length (${bannerLinks.length}).`,
    )
  }

  // Check for missing alt text
  const itemsWithoutAlt = bannerList.filter(
    item => !item.alt || item.alt.trim() === '',
  )
  if (itemsWithoutAlt.length > 0) {
    warnings.push(
      `${itemsWithoutAlt.length} banner items are missing alt text for accessibility.`,
    )
  }

  // Check for missing link preview data
  const linksWithoutPreviews = bannerLinks
    .filter(link => link && link.trim() !== '')
    .filter(link => !linkPreviewData[link as string])

  if (linksWithoutPreviews.length > 0) {
    warnings.push(
      `Missing link preview data for: ${linksWithoutPreviews.join(', ')}.`,
    )
  }

  // Check video file paths
  const videoItems = bannerList.filter(isVideoBannerItem)
  const invalidVideoPaths = videoItems.filter(
    item => !item.src.startsWith('/videos/'),
  )

  if (invalidVideoPaths.length > 0) {
    warnings.push(
      `Video items should use /videos/ path. Found: ${invalidVideoPaths.map(item => item.src).join(', ')}`,
    )
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  }
}

/**
 * Gathers all necessary details for rendering a banner item's preview card.
 * This function is intended to be the single source of truth for preview data.
 */
export function getBannerItemPreviewDetails(
  index: number,
): BannerItemPreviewDetails | null {
  if (index < 0 || index >= bannerList.length) {
    console.warn(`getBannerItemPreviewDetails: Index ${index} out of bounds.`)
    return null
  }

  const item = bannerList[index]
  const linkUrl = bannerLinks[index] // Raw link string or null

  let originalHref = ''
  let urlForDisplay = ''
  let hasValidLink = false
  let actualPreviewData: LinkPreviewInfo

  const defaultItemTitle = item.alt || `Banner Item ${index + 1}`
  const defaultItemDescription = isVideoBannerItem(item)
    ? 'This video banner showcases dynamic content.'
    : 'This image banner provides visual context.'
  const defaultItemIcon = isVideoBannerItem(item) ? 'film' : 'image'

  if (linkUrl && linkUrl.trim() !== '' && linkUrl !== '#') {
    try {
      // Attempt to parse the URL. For server-side or context-agnostic use, provide a base.
      // In a browser context, window.location.origin would be ideal if available.
      // For now, using a placeholder base, assuming relative paths are common.
      const base =
        typeof window !== 'undefined'
          ? window.location.origin
          : 'http://localhost'
      const testUrl = new URL(linkUrl, base)

      originalHref = linkUrl // Use the raw link for the href attribute
      urlForDisplay = testUrl.pathname // Use pathname for display
      hasValidLink = true
      // Fetch specific preview data if available, otherwise use a generic one for valid links
      actualPreviewData = linkPreviewData[originalHref] || {
        title: defaultItemTitle, // Fallback to item alt text or generic title
        description: 'Follow this link to learn more.',
        icon: 'arrow-up-right-from-square',
      }
    } catch (error) {
      console.warn(
        `Invalid URL in standard.ts for banner item ${index}: "${linkUrl}". Error: ${error}`,
      )
      // Link is invalid, treat as if no link
      hasValidLink = false
      actualPreviewData = {
        title: defaultItemTitle,
        description: defaultItemDescription,
        icon: defaultItemIcon,
      }
    }
  } else {
    // No link or a placeholder link like '#'
    hasValidLink = false
    actualPreviewData = {
      title: defaultItemTitle,
      description: defaultItemDescription,
      icon: defaultItemIcon,
    }
  }

  const previewIconSVG =
    iconSVGs[actualPreviewData.icon] || iconSVGs['arrow-up-right-from-square'] // Default icon SVG

  return {
    hasValidLink,
    originalHref, // This will be empty if no valid link
    urlForDisplay, // This will be empty if no valid link
    previewTitle: actualPreviewData.title,
    previewDescription: actualPreviewData.description,
    previewKicker: actualPreviewData.kicker,
    previewStat: actualPreviewData.stat,
    previewCtaLabel: actualPreviewData.ctaLabel,
    previewIconSVG,
    isVideoButton: isVideoBannerItem(item), // Renamed from isVideo for clarity in BannerItemPreviewDetails
  }
}

// =====================================================================
// EXPORT CONFIGURATION OBJECT
// =====================================================================

export const standardBannerConfig = {
  data: standardBannerData,
  bannerList,
  bannerLinks,
  defaultBanner,
  linkPreviewData,
  animation: animationConfig,
  video: videoConfig,
  iconSVGs,

  // Helper functions
  getBannerAnimationSettings,
  getVideoConfig,
  getBannerLink, // Retain for now if used elsewhere, but preview details should come from the new function
  hasAnyBannerLinks, // Retain for now
  getLinkPreviewData, // Retain for now
  getIconSVG, // Retain for now
  getBannerItemPreviewDetails, // Export the new function
  getBannerItem,
  getBannerCount,
  validateStandardBannerConfig,

  // Type guards for convenience
  isVideoBannerItem,
  isImageBannerItem,
}
