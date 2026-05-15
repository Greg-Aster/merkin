import type { EditorSceneNode } from './editorStore'

type Vector3Tuple = [number, number, number]

export type GeneratedAssetVisualBounds = {
  size: Vector3Tuple
  maxDimension: number
}

interface GeneratedAssetFitData {
  nodeId: string
  sourceVisualBounds: GeneratedAssetVisualBounds
  baseScale: Vector3Tuple
  descriptor: string
  originalAssetUrl?: string
}

interface GeneratedAssetReplacementPlan {
  editorNodes: EditorSceneNode[]
  targetNodeIds: string[]
  fitData: GeneratedAssetFitData[]
  selectedNode: EditorSceneNode
}

export interface EditorGeneratedAssetNodeApplicationDeps {
  getSceneNodeVisualBounds: (
    node: EditorSceneNode,
    sourceAssetUrl?: string,
  ) => Promise<GeneratedAssetVisualBounds>
  inspectGeneratedAssetBounds: (
    assetUrl: string,
  ) => Promise<GeneratedAssetVisualBounds | null>
  patchNode: (nodeId: string, patch: Record<string, any>) => void
  appendPipelineLog: (message: string, detail?: unknown) => void
  getNodeTransformSnapshot: (node: EditorSceneNode | null) => {
    position: Vector3Tuple
    rotation: Vector3Tuple
    scale: Vector3Tuple
  } | null
}

export interface EditorGeneratedAssetApplicationDeps
  extends EditorGeneratedAssetNodeApplicationDeps {
  getSelectedNode: () => EditorSceneNode | null
  getEditorNodes: () => EditorSceneNode[]
  getDefaultStyleDescriptor: (node: EditorSceneNode | null) => string
  addNode: (node: Record<string, any>) => void
  getActiveSceneLevelId: () => string
  saveSceneDocumentToDisk: (levelId: string) => Promise<any>
}

export async function fitGeneratedAssetToSource(
  deps: Pick<
    EditorGeneratedAssetNodeApplicationDeps,
    'appendPipelineLog' | 'inspectGeneratedAssetBounds'
  >,
  nodeId: string,
  sourceVisualBounds: GeneratedAssetVisualBounds,
  generatedAssetUrl: string,
  fallbackScale: Vector3Tuple,
) {
  const generatedBounds =
    await deps.inspectGeneratedAssetBounds(generatedAssetUrl)
  const sourceSize = sourceVisualBounds?.size ?? [0, 0, 0]
  const sourceMax = Number(sourceVisualBounds?.maxDimension ?? 0)
  const generatedMax = Number(generatedBounds?.maxDimension ?? 0)
  if (
    !Number.isFinite(sourceMax) ||
    !Number.isFinite(generatedMax) ||
    sourceMax <= 0.0001 ||
    generatedMax <= 0.0001
  ) {
    const report = `Fit fallback for ${nodeId}: source bounds ${Number.isFinite(sourceMax) ? sourceMax.toFixed(4) : 'invalid'}, generated bounds ${Number.isFinite(generatedMax) ? generatedMax.toFixed(4) : 'invalid'}. Keeping existing scale [${fallbackScale.map(v => v.toFixed(3)).join(', ')}].`
    deps.appendPipelineLog('Generated asset fit fallback', {
      nodeId,
      generatedAssetUrl,
      sourceSize,
      sourceMax,
      generatedBounds,
      fallbackScale,
    })
    return { appliedScale: fallbackScale, report, usedFallback: true }
  }

  const generatedSize =
    Array.isArray(generatedBounds?.size) && generatedBounds.size.length === 3
      ? ([
          Math.abs(Number(generatedBounds.size[0] ?? 0)),
          Math.abs(Number(generatedBounds.size[1] ?? 0)),
          Math.abs(Number(generatedBounds.size[2] ?? 0)),
        ] as Vector3Tuple)
      : ([generatedMax, generatedMax, generatedMax] as Vector3Tuple)

  const axisRatios = sourceSize.map((value, index) => {
    const generatedAxis = generatedSize[index]
    if (
      !Number.isFinite(value) ||
      !Number.isFinite(generatedAxis) ||
      value <= 0.0001 ||
      generatedAxis <= 0.0001
    ) {
      return sourceMax / generatedMax
    }
    return value / generatedAxis
  }) as Vector3Tuple

  const clampedRatios = axisRatios.map(ratio =>
    Math.min(Math.max(ratio, 0.05), 500),
  ) as Vector3Tuple
  const appliedScale = [...clampedRatios] as Vector3Tuple
  const report = `Source [${sourceSize.map(v => v.toFixed(2)).join(', ')}]u -> Generated [${generatedSize.map(v => v.toFixed(2)).join(', ')}]u -> Applied x[${clampedRatios.map(v => v.toFixed(3)).join(', ')}] -> Final scale [${appliedScale.map(v => v.toFixed(3)).join(', ')}]`
  deps.appendPipelineLog('Computed generated asset fit', {
    nodeId,
    generatedAssetUrl,
    sourceSize,
    generatedSize,
    ratios: clampedRatios,
    appliedScale,
  })
  return { appliedScale, report, usedFallback: false }
}

