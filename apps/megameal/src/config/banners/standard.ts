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

// Import type for Astro image metadata
import type { ImageMetadata } from 'astro'
import type {
  BannerAnimationConfig,
  BannerItem,
  BannerItemPreviewDetails, // Added import
  ImageBannerItem,
  LinkPreviewInfo,
  StandardBannerData,
  VideoBannerConfig,
  VideoBannerItem,
} from './types'

// Import type guards
import { isImageBannerItem, isVideoBannerItem } from './types'

// =====================================================================
// BANNER IMAGE IMPORTS (for images and video fallbacks)
// =====================================================================

import banner5 from '@/assets/banner/0005.png'
import banner6 from '@/assets/banner/0006.png'
import banner7 from '@/assets/banner/0007.png'
import banner8 from '@/assets/banner/0008.png'
import banner2Fallback from '@/assets/banner/3dtimeline.webp'
import banner3Fallback from '@/assets/banner/cookbook.png'
//import banner1 from '@/assets/banner/main-title.png'
import banner1Fallback from '@/assets/banner/main-title.png' // Fallback for your video
import banner4Fallback from '@/assets/banner/reviews.png'

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
 *
 * MAINTENANCE:
 * - Add new videos to /public/videos/
 * - Import fallback images above
 * - Add items to this array in desired order
 * - Ensure corresponding links are added to bannerLinks array
 */
export const bannerList: BannerItem[] = [
  // Video item - uses your ComfyUI video
  /*   {
    type: 'image',
    src: banner1,
    alt: 'Banner image 4'
  }, */
  {
    type: 'video',
    src: '/videos/titleb.webm', // Place this file in /public/videos/
    fallbackImage: banner1Fallback, // Fallback image for unsupported browsers
    alt: 'Animated title',
    preload: 'none', // Don't preload video until needed
  },
  {
    type: 'video',
    src: '/videos/deep-time3.webm', // Place this file in /public/videos/
    fallbackImage: banner2Fallback, // Fallback image for unsupported browsers
    alt: 'Animated banner',
    preload: 'none', // Don't preload video until needed
  },
  {
    type: 'video',
    src: '/videos/cookbook.webm', // Place this file in /public/videos/
    fallbackImage: banner3Fallback, // Fallback image for unsupported browsers
    alt: 'MegaMeal Cookbook',
    preload: 'none', // Don't preload video until needed
  },
  /*
  {
    type: 'video',
    src: '/videos/reviews.webm',  // Place this file in /public/videos/
    fallbackImage: banner4Fallback,      // Fallback image for unsupported browsers
    alt: 'Reviews and testimonials',
    preload: 'none'  // Don't preload video until needed
  }, */

  // Image items - existing images

  /*   {
    type: 'image',
    src: banner4,
    alt: 'Banner image 4'
  },
  {
    type: 'image',
    src: banner5,
    alt: 'Banner image 5'
  },
  {
    type: 'image',
    src: banner6,
    alt: 'Banner image 6'
  },
  {
    type: 'image',
    src: banner7,
    alt: 'Banner image 7'
  },
  {
    type: 'image',
    src: banner8,
    alt: 'Banner image 8' 
  } */

  // Example of adding more videos:
  // {
  //   type: 'video',
  //   src: '/videos/banner-animation-2.webm',
  //   fallbackImage: anotherFallbackImage,
  //   alt: 'Second animated banner',
  //   preload: 'none'  // Override default preload for this video
  // }
]

/* IMPORTANT: This array should have the same length as bannerList
 */
export const bannerLinks: (string | null)[] = [
  '', // no for video banner (ComfyUI_00010_.webm)
  '/posts/explainer/', // Link for video banner (ComfyUI_00010_.webm)
  '/posts/cookbook/cookbook-index/', // Link for video banner3 (cookbook.webm)
  '', // Link for banner4 (0003.png)
  null, // No link for banner4 (0004.png)
  '/contact', // Link for banner5 (0005.png)
  '/blog', // Link for banner6 (0006.png)
  '', // No link for banner7 (0007.png)
]

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
  '/cookbook/': {
    title: 'The Cookbook Project',
    description:
      'Discover our comprehensive cookbook featuring recipes, cooking techniques, and culinary tips inspired by the MEGAMEAL universe. Perfect for aspiring chefs and food enthusiasts.',
    icon: 'user-group',
  },
  '/reviews/': {
    title: 'Recipies, Reviews. and Testimonials - Under Construction',
    description:
      'Read reviews, testimonials, and user experiences with MEGAMEAL products and recipes. Join our community of food lovers and share your culinary journey.',
    icon: 'newspaper',
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
export const animationConfig: BannerAnimationConfig = {
  enabled: true, // Set to false to disable banner cycling
  interval: 4000, // 5 seconds between transitions (shorter for videos)
  transitionDuration: 1000, // 1 second fade transition
  direction: 'forward', // 'forward', 'reverse', or 'alternate'

  // NEW: Navigation-specific animation settings
  pauseOnHover: true, // Pause on desktop hover
  pauseOnMobileTouch: true, // Pause on mobile touch
  resumeAfterNavigation: true, // Auto-resume after manual navigation
  smoothTransitions: true, // Use smooth crossfade transitions
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
export function getBannerAnimationSettings(): BannerAnimationConfig {
  return {
    enabled: animationConfig.enabled,
    interval: animationConfig.interval,
    transitionDuration: animationConfig.transitionDuration,
    direction: animationConfig.direction,
    // Include all properties from the local animationConfig
    pauseOnHover: animationConfig.pauseOnHover,
    pauseOnMobileTouch: animationConfig.pauseOnMobileTouch,
    resumeAfterNavigation: animationConfig.resumeAfterNavigation,
    smoothTransitions: animationConfig.smoothTransitions,
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
        description: `Follow this link to learn more.`,
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
