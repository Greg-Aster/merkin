export type {
  SharedGameStar,
  SharedGameStarsManifest,
  SharedPostsManifest,
  SharedTimelineManifest,
} from './types.ts'

export const GENERATED_FILES = {
  posts: 'posts.json',
  timeline: 'timeline.json',
  gameStars: 'game-stars.json',
} as const
