import {
  type EditorGeneratedAssetNodeApplicationDeps,
  type GeneratedAssetVisualBounds,
  applyGeneratedAssetToNode,
} from './editorGeneratedAssetApplication'
import type { EditorJsonReader } from './editorHunyuanApi'
import type { EditorSceneNode } from './editorStore'
import {
  bakeBlenderGeometryStyleAsset,
  bakeProceduralStyleAsset,
  fingerprintStyleAsset,
} from './editorStyleApi'
import {
  type EditorStyleBakeOutputTier,
  type EditorStyleBakeProduct,
  type EditorStyleBakeRunOptions,
  type EditorStyleBakeRunResult,
  type EditorStyleBakeSettings,
  type EditorStyleBakeStatus,
  type StyleBakeFingerprint,
  type StyleBakeInputContract,
  type StyleBakeMode,
  type StyleBakeProduct,
  type StyleBakeSettings,
  type StyleBakeTransformSnapshot,
  type StyleBakeVec3,
  type StyleBakeVisualBounds,
  blenderStyleBakeGeneratorName,
  blenderStyleBakeGeneratorVersion,
  createStyleBakeCacheKey,
  createStyleBakeSettingsFingerprint,
  normalizeStyleBakeSettings,
  proceduralStyleBakeGeneratorName,
  proceduralStyleBakeGeneratorVersion,
  stableStyleBakeJson,
  styleBakeProductSchemaVersion,
} from './editorStyleBakeTypes'

type SceneNodeSourceAsset = {
  assetUrl: string
  sourceName: string
}

export interface EditorStyleBakeManagerDeps
  extends EditorGeneratedAssetNodeApplicationDeps {
  getSelectedNode?: () => EditorSceneNode | null
  getEditorNodes?: () => EditorSceneNode[]
  canUseStyleStudio?: (node: EditorSceneNode | null) => boolean
  getActiveSceneLevelId: () => string
  getDefaultStyleDescriptor: (node: EditorSceneNode | null) => string
  ensureSceneNodeSourceAsset: (
    node: EditorSceneNode,
  ) => Promise<SceneNodeSourceAsset>
  readJsonPayload: EditorJsonReader
  refreshGeneratedAssetLibrary?: (selectAssetUrl?: string) => Promise<void>
  saveSceneDocumentToDisk?: (levelId: string) => Promise<any>
}

export interface ProceduralStyleBakeSelectionRequest {
  outputName: string
  styleProfileName: string
  prompt: string
  textureSize?: number
  outputTier?: 'preview' | 'runtime' | 'hero'
  force?: boolean
}

export interface ProceduralStyleBakeSelectionResult {
  selectedNode: EditorSceneNode
  source: SceneNodeSourceAsset
  input: StyleBakeInputContract
  product: StyleBakeProduct
  applicationResult: Awaited<ReturnType<typeof applyGeneratedAssetToNode>>
  payload: any
}

export interface ProceduralStyleBakeNodeResult
  extends ProceduralStyleBakeSelectionResult {
  selectedNode: EditorSceneNode
}