export async function createGeneratedAssetNode(
  deps: EditorGeneratedAssetApplicationDeps,
  assetUrl: string,
  name: string,
) {
  const selectedNode = deps.getSelectedNode()
  const fallbackName = name.trim() || 'Generated Asset'
  const parentId =
    selectedNode?.kind === 'group'
      ? selectedNode.id
      : selectedNode?.parentId ?? null
  const anchorPosition = selectedNode?.position ?? [0, 0, 0]
  const nextPosition: Vector3Tuple = [
    anchorPosition[0] + (selectedNode ? 2 : 0),
    anchorPosition[1],
    anchorPosition[2],
  ]
  const generatedBounds = await deps.inspectGeneratedAssetBounds(assetUrl)
  const sourceVisualSize =
    generatedBounds?.size?.length === 3
      ? ([...generatedBounds.size] as Vector3Tuple)
      : undefined

  deps.addNode({
    id: `asset-${Date.now()}`,
    name: fallbackName,
    kind: 'asset',
    parentId,
    position: nextPosition,
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    asset: { url: assetUrl },
    ...(sourceVisualSize
      ? {
          generation: {
            sourceVisualSize,
            lastBakedAssetUrl: assetUrl,
            lastBakedAt: new Date().toISOString(),
          },
        }
      : {}),
  })
}

export async function applyGeneratedAssetToNode(
  deps: EditorGeneratedAssetNodeApplicationDeps,
  node: EditorSceneNode,
  generatedAssetUrl: string,
  options: {
    sourceAssetUrl?: string
    descriptor: string
    logMessage?: string
    generationPatch?: Record<string, unknown>
  },
) {
  const originalAssetUrl =
    node.generation?.originalAssetUrl ??
    (options.sourceAssetUrl?.startsWith('/generated/')
      ? options.sourceAssetUrl
      : undefined)
  const sourceVisualBounds = await deps.getSceneNodeVisualBounds(
    node,
    options.sourceAssetUrl || '',
  )
  const baseScale = [...node.scale] as Vector3Tuple
  const fitResult = await fitGeneratedAssetToSource(
    deps,
    node.id,
    sourceVisualBounds,
    generatedAssetUrl,
    baseScale,
  )
  deps.patchNode(node.id, {
    kind: 'asset',
    asset: { url: generatedAssetUrl },
    scale: fitResult.appliedScale,
    prefab: undefined,
    primitive: undefined,
    generation: {
      ...(node.generation ?? {}),
      descriptor: options.descriptor,
      ...(originalAssetUrl ? { originalAssetUrl } : {}),
      sourceVisualSize: sourceVisualBounds.size,
      lastBakedAssetUrl: generatedAssetUrl,
      lastBakedAt: new Date().toISOString(),
      ...(options.generationPatch ?? {}),
    },
  })

  deps.appendPipelineLog(
    options.logMessage ?? 'Applied generated asset with preserved transform',
    {
      nodeId: node.id,
      assetUrl: generatedAssetUrl,
      transform: deps.getNodeTransformSnapshot(node),
    },
  )

  return {
    fitReport: fitResult.report,
    appliedScale: fitResult.appliedScale,
    sourceVisualBounds,
  }
}

