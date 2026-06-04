import { EDITOR_API_BASE } from '@config/editorApi'
import { getPrefabAssetUrl } from './editorBakeSource'
import { isEditorGeometryNode } from './editorCollisionDefaults'
import {
  type GeneratedAssetVisualBounds,
  fitGeneratedAssetToSource,
} from './editorGeneratedAssetApplication'
import { getDefaultChildPointLightPosition } from './editorLightPlacement'
import { type EditorNpcPatch, applyEditorNpcPatch } from './editorNpcControls'
import type { RuntimeLightBudgetGroup } from '../engine/sceneDocumentTypes'
import type {
  EditorCollisionLodSourceTier,
  EditorCollisionMode,
  EditorCollisionQuality,
  EditorNodeCollisionData,
  EditorPrimitiveData,
  EditorRigidBodyType,
  EditorSceneNode,
  SharedLevelEditorSettings,
} from './editorTypes'

type TextureField =
  | 'mapUrl'
  | 'normalMapUrl'
  | 'roughnessMapUrl'
  | 'metalnessMapUrl'
  | 'emissiveMapUrl'
  | 'alphaMapUrl'

type LibraryItem = {
  name: string
  path: string
  isDirectory: boolean
}
type LightEditableField =
  | 'intensity'
  | 'distance'
  | 'decay'
  | 'priority'
  | 'runtimeBudgeted'
  | 'budgetGroup'
  | 'castsShadow'

const runtimeLightBudgetGroups: RuntimeLightBudgetGroup[] = [
  'player',
  'authored',
  'firefly-npc',
  'shockwave',
  'ambient-vfx',
  'diagnostic',
]

function isRuntimeLightBudgetGroup(
  value: string,
): value is RuntimeLightBudgetGroup {
  return runtimeLightBudgetGroups.includes(value as RuntimeLightBudgetGroup)
}

type EditorPanelTab =
  | 'scene'
  | 'create'
  | 'world'
  | 'collision'
  | 'build'
  | 'ai'

type InspectorControllerDeps = {
  getLevelId: () => string
  getSelectedNode: () => EditorSceneNode | null
  getSelectedNodes: () => EditorSceneNode[]
  getEditorNodes: () => EditorSceneNode[]
  addNode: (node: EditorSceneNode) => string
  patchNode: (nodeId: string, patch: Partial<EditorSceneNode>) => void
  updateLevelSettings: (
    updater: (settings: SharedLevelEditorSettings) => SharedLevelEditorSettings,
  ) => void
  reparentNodes: (nodeIds: string[], parentId: string | null) => boolean
  selectEditorNode: (nodeId: string) => void
  setSaveMessage: (message: string) => void
  updateNodeStyleDescriptor: (nodeId: string, value: string) => void
  getNodeVisualColliderSize: (
    node: EditorSceneNode | null,
  ) => [number, number, number]
  getDefaultCollisionShape: (
    node: EditorSceneNode | null,
  ) => EditorNodeCollisionData['shape']
  getDefaultCollisionIntent: (
    node: EditorSceneNode | null,
  ) => NonNullable<EditorNodeCollisionData['intent']>
  getDefaultCollisionChannel: (
    node: EditorSceneNode | null,
  ) => NonNullable<EditorNodeCollisionData['channel']>

  getTextureBrowserPath: () => string
  getTextureBrowserItems: () => Array<{
    name: string
    path: string
    isDirectory: boolean
  }>
  getTextureBrowserLoading: () => boolean
  getActiveTextureMaterialField: () => TextureField | null
  setActiveTextureMaterialField: (field: TextureField | null) => void
  loadTextureBrowser: (path: string) => Promise<unknown>
  resolvePublicAssetUrl: (path: string, fallbackName: string) => string

  getAssetBrowserPath: () => string
  getSelectedLibraryItem: () => LibraryItem | null
  setSelectedLibraryItem: (item: LibraryItem | null) => void
  setAssetBrowserFilter: (value: string) => void
  loadAssetBrowser: (path: string) => Promise<LibraryItem[]>
  setAssetPickerTargetNodeId: (nodeId: string) => void
  getAssetPickerTargetNodeId: () => string
  setActiveEditorTab: (tab: EditorPanelTab) => void
  setPropertiesShelfOpen?: (open: boolean) => void
  setHunyuanSelectionKey: (value: string) => void
  setLastInspectedHunyuanAsset: (value: string) => void
  inspectSelectedAssetForHunyuan: (
    assetUrl: string,
    selectionKey: string,
  ) => Promise<unknown>
  getSceneNodeVisualBounds: (
    node: EditorSceneNode,
    sourceAssetUrl?: string,
  ) => Promise<GeneratedAssetVisualBounds>
  inspectGeneratedAssetBounds: (
    assetUrl: string,
  ) => Promise<GeneratedAssetVisualBounds | null>
  getDefaultStyleDescriptor: (node: EditorSceneNode | null) => string
  appendPipelineLog: (message: string, detail?: unknown) => void
  getNodeTransformSnapshot: (node: EditorSceneNode | null) => {
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
  } | null
  setSelectedGeneratedVariantUrl: (assetUrl: string) => void
  setHunyuanLastOutputUrl: (assetUrl: string) => void
  saveSceneDocumentToDisk: (levelId: string) => Promise<unknown>
}

