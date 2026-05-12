import runtimePrefabCatalog from './runtimePrefabCatalog.json'
import type {
  RuntimePrefabAssetAnimationContract,
  RuntimePrefabType,
  RuntimePrefabVfxContract,
} from './runtimePrefabTypes'

export const RUNTIME_PREFAB_TYPES =
  runtimePrefabCatalog.types as RuntimePrefabType[]

const RUNTIME_PREFAB_TYPE_SET = new Set<string>(RUNTIME_PREFAB_TYPES)

const RUNTIME_PREFAB_ASSET_URLS = runtimePrefabCatalog.assetUrls as Partial<
  Record<RuntimePrefabType, string>
>
const RUNTIME_PREFAB_ASSET_VARIANT_URLS =
  runtimePrefabCatalog.assetVariants as Partial<
    Record<RuntimePrefabType, Record<string, string>>
  >
const RUNTIME_PREFAB_ASSET_ANIMATIONS =
  runtimePrefabCatalog.assetAnimations as Partial<
    Record<RuntimePrefabType, RuntimePrefabAssetAnimationContract>
  >
const RUNTIME_PREFAB_ASSET_VFX = runtimePrefabCatalog.assetVfx as Partial<
  Record<RuntimePrefabType, RuntimePrefabVfxContract>
>
export function isRuntimePrefabType(type: string): type is RuntimePrefabType {
  return RUNTIME_PREFAB_TYPE_SET.has(type)
}

export function getRuntimePrefabAssetUrl(
  type: string | undefined | null,
  variant?: string | null,
): string {
  if (!type || !isRuntimePrefabType(type)) return ''
  if (variant) {
    const variantUrl = RUNTIME_PREFAB_ASSET_VARIANT_URLS[type]?.[variant]
    if (variantUrl) return variantUrl
  }
  return RUNTIME_PREFAB_ASSET_URLS[type] ?? ''
}

export function getRuntimePrefabAssetUrls(): Partial<
  Record<RuntimePrefabType, string>
> {
  return { ...RUNTIME_PREFAB_ASSET_URLS }
}

export function getRuntimePrefabAssetAnimation(
  type: string | undefined | null,
): RuntimePrefabAssetAnimationContract | null {
  if (!type || !isRuntimePrefabType(type)) return null
  return RUNTIME_PREFAB_ASSET_ANIMATIONS[type] ?? null
}

export function getRuntimePrefabAssetVfx(
  type: string | undefined | null,
): RuntimePrefabVfxContract | null {
  if (!type || !isRuntimePrefabType(type)) return null
  return RUNTIME_PREFAB_ASSET_VFX[type] ?? null
}