export async function prepareGeneratedAssetReplacementPlan(
  deps: EditorGeneratedAssetApplicationDeps,
  selectedNode: EditorSceneNode,
  targetNodeIds: string[],
  targetAssetUrl: string,
): Promise<GeneratedAssetReplacementPlan> {
  const editorNodes = deps.getEditorNodes()
  const fitData = (
    await Promise.all(
      targetNodeIds.map(async nodeId => {
        const node = editorNodes.find(candidate => candidate.id === nodeId)
        if (!node) return null
        return {
          nodeId,
          sourceVisualBounds: await deps.getSceneNodeVisualBounds(
            node,
            targetAssetUrl,
          ),
          baseScale: [...node.scale] as Vector3Tuple,
          descriptor: deps.getDefaultStyleDescriptor(node),
          originalAssetUrl:
            node.generation?.originalAssetUrl ??
            (targetAssetUrl.startsWith('/generated/')
              ? targetAssetUrl
              : undefined),
        }
      }),
    )
  ).filter(Boolean) as GeneratedAssetFitData[]

  return {
    editorNodes,
    targetNodeIds,
    fitData,
    selectedNode,
  }
}

export async function applyGeneratedAssetReplacementPlan(
  deps: EditorGeneratedAssetApplicationDeps,
  plan: GeneratedAssetReplacementPlan,
  generatedAssetUrl: string,
) {
  const fitDataById = new Map(plan.fitData.map(entry => [entry.nodeId, entry]))
  let lastFitReport = ''

  const replacementPatches = await Promise.all(
    plan.targetNodeIds.map(async nodeId => {
      const fitData = fitDataById.get(nodeId)
      const fitResult = fitData
        ? await fitGeneratedAssetToSource(
            deps,
            nodeId,
            fitData.sourceVisualBounds,
            generatedAssetUrl,
            fitData.baseScale,
          )
        : null

      if (fitResult?.report) {
        lastFitReport = fitResult.report
      }

      return {
        nodeId,
        node: plan.editorNodes.find(candidate => candidate.id === nodeId),
        patch: {
          kind: 'asset' as const,
          asset: { url: generatedAssetUrl },
          prefab: undefined,
          primitive: undefined,
          scale: fitResult?.appliedScale ?? fitData?.baseScale ?? [1, 1, 1],
          generation: {
            ...(plan.editorNodes.find(candidate => candidate.id === nodeId)
              ?.generation ?? {}),
            descriptor:
              fitData?.descriptor ??
              deps.getDefaultStyleDescriptor(plan.selectedNode),
            ...(fitData?.originalAssetUrl
              ? { originalAssetUrl: fitData.originalAssetUrl }
              : {}),
            sourceVisualSize: fitData?.sourceVisualBounds?.size,
            lastBakedAssetUrl: generatedAssetUrl,
            lastBakedAt: new Date().toISOString(),
          },
        },
      }
    }),
  )

  if (replacementPatches.length > 0) {
    for (const entry of replacementPatches) {
      deps.patchNode(entry.nodeId, entry.patch)
    }
    await deps.saveSceneDocumentToDisk(deps.getActiveSceneLevelId())
  }

  deps.appendPipelineLog(
    'Replaced node(s) with generated asset using preserved transform',
    {
      generatedAssetUrl,
      targets: plan.targetNodeIds.map(id => {
        const node = plan.editorNodes.find(candidate => candidate.id === id)
        return {
          id,
          transform: deps.getNodeTransformSnapshot(node ?? null),
        }
      }),
    },
  )

  return {
    appliedCount: replacementPatches.length,
    lastFitReport,
  }
}
