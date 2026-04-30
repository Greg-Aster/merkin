function preserveConstants(configObj) {
  const config = JSON.parse(JSON.stringify(configObj))

  if (config.defaultTheme) {
    if (
      typeof config.defaultTheme === 'string' &&
      (config.defaultTheme === 'LIGHT_MODE' ||
        config.defaultTheme === 'DARK_MODE' ||
        config.defaultTheme === 'AUTO_MODE')
    ) {
      config.defaultTheme = `__CONSTANT_${config.defaultTheme.toLowerCase()}__`
    } else {
      const themeValue = config.defaultTheme
      config.defaultTheme = `__CONSTANT_${themeValue}__`
    }
  }

  return config
}

export function formatConfigObject(configName, configObj) {
  function formatWithPreservation(obj, indent = 2, level = 0) {
    const spaces = ' '.repeat(indent * level)
    const nextSpaces = ' '.repeat(indent * (level + 1))

    if (obj === null) return 'null'
    if (obj === undefined) return 'undefined'

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]'

      const items = obj.map(
        item =>
          `${nextSpaces}${formatWithPreservation(item, indent, level + 1)}`,
      )
      return `[\n${items.join(',\n')}\n${spaces}]`
    }

    if (typeof obj === 'object') {
      const keys = Object.keys(obj)
      if (keys.length === 0) return '{}'

      const items = keys.map(key => {
        const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`
        return `${nextSpaces}${keyStr}: ${formatWithPreservation(obj[key], indent, level + 1)}`
      })

      return `{\n${items.join(',\n')}\n${spaces}}`
    }

    if (typeof obj === 'string') {
      if (obj.startsWith('__CONSTANT_') && obj.endsWith('__')) {
        return obj.substring(11, obj.length - 2)
      }
      return `"${obj.replace(/"/g, '\\"')}"`
    }

    return String(obj)
  }

  if (configName === 'siteConfig') {
    const processedConfig = preserveConstants(configObj)

    return formatWithPreservation(processedConfig)
      .replace(/"__CONSTANT_light__"/g, 'LIGHT_MODE')
      .replace(/"__CONSTANT_dark__"/g, 'DARK_MODE')
      .replace(/"__CONSTANT_auto__"/g, 'AUTO_MODE')
  }

  if (configName === 'navBarConfig') {
    return formatWithPreservation(configObj).replace(
      /"LinkPreset\.([a-zA-Z]+)"/g,
      'LinkPreset.$1',
    )
  }

  return formatWithPreservation(configObj)
}