export function buildProceduralStyleBakeSettings(input: {
  styleProfileName: string
  prompt: string
  fallbackPrompt?: string
  textureSize?: number
  profileId?: string
  lineStrength?: number
  brushStrength?: number
  aoStrength?: number
  cavityStrength?: number
  curvatureStrength?: number
  geometrySimplification?: number
  outputTier?: EditorStyleBakeOutputTier
  bevelCleanup?: boolean
  weightedNormalCleanup?: boolean
  lineGeometry?: boolean
}): EditorStyleBakeSettings {
  const normalized = normalizeStyleBakeSettings({
    styleProfileName: input.styleProfileName,
    prompt: input.prompt.trim() || input.fallbackPrompt?.trim() || '',
    textureSize: input.textureSize,
    profileId: input.profileId,
    lineStrength: input.lineStrength,
    brushStrength: input.brushStrength,
    aoStrength: input.aoStrength,
    cavityStrength: input.cavityStrength,
    curvatureStrength: input.curvatureStrength,
    geometrySimplification: input.geometrySimplification,
    outputTier: input.outputTier,
    bevelCleanup: input.bevelCleanup,
    weightedNormalCleanup: input.weightedNormalCleanup,
    lineGeometry: input.lineGeometry,
  })

  return {
    styleProfileName: normalized.styleProfileName,
    prompt: normalized.prompt,
    textureSize: normalized.textureSize,
    profileId: normalized.profileId ?? normalized.styleProfileName,
    lineStrength: normalized.lineStrength ?? 0.35,
    brushStrength: normalized.brushStrength ?? 0.25,
    aoStrength: normalized.aoStrength ?? 0.8,
    cavityStrength: normalized.cavityStrength ?? 0.65,
    curvatureStrength: normalized.curvatureStrength ?? 0.45,
    geometrySimplification: normalized.geometrySimplification ?? 0,
    outputTier: normalized.outputTier ?? 'runtime',
    bevelCleanup: Boolean(normalized.bevelCleanup),
    weightedNormalCleanup: normalized.weightedNormalCleanup !== false,
    lineGeometry: Boolean(normalized.lineGeometry),
  }
}

function cloneVec3(value: StyleBakeVec3): StyleBakeVec3 {
  return [value[0], value[1], value[2]]
}

function getNodeTransformSnapshot(
  deps: EditorStyleBakeManagerDeps,
  node: EditorSceneNode,
): StyleBakeTransformSnapshot {
  return (
    deps.getNodeTransformSnapshot(node) ?? {
      position: cloneVec3(node.position),
      rotation: cloneVec3(node.rotation),
      scale: cloneVec3(node.scale),
    }
  )
}

function normalizeVisualBounds(
  bounds: GeneratedAssetVisualBounds | null | undefined,
): StyleBakeVisualBounds | null {
  if (
    !bounds ||
    !Array.isArray(bounds.size) ||
    bounds.size.length !== 3 ||
    !Number.isFinite(bounds.maxDimension)
  ) {
    return null
  }

  return {
    size: [
      Number(bounds.size[0]),
      Number(bounds.size[1]),
      Number(bounds.size[2]),
    ],
    maxDimension: Number(bounds.maxDimension),
  }
}

function normalizeFingerprint(value: unknown): StyleBakeFingerprint | null {
  if (typeof value === 'string' && value.trim()) {
    return {
      algorithm: 'sha256',
      value: value.trim(),
    }
  }

  if (
    value &&
    typeof value === 'object' &&
    'algorithm' in value &&
    'value' in value &&
    typeof value.algorithm === 'string' &&
    typeof value.value === 'string' &&
    value.value.trim()
  ) {
    return {
      algorithm:
        value.algorithm === 'fnv1a32' ||
        value.algorithm === 'fnv1a64' ||
        value.algorithm === 'sha256'
          ? value.algorithm
          : 'sha256',
      value: value.value.trim(),
    }
  }

  return null
}

async function resolveSourceFingerprint(
  deps: EditorStyleBakeManagerDeps,
  assetUrl: string,
) {
  const payload = await fingerprintStyleAsset(assetUrl, deps.readJsonPayload)
  if (!payload?.success) {
    throw new Error(
      payload?.message ?? `Could not fingerprint style source ${assetUrl}.`,
    )
  }

  const fingerprint = normalizeFingerprint(
    payload.sourceAssetFingerprint ?? payload.fingerprint,
  )
  if (!fingerprint) {
    throw new Error(`Style source fingerprint was missing for ${assetUrl}.`)
  }

  return fingerprint
}

