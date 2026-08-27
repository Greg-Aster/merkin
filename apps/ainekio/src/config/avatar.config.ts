// Import type - use import type syntax to fix verbatimModuleSyntax error
import type { ImageMetadata } from 'astro'

import avatar1 from '/src/content/avatar/avatar.webp'

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
  avatarList: [avatar1],

  // Avatar to use on the home page (site owner)
  homeAvatar: avatar1,

  // Animation interval in milliseconds
  animationInterval: 0,
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
