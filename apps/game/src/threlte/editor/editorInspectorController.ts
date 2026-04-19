import type { EditorPrimitiveData, EditorRigidBodyType, EditorSceneNode } from './editorTypes'

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

type EditorPanelTab = 'workflow' | 'scene' | 'environment' | 'create' | 'hierarchy' | 'inspect' | 'style' | 'ai' | 'save'

type InspectorControllerDeps = {
  getSelectedNode: () => EditorSceneNode | null
  getSelectedNodes: () => EditorSceneNode[]
  getEditorNodes: () => EditorSceneNode[]
  patchNode: (nodeId: string, patch: Partial<EditorSceneNode>) => void
  reparentNodes: (nodeIds: string[], parentId: string | null) => boolean
  selectEditorNode: (nodeId: string) => void
  setSaveMessage: (message: string) => void
  updateNodeStyleDescriptor: (nodeId: string, value: string) => void
  getNodeVisualColliderSize: (node: EditorSceneNode | null) => [number, number, number]

  getTextureBrowserPath: () => string
  getTextureBrowserItems: () => Array<{ name: string; path: string; isDirectory: boolean }>
  getTextureBrowserLoading: () => boolean
  getActiveTextureMaterialField: () => TextureField | null
  setActiveTextureMaterialField: (field: TextureField | null) => void
  loadTextureBrowser: (path: string) => Promise<unknown>
  resolvePublicAssetUrl: (path: string, fallbackName: string) => string

  getAssetBrowserPath: () => string
  getSelectedLibraryItem: () => LibraryItem | null
  setSelectedLibraryItem: (item: LibraryItem | null) => void
  setAssetBrowserFilter: (value: string) => void
  loadAssetBrowser: (path: string) => Promise<unknown>
  setAssetPickerTargetNodeId: (nodeId: string) => void
  getAssetPickerTargetNodeId: () => string
  setActiveEditorTab: (tab: EditorPanelTab) => void
  setHunyuanSelectionKey: (value: string) => void
  setLastInspectedHunyuanAsset: (value: string) => void
  inspectSelectedAssetForHunyuan: (assetUrl: string, selectionKey: string) => Promise<unknown>
  setSelectedGeneratedVariantUrl: (assetUrl: string) => void
  setHunyuanLastOutputUrl: (assetUrl: string) => void
}

