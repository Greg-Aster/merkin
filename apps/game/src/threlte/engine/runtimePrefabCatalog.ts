import {
  RUNTIME_PREFAB_TYPES,
  getRuntimePrefabAssetAnimation,
  getRuntimePrefabAssetUrl,
  getRuntimePrefabAssetVfx,
  isRuntimePrefabType,
} from './runtimePrefabRegistry'
import type {
  RuntimePrefabData,
  RuntimePrefabDescriptor,
} from './runtimePrefabTypes'

export type {
  RuntimePrefabData,
  RuntimePrefabAssetAnimationContract,
  RuntimePrefabDescriptor,
  RuntimePrefabType,
  RuntimePrefabVfxContract,
} from './runtimePrefabTypes'
export {
  getRuntimePrefabAssetAnimation,
  getRuntimePrefabAssetVfx,
  getRuntimePrefabAssetUrl,
  getRuntimePrefabAssetUrls,
  isRuntimePrefabType,
  RUNTIME_PREFAB_TYPES,
} from './runtimePrefabRegistry'

export function resolveRuntimePrefabDescriptor(
  prefab: RuntimePrefabData | null | undefined,
): RuntimePrefabDescriptor {
  const type = prefab?.type ?? ''
  if (!isRuntimePrefabType(type)) {
    return { kind: 'empty', type, known: false }
  }

  const assetUrl = getRuntimePrefabAssetUrl(type, prefab?.variant)
  if (assetUrl) {
    return {
      kind: 'asset',
      type,
      assetUrl,
      assetAnimation: getRuntimePrefabAssetAnimation(type),
      assetVfx: getRuntimePrefabAssetVfx(type),
      known: true,
    }
  }

  return { kind: 'empty', type, known: false }
}
