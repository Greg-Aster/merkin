import type { SharedLevelEditorSettings } from './editorTypes'

type TerrainCookPayload = {
  manifestUrl?: string
  chunksPath?: string
  grid?: number
  chunkCount?: number
  lods?: number[]
  sourceAssetUrl?: string
  sourceHash?: string
  preservation?: {
    sourceUvs?: boolean
    materialSlots?: boolean
    normals?: boolean
    tangents?: boolean
    meshGroups?: boolean
    textureReferences?: boolean
  }
}

type TerrainSourceImportPayload = {
  manifestUrl?: string
  sourceAssetUrl: string
  sourceAssetHash?: string
  sourceAssetFingerprint?: {
    algorithm?: string
    value?: string
  }
  sourceName?: string
  sourceSizeBytes?: number
  copied?: boolean
}

type TerrainCollisionPayload = {
  manifestUrl?: string
  collision?: {
    url?: string
    metadataUrl?: string
    colliderResolution?: number
    triangleCount?: number
    vertexCount?: number
  }
}

export function buildTerrainChunkCookRequest(input: { levelId: string }) {
  return {
    levelId: input.levelId,
    mode: 'glb-chunk-terrain',
  }
}

export function buildTerrainSourceImportRequest(input: {
  levelId: string
  sourcePath?: string
  sourceAssetUrl?: string
  fileName?: string
  fileBase64?: string
  sourceName?: string
}) {
  return {
    levelId: input.levelId,
    sourcePath: input.sourcePath ?? '',
    sourceAssetUrl: input.sourceAssetUrl ?? '',
    fileName: input.fileName ?? '',
    fileBase64: input.fileBase64 ?? '',
    sourceName: input.sourceName ?? '',
  }
}

export function applyTerrainSourceImportPayload(
  settings: SharedLevelEditorSettings,
  payload: TerrainSourceImportPayload,
): SharedLevelEditorSettings {
  const terrain = settings.collision?.terrain ?? {}
  const nextSourceAssetUrl = payload.sourceAssetUrl
  const nextSourceName = payload.sourceName || nextSourceAssetUrl
  const sourceAssetFingerprint =
    payload.sourceAssetFingerprint ??
    (payload.sourceAssetHash
      ? {
          algorithm: 'sha256',
          value: payload.sourceAssetHash,
        }
      : undefined)

  return {
    ...settings,
    ground: {
      ...(settings.ground ?? {}),
      mode: 'terrain-chunks',
      visualSource: 'source-glb-chunks',
      terrainRuntimeMode: 'glb-chunk-terrain',
      terrainVisualSource: 'source-glb-chunks',
      collisionSource: 'source-linked-terrain-collision',
      fallbackSurfacePolicy: 'disabled',
      terrainManifestUrl: payload.manifestUrl ?? settings.ground?.terrainManifestUrl,
      sourceAssetUrl: nextSourceAssetUrl,
      sourceAssetHash: payload.sourceAssetHash,
      sourceAssetFingerprint,
      renderChunks: undefined,
      collisionProduct: undefined,
    },
    collision: {
      ...(settings.collision ?? {}),
      terrain: {
        ...terrain,
        source: 'source-glb',
        runtimeSource: 'built-in-manifest',
        runtimeMode: 'glb-chunk-terrain',
        visualSource: 'source-glb-chunks',
        fallbackSurfacePolicy: 'disabled',
        manifestUrl: payload.manifestUrl ?? terrain.manifestUrl,
        sourceAssetUrl: nextSourceAssetUrl,
        sourceAssetUrls: [nextSourceAssetUrl],
        sourceAssetHash: payload.sourceAssetHash,
        sourceAssetFingerprint,
        sourceName: nextSourceName,
        renderChunks: undefined,
        chunksPath: undefined,
        chunkGrid: undefined,
        chunkCount: undefined,
        chunkLods: undefined,
        colliderUrl: undefined,
        metadataUrl: undefined,
        colliderResolution: undefined,
        triangleCount: undefined,
        vertexCount: undefined,
        sourceBounds: undefined,
        sourceTriangleCount: undefined,
        lastGeneratedAt: undefined,
        lastChunksGeneratedAt: undefined,
        heightOverrideCount: undefined,
        dirty: true,
      },
    },
  }
}