function buildStyleBakeInput(input: {
  sourceAssetUrl: string
  sourceAssetFingerprint: StyleBakeFingerprint
  levelId: string
  nodeId: string
  sourceNodeTransform: StyleBakeTransformSnapshot
  sourceLocalBounds: StyleBakeVisualBounds | null
  settings: StyleBakeSettings
  mode?: StyleBakeMode
  generatorName?: string
  generatorVersion?: string
}): StyleBakeInputContract {
  const settingsFingerprint = createStyleBakeSettingsFingerprint(input.settings)
  const mode = input.mode ?? 'procedural-material'
  const contract = {
    sourceAssetUrl: input.sourceAssetUrl,
    sourceAssetFingerprint: input.sourceAssetFingerprint,
    levelId: input.levelId,
    nodeId: input.nodeId,
    sourceNodeTransform: input.sourceNodeTransform,
    sourceLocalBounds: input.sourceLocalBounds,
    mode,
    settings: input.settings,
    settingsFingerprint,
    cacheKey: '',
    generatorName: input.generatorName ?? proceduralStyleBakeGeneratorName,
    generatorVersion:
      input.generatorVersion ?? proceduralStyleBakeGeneratorVersion,
  }

  return {
    ...contract,
    cacheKey: createStyleBakeCacheKey(contract),
  }
}

function getProductFromPayload(
  input: StyleBakeInputContract,
  payload: any,
): StyleBakeProduct {
  const product = payload?.product ?? payload?.styleBakeProduct
  if (product?.schemaVersion === styleBakeProductSchemaVersion) {
    return product as StyleBakeProduct
  }

  throw new Error(
    `${input.mode} style bake did not return authoritative product metadata.`,
  )
}

function styleBakeValuesMatch(left: unknown, right: unknown) {
  return (
    stableStyleBakeJson(left ?? null) === stableStyleBakeJson(right ?? null)
  )
}

async function resolveCurrentStyleBakeTarget(
  deps: EditorStyleBakeManagerDeps,
  originalNode: EditorSceneNode,
  input: StyleBakeInputContract,
  settings: StyleBakeSettings,
): Promise<EditorSceneNode> {
  const currentNode =
    deps
      .getEditorNodes?.()
      .find(candidate => candidate.id === originalNode.id) ?? originalNode

  if (
    !currentNode ||
    (deps.canUseStyleStudio && !deps.canUseStyleStudio(currentNode))
  ) {
    throw new Error(
      'Style bake target changed before the generated asset could be applied. Re-run the bake for the current selection.',
    )
  }

  const currentSource = await deps.ensureSceneNodeSourceAsset(currentNode)
  const currentSourceAssetFingerprint = await resolveSourceFingerprint(
    deps,
    currentSource.assetUrl,
  )
  const currentSourceNodeTransform = getNodeTransformSnapshot(deps, currentNode)
  const currentSourceLocalBounds = normalizeVisualBounds(
    await deps.getSceneNodeVisualBounds(currentNode, currentSource.assetUrl),
  )
  const currentInput = buildStyleBakeInput({
    sourceAssetUrl: currentSource.assetUrl,
    sourceAssetFingerprint: currentSourceAssetFingerprint,
    levelId: input.levelId,
    nodeId: currentNode.id,
    sourceNodeTransform: currentSourceNodeTransform,
    sourceLocalBounds: currentSourceLocalBounds,
    settings,
    mode: input.mode,
    generatorName: input.generatorName,
    generatorVersion: input.generatorVersion,
  })

  if (
    deps.getActiveSceneLevelId() !== input.levelId ||
    currentSource.assetUrl !== input.sourceAssetUrl ||
    currentInput.cacheKey !== input.cacheKey ||
    !styleBakeValuesMatch(
      currentSourceNodeTransform,
      input.sourceNodeTransform,
    ) ||
    !styleBakeValuesMatch(
      currentSourceLocalBounds,
      input.sourceLocalBounds ?? null,
    )
  ) {
    throw new Error(
      'Style bake target changed before the generated asset could be applied. Re-run the bake for the current node state.',
    )
  }

  return currentNode
}

function getEditorProductStatus(
  product: StyleBakeProduct,
): EditorStyleBakeStatus {
  if (product.state.status === 'ready') return 'clean'
  if (product.state.status === 'stale') return 'dirty'
  if (product.state.status === 'missing') return 'missing'
  if (product.state.status === 'failed') return 'failed'
  return 'dirty'
}

