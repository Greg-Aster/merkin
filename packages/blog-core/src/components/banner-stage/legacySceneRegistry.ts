export type LegacyBannerSceneId =
  | 'standard'
  | 'video'
  | 'image'
  | 'timeline'
  | 'assistant'
  | 'none'

export interface LegacyBannerSceneDefinition {
  id: LegacyBannerSceneId
  title: string
  transition: 'fade' | 'cut'
}

const LEGACY_BANNER_SCENES: LegacyBannerSceneDefinition[] = [
  { id: 'standard', title: 'Standard Banner', transition: 'fade' },
  { id: 'video', title: 'Video Banner', transition: 'cut' },
  { id: 'image', title: 'Image Banner', transition: 'cut' },
  { id: 'timeline', title: 'Timeline Banner', transition: 'cut' },
  { id: 'assistant', title: 'Assistant Banner', transition: 'cut' },
  { id: 'none', title: 'No Banner', transition: 'cut' },
]

export const legacyBannerSceneRegistry = new Map(
  LEGACY_BANNER_SCENES.map(scene => [scene.id, scene]),
)

export function resolveLegacyBannerScene(sceneId?: string | null) {
  if (!sceneId) return legacyBannerSceneRegistry.get('none') ?? null
  return legacyBannerSceneRegistry.get(sceneId as LegacyBannerSceneId) ?? null
}
