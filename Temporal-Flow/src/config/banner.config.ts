// Import type - use import type syntax to fix verbatimModuleSyntax error
import type { ImageMetadata } from 'astro'

// Import banner images
// These paths should match your actual banner image locations
import banner1 from 'src/assets/banner/0001.png'
import banner2 from 'src/assets/banner/0002.png'
import banner3 from 'src/assets/banner/0003.png'
import banner4 from 'src/assets/banner/0004.png'
import banner5 from 'src/assets/banner/0005.png'
import banner6 from 'src/assets/banner/0006.png'
import banner7 from 'src/assets/banner/0007.png'
import banner8 from 'src/assets/banner/0008.png'

// Banner type definitions
export type BannerType = 'standard' | 'video' | 'image' | 'timeline';

// Banner data type for each banner type
export interface StandardBannerData {
  // No additional data needed for standard banner
}

export interface VideoBannerData {
  videoId: string;
}

export interface ImageBannerData {
  imageUrl: string;
}

export interface TimelineBannerData {
  category: string;
  title?: string;
  startYear?: number;
  endYear?: number;
  background?: string;
  compact?: boolean;
  height?: string;
}

// Define the banner configuration type
export interface BannerConfig {
  // Default banner type for main pages
  defaultBannerType: BannerType;
  
  // Default banner data (differs based on banner type)
  defaultBannerData: StandardBannerData | VideoBannerData | ImageBannerData | TimelineBannerData;
  
  // List of banner images for animation (used for standard banner type)
  bannerList: ImageMetadata[]
  
  // Default banner for static usage (used for standard banner type)
  defaultBanner: ImageMetadata
  
  // Animation settings (used for standard banner type)
  animation: {
    enabled: boolean
    interval: number            // Milliseconds between transitions
    transitionDuration: number  // Milliseconds for fade transition
    direction: 'forward' | 'reverse' | 'alternate'
  }
  
  // Layout settings
  layout: {
    height: {
      desktop: string          // CSS value (e.g., '50vh')
      mobile: string           // CSS value (e.g., '30vh')
    }
    overlap: {
      desktop: string          // CSS value (e.g., '3.5rem')
      mobile: string           // CSS value (e.g., '2rem')
    }
    maxWidth: number           // Maximum width in pixels
  }
  
  // Visual settings
  visual: {
    objectFit: 'cover' | 'contain' | 'fill'
    objectPosition: string     // CSS position value
    applyGradientOverlay: boolean
    gradientOverlay: string    // CSS gradient value
    borderRadius: string       // CSS border-radius value
  }
  
  // Fallback settings (used if images fail to load)
  fallback: {
    enabled: boolean
    type: 'color' | 'gradient'
    value: string              // CSS color or gradient
  }
  
  // Navbar spacing settings
  navbarSpacing: {
    standard: string         // For standard animated banner
    timeline: string         // For timeline banner
    video: string            // For video banner
    image: string            // For image banner
  }

  // Navbar height settings (previously hardcoded in MainGridLayout.astro)
  navbar: {
    height: {
      desktop: string        // CSS value (e.g., '4.5rem')
      mobile: string         // CSS value (e.g., '3.5rem')
    }
  }

  // Panel positioning (previously calculated in MainGridLayout.astro)
  panel: {
    top: {
      video: string          // CSS value for video banner type
      image: string          // CSS value for image banner type
      timeline: string       // CSS value for timeline banner type
      standard: string       // CSS value for standard banner type
    }
  }

  // Parallax effect settings
  parallax: {
    enabled: boolean
    scrollFactor: number     // How much the parallax moves (e.g., -0.05)
    easingFactor: number     // Smooth motion factor (e.g., 0.1)
  }
}

/**
 * Banner configuration for the site
 * Controls which images are used for the animated banner
 */