function createEditorStyleBakeProduct(
  product: StyleBakeProduct,
  settings: EditorStyleBakeSettings,
  payload: any,
): EditorStyleBakeProduct {
  return {
    mode:
      product.mode === 'blender-geometry'
        ? 'blender-geometry'
        : 'procedural-material',
    assetUrl: product.generatedAssetUrl,
    metadataUrl: product.generatedMetadataUrl,
    source: {
      assetUrl: product.sourceAssetUrl,
      assetPath: payload?.sourceAssetPath,
      assetFingerprint: product.sourceAssetFingerprint.value,
      nodeId: product.nodeId,
      levelId: product.levelId,
    },
    settings,
    settingsFingerprint: product.settingsFingerprint.value,
    cacheKey: product.cacheKey,
    generator: `${product.generatorName}@${product.generatorVersion}`,
    generatedAt: product.generatedAt,
    status: getEditorProductStatus(product),
    styleBakeProduct: product,
    diagnostics: {
      state: product.state,
      generatedMetadataUrl: product.generatedMetadataUrl,
    },
  }
}

export function createEditorStyleBakeManager(deps: EditorStyleBakeManagerDeps) {
  async function bakeProceduralStyleForNode(
    node: EditorSceneNode,
    settings: EditorStyleBakeSettings,
    options: EditorStyleBakeRunOptions = {},
  ): Promise<EditorStyleBakeRunResult> {
    const source = await deps.ensureSceneNodeSourceAsset(node)
    const sourceAssetFingerprint = await resolveSourceFingerprint(
      deps,
      source.assetUrl,
    )
    const sourceNodeTransform = getNodeTransformSnapshot(deps, node)
    const sourceLocalBounds = normalizeVisualBounds(
      await deps.getSceneNodeVisualBounds(node, source.assetUrl),
    )
    const input = buildStyleBakeInput({
      sourceAssetUrl: source.assetUrl,
      sourceAssetFingerprint,
      levelId: deps.getActiveSceneLevelId(),
      nodeId: node.id,
      sourceNodeTransform,
      sourceLocalBounds,
      settings,
    })
    const payload = await bakeProceduralStyleAsset(
      {
        assetUrl: input.sourceAssetUrl,
        outputName: `${node.name}-style-bake`,
        levelId: input.levelId,
        nodeId: input.nodeId,
        sourceAssetFingerprint: input.sourceAssetFingerprint,
        sourceNodeTransform: input.sourceNodeTransform,
        sourceLocalBounds: input.sourceLocalBounds,
        bakeMode: input.mode,
        styleProfileName: settings.styleProfileName,
        prompt: settings.prompt,
        textureSize: settings.textureSize,
        settings,
        settingsFingerprint: input.settingsFingerprint,
        cacheKey: input.cacheKey,
        generatorName: input.generatorName,
        generatorVersion: input.generatorVersion,
        lineStrength: settings.lineStrength,
        brushStrength: settings.brushStrength,
        aoStrength: settings.aoStrength,
        cavityStrength: settings.cavityStrength,
        curvatureStrength: settings.curvatureStrength,
        geometrySimplification: settings.geometrySimplification,
        outputTier: settings.outputTier,
        force: options.force,
      },
      deps.readJsonPayload,
    )

    if (!payload?.success) {
      throw new Error(payload?.message ?? 'Procedural style bake failed.')
    }

    const product = getProductFromPayload(input, payload)
    if (!product.generatedAssetUrl) {
      throw new Error('Procedural style bake did not return a generated asset.')
    }
    if (product.cacheKey !== input.cacheKey) {
      throw new Error(
        'Procedural style bake returned product metadata for a different cache key.',
      )
    }

    const currentNode = await resolveCurrentStyleBakeTarget(
      deps,
      node,
      input,
      settings,
    )
    const applicationResult = await applyGeneratedAssetToNode(
      deps,
      currentNode,
      product.generatedAssetUrl,
      {
        sourceAssetUrl: source.assetUrl,
        descriptor: deps.getDefaultStyleDescriptor(currentNode),
        logMessage:
          'Applied procedural style-baked asset with preserved transform',
        generationPatch: {
          styleBakeProduct: product,
        },
      },
    )

    await deps.refreshGeneratedAssetLibrary?.(product.generatedAssetUrl)

    return {
      product: createEditorStyleBakeProduct(product, settings, payload),
      cached: Boolean(payload.cached),
      fitReport: applicationResult.fitReport,
      inspectReport: payload.inspectReport,
    }
  }

  async function bakeBlenderGeometryStyleForNode(
    node: EditorSceneNode,
    settings: EditorStyleBakeSettings,
    options: EditorStyleBakeRunOptions = {},
  ): Promise<EditorStyleBakeRunResult> {
    const source = await deps.ensureSceneNodeSourceAsset(node)
    const sourceAssetFingerprint = await resolveSourceFingerprint(
      deps,
      source.assetUrl,
    )
    const sourceNodeTransform = getNodeTransformSnapshot(deps, node)
    const sourceLocalBounds = normalizeVisualBounds(
      await deps.getSceneNodeVisualBounds(node, source.assetUrl),
    )
    const input = buildStyleBakeInput({
      sourceAssetUrl: source.assetUrl,
      sourceAssetFingerprint,
      levelId: deps.getActiveSceneLevelId(),
      nodeId: node.id,
      sourceNodeTransform,
      sourceLocalBounds,
      settings,
      mode: 'blender-geometry',
      generatorName: blenderStyleBakeGeneratorName,
      generatorVersion: blenderStyleBakeGeneratorVersion,
    })
    const payload = await bakeBlenderGeometryStyleAsset(
      {
        mode: 'blender-geometry',
        assetUrl: input.sourceAssetUrl,
        outputName: `${node.name}-blender-style-bake`,
        levelId: input.levelId,
        nodeId: input.nodeId,
        sourceAssetFingerprint: input.sourceAssetFingerprint,
        sourceNodeTransform: input.sourceNodeTransform,
        sourceLocalBounds: input.sourceLocalBounds,
        styleProfileName: settings.styleProfileName,
        profileId: settings.profileId,
        prompt: settings.prompt,
        textureSize: settings.textureSize,
        settings,
        settingsFingerprint: input.settingsFingerprint,
        cacheKey: input.cacheKey,
        generatorName: input.generatorName,
        generatorVersion: input.generatorVersion,
        lineStrength: settings.lineStrength,
        brushStrength: settings.brushStrength,
        aoStrength: settings.aoStrength,
        cavityStrength: settings.cavityStrength,
        curvatureStrength: settings.curvatureStrength,
        geometrySimplification: settings.geometrySimplification,
        outputTier: settings.outputTier,
        bevelCleanup: settings.bevelCleanup,
        weightedNormalCleanup: settings.weightedNormalCleanup,
        lineGeometry: settings.lineGeometry,
        force: options.force,
      },
      deps.readJsonPayload,
    )

    if (!payload?.success) {
      throw new Error(payload?.message ?? 'Blender geometry style bake failed.')
    }

    const product = getProductFromPayload(input, payload)
    if (!product.generatedAssetUrl) {
      throw new Error(
        'Blender geometry style bake did not return a generated asset.',
      )
    }
    if (product.cacheKey !== input.cacheKey) {
      throw new Error(
        'Blender geometry style bake returned product metadata for a different cache key.',
      )
    }

    const currentNode = await resolveCurrentStyleBakeTarget(
      deps,
      node,
      input,
      settings,
    )
    const applicationResult = await applyGeneratedAssetToNode(
      deps,
      currentNode,
      product.generatedAssetUrl,
      {
        sourceAssetUrl: source.assetUrl,
        descriptor: deps.getDefaultStyleDescriptor(currentNode),
        logMessage:
          'Applied Blender style-baked asset with preserved transform',
        generationPatch: {
          styleBakeProduct: product,
        },
      },
    )

    await deps.refreshGeneratedAssetLibrary?.(product.generatedAssetUrl)

    return {
      product: createEditorStyleBakeProduct(product, settings, payload),
      cached: Boolean(payload.cached),
      fitReport: applicationResult.fitReport,
      inspectReport: payload.inspectReport,
    }
  }

  async function bakeSelectedProceduralStyle(
    request: ProceduralStyleBakeSelectionRequest,
  ): Promise<ProceduralStyleBakeSelectionResult> {
    const selectedNode = deps.getSelectedNode?.() ?? null
    if (
      !selectedNode ||
      (deps.canUseStyleStudio && !deps.canUseStyleStudio(selectedNode))
    ) {
      throw new Error(
        'Select a single geometry node before running a procedural style bake.',
      )
    }

    const source = await deps.ensureSceneNodeSourceAsset(selectedNode)
    const descriptor = deps.getDefaultStyleDescriptor(selectedNode)
    const settings = normalizeStyleBakeSettings({
      styleProfileName: request.styleProfileName,
      prompt: request.prompt.trim() || descriptor,
      textureSize: request.textureSize ?? 256,
    })
    const sourceAssetFingerprint = await resolveSourceFingerprint(
      deps,
      source.assetUrl,
    )
    const sourceNodeTransform = getNodeTransformSnapshot(deps, selectedNode)
    const sourceLocalBounds = normalizeVisualBounds(
      await deps.getSceneNodeVisualBounds(selectedNode, source.assetUrl),
    )
    const input = buildStyleBakeInput({
      sourceAssetUrl: source.assetUrl,
      sourceAssetFingerprint,
      levelId: deps.getActiveSceneLevelId(),
      nodeId: selectedNode.id,
      sourceNodeTransform,
      sourceLocalBounds,
      settings,
    })
    const payload = await bakeProceduralStyleAsset(
      {
        assetUrl: input.sourceAssetUrl,
        outputName: request.outputName,
        levelId: input.levelId,
        nodeId: input.nodeId,
        sourceAssetFingerprint: input.sourceAssetFingerprint,
        sourceNodeTransform: input.sourceNodeTransform,
        sourceLocalBounds: input.sourceLocalBounds,
        bakeMode: input.mode,
        styleProfileName: input.settings.styleProfileName,
        prompt: input.settings.prompt,
        textureSize: input.settings.textureSize,
        settings: input.settings,
        settingsFingerprint: input.settingsFingerprint,
        cacheKey: input.cacheKey,
        generatorName: input.generatorName,
        generatorVersion: input.generatorVersion,
      },
      deps.readJsonPayload,
    )

    if (!payload?.success) {
      throw new Error(payload?.message ?? 'Procedural style bake failed.')
    }

    const product = getProductFromPayload(input, payload)
    if (!product.generatedAssetUrl) {
      throw new Error('Procedural style bake did not return a generated asset.')
    }
    if (product.cacheKey !== input.cacheKey) {
      throw new Error(
        'Procedural style bake returned product metadata for a different cache key.',
      )
    }

    const currentNode = await resolveCurrentStyleBakeTarget(
      deps,
      selectedNode,
      input,
      settings,
    )
    const applicationResult = await applyGeneratedAssetToNode(
      deps,
      currentNode,
      product.generatedAssetUrl,
      {
        sourceAssetUrl: source.assetUrl,
        descriptor: deps.getDefaultStyleDescriptor(currentNode) || descriptor,
        logMessage:
          'Applied procedural style-baked asset with preserved transform',
        generationPatch: {
          styleBakeProduct: product,
        },
      },
    )

    return {
      selectedNode,
      source,
      input,
      product,
      applicationResult,
      payload,
    }
  }

  return {
    bakeBlenderGeometryStyleForNode,
    bakeProceduralStyleForNode,
    bakeSelectedProceduralStyle,
  }
}