export function applyTerrainCollisionBakePayload(
  settings: SharedLevelEditorSettings,
  payload: TerrainCollisionPayload,
  options: {
    sourceStillDirty: boolean
  },
): SharedLevelEditorSettings {
  const collision = payload.collision

  return {
    ...settings,
    ground: {
      ...(settings.ground ?? {}),
      terrainRuntimeMode: 'glb-chunk-terrain',
      visualSource: 'source-glb-chunks',
      terrainVisualSource: 'source-glb-chunks',
      collisionSource: 'source-linked-terrain-collision',
      fallbackSurfacePolicy: settings.ground?.fallbackSurfacePolicy ?? 'disabled',
      terrainManifestUrl:
        payload.manifestUrl ?? settings.ground?.terrainManifestUrl,
    },
    collision: {
      ...(settings.collision ?? {}),
      terrain: {
        ...(settings.collision?.terrain ?? {}),
        source: 'source-glb',
        runtimeSource: 'editor-manifest',
        runtimeMode: 'glb-chunk-terrain',
        visualSource: 'source-glb-chunks',
        fallbackSurfacePolicy:
          settings.collision?.terrain?.fallbackSurfacePolicy ?? 'disabled',
        manifestUrl:
          payload.manifestUrl ?? settings.collision?.terrain?.manifestUrl,
        colliderUrl: collision?.url ?? settings.collision?.terrain?.colliderUrl,
        metadataUrl:
          collision?.metadataUrl ?? settings.collision?.terrain?.metadataUrl,
        colliderResolution:
          collision?.colliderResolution ??
          settings.collision?.terrain?.colliderResolution,
        triangleCount:
          collision?.triangleCount ??
          settings.collision?.terrain?.triangleCount,
        vertexCount:
          collision?.vertexCount ?? settings.collision?.terrain?.vertexCount,
        dirty: options.sourceStillDirty,
        lastGeneratedAt: new Date().toISOString(),
      },
    },
  }
}

export function applyTerrainChunkCookPayload(
  settings: SharedLevelEditorSettings,
  payload: TerrainCookPayload,
): SharedLevelEditorSettings {
  const terrain = settings.collision?.terrain
  const renderChunks = terrain?.renderChunks

  return {
    ...settings,
    ground: {
          ...(settings.ground ?? {}),
          terrainRuntimeMode: 'glb-chunk-terrain',
          visualSource: 'source-glb-chunks',
          terrainVisualSource: 'source-glb-chunks',
          fallbackSurfacePolicy:
            settings.ground?.fallbackSurfacePolicy ?? 'disabled',
        },
    collision: {
      ...(settings.collision ?? {}),
      terrain: {
        ...(terrain ?? {}),
        source: 'source-glb',
        runtimeSource: terrain?.runtimeSource ?? 'editor-manifest',
        runtimeMode: 'glb-chunk-terrain',
        visualSource: 'source-glb-chunks',
        fallbackSurfacePolicy: terrain?.fallbackSurfacePolicy ?? 'disabled',
        manifestUrl: payload.manifestUrl ?? terrain?.manifestUrl,
        chunksPath: payload.chunksPath ?? terrain?.chunksPath,
        chunkGrid: payload.grid ?? terrain?.chunkGrid,
        chunkCount: payload.chunkCount ?? terrain?.chunkCount,
        chunkLods: payload.lods ?? terrain?.chunkLods,
        sourceAssetUrl: payload.sourceAssetUrl ?? terrain?.sourceAssetUrl,
        sourceAssetHash: payload.sourceHash ?? terrain?.sourceAssetHash,
        renderChunks: {
              ...(renderChunks ?? {}),
              type: 'glb-chunk-terrain',
              visualSource: 'source-glb-chunks',
              chunksPath: payload.chunksPath ?? renderChunks?.chunksPath,
              chunkCount: payload.chunkCount ?? renderChunks?.chunkCount,
              lods: payload.lods ?? renderChunks?.lods,
              sourceAssetUrl:
                payload.sourceAssetUrl ?? renderChunks?.sourceAssetUrl,
              sourceHash: payload.sourceHash ?? renderChunks?.sourceHash,
              preservesSourceUvs:
                payload.preservation?.sourceUvs ??
                renderChunks?.preservesSourceUvs,
              preservesSourceMaterialSlots:
                payload.preservation?.materialSlots ??
                renderChunks?.preservesSourceMaterialSlots,
              preservesSourceNormals:
                payload.preservation?.normals ??
                renderChunks?.preservesSourceNormals,
              preservesSourceTangents:
                payload.preservation?.tangents ??
                renderChunks?.preservesSourceTangents,
              preservesSourceMeshGroups:
                payload.preservation?.meshGroups ??
                renderChunks?.preservesSourceMeshGroups,
              textureReferencesPreserved:
                payload.preservation?.textureReferences ??
                renderChunks?.textureReferencesPreserved,
            },
        lastChunksGeneratedAt: new Date().toISOString(),
      },
    },
  }
}