export const bannerConfig: BannerConfig = {
  // Default banner type for main pages
  defaultBannerType: 'standard', // 'standard' | 'video' | 'image' | 'timeline'
  
  // Default banner data for timeline
  defaultBannerData: {
    category: "history", // This is required for timeline banner
    title: "Site Timeline", // Optional but recommended
    startYear: 2000, // Optional 
    endYear: 2025, // Optional
    background: "/public/posts/timeline/universe.png", // Optional
    compact: false, // Optional
    height: "90vh" // Optional
  },
  
  // List of all banner images for animation
  bannerList: [
    banner1,
    banner2,
    banner3,
    banner4,
    banner5,
    banner6,
    banner7,
    banner8
  ],
  
  // Default banner image (used for static banner or as first animation frame)
  defaultBanner: banner1,
  
  // Animation settings
  animation: {
    enabled: true,
    interval: 5000,            // 5 seconds between transitions
    transitionDuration: 1000,  // 1 second fade transition
    direction: 'alternate'     // Bounce back and forth through the images
  },
  
  // Layout settings
  layout: {
    height: {
      desktop: '60vh',         // 100% of viewport height on desktop
      mobile: '50vh'           // 100% of viewport height on mobile
    },
    overlap: {
      desktop: '3rem',          // Content overlap on desktop
      mobile: '2rem'            // Content overlap on mobile
    },
    maxWidth: 1920              // Max banner width in pixels
  },
  
  // Visual settings
  visual: {
    objectFit: 'cover',
    objectPosition: 'center',
    applyGradientOverlay: false,
    gradientOverlay: 'linear-gradient(to bottom, rgba(0,0,0,0.2), transparent)',
    borderRadius: '0'
  },
  
  // Fallback settings
  fallback: {
    enabled: true,
    type: 'gradient',
    value: 'linear-gradient(to bottom, var(--color-primary-light), var(--color-primary))'
  },
  
  // Navbar spacing settings
  navbarSpacing: {
    standard: "0",
    timeline: "5.5rem",       // Adjust to exact navbar height
    video: "5.5rem",
    image: "0"                // Set to 0 for navbar overlap
  },

  // Navbar height settings (moved from MainGridLayout.astro)
  navbar: {
    height: {
      desktop: '4.5rem',      // 72px at 16px base font size
      mobile: '3.5rem'        // 56px at 16px base font size
    }
  },

  // Panel positioning (moved from MainGridLayout calculations)
  panel: {
    top: {
      video: "0",             // For video banner: no overlap needed
      image: "calc(var(--navbar-height) + 1rem)", // For image banner: navbar + spacing
      timeline: "0",          // For timeline banner
      standard: "calc(var(--banner-height) - var(--banner-overlap))" // For standard banner
    }
  },

  // Parallax effect settings
  parallax: {
    enabled: true,
    scrollFactor: -0.02,      // How much the background moves (-0.05 = 5% opposite of scroll)
    easingFactor: 0.1         // Smooth motion factor (0.1 = 10% of the gap each frame)
    }
}

/**
 * Get appropriate banner dimensions based on screen size
 * @returns Object with height and overlap values
 */
export function getResponsiveBannerDimensions(isMobile: boolean = false): {
  height: string;
  overlap: string;
} {
  return {
    height: isMobile ? bannerConfig.layout.height.mobile : bannerConfig.layout.height.desktop,
    overlap: isMobile ? bannerConfig.layout.overlap.mobile : bannerConfig.layout.overlap.desktop
  };
}

/**
 * Get CSS for fallback banner
 * @returns CSS string for background
 */
export function getFallbackBannerCSS(): string {
  if (!bannerConfig.fallback.enabled) return '';
  
  return bannerConfig.fallback.type === 'gradient' 
    ? bannerConfig.fallback.value
    : `${bannerConfig.fallback.value}`;
}

/**
 * Get animation settings for banner
 * @returns Object with animation settings
 */
export function getBannerAnimationSettings(): {
  enabled: boolean;
  interval: number;
  transitionDuration: number;
  direction: string;
} {
  return {
    enabled: bannerConfig.animation.enabled,
    interval: bannerConfig.animation.interval,
    transitionDuration: bannerConfig.animation.transitionDuration,
    direction: bannerConfig.animation.direction
  };
}

/**
 * Get panel top position based on banner type
 * @param bannerType The type of banner being used
 * @returns CSS value for top position
 */
export function getPanelTopPosition(bannerType: BannerType): string {
  switch(bannerType) {
    case 'video': return bannerConfig.panel.top.video;
    case 'image': return bannerConfig.panel.top.image;
    case 'timeline': return bannerConfig.panel.top.timeline;
    default: return bannerConfig.panel.top.standard;
  }
}

/**
 * Get navbar height based on screen size
 * @param isMobile Whether to get mobile height
 * @returns CSS value for navbar height
 */
export function getNavbarHeight(isMobile: boolean = false): string {
  return isMobile ? bannerConfig.navbar.height.mobile : bannerConfig.navbar.height.desktop;
}

/**
 * Helper function to determine if the default banner data is for a specific banner type
 */
export function isVideoBannerData(data: any): data is VideoBannerData {
  return data && 'videoId' in data && typeof data.videoId === 'string';
}

export function isImageBannerData(data: any): data is ImageBannerData {
  return data && 'imageUrl' in data && typeof data.imageUrl === 'string';
}

export function isTimelineBannerData(data: any): data is TimelineBannerData {
  return data && 'category' in data && typeof data.category === 'string';
}