export function createEditorInspectorController(deps: InspectorControllerDeps) {
  function updateParent(nextParentId: string) {
    const selectedNodes = deps.getSelectedNodes()
    if (selectedNodes.length === 0) return
    const applied = deps.reparentNodes(selectedNodes.map((node) => node.id), nextParentId || null)
    deps.setSaveMessage(applied ? 'Hierarchy updated' : 'Invalid parent relationship')
  }

  function goUpTextureBrowser() {
    const parts = deps.getTextureBrowserPath().split('/').filter(Boolean)
    if (parts.length <= 1) return
    parts.pop()
    void deps.loadTextureBrowser(parts.join('/'))
  }

  function openTexturePicker(field: TextureField) {
    deps.setActiveTextureMaterialField(field)
    if (deps.getTextureBrowserItems().length === 0 && !deps.getTextureBrowserLoading()) {
      void deps.loadTextureBrowser(deps.getTextureBrowserPath())
    }
  }

  function updateNodeMaterialTextureField(
    field: TextureField,
    value: string
  ) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return
    deps.patchNode(selectedNode.id, {
      material: {
        ...(selectedNode.material ?? {}),
        [field]: value.trim() || undefined,
      },
    })
  }

  function applyTextureFromBrowser(item: { name: string, path: string }) {
    const activeTextureMaterialField = deps.getActiveTextureMaterialField()
    if (!activeTextureMaterialField) return
    updateNodeMaterialTextureField(activeTextureMaterialField, deps.resolvePublicAssetUrl(item.path, item.name))
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

  function openAssetPickerForSelectedNode(preferredRoot: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.asset) {
      deps.setSaveMessage('Select an asset node before choosing a replacement asset')
      return
    }

    deps.setAssetPickerTargetNodeId(selectedNode.id)
    deps.setSelectedLibraryItem(null)
    deps.setAssetBrowserFilter('')
    deps.setActiveEditorTab('create')
    void deps.loadAssetBrowser(preferredRoot)
    deps.setSaveMessage(`Choose a replacement asset for ${selectedNode.name}`)
  }

  function applySelectedLibraryAssetToTargetNode() {
    const assetPickerTargetNodeId = deps.getAssetPickerTargetNodeId()
    const selectedLibraryItem = deps.getSelectedLibraryItem()
    if (!assetPickerTargetNodeId) {
      deps.setSaveMessage('No target object is waiting for an asset replacement')
      return
    }
    if (!selectedLibraryItem || selectedLibraryItem.isDirectory) {
      deps.setSaveMessage('Select an asset file from the library first')
      return
    }

    const targetNode = deps.getEditorNodes().find((node) => node.id === assetPickerTargetNodeId)
    if (!targetNode?.asset) {
      deps.setSaveMessage('The target object is no longer available for asset replacement')
      deps.setAssetPickerTargetNodeId('')
      return
    }

    const url = deps.resolvePublicAssetUrl(selectedLibraryItem.path, selectedLibraryItem.name)
    deps.patchNode(targetNode.id, {
      asset: {
        ...targetNode.asset,
        url,
      },
    })

    deps.selectEditorNode(targetNode.id)
    deps.setAssetPickerTargetNodeId('')
    deps.setSaveMessage(`Replaced ${targetNode.name} with ${selectedLibraryItem.name}`)
    void deps.inspectSelectedAssetForHunyuan(url, targetNode.id)
  }

  function cancelAssetPickerTarget() {
    deps.setAssetPickerTargetNodeId('')
    deps.setSaveMessage('Asset replacement picker closed')
  }

  function applyGeneratedVariantToSelectedNode(assetUrl: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.asset) {
      deps.setSaveMessage('Select a generated asset node before applying a variant.')
      return
    }
    if (!assetUrl) return

    deps.patchNode(selectedNode.id, {
      kind: 'asset',
      asset: { url: assetUrl },
      prefab: undefined,
      primitive: undefined,
      generation: {
        ...(selectedNode.generation ?? {}),
        lastBakedAssetUrl: assetUrl,
        lastBakedAt: new Date().toISOString(),
      },
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
    field: 'emissiveIntensity' | 'metalness' | 'roughness' | 'opacity' | 'envMapIntensity' | 'transmission' | 'ior' | 'clearcoat' | 'clearcoatRoughness' | 'thickness' | 'reflectivity',
    value: string
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
    value: boolean
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

    deps.patchNode(selectedNode.id, {
      collision: value
        ? {
            shape: 'cuboid',
            size: selectedNode.collision?.size ?? deps.getNodeVisualColliderSize(selectedNode),
            friction: selectedNode.collision?.friction ?? 0.7,
            restitution: selectedNode.collision?.restitution ?? 0,
            sensor: selectedNode.collision?.sensor ?? false,
          }
        : undefined,
    })
  }

  function updateCollisionNumericField(field: 'friction' | 'restitution', value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.collision) return
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return

    deps.patchNode(selectedNode.id, {
      collision: {
        ...selectedNode.collision,
        [field]: numeric,
      },
    })
  }

  function updateCollisionSize(index: number, value: string) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.collision) return
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    const size = [...(selectedNode.collision.size ?? [1, 1, 1])] as [number, number, number]
    size[index] = Math.max(0.05, numeric)

    deps.patchNode(selectedNode.id, {
      collision: {
        ...selectedNode.collision,
        size,
      },
    })
  }

  function updateCollisionBooleanField(field: 'sensor', value: boolean) {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode?.collision) return
    deps.patchNode(selectedNode.id, {
      collision: {
        ...selectedNode.collision,
        [field]: value,
      },
    })
  }

  function recalculateCollisionFromVisual() {
    const selectedNode = deps.getSelectedNode()
    if (!selectedNode) return

    deps.patchNode(selectedNode.id, {
      collision: {
        ...(selectedNode.collision ?? { shape: 'cuboid' as const }),
        shape: 'cuboid',
        size: deps.getNodeVisualColliderSize(selectedNode),
        friction: selectedNode.collision?.friction ?? 0.7,
        restitution: selectedNode.collision?.restitution ?? 0,
        sensor: selectedNode.collision?.sensor ?? false,
      },
    })
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

  function updatePhysicsNumericField(field: 'gravityScale' | 'linearDamping' | 'angularDamping', value: string) {
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

  function updatePhysicsBooleanField(field: 'canSleep' | 'ccd' | 'lockRotations' | 'lockTranslations', value: boolean) {
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

  function updateLightNumericField(field: 'intensity' | 'distance' | 'decay', value: string) {
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

  function updateGameplayField(field: 'title' | 'author' | 'location' | 'excerpt' | 'body' | 'targetLevelId' | 'markerColor' | 'audioTrack' | 'fogColor', value: string) {
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

  function updateGameplayNumericField(field: 'markerSize' | 'audioVolume' | 'regionFalloff' | 'fogDensity' | 'wanderRadius' | 'wanderSpeed' | 'hoverHeight' | 'bobAmplitude' | 'bobSpeed' | 'twinkleSpeed' | 'lightIntensity' | 'lightDistance' | 'lightDecay' | 'spriteIntensity', value: string) {
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
    updateCollisionNumericField,
    updateCollisionSize,
    updateCollisionBooleanField,
    recalculateCollisionFromVisual,
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
