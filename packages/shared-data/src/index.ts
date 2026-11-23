export type {
  SharedArchiveManifest,
  SharedGameStar,
  SharedGameStarsManifest,
  SharedPostsManifest,
  SharedTimelineManifest,
} from './types.ts'

export const GENERATED_FILES = {
  archive: 'archive.json',
  posts: 'posts.json',
  timeline: 'timeline.json',
  gameStars: 'game-stars.json',
} as const
