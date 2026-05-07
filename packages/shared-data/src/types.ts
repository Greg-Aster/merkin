import type { SharedPost, SharedTimelineEvent } from '@merkin/shared-content'

export type SharedManifestMeta = {
  generatedAt: string
  sourceRoot: string
  count: number
}

export type SharedPostsManifest = SharedManifestMeta & {
  items: SharedPost[]
}

export type SharedArchiveManifest = SharedManifestMeta & {
  items: SharedPost[]
}

export type SharedTimelineManifest = SharedManifestMeta & {
  items: SharedTimelineEvent[]
}

export type SharedGameStar = SharedTimelineEvent

export type SharedGameStarsManifest = SharedManifestMeta & {
  items: SharedGameStar[]
}
