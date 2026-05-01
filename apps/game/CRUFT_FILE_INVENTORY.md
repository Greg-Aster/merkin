# Game File Inventory

Generated from:

```bash
find apps/game \
  -path 'apps/game/node_modules' -prune -o \
  -path 'apps/game/dist' -prune -o \
  -path 'apps/game/.astro' -prune -o \
  -type f -print | sort
```

Status key: `unreviewed`, `keep`, `refactor`, `move`, `merge`, `delete`,
`externalize`, `defer`.

## Root

| Status | File |
| --- | --- |
| unreviewed | `AGENTS.md` |
| keep | `CRUFT_AUDIT_PLAN.md` |
| keep | `CRUFT_FILE_INVENTORY.md` |
| unreviewed | `ENGINE_ARCHITECTURE.md` |
| unreviewed | `ENGINE_MIGRATION_CHECKLIST.md` |
| unreviewed | `astro.config.mjs` |
| unreviewed | `biome.json` |
| unreviewed | `package.json` |
| unreviewed | `performance-baselines.json` |
| unreviewed | `tailwind.config.cjs` |
| unreviewed | `tsconfig.json` |

## Authoring Assets

| Status | File |
| --- | --- |
| move | `authoring/reference/style-engine-ref/1856.jpg` |
| move | `authoring/reference/style-engine-ref/ComfyUI_0020 (copy).png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2023-09-28 20-05-35.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-01-12 14-14-25.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-01-17 18-07-55.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-01-17 18-08-47.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-01-17 18-27-26.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-01-17 18-48-21.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-01-24 19-32-17.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-01-29 18-14-15.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-04-17 12-36-53.jpg` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-04-18 15-56-07.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-04-21 13-48-21.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-04-23 13-16-40.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-05-09 16-02-22.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-05-09 16-03-24.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-05-09 16-05-45.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-05-09 16-12-22.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-05-09 16-16-00.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-08-26 10-58-38.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-08-28 13-56-44.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-09-01 13-08-21.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-09-02 18-52-20.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-09-02 18-52-31.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-09-02 18-52-52.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-09-02 18-53-41.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-09-02 18-53-59.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-09-02 18-54-31.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-09-02 18-55-13.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-10-29 15-23-06.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-11-07 20-21-11.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-11-13 16-38-43.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2024-11-18 11-52-40.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2025-01-03 10-56-10.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2025-01-16 11-08-22.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2025-02-09 15-10-42.png` |
| move | `authoring/reference/style-engine-ref/Screenshot from 2025-02-24 18-12-12.png` |
| move | `authoring/reference/style-engine-ref/avatar.png` |
| move | `authoring/reference/style-engine-ref/banner.png` |
| move | `authoring/reference/style-engine-ref/celluloid-shot0008.jpg` |
| move | `authoring/reference/style-engine-ref/celluloid-shot0021.jpg` |
| move | `authoring/reference/style-engine-ref/celluloid-shot0022.jpg` |
| move | `authoring/reference/style-engine-ref/celluloid-shot0023.jpg` |
| move | `authoring/reference/style-engine-ref/cookbook.png` |
| move | `authoring/reference/style-engine-ref/dance2.png` |
| move | `authoring/reference/style-engine-ref/golden-era.png` |
| move | `authoring/reference/style-engine-ref/king.png` |
| move | `authoring/reference/style-engine-ref/main-title.png` |
| move | `authoring/reference/style-engine-ref/merkin.png` |
| move | `authoring/reference/style-engine-ref/wendi.png` |
| move | `authoring/reference/style-engine-ref/ww2.png` |
| keep | `authoring/workflows/ref-image/ComfyUI_0147.png` |
| keep | `authoring/workflows/ref-image/Hunyaun example.json` |
| keep | `authoring/workflows/ref-image/comfy_image_example.json` |

## Public Assets

| Status | File |
| --- | --- |
| keep | `public/CNAME` |
| keep | `public/audio/ambient/Dark Shadows of Delight.mp3` |
| keep | `public/audio/ambient/Faster.mp3` |
| keep | `public/audio/ambient/Shadow Waltz.mp3` |
| keep | `public/audio/ambient/Untitled.mp3` |
| keep | `public/audio/ambient/Whistling Dreams.mp3` |
| keep | `public/audio/ambient/Wicked Shadows Whisper.mp3` |
| keep | `public/audio/ambient/meta_3.mp3` |
| keep | `public/audio/ambient/piano synth.mp3` |
| keep | `public/audio/ambient/portal-deck.mp3` |
| keep | `public/audio/ambient/retro video game, new age, electric guitar fake.mp3` |
| keep | `public/audio/sfx/interface-back.mp3` |
| keep | `public/audio/sfx/interface-click-tone.mp3` |
| keep | `public/audio/sfx/interface-open.mp3` |
| keep | `public/audio/sfx/interface-sweep.mp3` |
| keep | `public/audio/sfx/select-click.mp3` |

## Scripts

| Status | File |
| --- | --- |
| refactor | `scripts/audit-engine-architecture.mjs` |
| keep | `scripts/bake-terrain-collision.mjs` |
| keep | `scripts/boot-check-browser.mjs` |
| keep | `scripts/boot-check.mjs` |
| refactor | `scripts/cook-runtime-assets.mjs` |
| unreviewed | `scripts/cook-terrain-chunks.mjs` |
| unreviewed | `scripts/cook-world-partition.mjs` |
| keep | `scripts/dev-app.mjs` |
| refactor | `scripts/editor-tools/server.cjs` |
| keep | `scripts/generate-terrain-heightmap.mjs` |
| keep | `scripts/lib/browserHarness.mjs` |
| keep | `scripts/lib/levelRegistry.mjs` |
| keep | `scripts/lib/runtimeSceneManifest.mjs` |
| keep | `scripts/lib/terrainManifestDiscovery.mjs` |
| keep | `scripts/performance-baseline.mjs` |
| keep | `scripts/profile-level-resources.mjs` |
| refactor | `scripts/profile-three-runtime.mjs` |
| keep | `scripts/smoke-check.mjs` |

## Source

Every current source file is listed explicitly so the cruft pass can assign
file-level outcomes without hiding work behind directory globs.

| Status | File |
| --- | --- |
| unreviewed | `src/config/editorApi.ts` |
| unreviewed | `src/config/timelineconfig.ts` |
| unreviewed | `src/content.config.ts` |
| unreviewed | `src/env.d.ts` |
| unreviewed | `src/layouts/GameLayout.astro` |
| unreviewed | `src/pages/index.astro` |
| unreviewed | `src/services/TimelineConfig.ts` |
| unreviewed | `src/services/TimelineService.client.ts` |
| unreviewed | `src/services/TimelineService.ts` |
| unreviewed | `src/shims/rapier3d-compat.ts` |
| unreviewed | `src/threlte/collision/AssetTrimeshCollider.svelte` |
| unreviewed | `src/threlte/collision/ColliderHelper.svelte` |
| keep | `src/threlte/collision/CollisionBody.svelte` |
| unreviewed | `src/threlte/collision/CollisionOverlayLabel.svelte` |
| unreviewed | `src/threlte/collision/MeshColliderHelper.svelte` |
| unreviewed | `src/threlte/collision/primitiveGeometry.ts` |
| unreviewed | `src/threlte/collision/PrimitiveTrimeshCollider.svelte` |
| unreviewed | `src/threlte/collision/PrimitiveTrimeshHelper.svelte` |
| unreviewed | `src/threlte/components/AdaptivePointLight.svelte` |
| unreviewed | `src/threlte/components/AmbientAudioRegions.svelte` |
| unreviewed | `src/threlte/components/AmbientParticleField.svelte` |
| unreviewed | `src/threlte/components/GroundMistLayer.svelte` |
| unreviewed | `src/threlte/components/HeroProp.svelte` |
| unreviewed | `src/threlte/components/HybridFireflyComponent.svelte` |
| unreviewed | `src/threlte/components/LevelTransitionHandler.svelte` |
| unreviewed | `src/threlte/components/NaturePackVegetation.svelte` |
| unreviewed | `src/threlte/components/ProceduralMesh.svelte` |
| unreviewed | `src/threlte/components/SceneFogExp2.svelte` |
| unreviewed | `src/threlte/components/StarInteractionComponent.svelte` |
| unreviewed | `src/threlte/components/StarNavigationSystem.svelte` |
| unreviewed | `src/threlte/components/StarSprite.svelte` |
| unreviewed | `src/threlte/components/StaticEnvironment.svelte` |
| unreviewed | `src/threlte/components/VegetationSystem.svelte` |
| unreviewed | `src/threlte/constants/physics.ts` |
| unreviewed | `src/threlte/core/ECSIntegration.ts` |
| unreviewed | `src/threlte/core/GameWorld.svelte` |
| unreviewed | `src/threlte/core/gameWorldLifecycle.ts` |
| unreviewed | `src/threlte/core/LevelManager.svelte` |
| unreviewed | `src/threlte/core/levelRuntimeEvents.ts` |
| unreviewed | `src/threlte/core/levelRuntimeReset.ts` |
| unreviewed | `src/threlte/core/LevelSystem.ts` |
| unreviewed | `src/threlte/editor/defaultScenes.ts` |
| unreviewed | `src/threlte/editor/editor-ui.css` |
| unreviewed | `src/threlte/editor/editorAiController.ts` |
| unreviewed | `src/threlte/editor/EditorAIMeshStudio.svelte` |
| unreviewed | `src/threlte/editor/EditorAiTabHost.svelte` |
| unreviewed | `src/threlte/editor/EditorAmbientAudioPresetControls.svelte` |
| unreviewed | `src/threlte/editor/editorAssetController.ts` |
| unreviewed | `src/threlte/editor/EditorAssetPreview.svelte` |
| unreviewed | `src/threlte/editor/EditorAtmospherePresetPicker.svelte` |
| unreviewed | `src/threlte/editor/editorBakeSource.ts` |
| unreviewed | `src/threlte/editor/EditorCircleSelectOverlay.svelte` |
| keep | `src/threlte/editor/editorCollisionDefaults.ts` |
| unreviewed | `src/threlte/editor/EditorCollisionOverlay.svelte` |
| unreviewed | `src/threlte/editor/editorCommands.ts` |
| unreviewed | `src/threlte/editor/EditorControlsOverlay.svelte` |
| unreviewed | `src/threlte/editor/editorCreateController.ts` |
| unreviewed | `src/threlte/editor/EditorCreatePanel.svelte` |
| unreviewed | `src/threlte/editor/EditorCreateTabHost.svelte` |
| unreviewed | `src/threlte/editor/editorDocumentStore.ts` |
| unreviewed | `src/threlte/editor/EditorEnvironmentPanel.svelte` |
| unreviewed | `src/threlte/editor/EditorEnvironmentTabHost.svelte` |
| unreviewed | `src/threlte/editor/editorGeneration.ts` |
| unreviewed | `src/threlte/editor/EditorHierarchyPanel.svelte` |
| unreviewed | `src/threlte/editor/EditorHierarchyTabHost.svelte` |
| unreviewed | `src/threlte/editor/editorHierarchyUtils.ts` |
| unreviewed | `src/threlte/editor/editorHistory.ts` |
| unreviewed | `src/threlte/editor/editorInspectorController.ts` |
| unreviewed | `src/threlte/editor/EditorInspectorForm.svelte` |
| unreviewed | `src/threlte/editor/EditorInspectTabHost.svelte` |
| unreviewed | `src/threlte/editor/editorLevelController.ts` |
| unreviewed | `src/threlte/editor/editorLevelPresets.ts` |
| keep | `src/threlte/editor/editorLevelSetup.ts` |
| unreviewed | `src/threlte/editor/EditorMarqueeOverlay.svelte` |
| unreviewed | `src/threlte/editor/editorNodeCommands.ts` |
| unreviewed | `src/threlte/editor/EditorNodeGizmos.svelte` |
| unreviewed | `src/threlte/editor/EditorNodePhysicsBody.svelte` |
| unreviewed | `src/threlte/editor/EditorNodeRenderContent.svelte` |
| unreviewed | `src/threlte/editor/EditorOutliner.svelte` |
| unreviewed | `src/threlte/editor/editorOutliner.ts` |
| unreviewed | `src/threlte/editor/editorOutlinerController.ts` |
| unreviewed | `src/threlte/editor/EditorOutlinerDock.svelte` |
| unreviewed | `src/threlte/editor/editorOutlinerTypes.ts` |
| keep | `src/threlte/editor/EditorPanel.svelte` |
| unreviewed | `src/threlte/editor/EditorPanelHeader.svelte` |
| keep | `src/threlte/editor/editorPanelPropBuilders.ts` |
| unreviewed | `src/threlte/editor/EditorPanelTabRail.svelte` |
| unreviewed | `src/threlte/editor/editorPanelTabs.ts` |
| unreviewed | `src/threlte/editor/EditorPanelToolsDock.svelte` |
| unreviewed | `src/threlte/editor/editorPersistence.ts` |
| unreviewed | `src/threlte/editor/EditorPlayerPanel.svelte` |
| unreviewed | `src/threlte/editor/EditorPlayerTabHost.svelte` |
| unreviewed | `src/threlte/editor/editorPrefabFactory.ts` |
| unreviewed | `src/threlte/editor/EditorPropertiesDock.svelte` |
| unreviewed | `src/threlte/editor/EditorPropertiesShelf.svelte` |
| unreviewed | `src/threlte/editor/editorRegistry.ts` |
| unreviewed | `src/threlte/editor/EditorSavePanel.svelte` |
| unreviewed | `src/threlte/editor/EditorSaveTabHost.svelte` |
| unreviewed | `src/threlte/editor/EditorSceneBranch.svelte` |
| unreviewed | `src/threlte/editor/editorSceneCommands.ts` |
| unreviewed | `src/threlte/editor/editorSceneDocumentLoader.ts` |
| unreviewed | `src/threlte/editor/editorSceneDocumentValidation.ts` |
| unreviewed | `src/threlte/editor/EditorSceneLayer.svelte` |
| unreviewed | `src/threlte/editor/EditorSceneNode.svelte` |
| keep | `src/threlte/editor/EditorSceneTabHost.svelte` |
| keep | `src/threlte/editor/EditorSceneToolsPanel.svelte` |
| unreviewed | `src/threlte/editor/editorSelectors.ts` |
| unreviewed | `src/threlte/editor/editorSessionStore.ts` |
| unreviewed | `src/threlte/editor/EditorSideStackHost.svelte` |
| unreviewed | `src/threlte/editor/editorStore.ts` |
| unreviewed | `src/threlte/editor/editorStyleController.ts` |
| unreviewed | `src/threlte/editor/EditorStyleStudio.svelte` |
| unreviewed | `src/threlte/editor/EditorStyleTabHost.svelte` |
| keep | `src/threlte/editor/EditorTerrainSculptLayer.svelte` |
| keep | `src/threlte/editor/editorTypes.ts` |
| unreviewed | `src/threlte/editor/EditorViewportControls.svelte` |
| unreviewed | `src/threlte/editor/EditorWorkbenchLighting.svelte` |
| unreviewed | `src/threlte/editor/EditorWorkflowPanel.svelte` |
| unreviewed | `src/threlte/editor/EditorWorkflowTabHost.svelte` |
| unreviewed | `src/threlte/editor/scene-backups/yggdrasil/yggdrasil.2026-04-25T01-18-23-626Z.pre-simplify.json` |
| unreviewed | `src/threlte/editor/scene-backups/yggdrasil/yggdrasil.2026-04-25T01-28-44-185Z.pre-reduce-pass-2.json` |
| unreviewed | `src/threlte/editor/scene-backups/yggdrasil/yggdrasil.2026-04-25T02-07-36-925Z.pre-tree-merge.json` |
| unreviewed | `src/threlte/editor/scene-backups/yggdrasil/yggdrasil.2026-04-25T02-12-58-163Z.pre-ramp-merge.json` |
| unreviewed | `src/threlte/editor/scene-backups/yggdrasil/yggdrasil.2026-04-25T02-17-02-006Z.pre-bifrost-ribbon-merge.json` |
| unreviewed | `src/threlte/editor/scene-backups/yggdrasil/yggdrasil.2026-04-25T02-24-21-255Z.pre-tunnel-root-merge.json` |
| unreviewed | `src/threlte/editor/scene-backups/yggdrasil/yggdrasil.scene.20260418-185617.backup.json` |
| unreviewed | `src/threlte/editor/scene-backups/yggdrasil/yggdrasil.scene.20260418-185617.original-packaged.json` |
| unreviewed | `src/threlte/editor/scene-backups/yggdrasil/yggdrasil.scene.20260418-213014.pre-restore.json` |
| unreviewed | `src/threlte/editor/scene-backups/yggdrasil/yggdrasil.scene.20260418-214412.pre-restore.json` |
| unreviewed | `src/threlte/editor/scenes/miranda.scene.json` |
| unreviewed | `src/threlte/editor/scenes/observatory.scene.json` |
| unreviewed | `src/threlte/editor/scenes/sci-fi-room.scene.json` |
| unreviewed | `src/threlte/editor/scenes/solitude.scene.json` |
| unreviewed | `src/threlte/editor/scenes/yggdrasil.scene.json` |
| unreviewed | `src/threlte/engine/actorHierarchy.ts` |
| unreviewed | `src/threlte/engine/collisionChannels.ts` |
| keep | `src/threlte/engine/collisionPolicy.ts` |
| unreviewed | `src/threlte/engine/hierarchyTransforms.ts` |
| unreviewed | `src/threlte/engine/index.ts` |
| unreviewed | `src/threlte/engine/levelAssetPreloader.ts` |
| keep | `src/threlte/engine/levelCollisionWorkflow.ts` |
| unreviewed | `src/threlte/engine/levelContracts.ts` |
| unreviewed | `src/threlte/engine/levelValidation.ts` |
| keep | `src/threlte/engine/packagedSceneDocuments.ts` |
| unreviewed | `src/threlte/engine/runtimeAssetManifest.ts` |
| unreviewed | `src/threlte/engine/runtimeGameplayTypes.ts` |
| keep | `src/threlte/engine/runtimeLevelSettings.ts` |
| keep | `src/threlte/engine/runtimeSceneDocumentLoader.ts` |
| keep | `src/threlte/engine/runtimeSceneManifest.ts` |
| unreviewed | `src/threlte/engine/runtimeWorldPartition.ts` |
| keep | `src/threlte/engine/sceneAdapter.ts` |
| keep | `src/threlte/engine/sceneDocumentRuntime.ts` |
| keep | `src/threlte/engine/sceneDocumentTypes.ts` |
| unreviewed | `src/threlte/engine/types.ts` |
| unreviewed | `src/threlte/features/conversation/characters/CharacterComponent.ts` |
| unreviewed | `src/threlte/features/conversation/characters/CharacterRegistry.ts` |
| unreviewed | `src/threlte/features/conversation/characters/definitions/ava-chen.ts` |
| unreviewed | `src/threlte/features/conversation/characters/definitions/elara-voss.ts` |
| unreviewed | `src/threlte/features/conversation/characters/definitions/eleanor-kim.ts` |
| unreviewed | `src/threlte/features/conversation/characters/definitions/gregory-aster.ts` |
| unreviewed | `src/threlte/features/conversation/characters/definitions/helena-zhao.ts` |
| unreviewed | `src/threlte/features/conversation/characters/definitions/kaelen-vance.ts` |
| unreviewed | `src/threlte/features/conversation/characters/definitions/maya-okafor.ts` |
| unreviewed | `src/threlte/features/conversation/characters/definitions/merkin.ts` |
| unreviewed | `src/threlte/features/conversation/characters/definitions/soren-klein.ts` |
| unreviewed | `src/threlte/features/conversation/characters/definitions/vex-kanarath.ts` |
| unreviewed | `src/threlte/features/conversation/characters/index.ts` |
| unreviewed | `src/threlte/features/conversation/characters/types.ts` |
| unreviewed | `src/threlte/features/conversation/ConversationDialog.svelte` |
| unreviewed | `src/threlte/features/conversation/ConversationManager.ts` |
| unreviewed | `src/threlte/features/conversation/conversationStores.ts` |
| unreviewed | `src/threlte/features/conversation/FireflyAvatar.svelte` |
| unreviewed | `src/threlte/features/conversation/index.ts` |
| unreviewed | `src/threlte/features/conversation/MemoryManagerAgent.ts` |
| unreviewed | `src/threlte/features/conversation/README.md` |
| unreviewed | `src/threlte/features/conversation/types.ts` |
| unreviewed | `src/threlte/features/conversation/worldKnowledge.ts` |
| unreviewed | `src/threlte/features/lighting/FireflyLightingSystem.ts` |
| unreviewed | `src/threlte/features/lighting/index.ts` |
| unreviewed | `src/threlte/features/lighting/LightingManager.ts` |
| unreviewed | `src/threlte/features/lighting/SpatialGrid.ts` |
| unreviewed | `src/threlte/features/multiplayer/components/MultiplayerManager.svelte` |
| unreviewed | `src/threlte/features/multiplayer/components/PlayerAvatar.svelte` |
| unreviewed | `src/threlte/features/multiplayer/components/RemotePlayerAvatar.svelte` |
| unreviewed | `src/threlte/features/multiplayer/index.ts` |
| unreviewed | `src/threlte/features/multiplayer/services/MultiplayerService.ts` |
| unreviewed | `src/threlte/features/multiplayer/stores/chatStore.ts` |
| unreviewed | `src/threlte/features/multiplayer/stores/hostStore.ts` |
| unreviewed | `src/threlte/features/multiplayer/stores/logStore.ts` |
| unreviewed | `src/threlte/features/multiplayer/stores/multiplayerStore.ts` |
| unreviewed | `src/threlte/features/multiplayer/stores/playerNameStore.ts` |
| unreviewed | `src/threlte/features/multiplayer/ui/ChatBox.svelte` |
| unreviewed | `src/threlte/features/multiplayer/ui/HostPanel.svelte` |
| unreviewed | `src/threlte/features/multiplayer/ui/LogTerminal.svelte` |
| unreviewed | `src/threlte/features/multiplayer/ui/MultiplayerControls.svelte` |
| unreviewed | `src/threlte/features/ocean/components/OceanComponent.svelte` |
| unreviewed | `src/threlte/features/ocean/effects/UnderwaterEffect.svelte` |
| unreviewed | `src/threlte/features/ocean/effects/UnderwaterOverlay.svelte` |
| unreviewed | `src/threlte/features/ocean/index.ts` |
| unreviewed | `src/threlte/features/ocean/stores/underwaterStore.ts` |
| unreviewed | `src/threlte/features/performance/index.ts` |
| unreviewed | `src/threlte/features/performance/OptimizationManager.ts` |
| unreviewed | `src/threlte/features/performance/stores/performanceStore.ts` |
| unreviewed | `src/threlte/features/performance/systems/Performance.svelte` |
| unreviewed | `src/threlte/features/performance/ui/PerformancePanel.svelte` |
| unreviewed | `src/threlte/features/performance/utils/runtimeSceneBudget.ts` |
| unreviewed | `src/threlte/features/performance/utils/runtimeVisualQualityPolicy.ts` |
| unreviewed | `src/threlte/features/player/GroundShockwave.svelte` |
| unreviewed | `src/threlte/features/player/index.ts` |
| unreviewed | `src/threlte/features/player/mobileInputStore.ts` |
| unreviewed | `src/threlte/features/player/Player.svelte` |
| unreviewed | `src/threlte/features/player/ThrelteMobileControls.svelte` |
| unreviewed | `src/threlte/features/terrain/bakedTerrainCollider.ts` |
| unreviewed | `src/threlte/features/terrain/components/HeightmapSurface.svelte` |
| unreviewed | `src/threlte/features/terrain/components/TerrainChunk.svelte` |
| unreviewed | `src/threlte/features/terrain/components/TerrainCollider.svelte` |
| unreviewed | `src/threlte/features/terrain/index.ts` |
| unreviewed | `src/threlte/features/terrain/Terrain.svelte` |
| unreviewed | `src/threlte/features/terrain/TerrainManager.ts` |
| unreviewed | `src/threlte/features/terrain/terrainManifest.ts` |
| unreviewed | `src/threlte/features/terrain/TerrainRuntime.svelte` |
| unreviewed | `src/threlte/features/terrain/terrainStore.ts` |
| unreviewed | `src/threlte/features/terrain/types.ts` |
| unreviewed | `src/threlte/Game.svelte` |
| unreviewed | `src/threlte/GameCanvasStage.svelte` |
| unreviewed | `src/threlte/levels/level-registry.json` |
| keep | `src/threlte/levels/levelRegistry.ts` |
| unreviewed | `src/threlte/levels/RuntimeActorBranch.svelte` |
| unreviewed | `src/threlte/levels/runtimeActorCollision.ts` |
| unreviewed | `src/threlte/levels/RuntimeActorNode.svelte` |
| unreviewed | `src/threlte/levels/RuntimeActorRenderContent.svelte` |
| unreviewed | `src/threlte/levels/RuntimeGameplayRenderer.svelte` |
| unreviewed | `src/threlte/levels/RuntimePrefabNode.svelte` |
| keep | `src/threlte/levels/SceneDocumentLevel.svelte` |
| unreviewed | `src/threlte/levels/SceneLighting.svelte` |
| unreviewed | `src/threlte/services/TimelineDataService.ts` |
| unreviewed | `src/threlte/stores/gameStateStore.ts` |
| unreviewed | `src/threlte/stores/postProcessingStore.ts` |
| unreviewed | `src/threlte/stores/runtimeDiagnosticsStore.ts` |
| unreviewed | `src/threlte/stores/runtimeRenderRegistry.ts` |
| unreviewed | `src/threlte/stores/uiStore.ts` |
| keep | `src/threlte/styles/GameplayStyleProfiles.ts` |
| unreviewed | `src/threlte/styles/runtimeVisualStyleStore.ts` |
| unreviewed | `src/threlte/styles/StylePalettes.ts` |
| unreviewed | `src/threlte/systems/AssetLoader.svelte` |
| unreviewed | `src/threlte/systems/Audio.svelte` |
| unreviewed | `src/threlte/systems/EventBus.svelte` |
| unreviewed | `src/threlte/systems/InteractionSystem.svelte` |
| unreviewed | `src/threlte/systems/Physics.svelte` |
| unreviewed | `src/threlte/systems/Renderer.svelte` |
| unreviewed | `src/threlte/systems/SimplePostProcessing.svelte` |
| unreviewed | `src/threlte/systems/Skybox.svelte` |
| unreviewed | `src/threlte/systems/StarMap.svelte` |
| unreviewed | `src/threlte/systems/Time.svelte` |
| unreviewed | `src/threlte/tests/validate-performance.ts` |
| unreviewed | `src/threlte/ui/MobileEnhancements.svelte` |
| unreviewed | `src/threlte/ui/RuntimeDiagnosticsPanel.svelte` |
| unreviewed | `src/threlte/ui/SettingsButton.svelte` |
| unreviewed | `src/threlte/ui/SettingsPanel.svelte` |
| unreviewed | `src/threlte/ui/TimelineCard.svelte` |
| unreviewed | `src/threlte/utils/gltfAssetCache.ts` |
| keep | `src/threlte/utils/materialOverrideContext.ts` |
| keep | `src/threlte/utils/materialUtils.ts` |
| unreviewed | `src/threlte/utils/nameGenerator.ts` |
| unreviewed | `src/threlte/utils/proceduralTextures.ts` |
| unreviewed | `src/utils/content-utils.ts` |
| unreviewed | `src/utils/starUtils.ts` |

To refresh this section, run:

```bash
find apps/game/src -type f | sort | sed 's#^apps/game/##'
```