export async function updateMainConfigFile(githubService, changes) {
  const currentFile = await githubService.getFile('src/config/config.ts')
  if (!currentFile) {
    throw new Error('Could not retrieve the current config.ts file')
  }

  let fileContent = currentFile.content

  if (!fileContent.includes('import { AUTO_MODE, DARK_MODE, LIGHT_MODE }')) {
    fileContent = `import { AUTO_MODE, DARK_MODE, LIGHT_MODE } from '@constants/constants.ts'\n\n${fileContent}`
  }

  if (changes.some(c => c.name === 'navBarConfig')) {
    if (!fileContent.includes('import { LinkPreset }')) {
      if (fileContent.includes('import type {')) {
        fileContent = fileContent.replace(
          /import type {/,
          "import { LinkPreset } from '../types/config'\nimport type {",
        )
      } else {
        fileContent = `import { LinkPreset } from '../types/config'\n${fileContent}`
      }
    }
  }

  for (const config of changes) {
    const formattedConfig = formatConfigObject(config.name, config.obj)
    const regexPattern = new RegExp(
      `export const ${config.name}[\\s\\S]*?(?=\\n\\nexport const|$)`,
      'g',
    )

    if (regexPattern.test(fileContent)) {
      fileContent = fileContent.replace(
        regexPattern,
        `export const ${config.name}: ${config.typeName} = ${formattedConfig}`,
      )
    } else {
      fileContent += `\n\nexport const ${config.name}: ${config.typeName} = ${formattedConfig}`
    }
  }

  return githubService.commitFile(
    'src/config/config.ts',
    fileContent,
    `Update ${changes.map(c => c.name).join(', ')} in config.ts`,
  )
}

export async function updateStandaloneConfigFile(githubService, config) {
  let fileContent = ''

  if (config.name === 'timelineConfig') {
    fileContent = `// TimelineConfig.ts - Central configuration for all timeline services
import type { TimelineConfig } from '../types/timelineconfig'

export const timelineConfig: TimelineConfig = ${formatConfigObject(config.name, config.obj)}`
  } else if (config.name === 'avatarConfig') {
    fileContent = `// Import type - use import type syntax to fix verbatimModuleSyntax error
import type { ImageMetadata } from 'astro'

// Define the avatar configuration type
export interface AvatarConfig {
avatarList: string[]
homeAvatar: string
animationInterval: number
}

/**
* Avatar configuration for the site
* Controls which avatars are used for the home page and posts
*/
export const avatarConfig: AvatarConfig = ${formatConfigObject(config.name, config.obj)}`
  } else if (config.name === 'communityConfig') {
    fileContent = `// Import types
import type { 
CommunityConfig,
DiscordConfig,
ContactConfig,
NewsletterConfig,
EventsConfig,
GuidelinesConfig,
HeroConfig
} from '../types/communityconfig';

// Community page configuration
export const communityConfig: CommunityConfig = ${formatConfigObject(config.name, config.obj)}`
  } else if (config.name === 'aboutConfig') {
    fileContent = `// Import types
import type { 
AboutConfig,
TeamSectionConfig,
ContentSectionConfig,
ContactSectionConfig
} from '../types/aboutconfig';

// About page configuration
export const aboutConfig: AboutConfig = ${formatConfigObject(config.name, config.obj)}`
  } else if (config.name === 'postCardConfig') {
    fileContent = `// Configuration for PostCard components and friend post integration

    // Base PostCard configuration
    export interface PostCardConfig {
      // Layout options
      layout: {
        imagePosition: 'right' | 'top'; // Position of the image
        imageSizePercentage: number; // Size as percentage (e.g., 28 for 28%)
        cardBorderRadius: string; // Border radius for the card
        showEnterButton: boolean; // Whether to show the enter button
      };
      // Styling options
      styling: {
        titleSize: string; // Title font size class
        descriptionLines: number; // Number of lines to show in description
        animationEnabled: boolean; // Whether to enable load animations
      };
      // Content display options
      content: {
        showCategory: boolean;
        showTags: boolean;
        showUpdateDate: boolean;
        showWordCount: boolean;
        showReadTime: boolean;
        hideTagsOnMobile: boolean;
      };
    }

    // Friend post specific configuration
    export interface FriendPostConfig {
      // Friend styling options
      friendStyling: {
        indicatorType: 'border' | 'badge' | 'background'; // How to visually indicate friend posts
        indicatorColor: string; // Color for the indicator
        showFriendAvatar: boolean; // Whether to show friend's avatar
        avatarSize: string; // Size of the avatar
      };
    // Attribution options
      attribution: {
        showAttribution: boolean; // Whether to show attribution
        attributionText: string; // Text template for attribution
        linkToFriendSite: boolean; // Whether to link to friend's site
      };
      // Integration behavior
      behavior: {
        sortingMethod: 'date' | 'source'; // How to sort mixed posts
        mergeWithLocalPosts: boolean; // Whether to merge with local posts or show separately
      };
    }

    // Combined configuration
    export interface PostCardConfigs {
      localPosts: PostCardConfig;
      friendPosts: PostCardConfig & FriendPostConfig;
    }

    // Export the configuration
    export const postCardConfig: PostCardConfigs = ${formatConfigObject(config.name, config.obj)}`
  } else if (config.name === 'bannerConfig') {
    fileContent = `// Import type - use import type syntax to fix verbatimModuleSyntax error
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

// Define the banner configuration type
export interface BannerConfig {
  // List of banner images for animation
  bannerList: ImageMetadata[]
  
  // Default banner for static usage
  defaultBanner: ImageMetadata
  
  // Animation settings
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
}

/**
 * Banner configuration for the site
 * Controls which images are used for the animated banner
 */
export const bannerConfig: BannerConfig = ${formatConfigObject(
      config.name,
      config.obj,
    )
      .replace(/"bannerList": \[\s*"([^"]+)",/g, 'bannerList: [\n    banner1,')
      .replace(/"banner(\d+)",/g, 'banner$1,')
      .replace(/"defaultBanner": "banner(\d+)"/g, 'defaultBanner: banner$1')
      .replace(/"forward"/g, "'forward'")
      .replace(/"reverse"/g, "'reverse'")
      .replace(/"alternate"/g, "'alternate'")
      .replace(/"cover"/g, "'cover'")
      .replace(/"contain"/g, "'contain'")
      .replace(/"fill"/g, "'fill'")
      .replace(/"color"/g, "'color'")
      .replace(/"gradient"/g, "'gradient'")}

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
    : \`\${bannerConfig.fallback.value}\`;
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
}`
  }

  return githubService.commitFile(
    `src/config/${config.filename}`,
    fileContent,
    `Update ${config.name} configuration`,
  )
}
