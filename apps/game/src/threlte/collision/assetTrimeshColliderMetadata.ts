import type {
  AssetLocalTransformMetadata,
  AssetLocalTransformValidationResult,
} from '../engine/assetLocalTransform'
import { validateAssetLocalTransformMetadata } from '../engine/assetLocalTransform'

const metadataCache = new Map<
  string,
  Promise<AssetLocalTransformValidationResult>
>()

export function validateInlineAssetLocalTransform(
  metadata: AssetLocalTransformMetadata | null | undefined,
) {
  return validateAssetLocalTransformMetadata(metadata ?? null)
}

export async function loadAssetLocalTransformMetadata(
  metadataUrl: string,
): Promise<AssetLocalTransformValidationResult> {
  const normalizedUrl = metadataUrl.trim()
  if (!normalizedUrl) {
    return {
      state: 'missing',
      valid: false,
      metadata: null,
      errors: ['asset-local transform metadata URL is missing'],
    }
  }

  const cached = metadataCache.get(normalizedUrl)
  if (cached) return cached

  const promise = fetch(normalizedUrl)
    .then(async response => {
      if (!response.ok) {
        throw new Error(
          `Failed to load collider metadata ${normalizedUrl}: ${response.status}`,
        )
      }
      return validateAssetLocalTransformMetadata(await response.json())
    })
    .catch(error => {
      metadataCache.delete(normalizedUrl)
      throw error
    })

  metadataCache.set(normalizedUrl, promise)
  return promise
}
