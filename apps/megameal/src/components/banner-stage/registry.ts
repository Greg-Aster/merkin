import type { SceneDefinition } from './types'

function normalizeSceneDefinition(
  definition: SceneDefinition,
): SceneDefinition {
  return {
    weight: 1,
    transition: 'fade',
    eligiblePages: [],
    sceneProps: {},
    ...definition,
  }
}

export class BannerStageRegistry {
  #definitions = new Map<string, SceneDefinition>()

  register(definition: SceneDefinition) {
    const normalized = normalizeSceneDefinition(definition)
    this.#definitions.set(normalized.id, normalized)
    return normalized
  }

  get(sceneId: string) {
    return this.#definitions.get(sceneId) ?? null
  }

  list() {
    return Array.from(this.#definitions.values())
  }

  clear() {
    this.#definitions.clear()
  }
}

export function defineScene(definition: SceneDefinition) {
  return normalizeSceneDefinition(definition)
}

export const bannerStageRegistry = new BannerStageRegistry()
