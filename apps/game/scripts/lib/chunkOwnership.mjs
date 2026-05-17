export const localChunkOwnershipRules = [
  {
    chunk: 'runtime-world',
    patterns: [
      '/src/threlte/stores/gameStateStore.ts',
      '/src/threlte/levels/levelRegistry.ts',
      '/src/threlte/features/conversation/conversationStores.ts',
    ],
  },
  {
    chunk: 'runtime-diagnostics',
    patterns: ['/src/threlte/ui/RuntimeDiagnosticsPanel.svelte'],
  },
  {
    chunk: 'runtime-conversation',
    patterns: [
      '/src/threlte/features/conversation/ConversationDialog.svelte',
      '/src/threlte/features/conversation/FireflyAvatar.svelte',
    ],
  },
  {
    chunk: 'runtime-performance-state',
    patterns: [
      '/src/threlte/features/performance/OptimizationManager.ts',
      '/src/threlte/features/performance/stores/performanceStore.ts',
      '/src/threlte/features/performance/utils/runtimePerformancePressure.ts',
      '/src/threlte/features/performance/utils/runtimeFrameRatePolicy.ts',
      '/src/threlte/features/performance/utils/runtimeSceneBudget.ts',
      '/src/threlte/utils/runtimeLog.ts',
    ],
  },
  {
    chunk: 'runtime-render-state',
    patterns: [
      '/src/threlte/stores/postProcessingStore.ts',
      '/src/threlte/stores/runtimeDiagnosticsStore.ts',
      '/src/threlte/stores/runtimeRenderProfileStore.ts',
      '/src/threlte/stores/runtimeRenderRegistry.ts',
    ],
  },
  {
    chunk: 'runtime-post-processing',
    patterns: [
      '/src/threlte/features/performance/utils/runtimeVisualQualityPolicy.ts',
      '/src/threlte/systems/SimplePostProcessing.svelte',
    ],
  },
  {
    chunk: 'runtime-engine',
    prefixes: ['/src/threlte/engine/'],
  },
  {
    chunk: 'runtime-world',
    prefixes: [
      '/src/threlte/components/',
      '/src/threlte/systems/',
      '/src/threlte/core/',
      '/src/threlte/collision/',
      '/src/threlte/features/lighting/',
      '/src/threlte/features/ocean/',
      '/src/threlte/features/terrain/',
      '/src/threlte/levels/Runtime',
    ],
    patterns: [
      '/src/threlte/features/performance/systems/Performance.svelte',
      '/src/threlte/levels/runtimeActorCollision.ts',
    ],
  },
  {
    chunk: 'runtime-assets',
    patterns: [
      '/src/threlte/utils/materialUtils.ts',
      '/src/threlte/utils/gltfAssetCache.ts',
    ],
  },
  {
    chunk: 'runtime-world',
    patterns: [
      '/src/threlte/atmosphere/buildRuntimeAtmosphere.ts',
      '/src/threlte/styles/GameplayStyleProfiles.ts',
      '/src/threlte/styles/runtimeVisualStyleStore.ts',
      '/src/threlte/styles/StylePalettes.ts',
    ],
  },
  {
    chunk: 'editor-panel',
    patterns: [
      '/src/threlte/editor/EditorPanel.svelte',
      '/src/threlte/editor/EditorPanelHeader.svelte',
      '/src/threlte/editor/EditorPanelTabRail.svelte',
      '/src/threlte/editor/EditorPanelToolsDock.svelte',
      '/src/threlte/editor/EditorCommandPalette.svelte',
      '/src/threlte/editor/EditorMainToolbar.svelte',
      '/src/threlte/editor/EditorOutputTabHost.svelte',
      '/src/threlte/editor/EditorWorkflowTabHost.svelte',
      '/src/threlte/editor/EditorWorkflowPanel.svelte',
      '/src/threlte/editor/EditorWorldTabHost.svelte',
      '/src/threlte/editor/EditorSceneTabHost.svelte',
      '/src/threlte/editor/EditorSceneToolsPanel.svelte',
      '/src/threlte/editor/EditorPlayerTabHost.svelte',
      '/src/threlte/editor/EditorPlayerPanel.svelte',
      '/src/threlte/editor/EditorCreateTabHost.svelte',
      '/src/threlte/editor/EditorCreatePanel.svelte',
      '/src/threlte/editor/EditorHierarchyTabHost.svelte',
      '/src/threlte/editor/EditorHierarchyPanel.svelte',
      '/src/threlte/editor/EditorInspectTabHost.svelte',
      '/src/threlte/editor/EditorInspectorForm.svelte',
      '/src/threlte/editor/EditorStyleTabHost.svelte',
      '/src/threlte/editor/EditorSaveTabHost.svelte',
      '/src/threlte/editor/EditorSavePanel.svelte',
      '/src/threlte/editor/EditorSideStackHost.svelte',
      '/src/threlte/editor/EditorOutliner.svelte',
      '/src/threlte/editor/EditorOutlinerDock.svelte',
      '/src/threlte/editor/EditorPropertiesDock.svelte',
      '/src/threlte/editor/EditorPropertiesShelf.svelte',
      '/src/threlte/editor/EditorEnvironmentPanel.svelte',
      '/src/threlte/editor/EditorEnvironmentTabHost.svelte',
      '/src/threlte/editor/EditorAtmospherePresetPicker.svelte',
      '/src/threlte/editor/EditorAmbientAudioPresetControls.svelte',
      '/src/threlte/editor/EditorControlsOverlay.svelte',
      '/src/threlte/editor/editorAiController.ts',
      '/src/threlte/editor/editorAssetController.ts',
      '/src/threlte/editor/editorCommandRegistry.ts',
      '/src/threlte/editor/editorCreateController.ts',
      '/src/threlte/editor/editorInspectorController.ts',
      '/src/threlte/editor/editorLevelController.ts',
      '/src/threlte/editor/editorOutliner.ts',
      '/src/threlte/editor/editorOutlinerController.ts',
      '/src/threlte/editor/editorOutlinerTypes.ts',
      '/src/threlte/editor/editorPanelPropBuilders.ts',
      '/src/threlte/editor/editorPanelTabs.ts',
      '/src/threlte/editor/editorStyleController.ts',
    ],
  },
  {
    chunk: 'editor-ai',
    patterns: ['/src/threlte/editor/EditorAIMeshStudio.svelte'],
  },
  {
    chunk: 'editor-runtime',
    patterns: [
      '/src/threlte/editor/EditorCollisionOverlay.svelte',
      '/src/threlte/editor/EditorCircleSelectOverlay.svelte',
      '/src/threlte/editor/EditorMarqueeOverlay.svelte',
      '/src/threlte/editor/EditorSceneLayer.svelte',
      '/src/threlte/editor/EditorTerrainSculptLayer.svelte',
      '/src/threlte/editor/EditorViewportControls.svelte',
      '/src/threlte/editor/EditorWorkbenchLighting.svelte',
    ],
  },
  {
    chunk: 'editor-document',
    prefixes: ['/src/threlte/editor/scenes/'],
    patterns: [
      '/src/threlte/editor/editorStore.ts',
      '/src/threlte/editor/editorSessionStore.ts',
      '/src/threlte/editor/editorSelectors.ts',
      '/src/threlte/editor/editorTypes.ts',
      '/src/threlte/editor/editorBakeSource.ts',
      '/src/threlte/editor/editorCollisionDefaults.ts',
      '/src/threlte/editor/editorCollisionLifecycle.ts',
      '/src/threlte/editor/defaultScenes.ts',
      '/src/threlte/editor/editorDocumentStore.ts',
      '/src/threlte/editor/editorGeneration.ts',
      '/src/threlte/editor/editorPersistence.ts',
      '/src/threlte/editor/editorCommands.ts',
      '/src/threlte/editor/editorNodeCommands.ts',
      '/src/threlte/editor/editorSceneCommands.ts',
      '/src/threlte/editor/editorSceneDocumentLoader.ts',
      '/src/threlte/editor/editorSceneDocumentValidation.ts',
      '/src/threlte/editor/editorHierarchyUtils.ts',
      '/src/threlte/editor/editorHistory.ts',
      '/src/threlte/editor/editorNpcControls.ts',
      '/src/threlte/editor/editorNpcPrefabs.ts',
      '/src/threlte/editor/editorPrefabFactory.ts',
      '/src/threlte/editor/editorLevelSetup.ts',
      '/src/threlte/editor/editorLevelPresets.ts',
    ],
  },
  {
    chunk: 'editor-core',
    prefixes: ['/src/threlte/editor/'],
  },
]

