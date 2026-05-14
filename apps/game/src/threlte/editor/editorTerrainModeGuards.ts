export type EditorTerrainModeGuardInput = {
  terrainRuntimeMode?: string | null
  groundTerrainRuntimeMode?: string | null
  terrainVisualSource?: string | null
  groundTerrainVisualSource?: string | null
  groundVisualSource?: string | null
  groundMode?: string | null
  renderChunkType?: string | null
  terrainSource?: string | null
  terrainSculptEnabled?: boolean | null
  hasHeightfieldChunks?: boolean | null
}

export function canonicalTerrainVisualSource(value: string | null | undefined) {
  return value === 'terrain-chunks' ? 'generated-heightmap-chunks' : value
}

export function isSourceGlbChunkTerrain(input: EditorTerrainModeGuardInput) {
  return (
    input.terrainRuntimeMode === 'glb-chunk-terrain' ||
    input.groundTerrainRuntimeMode === 'glb-chunk-terrain' ||
    input.terrainVisualSource === 'source-glb-chunks' ||
    input.groundTerrainVisualSource === 'source-glb-chunks' ||
    canonicalTerrainVisualSource(input.groundVisualSource) ===
      'source-glb-chunks' ||
    input.renderChunkType === 'glb-chunk-terrain' ||
    input.terrainSource === 'source-glb'
  )
}

export function isGeneratedHeightmapChunkTerrain(
  input: EditorTerrainModeGuardInput,
) {
  if (isSourceGlbChunkTerrain(input)) return false

  return (
    input.terrainSculptEnabled === true ||
    input.groundMode === 'terrain-chunks' ||
    input.groundMode === 'hybrid' ||
    canonicalTerrainVisualSource(input.groundVisualSource) ===
      'generated-heightmap-chunks' ||
    input.groundTerrainVisualSource === 'generated-heightmap-chunks' ||
    input.renderChunkType === 'heightfield-terrain' ||
    input.hasHeightfieldChunks === true
  )
}
