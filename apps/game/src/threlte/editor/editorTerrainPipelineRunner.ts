import type { EditorSceneNode, SharedLevelEditorSettings } from './editorTypes'

export type HeightmapSourceDescriptor = {
  nodeId: string
  sourceName: string
  sourceAssetUrl?: string
  primitive?: EditorSceneNode['primitive']
  matrix: number[]
}

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

type TerrainCollisionPayload = {
  manifestUrl?: string
  collision?: {
    url?: string
    metadataUrl?: string
    colliderResolution?: number
    triangleCount?: number
    vertexCount?: number
  }
  metadata?: {
    sourceHeightmap?: string
    heightOverrideCount?: number
  }
}

type TerrainHeightmapPayload = TerrainCollisionPayload & {
  heightmapUrl?: string
  resolution?: number
  sourceAssetUrl?: string
  sourceAssetUrls?: string[]
  sourceNodeIds?: string[]
  sourceName?: string
  sourceTriangleCount?: number
  bounds?: {
    min: [number, number, number]
    max: [number, number, number]
  }
  collisionMetadata?: {
    sourceHeightmap?: string
    heightOverrideCount?: number
  }
}

export function buildTerrainHeightmapRequest(input: {
  levelId: string
  nodeId?: string
  sources: HeightmapSourceDescriptor[]
  resolution?: number
}) {
  return {
    levelId: input.levelId,
    nodeId: input.nodeId,
    sources: input.sources,
    resolution: input.resolution ?? 512,
    bakeCollision: true,
  }
}

export function buildTerrainChunkCookRequest(input: {
  levelId: string
  sourceGlbCook: boolean
}) {
  return {
    levelId: input.levelId,
    mode: input.sourceGlbCook ? 'glb-chunk-terrain' : 'heightfield-terrain',
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
  const metadata = payload.metadata

  return {
    ...settings,
    collision: {
      ...(settings.collision ?? {}),
      terrain: {
        ...(settings.collision?.terrain ?? {}),
        source: 'baked-heightmap',
        runtimeSource: 'editor-manifest',
        manifestUrl:
          payload.manifestUrl ?? settings.collision?.terrain?.manifestUrl,
        heightmapUrl:
          metadata?.sourceHeightmap ??
          settings.collision?.terrain?.heightmapUrl,
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
        heightmapDirty: options.sourceStillDirty,
        lastGeneratedAt: new Date().toISOString(),
        heightOverrideCount:
          metadata?.heightOverrideCount ??
          settings.collision?.terrain?.heightOverrideCount,
      },
    },
  }
}

export function applyTerrainHeightmapPayload(
  settings: SharedLevelEditorSettings,
  payload: TerrainHeightmapPayload,
  options: {
    selectedNodeId?: string
    selectedTerrainSourceName: string
  },
): SharedLevelEditorSettings {
  const collision = payload.collision
  const metadata = payload.collisionMetadata

  return {
    ...settings,
    collision: {
      ...(settings.collision ?? {}),
      terrain: {
        ...(settings.collision?.terrain ?? {}),
        source: 'baked-heightmap',
        runtimeSource: 'generated-heightmap',
        manifestUrl:
          payload.manifestUrl ?? settings.collision?.terrain?.manifestUrl,
        heightmapUrl:
          payload.heightmapUrl ?? settings.collision?.terrain?.heightmapUrl,
        heightmapResolution:
          payload.resolution ??
          settings.collision?.terrain?.heightmapResolution,
        sourceAssetUrl:
          payload.sourceAssetUrl ?? settings.collision?.terrain?.sourceAssetUrl,
        sourceAssetUrls:
          payload.sourceAssetUrls ??
          settings.collision?.terrain?.sourceAssetUrls,
        sourceNodeId: options.selectedNodeId,
        sourceNodeIds:
          payload.sourceNodeIds ?? settings.collision?.terrain?.sourceNodeIds,
        sourceName: payload.sourceName ?? options.selectedTerrainSourceName,
        sourceTriangleCount:
          payload.sourceTriangleCount ??
          settings.collision?.terrain?.sourceTriangleCount,
        sourceBounds:
          payload.bounds ?? settings.collision?.terrain?.sourceBounds,
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
        dirty: false,
        heightmapDirty: false,
        lastGeneratedAt: new Date().toISOString(),
        lastChunksGeneratedAt: '',
        heightOverrideCount:
          metadata?.heightOverrideCount ??
          settings.collision?.terrain?.heightOverrideCount,
      },
    },
  }
}

export function applyTerrainChunkCookPayload(
  settings: SharedLevelEditorSettings,
  payload: TerrainCookPayload,
  options: {
    sourceGlbCook: boolean
  },
): SharedLevelEditorSettings {
  const terrain = settings.collision?.terrain
  const renderChunks = terrain?.renderChunks

  return {
    ...settings,
    ground: options.sourceGlbCook
      ? {
          ...(settings.ground ?? {}),
          terrainRuntimeMode: 'glb-chunk-terrain',
          visualSource: 'source-glb-chunks',
          terrainVisualSource: 'source-glb-chunks',
          fallbackSurfacePolicy:
            settings.ground?.fallbackSurfacePolicy ?? 'disabled',
        }
      : settings.ground,
    collision: {
      ...(settings.collision ?? {}),
      terrain: {
        ...(terrain ?? {}),
        source: options.sourceGlbCook ? terrain?.source : 'baked-heightmap',
        runtimeSource: terrain?.runtimeSource ?? 'editor-manifest',
        runtimeMode: options.sourceGlbCook
          ? 'glb-chunk-terrain'
          : terrain?.runtimeMode,
        visualSource: options.sourceGlbCook
          ? 'source-glb-chunks'
          : terrain?.visualSource,
        fallbackSurfacePolicy: options.sourceGlbCook
          ? terrain?.fallbackSurfacePolicy ?? 'disabled'
          : terrain?.fallbackSurfacePolicy,
        manifestUrl: payload.manifestUrl ?? terrain?.manifestUrl,
        chunksPath: payload.chunksPath ?? terrain?.chunksPath,
        chunkGrid: payload.grid ?? terrain?.chunkGrid,
        chunkCount: payload.chunkCount ?? terrain?.chunkCount,
        chunkLods: payload.lods ?? terrain?.chunkLods,
        sourceAssetUrl: payload.sourceAssetUrl ?? terrain?.sourceAssetUrl,
        sourceAssetHash: payload.sourceHash ?? terrain?.sourceAssetHash,
        renderChunks: options.sourceGlbCook
          ? {
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
            }
          : renderChunks,
        lastChunksGeneratedAt: new Date().toISOString(),
      },
    },
  }
}
