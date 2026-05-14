import { EDITOR_API_BASE } from '@config/editorApi'
import { getPrefabAssetUrl } from './editorBakeSource'
import {
  getNodeVisualColliderSizeSource,
  isEditorGeometryNode,
} from './editorCollisionDefaults'
import {
  type GeneratedAssetVisualBounds,
  fitGeneratedAssetToSource,
} from './editorGeneratedAssetApplication'
import type {
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

  function getCollisionSizeForShape(
    node: EditorSceneNode,
    shape: EditorNodeCollisionData['shape'],
  ) {
    return shape === 'trimesh'
      ? {}
      : {
          size: node.collision?.size ?? deps.getNodeVisualColliderSize(node),
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
    const previousShape =
      options.shape ??
      (node.kind === 'asset' || node.kind === 'prefab'
        ? defaultShape
        : node.collision?.shape) ??
      defaultShape
    const shape =
      intent === 'detailMesh'
        ? options.shape ??
          (node.kind === 'asset' || node.kind === 'prefab'
            ? defaultShape
            : node.collision?.shape) ??
          'trimesh'
        : previousShape
    const channel =
      options.channel ??
      (intent === 'trigger'
        ? 'trigger'
        : intent === 'detailMesh'
          ? 'detail'
          : 'worldStatic')

    return {
      ...(node.collision ?? {}),
      shape,
      intent,
      channel,
      enabled: true,
      sensor: options.sensor ?? intent === 'trigger',
      friction: options.friction ?? node.collision?.friction ?? 0.7,
      restitution: options.restitution ?? node.collision?.restitution ?? 0,
      triangleBudget:
        intent === 'detailMesh'
          ? options.triangleBudget ?? node.collision?.triangleBudget ?? 0
          : node.collision?.triangleBudget,
      ...getCollisionSizeForShape(node, shape),
      ...options,
    }
  }

  function applyCollisionPresetToSelection(
    intent: NonNullable<EditorNodeCollisionData['intent']>,
    message: string,
    options: Partial<EditorNodeCollisionData> = {},
  ) {
    const nodes = getEditableGeometrySelection()
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
    if (!selectedNode) return
    const defaultShape = deps.getDefaultCollisionShape(selectedNode)
    const defaultIntent = deps.getDefaultCollisionIntent(selectedNode)

    if (value) {
      enableCollisionRoleForNodes([selectedNode])
    } else {
      disableCollisionRoleForNodes([selectedNode])
    }

    deps.patchNode(selectedNode.id, {
      collision: value
        ? {
            shape: defaultShape,
            intent: selectedNode.collision?.intent ?? defaultIntent,
            channel:
              selectedNode.collision?.channel ??
              deps.getDefaultCollisionChannel(selectedNode),
            enabled: true,
            ...(defaultShape === 'trimesh'
              ? {}
              : {
                  size:
                    selectedNode.collision?.size ??
                    deps.getNodeVisualColliderSize(selectedNode),
                }),
            friction: selectedNode.collision?.friction ?? 0.7,
            restitution: selectedNode.collision?.restitution ?? 0,
            sensor: selectedNode.collision?.sensor ?? false,
          }
        : {
            shape: 'cuboid',
            intent: 'none',
            channel: 'worldStatic',
            enabled: false,
          },
    })
  }

  function updateCollisionShape(value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !isEditorGeometryNode(selectedNode)) return
    const requestedShape = value as EditorNodeCollisionData['shape']
    const shape =
      selectedNode.kind === 'asset' || selectedNode.kind === 'prefab'
        ? 'trimesh'
        : requestedShape
    enableCollisionRoleForNodes([selectedNode])
    const baseCollision =
      selectedNode.collision ??
      buildCollisionPreset(
        selectedNode,
        deps.getDefaultCollisionIntent(selectedNode),
        { shape },
      )

    deps.patchNode(selectedNode.id, {
      collision: {
        ...baseCollision,
        shape,
        enabled: baseCollision.intent !== 'none',
        ...(shape === 'trimesh'
          ? { size: undefined }
          : {
              size:
                selectedNode.collision?.size ??
                deps.getNodeVisualColliderSize(selectedNode),
            }),
      },
    })
  }

  function updateCollisionIntent(value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return
    const defaultShape = deps.getDefaultCollisionShape(selectedNode)
    const intent = value as EditorNodeCollisionData['intent']

    if (intent === 'none') {
      disableCollisionRoleForNodes([selectedNode])
    } else {
      enableCollisionRoleForNodes([selectedNode])
    }

    deps.patchNode(selectedNode.id, {
      collision:
        intent === 'none'
          ? {
              ...(selectedNode.collision ?? { shape: defaultShape }),
              intent,
              channel: selectedNode.collision?.channel ?? 'worldStatic',
              enabled: false,
            }
          : {
              ...(selectedNode.collision ?? {
                shape: defaultShape,
                ...(defaultShape === 'trimesh'
                  ? {}
                  : { size: deps.getNodeVisualColliderSize(selectedNode) }),
              }),
              intent,
              channel:
                selectedNode.collision?.channel ??
                deps.getDefaultCollisionChannel({
                  ...selectedNode,
                  collision: {
                    ...(selectedNode.collision ?? { shape: defaultShape }),
                    intent,
                  },
                }),
              enabled: true,
              sensor: intent === 'trigger',
              friction: selectedNode.collision?.friction ?? 0.7,
              restitution: selectedNode.collision?.restitution ?? 0,
            },
    })
  }

  function updateCollisionChannel(value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return
    const defaultShape = deps.getDefaultCollisionShape(selectedNode)
    enableCollisionRoleForNodes([selectedNode])

    deps.patchNode(selectedNode.id, {
      collision: {
        ...(selectedNode.collision ?? {
          shape: defaultShape,
          intent: deps.getDefaultCollisionIntent(selectedNode),
          ...(defaultShape === 'trimesh'
            ? {}
            : { size: deps.getNodeVisualColliderSize(selectedNode) }),
        }),
        channel: value as EditorNodeCollisionData['channel'],
        enabled: selectedNode.collision?.intent !== 'none',
      },
    })
  }

  function updateCollisionNumericField(
    field: 'friction' | 'restitution' | 'triangleBudget',
    value: string,
  ) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    const defaultShape = deps.getDefaultCollisionShape(selectedNode)
    enableCollisionRoleForNodes([selectedNode])

    deps.patchNode(selectedNode.id, {
      collision: {
        ...(selectedNode.collision ?? {
          shape: defaultShape,
          intent: deps.getDefaultCollisionIntent(selectedNode),
          channel: deps.getDefaultCollisionChannel(selectedNode),
          ...(defaultShape === 'trimesh'
            ? {}
            : { size: deps.getNodeVisualColliderSize(selectedNode) }),
        }),
        enabled: true,
        [field]: numeric,
      },
    })
  }

  function updateCollisionStringField(field: 'colliderUrl', value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return
    const defaultShape = deps.getDefaultCollisionShape(selectedNode)
    const normalized = value.trim()
    enableCollisionRoleForNodes([selectedNode])

    deps.patchNode(selectedNode.id, {
      collision: {
        ...(selectedNode.collision ?? {
          shape: defaultShape,
          intent: deps.getDefaultCollisionIntent(selectedNode),
          channel: deps.getDefaultCollisionChannel(selectedNode),
          ...(defaultShape === 'trimesh'
            ? {}
            : { size: deps.getNodeVisualColliderSize(selectedNode) }),
        }),
        enabled: true,
        [field]: normalized || undefined,
      },
    })
  }

  function updateCollisionSize(index: number, value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    enableCollisionRoleForNodes([selectedNode])
    const size = [
      ...(selectedNode.collision?.size ??
        deps.getNodeVisualColliderSize(selectedNode)),
    ] as [number, number, number]
    size[index] = Math.max(0.05, numeric)

    deps.patchNode(selectedNode.id, {
      collision: {
        ...(selectedNode.collision ?? {
          shape: deps.getDefaultCollisionShape(selectedNode),
          intent: deps.getDefaultCollisionIntent(selectedNode),
          channel: deps.getDefaultCollisionChannel(selectedNode),
        }),
        enabled: true,
        size,
      },
    })
  }

  function updateCollisionBooleanField(field: 'sensor', value: boolean) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return
    const defaultShape = deps.getDefaultCollisionShape(selectedNode)
    enableCollisionRoleForNodes([selectedNode])
    deps.patchNode(selectedNode.id, {
      collision: {
        ...(selectedNode.collision ?? {
          shape: defaultShape,
          intent: deps.getDefaultCollisionIntent(selectedNode),
          channel: deps.getDefaultCollisionChannel(selectedNode),
          ...(defaultShape === 'trimesh'
            ? {}
            : { size: deps.getNodeVisualColliderSize(selectedNode) }),
        }),
        enabled: true,
        ...(field === 'sensor'
          ? {
              intent: value
                ? 'trigger'
                : selectedNode.collision?.intent === 'trigger'
                  ? deps.getDefaultCollisionIntent(selectedNode)
                  : selectedNode.collision?.intent,
            }
          : {}),
        [field]: value,
      },
    })
  }

  function recalculateCollisionFromVisual() {
    fitColliderToVisualBounds()
  }

  function setVisualOnly() {
    const nodes = getEditableGeometrySelection()
    if (nodes.length === 0) {
      deps.setSaveMessage('Select geometry before changing collision mode')
      return
    }

    for (const node of nodes) {
      deps.patchNode(node.id, {
        collision: {
          ...(node.collision ?? { shape: deps.getDefaultCollisionShape(node) }),
          intent: 'none',
          channel: node.collision?.channel ?? 'worldStatic',
          enabled: false,
          sensor: false,
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

  async function bakeMeshColliderFromSelection() {
    const selectedNode = deps.getSelectedNode()
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
      selectedNode.collision?.triangleBudget ??
      (intent === 'detailMesh' ? 20000 : 5000)

    deps.setSaveMessage(`Baking mesh collider for ${selectedNode.name}...`)
    enableCollisionRoleForNodes([selectedNode])

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
          ...(selectedNode.collision ?? {}),
          shape: 'trimesh',
          colliderUrl: payload.colliderUrl ?? collision.colliderUrl,
          colliderMetadataUrl:
            payload.metadataUrl ?? collision.colliderMetadataUrl,
          assetLocalTransform:
            collision.assetLocalTransform ??
            payload.assetLocalTransform ??
            selectedNode.collision?.assetLocalTransform ??
            null,
          triangleBudget: collision.triangleBudget ?? triangleBudget,
          triangleCount: collision.triangleCount ?? payload.triangleCount,
          intent: collision.intent ?? intent,
          channel: collision.channel ?? channel,
          enabled: true,
          proxy: false,
          bakeStatus: 'ready',
          sourceAssetUrl: assetUrl,
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
      deps.setSaveMessage(
        error instanceof Error ? error.message : 'Mesh collider bake failed',
      )
    }
  }

  function fitColliderToVisualBounds() {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode || !isEditorGeometryNode(selectedNode)) return
    const shape =
      selectedNode.collision?.shape ??
      deps.getDefaultCollisionShape(selectedNode)

    if (shape === 'trimesh') {
      deps.setSaveMessage(
        'Trimesh collision uses a collider asset URL; no bounds were fitted',
      )
      return
    }

    const sizeSource = getNodeVisualColliderSizeSource(selectedNode)
    const size = deps.getNodeVisualColliderSize(selectedNode)

    deps.patchNode(selectedNode.id, {
      collision: {
        ...(selectedNode.collision ?? { shape }),
        shape,
        intent:
          selectedNode.collision?.intent ??
          deps.getDefaultCollisionIntent(selectedNode),
        channel:
          selectedNode.collision?.channel ??
          deps.getDefaultCollisionChannel(selectedNode),
        enabled: true,
        size,
        friction: selectedNode.collision?.friction ?? 0.7,
        restitution: selectedNode.collision?.restitution ?? 0,
        sensor: selectedNode.collision?.sensor ?? false,
      },
    })

    deps.setSaveMessage(
      sizeSource === 'transform-scale'
        ? 'Matched collider to transform scale because visual bounds metadata is missing'
        : 'Matched collider to visual bounds',
    )
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
    field: 'intensity' | 'distance' | 'decay',
    value: string,
  ) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.light) return
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    deps.patchNode(selectedNode.id, {
      light: {
        ...selectedNode.light,
        [field]: numeric,
      },
    })
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

  function updateGameplayBooleanField(field: 'wanderEnabled', value: boolean) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.gameplay) return
    deps.patchNode(selectedNode.id, {
      gameplay: {
        ...selectedNode.gameplay,
        [field]: value,
      },
    })
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
      | 'mistDriftSpeed'
      | 'wanderRadius'
      | 'wanderSpeed'
      | 'hoverHeight'
      | 'bobAmplitude'
      | 'bobSpeed'
      | 'twinkleSpeed'
      | 'lightIntensity'
      | 'lightDistance'
      | 'lightDecay'
      | 'spriteIntensity'
      | 'lightBurstBoost',
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
    updateCollisionShape,
    updateCollisionIntent,
    updateCollisionChannel,
    updateCollisionNumericField,
    updateCollisionStringField,
    updateCollisionSize,
    updateCollisionBooleanField,
    recalculateCollisionFromVisual,
    setVisualOnly,
    setBlocker,
    setWalkable,
    setTrigger,
    setDetail,
    bakeMeshColliderFromSelection,
    fitColliderToVisualBounds,
    updatePhysicsField,
    updatePhysicsNumericField,
    updatePhysicsBooleanField,
    updatePrimitiveArg,
    updateAssetUrl,
    updateLightField,
    updateLightNumericField,
    updateGameplayField,
    updateGameplayBooleanField,
    updateGameplayNumericField,
  }
}