export function createEditorInspectorController(deps: InspectorControllerDeps) {
  function getEditableGeometrySelection() {
    const selectedNodes = deps.getSelectedNodes().filter(isEditorGeometryNode)
    const selectedNode = deps.getSelectedNode()

    if (selectedNodes.length > 0) return selectedNodes
    return isEditorGeometryNode(selectedNode) ? [selectedNode] : []
  }

  function getEditableGeometryNodesByIds(nodeIds: string[]) {
    const idSet = new Set(nodeIds)
    return deps
      .getEditorNodes()
      .filter(node => idSet.has(node.id) && isEditorGeometryNode(node))
  }

  function clearCollisionArtifactFields(
    collision: EditorNodeCollisionData,
  ): EditorNodeCollisionData {
    return {
      ...collision,
      shape: undefined,
      enabled: undefined,
      size: undefined,
      colliderUrl: undefined,
      colliderMetadataUrl: undefined,
      colliderCacheKey: undefined,
      assetLocalTransform: undefined,
      sourceAssetUrl: undefined,
      colliderSourceAssetUrl: undefined,
      lockToObject: undefined,
      lodSourceTier: undefined,
      triangleBudget: undefined,
      triangleCount: undefined,
      vertexCount: undefined,
    }
  }

  function updateVisualOnlyRoleForNodes(
    nodes: EditorSceneNode[],
    visualOnly: boolean,
  ) {
    const nodeIds = new Set(nodes.map(node => node.id).filter(Boolean))
    if (nodeIds.size === 0) return

    deps.updateLevelSettings(settings => {
      const collision = settings.collision ?? {}
      const roles = collision.roles ?? {}
      const visualOnlyActorIds = roles.visualOnlyActorIds ?? []
      const nextVisualOnlyActorIds = visualOnly
        ? Array.from(new Set([...visualOnlyActorIds, ...nodeIds]))
        : visualOnlyActorIds.filter(actorId => !nodeIds.has(actorId))
      const nextCollisionGroundActorIds = roles.groundActorIds?.filter(
        actorId => !visualOnly || !nodeIds.has(actorId),
      )
      const nextGroundActorIds = settings.ground?.groundActorIds?.filter(
        actorId => !visualOnly || !nodeIds.has(actorId),
      )

      return {
        ...settings,
        collision: {
          ...collision,
          roles: {
            ...roles,
            visualOnlyActorIds: nextVisualOnlyActorIds,
            ...(nextCollisionGroundActorIds
              ? { groundActorIds: nextCollisionGroundActorIds }
              : {}),
          },
        },
        ...(settings.ground
          ? {
              ground: {
                ...settings.ground,
                ...(nextGroundActorIds
                  ? { groundActorIds: nextGroundActorIds }
                  : {}),
              },
            }
          : {}),
      }
    })
  }

  function enableCollisionRoleForNodes(nodes: EditorSceneNode[]) {
    updateVisualOnlyRoleForNodes(nodes, false)
  }

  function disableCollisionRoleForNodes(nodes: EditorSceneNode[]) {
    updateVisualOnlyRoleForNodes(nodes, true)
  }

  function buildCollisionPreset(
    node: EditorSceneNode,
    intent: NonNullable<EditorNodeCollisionData['intent']>,
    options: Partial<EditorNodeCollisionData> = {},
  ): EditorNodeCollisionData {
    const defaultShape = deps.getDefaultCollisionShape(node)
    const shape =
      options.shape ??
      (node.kind === 'asset' || node.kind === 'prefab'
        ? defaultShape
        : node.collision?.shape) ??
      defaultShape
    const channel =
      options.channel ??
      (intent === 'trigger'
        ? 'trigger'
        : intent === 'detailMesh'
          ? 'detail'
          : 'worldStatic')
    const quality =
      options.quality ??
      node.collision?.quality ??
      (intent === 'detailMesh' || shape === 'trimesh'
        ? 'simplifiedMesh'
        : 'primitive')
    const mode =
      options.mode ??
      (intent === 'trigger'
        ? 'trigger'
        : node.collision?.mode === 'none'
          ? 'auto'
          : node.collision?.mode ?? 'auto')

    return clearCollisionArtifactFields({
      ...(node.collision ?? {}),
      intent,
      channel,
      mode,
      quality,
      sensor: options.sensor ?? intent === 'trigger',
      friction: options.friction ?? node.collision?.friction ?? 0.7,
      restitution: options.restitution ?? node.collision?.restitution ?? 0,
      maxTriangles:
        quality === 'primitive'
          ? undefined
          : options.maxTriangles ??
            node.collision?.maxTriangles ??
            (intent === 'detailMesh' ? 20000 : 5000),
      generationStatus: quality === 'primitive' ? 'ready' : 'dirty',
      generationLastError: undefined,
      ...options,
    })
  }

  function applyCollisionPresetToSelection(
    intent: NonNullable<EditorNodeCollisionData['intent']>,
    message: string,
    options: Partial<EditorNodeCollisionData> = {},
  ) {
    const nodes = getEditableGeometrySelection()
    applyCollisionPresetToNodes(nodes, intent, message, options)
  }

  function applyCollisionPresetToNodes(
    nodes: EditorSceneNode[],
    intent: NonNullable<EditorNodeCollisionData['intent']>,
    message: string,
    options: Partial<EditorNodeCollisionData> = {},
  ) {
    if (nodes.length === 0) {
      deps.setSaveMessage('Select geometry before changing collision mode')
      return
    }

    for (const node of nodes) {
      deps.patchNode(node.id, {
        collision: buildCollisionPreset(node, intent, options),
        physics: {
          ...(node.physics ?? {}),
          bodyType: node.physics?.bodyType ?? 'fixed',
        },
      })
    }

    enableCollisionRoleForNodes(nodes)
    deps.setSaveMessage(
      nodes.length === 1 ? message : `${message} on ${nodes.length} objects`,
    )
  }

  function resolveWorkspaceAssetCandidates(assetUrl: string) {
    if (typeof assetUrl !== 'string' || !assetUrl.startsWith('/')) return []

    const normalizedUrl = assetUrl.replace(/^\/+/, '')
    return [
      `apps/megameal/public/${normalizedUrl}`,
      `apps/game/public/${normalizedUrl}`,
    ]
  }

  function resolveInitialAssetBrowserDirectory(
    preferredRoot: string,
    assetUrl: string,
  ) {
    const matchingAssetPath = resolveWorkspaceAssetCandidates(assetUrl).find(
      candidate =>
        candidate === preferredRoot ||
        candidate.startsWith(`${preferredRoot}/`),
    )

    if (!matchingAssetPath) {
      return {
        directoryPath: preferredRoot,
        selectedAssetPath: '',
      }
    }

    return {
      directoryPath: matchingAssetPath.replace(/\/[^/]+$/, ''),
      selectedAssetPath: matchingAssetPath,
    }
  }

  function updateParent(nextParentId: string) {
    const selectedNodes = deps.getSelectedNodes()
    if (selectedNodes.length === 0) return
    const applied = deps.reparentNodes(
      selectedNodes.map(node => node.id),
      nextParentId || null,
    )
    deps.setSaveMessage(
      applied ? 'Hierarchy updated' : 'Invalid parent relationship',
    )
  }

  function goUpTextureBrowser() {
    const parts = deps.getTextureBrowserPath().split('/').filter(Boolean)
    if (parts.length <= 1) return
    parts.pop()
    void deps.loadTextureBrowser(parts.join('/'))
  }

  function openTexturePicker(field: TextureField) {
    deps.setActiveTextureMaterialField(field)
    if (
      deps.getTextureBrowserItems().length === 0 &&
      !deps.getTextureBrowserLoading()
    ) {
      void deps.loadTextureBrowser(deps.getTextureBrowserPath())
    }
  }

  function updateNodeMaterialTextureField(field: TextureField, value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return
    deps.patchNode(selectedNode.id, {
      material: {
        ...(selectedNode.material ?? {}),
        [field]: value.trim() || undefined,
      },
    })
  }

  function applyTextureFromBrowser(item: { name: string; path: string }) {
    const activeTextureMaterialField = deps.getActiveTextureMaterialField()
    if (!activeTextureMaterialField) return
    updateNodeMaterialTextureField(
      activeTextureMaterialField,
      deps.resolvePublicAssetUrl(item.path, item.name),
    )
    deps.setActiveTextureMaterialField(null)
  }

  function goUpAssetBrowser() {
    const parts = deps.getAssetBrowserPath().split('/').filter(Boolean)
    if (parts.length <= 1) return
    parts.pop()
    void deps.loadAssetBrowser(parts.join('/'))
  }

  function selectAssetLibraryRoot(path: string) {
    deps.setSelectedLibraryItem(null)
    void deps.loadAssetBrowser(path)
  }

  function selectLibraryItem(item: LibraryItem) {
    if (item.isDirectory) {
      deps.setSelectedLibraryItem(null)
      void deps.loadAssetBrowser(item.path)
      return
    }

    deps.setSelectedLibraryItem(item)
    deps.setHunyuanSelectionKey(item.path)
    deps.setLastInspectedHunyuanAsset('')
    const publicUrl = deps.resolvePublicAssetUrl(item.path, item.name)
    void deps.inspectSelectedAssetForHunyuan(publicUrl, item.path)
  }

  async function openAssetPickerForSelectedNode(preferredRoot: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.asset) {
      deps.setSaveMessage(
        'Select an asset node before choosing a replacement asset',
      )
      return
    }

    const { directoryPath, selectedAssetPath } =
      resolveInitialAssetBrowserDirectory(preferredRoot, selectedNode.asset.url)

    deps.setAssetPickerTargetNodeId(selectedNode.id)
    deps.setSelectedLibraryItem(null)
    deps.setAssetBrowserFilter('')
    deps.setPropertiesShelfOpen?.(true)

    const items = await deps.loadAssetBrowser(directoryPath)
    const currentAssetItem = selectedAssetPath
      ? items.find(item => !item.isDirectory && item.path === selectedAssetPath)
      : null

    if (currentAssetItem) {
      selectLibraryItem(currentAssetItem)
    }

    deps.setSaveMessage(
      directoryPath === preferredRoot
        ? `Choose a replacement asset for ${selectedNode.name}`
        : `Choose a replacement asset for ${selectedNode.name} from its current folder`,
    )
  }

  function applySelectedLibraryAssetToTargetNode() {
    const assetPickerTargetNodeId = deps.getAssetPickerTargetNodeId()
    const selectedLibraryItem = deps.getSelectedLibraryItem()
    if (!assetPickerTargetNodeId) {
      deps.setSaveMessage(
        'No target object is waiting for an asset replacement',
      )
      return
    }
    if (!selectedLibraryItem || selectedLibraryItem.isDirectory) {
      deps.setSaveMessage('Select an asset file from the library first')
      return
    }

    const targetNode = deps
      .getEditorNodes()
      .find(node => node.id === assetPickerTargetNodeId)
    if (!targetNode?.asset) {
      deps.setSaveMessage(
        'The target object is no longer available for asset replacement',
      )
      deps.setAssetPickerTargetNodeId('')
      return
    }

    const url = deps.resolvePublicAssetUrl(
      selectedLibraryItem.path,
      selectedLibraryItem.name,
    )
    deps.patchNode(targetNode.id, {
      asset: {
        ...targetNode.asset,
        url,
      },
    })

    deps.selectEditorNode(targetNode.id)
    deps.setAssetPickerTargetNodeId('')
    deps.setSaveMessage(
      `Replaced ${targetNode.name} with ${selectedLibraryItem.name}`,
    )
    void deps.inspectSelectedAssetForHunyuan(url, targetNode.id)
  }

  function cancelAssetPickerTarget() {
    deps.setAssetPickerTargetNodeId('')
    deps.setSaveMessage('Asset replacement picker closed')
  }

  function getCollisionVisualBounds(
    node: EditorSceneNode,
  ): GeneratedAssetVisualBounds | null {
    const size = node.collision?.assetLocalTransform?.visualLocalBounds?.size
    if (!Array.isArray(size) || size.length !== 3) return null

    const scaledSize = size.map((value, index) => {
      const numericValue = Math.abs(Number(value))
      const scale = Math.abs(Number(node.scale[index] ?? 1))
      return numericValue * (Number.isFinite(scale) ? scale : 1)
    }) as [number, number, number]
    const maxDimension = Math.max(...scaledSize)

    if (!Number.isFinite(maxDimension) || maxDimension <= 0.0001) {
      return null
    }

    return { size: scaledSize, maxDimension }
  }

  function getStoredSourceVisualBounds(
    node: EditorSceneNode,
  ): GeneratedAssetVisualBounds | null {
    const size = node.generation?.sourceVisualSize
    if (!Array.isArray(size) || size.length !== 3) return null

    const sourceSize = size.map(value => Math.abs(Number(value))) as [
      number,
      number,
      number,
    ]
    const maxDimension = Math.max(...sourceSize)

    if (!Number.isFinite(maxDimension) || maxDimension <= 0.0001) {
      return null
    }

    return { size: sourceSize, maxDimension }
  }

  function getOriginalAssetUrl(node: EditorSceneNode) {
    return (
      node.generation?.originalAssetUrl ??
      node.collision?.assetLocalTransform?.sourceAssetUrl ??
      node.asset?.url ??
      ''
    )
  }

  async function applyGeneratedVariantToSelectedNode(assetUrl: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.asset) {
      deps.setSaveMessage(
        'Select a generated asset node before applying a variant.',
      )
      return
    }
    if (!assetUrl) return

    deps.setSaveMessage(`Fitting variant to ${selectedNode.name}...`)
    const sourceVisualBounds =
      getStoredSourceVisualBounds(selectedNode) ??
      getCollisionVisualBounds(selectedNode) ??
      (await deps.getSceneNodeVisualBounds(
        selectedNode,
        selectedNode.asset.url,
      ))
    const originalAssetUrl = getOriginalAssetUrl(selectedNode)
    const fitResult = await fitGeneratedAssetToSource(
      deps,
      selectedNode.id,
      sourceVisualBounds,
      assetUrl,
      [...selectedNode.scale] as [number, number, number],
    )
    deps.patchNode(selectedNode.id, {
      kind: 'asset',
      asset: { url: assetUrl },
      scale: fitResult.appliedScale,
      prefab: undefined,
      primitive: undefined,
      generation: {
        ...(selectedNode.generation ?? {}),
        descriptor: deps.getDefaultStyleDescriptor(selectedNode),
        originalAssetUrl,
        sourceVisualSize: sourceVisualBounds.size,
        lastBakedAssetUrl: assetUrl,
        lastBakedAt: new Date().toISOString(),
      },
    })

    deps.appendPipelineLog('Applied generated variant with visual fit', {
      nodeId: selectedNode.id,
      assetUrl,
      fitReport: fitResult.report,
      transform: deps.getNodeTransformSnapshot(selectedNode),
    })
    deps.setSelectedGeneratedVariantUrl(assetUrl)
    deps.setHunyuanLastOutputUrl(assetUrl)
    deps.setSaveMessage(`Applied variant to ${selectedNode.name}`)
    void deps.inspectSelectedAssetForHunyuan(assetUrl, selectedNode.id)
  }

  function updateNodeName(value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return
    deps.patchNode(selectedNode.id, { name: value })
  }

  function updateVisible(value: boolean) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return
    deps.patchNode(selectedNode.id, { visible: value })
  }

  function updateSelectedNodeStyleDescriptor(value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return
    deps.updateNodeStyleDescriptor(selectedNode.id, value)
  }

  function updatePrefabVariant(value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.prefab) return
    deps.patchNode(selectedNode.id, {
      prefab: {
        ...selectedNode.prefab,
        variant: value || undefined,
      },
    })
  }

  function updatePrimitiveField(field: 'geometry', value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.primitive) return
    deps.patchNode(selectedNode.id, {
      primitive: {
        ...selectedNode.primitive,
        [field]: value as EditorPrimitiveData['geometry'],
      },
    })
  }

  function updateNodeMaterialField(field: 'color' | 'emissive', value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return
    deps.patchNode(selectedNode.id, {
      material: {
        ...(selectedNode.material ?? {}),
        [field]: value || undefined,
      },
    })
  }

  function updateNodeMaterialNumericField(
    field:
      | 'emissiveIntensity'
      | 'metalness'
      | 'roughness'
      | 'opacity'
      | 'envMapIntensity'
      | 'transmission'
      | 'ior'
      | 'clearcoat'
      | 'clearcoatRoughness'
      | 'thickness'
      | 'reflectivity',
    value: string,
  ) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    deps.patchNode(selectedNode.id, {
      material: {
        ...(selectedNode.material ?? {}),
        [field]: numeric,
      },
    })
  }

  function updateNodeMaterialBooleanField(
    field: 'transparent' | 'wireframe' | 'doubleSided' | 'flatShading',
    value: boolean,
  ) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return
    deps.patchNode(selectedNode.id, {
      material: {
        ...(selectedNode.material ?? {}),
        [field]: value,
      },
    })
  }

  function clearNodeMaterialOverrides() {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return
    deps.patchNode(selectedNode.id, { material: undefined })
  }

  function updateCollisionEnabled(value: boolean) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !isEditorGeometryNode(selectedNode)) return
    const defaultShape = deps.getDefaultCollisionShape(selectedNode)
    const defaultIntent = deps.getDefaultCollisionIntent(selectedNode)

    if (value) {
      enableCollisionRoleForNodes([selectedNode])
    } else {
      enableCollisionRoleForNodes([selectedNode])
    }

    deps.patchNode(selectedNode.id, {
      collision: value
        ? {
            intent: selectedNode.collision?.intent ?? defaultIntent,
            channel:
              selectedNode.collision?.channel ??
              deps.getDefaultCollisionChannel(selectedNode),
            mode:
              selectedNode.collision?.mode === 'none'
                ? 'auto'
                : selectedNode.collision?.mode ?? 'auto',
            quality:
              selectedNode.collision?.quality ??
              (defaultShape === 'trimesh' ? 'simplifiedMesh' : 'primitive'),
            friction: selectedNode.collision?.friction ?? 0.7,
            restitution: selectedNode.collision?.restitution ?? 0,
            sensor: selectedNode.collision?.sensor ?? false,
          }
        : {
            intent: 'none',
            channel: 'worldStatic',
            mode: 'none',
          },
    })
  }

  function getQualityShape(
    node: EditorSceneNode,
    quality: EditorCollisionQuality,
  ): EditorNodeCollisionData['shape'] {
    if (quality === 'primitive') return deps.getDefaultCollisionShape(node)
    return 'trimesh'
  }

  function getGenerationStatusForQuality(
    quality: EditorCollisionQuality,
  ): EditorNodeCollisionData['generationStatus'] {
    return quality === 'primitive' ? 'ready' : 'dirty'
  }

  function updateCollisionMode(value: EditorCollisionMode) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !isEditorGeometryNode(selectedNode)) return

    if (value === 'none') {
      enableCollisionRoleForNodes([selectedNode])
      deps.patchNode(selectedNode.id, {
        collision: {
          ...(selectedNode.collision ?? {
            channel: deps.getDefaultCollisionChannel(selectedNode),
          }),
          mode: 'none',
          intent: 'none',
          generationStatus: undefined,
          generationLastError: undefined,
        },
      })
      deps.setSaveMessage(`Disabled collision for ${selectedNode.name}`)
      return
    }

    const intent =
      value === 'trigger'
        ? 'trigger'
        : selectedNode.collision?.intent &&
            selectedNode.collision.intent !== 'none'
          ? selectedNode.collision.intent
          : deps.getDefaultCollisionIntent(selectedNode)
    applyCollisionPresetToNodes(
      [selectedNode],
      intent,
      value === 'trigger'
        ? 'Set collision mode to trigger'
        : 'Set collision mode to auto',
      {
        mode: value,
        sensor: value === 'trigger',
      },
    )
  }

  function updateCollisionQuality(value: EditorCollisionQuality) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !isEditorGeometryNode(selectedNode)) return

    const shape = getQualityShape(selectedNode, value)
    const intent =
      selectedNode.collision?.intent && selectedNode.collision.intent !== 'none'
        ? selectedNode.collision.intent
        : deps.getDefaultCollisionIntent(selectedNode)
    const mode =
      selectedNode.collision?.mode && selectedNode.collision.mode !== 'none'
        ? selectedNode.collision.mode
        : intent === 'trigger'
          ? 'trigger'
          : 'auto'
    const nextCollision: EditorNodeCollisionData = {
      ...clearCollisionArtifactFields(
        selectedNode.collision ??
          buildCollisionPreset(selectedNode, intent, { shape }),
      ),
      mode,
      quality: value,
      intent,
      channel:
        selectedNode.collision?.channel ??
        deps.getDefaultCollisionChannel(selectedNode),
      generationStatus: getGenerationStatusForQuality(value),
      generationLastError: undefined,
      ...(shape === 'trimesh'
        ? {
            maxTriangles: selectedNode.collision?.maxTriangles ?? 5000,
          }
        : {
            maxTriangles: undefined,
          }),
    }

    enableCollisionRoleForNodes([selectedNode])
    deps.patchNode(selectedNode.id, {
      collision: nextCollision,
      physics: {
        ...(selectedNode.physics ?? {}),
        bodyType: selectedNode.physics?.bodyType ?? 'fixed',
      },
    })
    deps.setSaveMessage(
      value === 'primitive'
        ? `Set ${selectedNode.name} collision quality to primitive`
        : `Set ${selectedNode.name} collision quality to ${value}; regeneration required`,
    )
  }

  function updateCollisionLodSourceTier(value: EditorCollisionLodSourceTier) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !isEditorGeometryNode(selectedNode)) return
    enableCollisionRoleForNodes([selectedNode])
    deps.patchNode(selectedNode.id, {
      collision: {
        ...(selectedNode.collision ?? {
          intent: deps.getDefaultCollisionIntent(selectedNode),
          channel: deps.getDefaultCollisionChannel(selectedNode),
        }),
        mode: selectedNode.collision?.mode ?? 'auto',
        lodTier: value,
        generationStatus:
          selectedNode.collision?.quality === 'primitive' ? 'ready' : 'dirty',
        generationLastError: undefined,
      },
    })
  }

  function updateCollisionShape(value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !isEditorGeometryNode(selectedNode)) return
    const requestedShape = value as EditorNodeCollisionData['shape']
    const quality =
      selectedNode.kind === 'asset' || selectedNode.kind === 'prefab'
        ? 'simplifiedMesh'
        : requestedShape === 'trimesh'
          ? 'simplifiedMesh'
          : 'primitive'
    const intent =
      selectedNode.collision?.intent && selectedNode.collision.intent !== 'none'
        ? selectedNode.collision.intent
        : deps.getDefaultCollisionIntent(selectedNode)
    const baseCollision = clearCollisionArtifactFields(
      selectedNode.collision ??
        buildCollisionPreset(selectedNode, intent, {
          quality,
          shape: requestedShape,
        }),
    )
    const mode =
      baseCollision.mode && baseCollision.mode !== 'none'
        ? baseCollision.mode
        : intent === 'trigger'
          ? 'trigger'
          : 'auto'

    enableCollisionRoleForNodes([selectedNode])

    deps.patchNode(selectedNode.id, {
      collision: {
        ...baseCollision,
        mode,
        intent,
        channel:
          baseCollision.channel ??
          deps.getDefaultCollisionChannel(selectedNode),
        quality,
        maxTriangles:
          quality === 'primitive'
            ? undefined
            : selectedNode.collision?.maxTriangles ?? 5000,
        generationStatus: getGenerationStatusForQuality(quality),
        generationLastError: undefined,
      },
    })
  }

  function updateCollisionIntent(value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !isEditorGeometryNode(selectedNode)) return
    const intent = value as NonNullable<EditorNodeCollisionData['intent']>
    const baseCollision =
      selectedNode.collision ??
      buildCollisionPreset(
        selectedNode,
        intent === 'none'
          ? deps.getDefaultCollisionIntent(selectedNode)
          : intent,
      )

    if (intent === 'none') {
      enableCollisionRoleForNodes([selectedNode])
      deps.patchNode(selectedNode.id, {
        collision: {
          ...baseCollision,
          intent,
          channel: baseCollision.channel ?? 'worldStatic',
          mode: 'none',
          sensor: false,
          generationStatus: undefined,
          generationLastError: undefined,
        },
      })
      return
    }

    enableCollisionRoleForNodes([selectedNode])
    const mode =
      intent === 'trigger'
        ? 'trigger'
        : selectedNode.collision?.mode === 'none'
          ? 'auto'
          : selectedNode.collision?.mode ?? 'auto'
    const quality = baseCollision.quality ?? 'primitive'

    deps.patchNode(selectedNode.id, {
      collision: {
        ...baseCollision,
        intent,
        mode,
        channel:
          baseCollision.channel ??
          deps.getDefaultCollisionChannel({
            ...selectedNode,
            collision: {
              ...baseCollision,
              intent,
            },
          }),
        sensor: intent === 'trigger',
        friction: baseCollision.friction ?? 0.7,
        restitution: baseCollision.restitution ?? 0,
        generationStatus:
          quality === 'primitive'
            ? 'ready'
            : selectedNode.collision?.intent === intent
              ? baseCollision.generationStatus
              : 'dirty',
        generationLastError:
          quality === 'primitive' || selectedNode.collision?.intent !== intent
            ? undefined
            : baseCollision.generationLastError,
      },
    })
  }

  function updateCollisionChannel(value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !isEditorGeometryNode(selectedNode)) return
    const baseCollision =
      selectedNode.collision ??
      buildCollisionPreset(
        selectedNode,
        deps.getDefaultCollisionIntent(selectedNode),
      )
    const quality = baseCollision.quality ?? 'primitive'
    enableCollisionRoleForNodes([selectedNode])

    deps.patchNode(selectedNode.id, {
      collision: {
        ...baseCollision,
        mode:
          selectedNode.collision?.mode === 'none'
            ? 'auto'
            : selectedNode.collision?.mode ?? 'auto',
        channel: value as EditorNodeCollisionData['channel'],
        generationStatus:
          quality === 'primitive'
            ? 'ready'
            : selectedNode.collision?.channel === value
              ? baseCollision.generationStatus
              : 'dirty',
        generationLastError:
          quality === 'primitive' || selectedNode.collision?.channel !== value
            ? undefined
            : baseCollision.generationLastError,
      },
    })
  }

  function updateCollisionNumericField(
    field: 'friction' | 'restitution' | 'maxTriangles',
    value: string,
  ) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !isEditorGeometryNode(selectedNode)) return
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    const baseCollision =
      selectedNode.collision ??
      buildCollisionPreset(
        selectedNode,
        deps.getDefaultCollisionIntent(selectedNode),
      )
    const quality = baseCollision.quality ?? 'primitive'
    enableCollisionRoleForNodes([selectedNode])

    deps.patchNode(selectedNode.id, {
      collision: {
        ...baseCollision,
        mode:
          selectedNode.collision?.mode === 'none'
            ? 'auto'
            : selectedNode.collision?.mode ?? 'auto',
        ...(field === 'maxTriangles' && quality !== 'primitive'
          ? {
              generationStatus: 'dirty' as const,
              generationLastError: undefined,
            }
          : {}),
        [field]: numeric,
      },
    })
  }

  function updateCollisionBooleanField(field: 'sensor', value: boolean) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !isEditorGeometryNode(selectedNode)) return
    const baseCollision =
      selectedNode.collision ??
      buildCollisionPreset(
        selectedNode,
        deps.getDefaultCollisionIntent(selectedNode),
      )
    enableCollisionRoleForNodes([selectedNode])
    deps.patchNode(selectedNode.id, {
      collision: {
        ...baseCollision,
        intent: value
          ? 'trigger'
          : selectedNode.collision?.intent === 'trigger'
            ? deps.getDefaultCollisionIntent(selectedNode)
            : selectedNode.collision?.intent,
        mode: value
          ? 'trigger'
          : selectedNode.collision?.mode === 'trigger'
            ? 'auto'
            : selectedNode.collision?.mode ?? 'auto',
        [field]: value,
      },
    })
  }

  function setVisualOnlyForNodes(nodes: EditorSceneNode[]) {
    if (nodes.length === 0) {
      deps.setSaveMessage('Select geometry before changing collision mode')
      return
    }

    for (const node of nodes) {
      deps.patchNode(node.id, {
        collision: {
          ...clearCollisionArtifactFields(node.collision ?? {}),
          intent: 'none',
          channel: node.collision?.channel ?? 'worldStatic',
          mode: 'none',
          sensor: false,
          generationStatus: undefined,
          generationLastError: undefined,
        },
      })
    }

    disableCollisionRoleForNodes(nodes)
    deps.setSaveMessage(
      nodes.length === 1
        ? 'Marked object as visual only'
        : `Marked ${nodes.length} objects as visual only`,
    )
  }

  function setVisualOnly() {
    setVisualOnlyForNodes(getEditableGeometrySelection())
  }

  function disableCollisionForNodes(nodes: EditorSceneNode[]) {
    if (nodes.length === 0) {
      deps.setSaveMessage('Select geometry before disabling collision')
      return
    }

    for (const node of nodes) {
      deps.patchNode(node.id, {
        collision: {
          ...clearCollisionArtifactFields(node.collision ?? {}),
          intent: 'none',
          channel: node.collision?.channel ?? 'worldStatic',
          mode: 'none',
          sensor: false,
          generationStatus: undefined,
          generationLastError: undefined,
        },
      })
    }

    enableCollisionRoleForNodes(nodes)
    deps.setSaveMessage(
      nodes.length === 1
        ? 'Disabled collision'
        : `Disabled collision on ${nodes.length} objects`,
    )
  }

  function setBlocker() {
    applyCollisionPresetToSelection('blocker', 'Set collision mode to blocker')
  }

  function setWalkable() {
    applyCollisionPresetToSelection(
      'walkable',
      'Set collision mode to walkable',
    )
  }

  function setTrigger() {
    applyCollisionPresetToSelection('trigger', 'Set collision mode to trigger')
  }

  function setDetail() {
    applyCollisionPresetToSelection(
      'detailMesh',
      'Set collision mode to detail',
    )
  }

  async function bakeMeshColliderForNode(selectedNode: EditorSceneNode | null) {
    if (
      !selectedNode ||
      (selectedNode.kind !== 'asset' && selectedNode.kind !== 'prefab')
    ) {
      deps.setSaveMessage(
        'Select one asset or prefab mesh before baking a mesh collider',
      )
      return
    }

    const assetUrl =
      selectedNode.kind === 'prefab'
        ? getPrefabAssetUrl(
            selectedNode.prefab?.type,
            selectedNode.prefab?.variant,
          )?.trim()
        : selectedNode.asset?.url?.trim()
    if (!assetUrl) {
      deps.setSaveMessage('Selected node has no source asset URL to bake from')
      return
    }

    try {
      await deps.saveSceneDocumentToDisk(deps.getLevelId())
    } catch (error) {
      console.error('Pre-bake scene save failed:', error)
      deps.setSaveMessage(
        error instanceof Error
          ? `Cannot bake: scene save failed (${error.message})`
          : 'Cannot bake: scene save failed',
      )
      return
    }

    const intent =
      selectedNode.collision?.intent && selectedNode.collision.intent !== 'none'
        ? selectedNode.collision.intent
        : 'blocker'
    const channel =
      selectedNode.collision?.channel ??
      (intent === 'trigger'
        ? 'trigger'
        : intent === 'detailMesh'
          ? 'detail'
          : 'worldStatic')
    const triangleBudget =
      selectedNode.collision?.maxTriangles ??
      selectedNode.collision?.triangleBudget ??
      (intent === 'detailMesh' ? 20000 : 5000)
    const quality = selectedNode.collision?.quality ?? 'simplifiedMesh'
    const lodSourceTier = selectedNode.collision?.lodTier ?? 'low'

    if (quality === 'convexHull') {
      const message =
        'Convex hull collision generation is not supported by the current mesh collider baker.'
      enableCollisionRoleForNodes([selectedNode])
      deps.patchNode(selectedNode.id, {
        collision: {
          ...clearCollisionArtifactFields(
            selectedNode.collision ??
              buildCollisionPreset(selectedNode, intent, { quality }),
          ),
          mode: intent === 'trigger' ? 'trigger' : 'auto',
          quality,
          lodTier: lodSourceTier,
          intent,
          channel,
          maxTriangles: triangleBudget,
          generationStatus: 'failed',
          generationLastError: message,
        },
      })
      deps.setSaveMessage(message)
      return
    }

    deps.setSaveMessage(`Baking mesh collider for ${selectedNode.name}...`)
    enableCollisionRoleForNodes([selectedNode])
    deps.patchNode(selectedNode.id, {
      collision: {
        ...clearCollisionArtifactFields(
          selectedNode.collision ??
            buildCollisionPreset(selectedNode, intent, { quality }),
        ),
        mode: intent === 'trigger' ? 'trigger' : 'auto',
        quality,
        lodTier: lodSourceTier,
        intent,
        channel,
        maxTriangles: triangleBudget,
        generationStatus: 'generating',
        generationLastError: undefined,
      },
    })

    try {
      const response = await fetch(
        `${EDITOR_API_BASE}/api/editor-collision/bake-mesh-collider`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            levelId: deps.getLevelId(),
            nodeId: selectedNode.id,
            assetUrl,
            intent,
            channel,
            triangleBudget,
            lodSourceTier,
            simplify: quality !== 'trimesh',
          }),
        },
      )
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message ?? 'Mesh collider bake failed')
      }

      const collision = payload.collision ?? {}
      deps.patchNode(selectedNode.id, {
        collision: {
          ...clearCollisionArtifactFields(selectedNode.collision ?? {}),
          shape: 'trimesh',
          colliderUrl: payload.colliderUrl ?? collision.colliderUrl,
          colliderMetadataUrl:
            payload.metadataUrl ?? collision.colliderMetadataUrl,
          assetLocalTransform:
            collision.assetLocalTransform ??
            payload.assetLocalTransform ??
            selectedNode.collision?.assetLocalTransform ??
            null,
          maxTriangles:
            collision.maxTriangles ??
            collision.triangleBudget ??
            triangleBudget,
          triangleCount: collision.triangleCount ?? payload.triangleCount,
          intent: collision.intent ?? intent,
          channel: collision.channel ?? channel,
          mode: intent === 'trigger' ? 'trigger' : 'auto',
          quality,
          lodTier: collision.lodTier ?? payload.lodSourceTier ?? lodSourceTier,
          generationStatus: 'ready',
          generationLastError: undefined,
          sourceAssetUrl: assetUrl,
          colliderSourceAssetUrl:
            collision.colliderSourceAssetUrl ?? payload.colliderSourceAssetUrl,
          colliderCacheKey:
            payload.colliderCacheKey ??
            payload.sourceAssetFingerprint?.value ??
            payload.generatedAt ??
            String(Date.now()),
          sensor:
            collision.sensor ??
            (intent === 'trigger' || intent === 'detailMesh'),
          friction:
            collision.friction ?? selectedNode.collision?.friction ?? 0.7,
          restitution:
            collision.restitution ?? selectedNode.collision?.restitution ?? 0,
        },
      })

      deps.setSaveMessage(
        payload.message ?? `Baked mesh collider for ${selectedNode.name}`,
      )
    } catch (error) {
      console.error('Mesh collider bake failed:', error)
      const message =
        error instanceof Error ? error.message : 'Mesh collider bake failed'
      deps.patchNode(selectedNode.id, {
        collision: {
          ...clearCollisionArtifactFields(
            selectedNode.collision ??
              buildCollisionPreset(selectedNode, intent, { quality }),
          ),
          mode: intent === 'trigger' ? 'trigger' : 'auto',
          quality,
          lodTier: lodSourceTier,
          intent,
          channel,
          maxTriangles: triangleBudget,
          generationStatus: 'failed',
          generationLastError: message,
        },
      })
      deps.setSaveMessage(message)
    }
  }

  async function bakeMeshColliderFromSelection() {
    await bakeMeshColliderForNode(deps.getSelectedNode())
  }

  async function forceRegenerateCollisionFromSelection() {
    await bakeMeshColliderFromSelection()
  }

  async function bakeMeshColliderForNodeId(nodeId: string) {
    const node = deps
      .getEditorNodes()
      .find(candidate => candidate.id === nodeId)
    deps.selectEditorNode(nodeId)
    await bakeMeshColliderForNode(node ?? null)
  }

  function setCollisionPresetForNodeId(
    nodeId: string,
    intent: NonNullable<EditorNodeCollisionData['intent']>,
    message: string,
  ) {
    const nodes = getEditableGeometryNodesByIds([nodeId])
    deps.selectEditorNode(nodeId)
    applyCollisionPresetToNodes(nodes, intent, message)
  }

  function setVisualOnlyForNodeId(nodeId: string) {
    const nodes = getEditableGeometryNodesByIds([nodeId])
    deps.selectEditorNode(nodeId)
    setVisualOnlyForNodes(nodes)
  }

  function disableCollisionForNodeId(nodeId: string) {
    const nodes = getEditableGeometryNodesByIds([nodeId])
    deps.selectEditorNode(nodeId)
    disableCollisionForNodes(nodes)
  }

  function updatePhysicsField(field: 'bodyType', value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return
    deps.patchNode(selectedNode.id, {
      physics: {
        ...(selectedNode.physics ?? {}),
        [field]: value as EditorRigidBodyType,
      },
    })
  }

  function updatePhysicsNumericField(
    field: 'gravityScale' | 'linearDamping' | 'angularDamping',
    value: string,
  ) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    deps.patchNode(selectedNode.id, {
      physics: {
        ...(selectedNode.physics ?? {}),
        [field]: numeric,
      },
    })
  }

  function updatePhysicsBooleanField(
    field: 'canSleep' | 'ccd' | 'lockRotations' | 'lockTranslations',
    value: boolean,
  ) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return
    deps.patchNode(selectedNode.id, {
      physics: {
        ...(selectedNode.physics ?? {}),
        [field]: value,
      },
    })
  }

  function updatePrimitiveArg(index: number, value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.primitive) return
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    const args = [...selectedNode.primitive.args]
    args[index] = numeric
    deps.patchNode(selectedNode.id, {
      primitive: {
        ...selectedNode.primitive,
        args,
      },
    })
  }

  function updateAssetUrl(value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.asset) return
    deps.patchNode(selectedNode.id, {
      asset: {
        ...selectedNode.asset,
        url: value,
      },
    })
  }

  function updateLightField(field: 'color', value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.light) return
    deps.patchNode(selectedNode.id, {
      light: {
        ...selectedNode.light,
        [field]: value,
      },
    })
  }

  function updateLightNumericField(
    field: LightEditableField,
    value: string,
  ) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.light) return

    if (field === 'runtimeBudgeted' || field === 'castsShadow') {
      deps.patchNode(selectedNode.id, {
        light: {
          ...selectedNode.light,
          [field]: value === 'true' || value === '1',
        },
      })
      return
    }

    if (field === 'budgetGroup') {
      deps.patchNode(selectedNode.id, {
        light: {
          ...selectedNode.light,
          budgetGroup: isRuntimeLightBudgetGroup(value) ? value : undefined,
        },
      })
      return
    }

    if (field === 'priority' && value.trim() === '') {
      deps.patchNode(selectedNode.id, {
        light: {
          ...selectedNode.light,
          priority: undefined,
        },
      })
      return
    }

    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    deps.patchNode(selectedNode.id, {
      light: {
        ...selectedNode.light,
        [field]: numeric,
      },
    })
  }

  function placeSelectedLightAtParentBounds() {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.light) return

    const parentId = selectedNode.parentId
    if (!parentId) {
      deps.setSaveMessage('Select a child light with a parent object')
      return
    }

    const parentNode = deps.getEditorNodes().find(node => node.id === parentId)
    if (!parentNode) {
      deps.setSaveMessage('Light parent object was not found')
      return
    }

    deps.patchNode(selectedNode.id, {
      position: getDefaultChildPointLightPosition(parentNode),
    })
    deps.setSaveMessage(`Moved ${selectedNode.name} outside ${parentNode.name}`)
  }

  function updateGameplayField(
    field:
      | 'title'
      | 'author'
      | 'location'
      | 'excerpt'
      | 'body'
      | 'targetLevelId'
      | 'markerColor'
      | 'audioTrack'
      | 'fogColor'
      | 'mistColor',
    value: string,
  ) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.gameplay) return
    deps.patchNode(selectedNode.id, {
      gameplay: {
        ...selectedNode.gameplay,
        [field]: value,
      },
    })
  }

  function updateGameplayBooleanField(_field: never, _value: boolean) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.gameplay) return
  }

  function updateGameplayNumericField(
    field:
      | 'markerSize'
      | 'audioVolume'
      | 'regionFalloff'
      | 'fogDensity'
      | 'mistOpacity'
      | 'mistLayers'
      | 'mistSpacing'
      | 'mistScale'
      | 'mistDriftSpeed',
    value: string,
  ) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.gameplay) return
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    deps.patchNode(selectedNode.id, {
      gameplay: {
        ...selectedNode.gameplay,
        [field]: numeric,
      },
    })
  }

  function updateNpcField(patch: EditorNpcPatch) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.npc) return
    deps.patchNode(selectedNode.id, {
      npc: applyEditorNpcPatch(selectedNode.npc, patch),
    })
  }

  return {
    updateParent,
    goUpTextureBrowser,
    openTexturePicker,
    applyTextureFromBrowser,
    goUpAssetBrowser,
    selectAssetLibraryRoot,
    selectLibraryItem,
    openAssetPickerForSelectedNode,
    applySelectedLibraryAssetToTargetNode,
    cancelAssetPickerTarget,
    applyGeneratedVariantToSelectedNode,
    updateNodeName,
    updateVisible,
    updateSelectedNodeStyleDescriptor,
    updatePrefabVariant,
    updatePrimitiveField,
    updateNodeMaterialField,
    updateNodeMaterialTextureField,
    updateNodeMaterialNumericField,
    updateNodeMaterialBooleanField,
    clearNodeMaterialOverrides,
    updateCollisionEnabled,
    updateCollisionMode,
    updateCollisionShape,
    updateCollisionQuality,
    updateCollisionLodSourceTier,
    updateCollisionIntent,
    updateCollisionChannel,
    updateCollisionNumericField,
    updateCollisionBooleanField,
    setVisualOnly,
    setBlocker,
    setWalkable,
    setTrigger,
    setDetail,
    setBlockerForNodeId: (nodeId: string) =>
      setCollisionPresetForNodeId(
        nodeId,
        'blocker',
        'Set collision mode to blocker',
      ),
    setWalkableForNodeId: (nodeId: string) =>
      setCollisionPresetForNodeId(
        nodeId,
        'walkable',
        'Set collision mode to walkable',
      ),
    setTriggerForNodeId: (nodeId: string) =>
      setCollisionPresetForNodeId(
        nodeId,
        'trigger',
        'Set collision mode to trigger',
      ),
    setVisualOnlyForNodeId,
    disableCollisionForNodeId,
    bakeMeshColliderFromSelection,
    forceRegenerateCollisionFromSelection,
    bakeMeshColliderForNodeId,
    updatePhysicsField,
    updatePhysicsNumericField,
    updatePhysicsBooleanField,
    updatePrimitiveArg,
    updateAssetUrl,
    updateLightField,
    updateLightNumericField,
    placeSelectedLightAtParentBounds,
    updateGameplayField,
    updateGameplayBooleanField,
    updateGameplayNumericField,
    updateNpcField,
  }
}
