// Import type - use import type syntax to fix verbatimModuleSyntax error
import type { ImageMetadata } from 'astro'

// Import avatar images
import avatar1 from '/src/content/avatar/avatar.webp'
import avatar2 from '/src/content/avatar/avatar2.webp'
import avatar3 from '/src/content/avatar/avatar3.webp'
import avatar4 from '/src/content/avatar/avatar4.webp'
import avatar5 from '/src/content/avatar/avatar5.webp'
import avatar6 from '/src/content/avatar/avatar6.webp'
import avatar7 from '/src/content/avatar/avatar7.webp'
import avatar8 from '/src/content/avatar/avatar8.webp'
import avatar9 from '/src/content/avatar/avatar9.webp'
import avatar10 from '/src/content/avatar/avatar10.webp'

// Define the avatar configuration type
export interface AvatarConfig {
  avatarList: ImageMetadata[]
  homeAvatar: ImageMetadata
  animationInterval: number
}

/**
 * Avatar configuration for the site
 * Controls which avatars are used for the home page and posts
 */
export const avatarConfig: AvatarConfig = {
  // List of all available avatars for post pages and rotation
  avatarList: [
    avatar1,
    avatar2,
    avatar3,
    avatar4,
    avatar5,
    avatar6,
    avatar7,
    avatar8,
    avatar9,
    avatar10,
  ],

  // Avatar to use on the home page (site owner)
  homeAvatar: avatar1,

  // Animation interval in milliseconds
  animationInterval: 7500,
}

/**
 * Get a consistent avatar index for a given post slug
 * This ensures the same post always shows the same avatar
 */
export function getAvatarIndexFromSlug(
  slug: string = '',
  avatarCount: number,
): number {
  if (!slug) return 0 // Default to first avatar if no slug

  // Simple hash function to get consistent avatar for each slug
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }

  // Ensure positive index and map to available avatars
  return Math.abs(hash) % avatarCount
}
