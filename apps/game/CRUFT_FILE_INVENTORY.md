# Game File Inventory

Generated from:

```bash
find apps/game \
  -path apps/game/node_modules -prune -o \
  -path apps/game/dist -prune -o \
  -path apps/game/.astro -prune -o \
  -type f -print | sort
```

Status key: `unreviewed`, `keep`, `refactor`, `move`, `merge`, `delete`,
`externalize`, `defer`.

## Root

| Status | File |
| --- | --- |
| keep | `AGENTS.md` |
| keep | `CRUFT_AUDIT_PLAN.md` |
| keep | `CRUFT_FILE_INVENTORY.md` |
| keep | `CRUFT_TODO.md` |
| keep | `ENGINE_ARCHITECTURE.md` |
| keep | `ENGINE_MIGRATION_CHECKLIST.md` |
| refactor | `astro.config.mjs` |
| keep | `biome.json` |
| keep | `package.json` |
| keep | `performance-baselines.json` |
| keep | `tailwind.config.cjs` |
| keep | `tsconfig.json` |

## Authoring Assets

| Status | File |
| --- | --- |
| keep | `authoring/reference/style-engine-ref/1856.jpg` |
| keep | `authoring/reference/style-engine-ref/ComfyUI_0020 (copy).png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2023-09-28 20-05-35.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-01-12 14-14-25.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-01-17 18-07-55.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-01-17 18-08-47.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-01-17 18-27-26.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-01-17 18-48-21.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-01-24 19-32-17.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-01-29 18-14-15.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-04-17 12-36-53.jpg` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-04-18 15-56-07.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-04-21 13-48-21.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-04-23 13-16-40.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-05-09 16-02-22.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-05-09 16-03-24.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-05-09 16-05-45.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-05-09 16-12-22.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-05-09 16-16-00.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-08-26 10-58-38.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-08-28 13-56-44.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-09-01 13-08-21.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-09-02 18-52-20.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-09-02 18-52-31.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-09-02 18-52-52.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-09-02 18-53-41.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-09-02 18-53-59.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-09-02 18-54-31.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-09-02 18-55-13.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-10-29 15-23-06.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-11-07 20-21-11.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-11-13 16-38-43.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2024-11-18 11-52-40.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2025-01-03 10-56-10.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2025-01-16 11-08-22.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2025-02-09 15-10-42.png` |
| keep | `authoring/reference/style-engine-ref/Screenshot from 2025-02-24 18-12-12.png` |
| keep | `authoring/reference/style-engine-ref/avatar.png` |
| keep | `authoring/reference/style-engine-ref/banner.png` |
| keep | `authoring/reference/style-engine-ref/celluloid-shot0008.jpg` |
| keep | `authoring/reference/style-engine-ref/celluloid-shot0021.jpg` |
| keep | `authoring/reference/style-engine-ref/celluloid-shot0022.jpg` |
| keep | `authoring/reference/style-engine-ref/celluloid-shot0023.jpg` |
| keep | `authoring/reference/style-engine-ref/cookbook.png` |
| keep | `authoring/reference/style-engine-ref/dance2.png` |
| keep | `authoring/reference/style-engine-ref/golden-era.png` |
| keep | `authoring/reference/style-engine-ref/king.png` |
| keep | `authoring/reference/style-engine-ref/main-title.png` |
| keep | `authoring/reference/style-engine-ref/merkin.png` |
| keep | `authoring/reference/style-engine-ref/wendi.png` |
| keep | `authoring/reference/style-engine-ref/ww2.png` |
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
| keep | `scripts/audit-engine-architecture.mjs` |
| keep | `scripts/bake-terrain-collision.mjs` |
| keep | `scripts/boot-check-browser.mjs` |
| keep | `scripts/boot-check.mjs` |
| keep | `scripts/cook-runtime-assets.mjs` |
| keep | `scripts/cook-terrain-chunks.mjs` |
| keep | `scripts/cook-world-partition.mjs` |
| keep | `scripts/dev-app.mjs` |
| keep | `scripts/editor-tools/aiRoutes.cjs` |
| keep | `scripts/editor-tools/aiRuntimeContext.cjs` |
| keep | `scripts/editor-tools/browseRoutes.cjs` |
| keep | `scripts/editor-tools/sceneRoutes.cjs` |
| keep | `scripts/editor-tools/server.cjs` |
| keep | `scripts/editor-tools/styleRoutes.cjs` |
| keep | `scripts/editor-tools/styleRuntimeContext.cjs` |
| keep | `scripts/editor-tools/terrainRoutes.cjs` |
| keep | `scripts/generate-terrain-heightmap.mjs` |
| keep | `scripts/lib/authoringSceneSource.mjs` |
| keep | `scripts/lib/browserHarness.mjs` |
| keep | `scripts/lib/dependencyGraph.mjs` |
| keep | `scripts/lib/engineAuditSourceGuards.mjs` |
| keep | `scripts/lib/levelRegistry.mjs` |
| keep | `scripts/lib/runtimeAssetCookManifest.mjs` |
| keep | `scripts/lib/runtimeAssetVariantCooker.mjs` |
| keep | `scripts/lib/runtimeSceneAudit.mjs` |
| keep | `scripts/lib/runtimeSceneManifest.mjs` |
| keep | `scripts/lib/sceneArchitectureAudit.mjs` |
| keep | `scripts/lib/terrainCollisionAudit.mjs` |
| keep | `scripts/lib/terrainManifestDiscovery.mjs` |
| keep | `scripts/lib/worldPartitionAudit.mjs` |
| keep | `scripts/performance-baseline.mjs` |
| keep | `scripts/profile-level-resources.mjs` |
| keep | `scripts/profile-three-runtime.mjs` |
| keep | `scripts/smoke-check.mjs` |

## Source

Every current source file is listed explicitly so the cruft pass can assign
file-level outcomes without hiding work behind directory globs.

| Status | File |
| --- | --- |
| keep | `src/config/editorApi.ts` |
| keep | `src/config/timelineconfig.ts` |
| keep | `src/content.config.ts` |
| keep | `src/env.d.ts` |
| keep | `src/layouts/GameLayout.astro` |
| keep | `src/pages/host.astro` |
| keep | `src/pages/index.astro` |
| delete | `src/services/TimelineConfig.ts` |
| delete | `src/services/TimelineService.client.ts` |
| delete | `src/services/TimelineService.ts` |
| keep | `src/shims/rapier3d-compat.ts` |
| refactor | `src/threlte/Game.svelte` |
| keep | `src/threlte/GameCanvasStage.svelte` |
| refactor | `src/threlte/collision/AssetTrimeshCollider.svelte` |
| keep | `src/threlte/collision/ColliderHelper.svelte` |
| keep | `src/threlte/collision/CollisionBody.svelte` |
| keep | `src/threlte/collision/CollisionOverlayLabel.svelte` |
| keep | `src/threlte/collision/MeshColliderHelper.svelte` |
| keep | `src/threlte/collision/PrimitiveTrimeshCollider.svelte` |
| keep | `src/threlte/collision/PrimitiveTrimeshHelper.svelte` |
| keep | `src/threlte/components/AdaptivePointLight.svelte` |
| keep | `src/threlte/components/AmbientAudioRegions.svelte` |
| keep | `src/threlte/components/AmbientParticleField.svelte` |
| keep | `src/threlte/components/GroundMistLayer.svelte` |
| refactor | `src/threlte/components/HeroProp.svelte` |
| delete | `src/threlte/components/HybridFireflyComponent.svelte` |
| keep | `src/threlte/components/LevelTransitionHandler.svelte` |
| delete | `src/threlte/components/NaturePackVegetation.svelte` |
| keep | `src/threlte/components/ProceduralMesh.svelte` |
| keep | `src/threlte/components/SceneFogExp2.svelte` |
| keep | `src/threlte/components/StarInteractionComponent.svelte` |
| keep | `src/threlte/components/StarNavigationSystem.svelte` |
| keep | `src/threlte/components/StarSprite.svelte` |
| delete | `src/threlte/components/StaticEnvironment.svelte` |
| delete | `src/threlte/components/VegetationSystem.svelte` |
| keep | `src/threlte/constants/physics.ts` |
| keep | `src/threlte/core/ECSIntegration.ts` |
| keep | `src/threlte/core/GameWorld.svelte` |
| keep | `src/threlte/core/LevelManager.svelte` |
| keep | `src/threlte/core/LevelSystem.ts` |
| keep | `src/threlte/core/gameWorldLifecycle.ts` |
| keep | `src/threlte/core/levelRuntimeEvents.ts` |
| keep | `src/threlte/core/levelRuntimeReset.ts` |
| keep | `src/threlte/editor/EditorAIMeshStudio.svelte` |
| keep | `src/threlte/editor/EditorAiTabHost.svelte` |
| keep | `src/threlte/editor/EditorAmbientAudioPresetControls.svelte` |
| keep | `src/threlte/editor/EditorAssetPreview.svelte` |
| keep | `src/threlte/editor/EditorAtmospherePresetPicker.svelte` |
| keep | `src/threlte/editor/EditorCircleSelectOverlay.svelte` |
| keep | `src/threlte/editor/EditorCollisionOverlay.svelte` |
| keep | `src/threlte/editor/EditorControlsOverlay.svelte` |
| keep | `src/threlte/editor/EditorCreatePanel.svelte` |
| keep | `src/threlte/editor/EditorCreateTabHost.svelte` |
| refactor | `src/threlte/editor/EditorEnvironmentPanel.svelte` |
| keep | `src/threlte/editor/EditorEnvironmentTabHost.svelte` |
| keep | `src/threlte/editor/EditorHierarchyPanel.svelte` |
| keep | `src/threlte/editor/EditorHierarchyTabHost.svelte` |
| refactor | `src/threlte/editor/EditorInspectTabHost.svelte` |
| refactor | `src/threlte/editor/EditorInspectorForm.svelte` |
| keep | `src/threlte/editor/EditorMarqueeOverlay.svelte` |
| keep | `src/threlte/editor/EditorNodeGizmos.svelte` |
| keep | `src/threlte/editor/EditorNodePhysicsBody.svelte` |
| refactor | `src/threlte/editor/EditorNodeRenderContent.svelte` |
| keep | `src/threlte/editor/EditorOutliner.svelte` |
| keep | `src/threlte/editor/EditorOutlinerDock.svelte` |
| keep | `src/threlte/editor/EditorPanel.svelte` |
| keep | `src/threlte/editor/EditorPanelHeader.svelte` |
| keep | `src/threlte/editor/EditorPanelTabRail.svelte` |
| keep | `src/threlte/editor/EditorPanelToolsDock.svelte` |
| keep | `src/threlte/editor/EditorPlayerPanel.svelte` |
| keep | `src/threlte/editor/EditorPlayerTabHost.svelte` |
| refactor | `src/threlte/editor/EditorPropertiesDock.svelte` |
| refactor | `src/threlte/editor/EditorPropertiesShelf.svelte` |
| keep | `src/threlte/editor/EditorSavePanel.svelte` |
| keep | `src/threlte/editor/EditorSaveTabHost.svelte` |
| keep | `src/threlte/editor/EditorSceneBranch.svelte` |
| keep | `src/threlte/editor/EditorSceneLayer.svelte` |
| refactor | `src/threlte/editor/EditorSceneNode.svelte` |
| keep | `src/threlte/editor/EditorSceneTabHost.svelte` |
| keep | `src/threlte/editor/EditorSceneToolsPanel.svelte` |
| refactor | `src/threlte/editor/EditorSideStackHost.svelte` |
| refactor | `src/threlte/editor/EditorStyleStudio.svelte` |
| refactor | `src/threlte/editor/EditorStyleTabHost.svelte` |
| keep | `src/threlte/editor/EditorTerrainSculptLayer.svelte` |
| refactor | `src/threlte/editor/EditorViewportControls.svelte` |
| keep | `src/threlte/editor/EditorWorkbenchLighting.svelte` |
| keep | `src/threlte/editor/EditorWorkflowPanel.svelte` |
| keep | `src/threlte/editor/EditorWorkflowTabHost.svelte` |
| keep | `src/threlte/editor/defaultScenes.ts` |
| keep | `src/threlte/editor/editor-ui.css` |
| refactor | `src/threlte/editor/editorAiController.ts` |
| refactor | `src/threlte/editor/editorAssetController.ts` |
| refactor | `src/threlte/editor/editorBakeSource.ts` |
| keep | `src/threlte/editor/editorCollisionDefaults.ts` |
| keep | `src/threlte/editor/editorCommands.ts` |
| keep | `src/threlte/editor/editorCreateController.ts` |
| keep | `src/threlte/editor/editorDocumentStore.ts` |
| keep | `src/threlte/editor/editorGeneratedAssetApplication.ts` |
| refactor | `src/threlte/editor/editorGeneration.ts` |
| keep | `src/threlte/editor/editorHierarchyUtils.ts` |
| keep | `src/threlte/editor/editorHistory.ts` |
| keep | `src/threlte/editor/editorHunyuanApi.ts` |
| keep | `src/threlte/editor/editorHunyuanJobPolling.ts` |
| refactor | `src/threlte/editor/editorInspectorController.ts` |
| keep | `src/threlte/editor/editorLevelController.ts` |
| refactor | `src/threlte/editor/editorLevelPresets.ts` |
| keep | `src/threlte/editor/editorLevelSetup.ts` |
| keep | `src/threlte/editor/editorNodeCommands.ts` |
| keep | `src/threlte/editor/editorOutliner.ts` |
| keep | `src/threlte/editor/editorOutlinerController.ts` |
| keep | `src/threlte/editor/editorOutlinerTypes.ts` |
| keep | `src/threlte/editor/editorPanelPropBuilders.ts` |
| keep | `src/threlte/editor/editorPanelTabs.ts` |
| keep | `src/threlte/editor/editorPersistence.ts` |
| keep | `src/threlte/editor/editorPrefabFactory.ts` |
| keep | `src/threlte/editor/editorRegistry.ts` |
| keep | `src/threlte/editor/editorSceneCommands.ts` |
| keep | `src/threlte/editor/editorSceneDocumentLoader.ts` |
| keep | `src/threlte/editor/editorSceneDocumentValidation.ts` |
| refactor | `src/threlte/editor/editorSelectors.ts` |
| keep | `src/threlte/editor/editorSessionStore.ts` |
| keep | `src/threlte/editor/editorStore.ts` |
| keep | `src/threlte/editor/editorStyleApi.ts` |
| keep | `src/threlte/editor/editorStyleBatchSession.ts` |
| refactor | `src/threlte/editor/editorStyleController.ts` |
| keep | `src/threlte/editor/editorTypes.ts` |
| keep | `src/threlte/editor/editorWorkspaceBrowser.ts` |
| keep | `authoring/scene-backups/yggdrasil/yggdrasil.2026-04-25T01-18-23-626Z.pre-simplify.json` |
| keep | `authoring/scene-backups/yggdrasil/yggdrasil.2026-04-25T01-28-44-185Z.pre-reduce-pass-2.json` |
| keep | `authoring/scene-backups/yggdrasil/yggdrasil.2026-04-25T02-07-36-925Z.pre-tree-merge.json` |
| keep | `authoring/scene-backups/yggdrasil/yggdrasil.2026-04-25T02-12-58-163Z.pre-ramp-merge.json` |
| keep | `authoring/scene-backups/yggdrasil/yggdrasil.2026-04-25T02-17-02-006Z.pre-bifrost-ribbon-merge.json` |
| keep | `authoring/scene-backups/yggdrasil/yggdrasil.2026-04-25T02-24-21-255Z.pre-tunnel-root-merge.json` |
| keep | `authoring/scene-backups/yggdrasil/yggdrasil.scene.20260418-185617.backup.json` |
| keep | `authoring/scene-backups/yggdrasil/yggdrasil.scene.20260418-185617.original-packaged.json` |
| keep | `authoring/scene-backups/yggdrasil/yggdrasil.scene.20260418-213014.pre-restore.json` |
| keep | `authoring/scene-backups/yggdrasil/yggdrasil.scene.20260418-214412.pre-restore.json` |
| keep | `src/threlte/editor/scenes/miranda.scene.json` |
| keep | `src/threlte/editor/scenes/observatory.scene.json` |
| keep | `src/threlte/editor/scenes/sci-fi-room.scene.json` |
| keep | `src/threlte/editor/scenes/solitude.scene.json` |
| keep | `src/threlte/editor/scenes/yggdrasil.scene.json` |
| keep | `src/threlte/engine/actorHierarchy.ts` |
| keep | `src/threlte/engine/collisionChannels.ts` |
| keep | `src/threlte/engine/collisionPolicy.ts` |
| keep | `src/threlte/engine/hierarchyTransforms.ts` |
| keep | `src/threlte/engine/index.ts` |
| keep | `src/threlte/engine/levelAssetPreloader.ts` |
| keep | `src/threlte/engine/levelCollisionWorkflow.ts` |
| keep | `src/threlte/engine/levelContracts.ts` |
| keep | `src/threlte/engine/levelValidation.ts` |
| keep | `src/threlte/engine/packagedSceneDocuments.ts` |
| keep | `src/threlte/engine/primitiveGeometry.ts` |
| keep | `src/threlte/engine/runtimeAssetManifest.ts` |
| keep | `src/threlte/engine/runtimeCullingTrace.ts` |
| keep | `src/threlte/engine/runtimeGameplayTypes.ts` |
| keep | `src/threlte/engine/runtimeLevelSettings.ts` |
| keep | `src/threlte/engine/runtimeSceneDocumentLoader.ts` |
| keep | `src/threlte/engine/runtimeSceneManifest.ts` |
| keep | `src/threlte/engine/runtimeWorldPartition.ts` |
| keep | `src/threlte/engine/sceneAdapter.ts` |
| keep | `src/threlte/engine/sceneDocumentRuntime.ts` |
| keep | `src/threlte/engine/sceneDocumentTypes.ts` |
| keep | `src/threlte/engine/types.ts` |
| refactor | `src/threlte/features/conversation/ConversationDialog.svelte` |
| refactor | `src/threlte/features/conversation/ConversationManager.ts` |
| keep | `src/threlte/features/conversation/FireflyAvatar.svelte` |
| refactor | `src/threlte/features/conversation/MemoryManagerAgent.ts` |
| keep | `src/threlte/features/conversation/README.md` |
| refactor | `src/threlte/features/conversation/characters/CharacterComponent.ts` |
| keep | `src/threlte/features/conversation/characters/CharacterRegistry.ts` |
| keep | `src/threlte/features/conversation/characters/definitions/ava-chen.ts` |
| keep | `src/threlte/features/conversation/characters/definitions/elara-voss.ts` |
| keep | `src/threlte/features/conversation/characters/definitions/eleanor-kim.ts` |
| keep | `src/threlte/features/conversation/characters/definitions/gregory-aster.ts` |
| keep | `src/threlte/features/conversation/characters/definitions/helena-zhao.ts` |
| keep | `src/threlte/features/conversation/characters/definitions/kaelen-vance.ts` |
| keep | `src/threlte/features/conversation/characters/definitions/maya-okafor.ts` |
| keep | `src/threlte/features/conversation/characters/definitions/merkin.ts` |
| keep | `src/threlte/features/conversation/characters/definitions/soren-klein.ts` |
| keep | `src/threlte/features/conversation/characters/definitions/vex-kanarath.ts` |
| refactor | `src/threlte/features/conversation/characters/index.ts` |
| keep | `src/threlte/features/conversation/characters/types.ts` |
| refactor | `src/threlte/features/conversation/conversationStores.ts` |
| refactor | `src/threlte/features/conversation/index.ts` |
| keep | `src/threlte/features/conversation/types.ts` |
| keep | `src/threlte/features/conversation/worldKnowledge.ts` |
| delete | `src/threlte/features/lighting/FireflyLightingSystem.ts` |
| keep | `src/threlte/features/lighting/LightingManager.ts` |
| delete | `src/threlte/features/lighting/SpatialGrid.ts` |
| keep | `src/threlte/features/lighting/index.ts` |
| keep | `src/threlte/features/multiplayer/components/MultiplayerManager.svelte` |
| keep | `src/threlte/features/multiplayer/components/PlayerAvatar.svelte` |
| keep | `src/threlte/features/multiplayer/components/RemotePlayerAvatar.svelte` |
| keep | `src/threlte/features/multiplayer/index.ts` |
| keep | `src/threlte/features/multiplayer/services/MultiplayerService.ts` |
| keep | `src/threlte/features/multiplayer/stores/chatStore.ts` |
| keep | `src/threlte/features/multiplayer/stores/hostStore.ts` |
| keep | `src/threlte/features/multiplayer/stores/logStore.ts` |
| keep | `src/threlte/features/multiplayer/stores/multiplayerStore.ts` |
| keep | `src/threlte/features/multiplayer/stores/playerNameStore.ts` |
| keep | `src/threlte/features/multiplayer/ui/ChatBox.svelte` |
| keep | `src/threlte/features/multiplayer/ui/HostPanel.svelte` |
| keep | `src/threlte/features/multiplayer/ui/LogTerminal.svelte` |
| keep | `src/threlte/features/multiplayer/ui/MultiplayerControls.svelte` |
| refactor | `src/threlte/features/ocean/components/OceanComponent.svelte` |
| keep | `src/threlte/features/ocean/effects/UnderwaterEffect.svelte` |
| keep | `src/threlte/features/ocean/effects/UnderwaterOverlay.svelte` |
| keep | `src/threlte/features/ocean/index.ts` |
| keep | `src/threlte/features/ocean/stores/underwaterStore.ts` |
| keep | `src/threlte/features/performance/OptimizationManager.ts` |
| keep | `src/threlte/features/performance/index.ts` |
| keep | `src/threlte/features/performance/stores/performanceStore.ts` |
| keep | `src/threlte/features/performance/systems/Performance.svelte` |
| keep | `src/threlte/features/performance/ui/PerformancePanel.svelte` |
| keep | `src/threlte/features/performance/utils/runtimeSceneBudget.ts` |
| keep | `src/threlte/features/performance/utils/runtimeVisualQualityPolicy.ts` |
| keep | `src/threlte/features/player/GroundShockwave.svelte` |
| refactor | `src/threlte/features/player/Player.svelte` |
| refactor | `src/threlte/features/player/ThrelteMobileControls.svelte` |
| keep | `src/threlte/features/player/index.ts` |
| keep | `src/threlte/features/player/mobileInputStore.ts` |
| delete | `src/threlte/features/terrain/Terrain.svelte` |
| keep | `src/threlte/features/terrain/TerrainManager.ts` |
| keep | `src/threlte/features/terrain/TerrainRuntime.svelte` |
| keep | `src/threlte/features/terrain/bakedTerrainCollider.ts` |
| keep | `src/threlte/features/terrain/components/HeightmapSurface.svelte` |
| keep | `src/threlte/features/terrain/components/TerrainChunk.svelte` |
| keep | `src/threlte/features/terrain/components/TerrainCollider.svelte` |
| keep | `src/threlte/features/terrain/index.ts` |
| keep | `src/threlte/features/terrain/terrainManifest.ts` |
| keep | `src/threlte/features/terrain/terrainStore.ts` |
| keep | `src/threlte/features/terrain/types.ts` |
| keep | `src/threlte/levels/RuntimeActorBranch.svelte` |
| keep | `src/threlte/levels/RuntimeActorNode.svelte` |
| keep | `src/threlte/levels/RuntimeActorRenderContent.svelte` |
| delete | `src/threlte/levels/RuntimeActorVisualAudit.svelte` |
| keep | `src/threlte/levels/RuntimeGameplayRenderer.svelte` |
| refactor | `src/threlte/levels/RuntimePrefabNode.svelte` |
| keep | `src/threlte/levels/SceneDocumentLevel.svelte` |
| keep | `src/threlte/levels/SceneLighting.svelte` |
| keep | `src/threlte/levels/level-registry.json` |
| keep | `src/threlte/levels/levelRegistry.ts` |
| keep | `src/threlte/levels/runtimeActorCollision.ts` |
| keep | `src/threlte/levels/runtimeGameplayPresentation.ts` |
| delete | `src/threlte/services/TimelineDataService.ts` |
| keep | `src/threlte/stores/gameStateStore.ts` |
| keep | `src/threlte/stores/postProcessingStore.ts` |
| keep | `src/threlte/stores/runtimeDiagnosticsStore.ts` |
| keep | `src/threlte/stores/runtimeRenderRegistry.ts` |
| keep | `src/threlte/stores/uiStore.ts` |
| keep | `src/threlte/styles/GameplayStyleProfiles.ts` |
| keep | `src/threlte/styles/StylePalettes.ts` |
| keep | `src/threlte/styles/runtimeVisualStyleStore.ts` |
| keep | `src/threlte/systems/AssetLoader.svelte` |
| refactor | `src/threlte/systems/Audio.svelte` |
| refactor | `src/threlte/systems/EventBus.svelte` |
| refactor | `src/threlte/systems/InteractionSystem.svelte` |
| keep | `src/threlte/systems/Physics.svelte` |
| keep | `src/threlte/systems/Renderer.svelte` |
| keep | `src/threlte/systems/SimplePostProcessing.svelte` |
| keep | `src/threlte/systems/Skybox.svelte` |
| refactor | `src/threlte/systems/StarMap.svelte` |
| keep | `src/threlte/systems/Time.svelte` |
| delete | `src/threlte/tests/validate-performance.ts` |
| keep | `src/threlte/ui/MobileEnhancements.svelte` |
| keep | `src/threlte/ui/RuntimeDiagnosticsPanel.svelte` |
| keep | `src/threlte/ui/SettingsButton.svelte` |
| keep | `src/threlte/ui/SettingsPanel.svelte` |
| keep | `src/threlte/ui/TimelineCard.svelte` |
| keep | `src/threlte/utils/gltfAssetCache.ts` |
| keep | `src/threlte/utils/materialOverrideContext.ts` |
| keep | `src/threlte/utils/materialUtils.ts` |
| keep | `src/threlte/utils/nameGenerator.ts` |
| delete | `src/threlte/utils/proceduralTextures.ts` |
| delete | `src/utils/content-utils.ts` |
| keep | `src/utils/starUtils.ts` |

To refresh this section, run:

```bash
find apps/game/src -type f | sort | sed s#^apps/game/##
```
