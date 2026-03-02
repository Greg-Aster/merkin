import type { ImageMetadata } from 'astro'

import avatar1 from '/src/content/avatar/avatar.png'

export interface AvatarConfig {
  avatarList: ImageMetadata[]
  homeAvatar: ImageMetadata
  animationInterval: number
}

export const avatarConfig: AvatarConfig = {
  avatarList: [avatar1],
  homeAvatar: avatar1,
  animationInterval: 0,
}

export function getAvatarIndexFromSlug(slug: string = '', avatarCount: number): number {
  if (!slug || avatarCount <= 1) return 0

  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash) + slug.charCodeAt(i)
    hash = hash & hash
  }

  return Math.abs(hash) % avatarCount
}