export const vendorChunkOwnershipRules = [
  {
    chunk: 'effects-vendor',
    patterns: [
      'three/examples/jsm/postprocessing',
      'postprocessing',
      'threlte-postprocessing',
    ],
  },
  {
    chunk: 'three-renderer-vendor',
    patterns: [
      'node_modules/three/src/renderers',
      'node_modules/three/src/materials',
    ],
  },
  {
    chunk: 'three-core-vendor',
    patterns: [
      'node_modules/three/src/core',
      'node_modules/three/src/math',
      'node_modules/three/src/geometries',
    ],
  },
  {
    chunk: 'asset-vendor',
    patterns: ['three/examples/jsm/loaders/GLTFLoader', '@threlte/extras'],
  },
  {
    chunk: 'reflection-vendor',
    patterns: ['three/examples/jsm/objects/Reflector'],
  },
  {
    chunk: 'three-examples-vendor',
    patterns: ['three/examples/jsm'],
  },
  {
    chunk: 'physics-vendor',
    patterns: ['@dimforge/rapier3d', '@threlte/rapier'],
  },
  {
    chunk: 'three-vendor',
    patterns: ['three'],
  },
  {
    chunk: 'multiplayer-vendor',
    patterns: ['peerjs'],
  },
  {
    chunk: 'audio-vendor',
    patterns: ['howler'],
  },
  {
    chunk: 'threlte-vendor',
    patterns: ['@threlte/core', '@threlte/extras', '@threlte/theatre'],
  },
]

export const chunkOwnershipRules = [
  ...localChunkOwnershipRules,
  ...vendorChunkOwnershipRules,
]

function normalizeModuleId(id) {
  return id.replace(/\\/g, '/')
}

function ruleMatches(rule, normalizedId) {
  return (
    rule.patterns?.some(pattern => normalizedId.includes(pattern)) ||
    rule.prefixes?.some(prefix => normalizedId.includes(prefix))
  )
}

export function resolveGameManualChunk(id) {
  const normalizedId = normalizeModuleId(id)
  const rules = normalizedId.includes('node_modules')
    ? vendorChunkOwnershipRules
    : localChunkOwnershipRules

  return rules.find(rule => ruleMatches(rule, normalizedId))?.chunk
}
