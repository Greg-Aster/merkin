# Game System Guardrails And Patch Audit

Date: 2026-06-04

Scope: `apps/game` runtime, editor, validation scripts, cook/publish pipeline, rendering, atmosphere, lighting, NPC/firefly, terrain, player, collision, and world-partition systems.

This audit was run against the current dirty working tree. It is a read-only system review plus this document. No runtime code was changed.

## Audit Standard

The target architecture is creator-authored level data flowing through durable engine contracts:

- Level intent belongs in scene documents, level registry metadata, runtime manifests, or generated cook products.
- Runtime systems should execute authored contracts. They should not silently repair, replace, clamp, or reinterpret level intent.
- Editor systems may help creators, but behavior-changing repairs should be explicit actions with visible diffs, not normal load/save side effects.
- Validation is good when it fails loudly before publish and points to one source of truth.
- Validation is technical debt when it encodes one old incident, one level's content, or brittle source-shape expectations as a permanent engine rule.

## Agent Coverage

Six read-only sub-agents audited independent lanes, then this report was consolidated with a local parent sweep.

- Runtime lighting, performance, firefly NPC presentation, and point-light budgeting.
- Level editor authoring controls, normalization, save, publish, and bake lifecycle.
- Level-specific coupling across generic game systems.
- Validation, audit, release-gate, and source-guard scripts.
- Rendering, materials, atmosphere, post-processing, ocean, water, and skybox systems.
- Terrain, physics, collisions, player/spawn, world partition, and runtime scene loading.

No sub-agent made edits or ran smoke/browser/dev-server checks.

## Executive Summary

The codebase has several strong architectural pieces already: centralized runtime lighting, runtime scene manifests, readiness gates, terrain collision validation, and manifest-backed world partitioning. The problem is that those systems are mixed with hidden runtime fallbacks, compatibility migrations, level-id branches, source regex guards, and behavior-changing editor normalizers.

The highest-risk pattern is not "guardrails" as validation. The highest-risk pattern is behavior-changing code that runs in normal runtime or editor paths:

- Static level contracts hardcode level IDs and actor IDs in generic engine code.
- Editor load/save/publish can hydrate defaults, append missing packaged nodes, and mutate legacy settings buckets.
- Runtime performance and asset systems can change quality, lighting, post-processing, and asset tiers without a level-authored policy being the only owner.
- Firefly generation has split contracts: authored/generated NPCs, ignored `terrainFollow`, medium-only population compilation, and hardcoded interactive content.
- Rendering mutates imported GLB materials and lights at runtime.
- Ocean/water bypasses the unified atmosphere path.
- Player spawn Y can be changed by runtime snapping.
- Pipeline scripts can hide failures or write generated outputs after hard audit failures.

The recommended repair direction is not to add more guards. Move the hidden decisions into explicit scene/render/profile contracts, make editor repairs explicit migrations, and split validation into hard contracts, migration checks, content policy, and advisory hygiene.

## High Priority Findings

### 1. Static Level Contracts In Generic Engine Code

Type: behavior-changing validation/editor coupling.

Evidence:

- [`src/threlte/engine/levelContractsCore.mjs`](../src/threlte/engine/levelContractsCore.mjs) hardcodes `observatory`, `solitude`, `sci-fi-room`, and `yggdrasil` required actor IDs and budgets.
- [`src/threlte/engine/levelRuntimeReadinessContractCore.mjs`](../src/threlte/engine/levelRuntimeReadinessContractCore.mjs) merges those static contracts into readiness gates.
- [`src/threlte/engine/levelValidation.ts`](../src/threlte/engine/levelValidation.ts) and [`scripts/lib/runtimeSceneManifest.mjs`](../scripts/lib/runtimeSceneManifest.mjs) consume the same static contract path.
- [`src/threlte/editor/editorDocumentStore.ts`](../src/threlte/editor/editorDocumentStore.ts) uses required IDs to protect actors from deletion in the editor.

Impact:

Level creators cannot fully own required actors and budgets through the level editor. Required IDs and caps live outside the scene contract, so a level can fail or block edits because generic engine code knows about old level internals.

Recommendation:

Move `requiredActorIds`, `requiredRenderActorIds`, `requiredWalkableActorIds`, and per-level budgets into scene or manifest metadata. Existing surfaces such as `settings.level.runtimeAssets` and `settings.level.graphicsBudget` should be the source of truth. Replace inferred IDs like `${levelId}-terrain` and `${levelId}-player-spawn` with authored terrain/spawn metadata.

### 2. Editor Default Hydration And Repair Runs In Normal Paths

Type: behavior-changing editor mutation.

Evidence:

- [`src/threlte/editor/defaultScenes.ts`](../src/threlte/editor/defaultScenes.ts) hydrates missing packaged settings and can append missing packaged default nodes during `upgradeLegacySceneDocument`.
- [`src/threlte/editor/editorDocumentStore.ts`](../src/threlte/editor/editorDocumentStore.ts) runs the upgrade on load/clone.
- [`src/threlte/editor/editorLevelController.ts`](../src/threlte/editor/editorLevelController.ts) uses upgraded documents in save/publish flows.

Impact:

Missing authored data can be silently repaired from packaged scenes. That may be useful for one-time migrations, but as a normal path it hides missing contracts and can reintroduce level-specific defaults.

Recommendation:

Make repair an explicit versioned migration command with a diff and acceptance step. Normal load/save should preserve authored data and validation should report missing required data.

### 3. Settings Normalization Still Mutates Legacy Buckets

Type: behavior-changing editor mutation.

Evidence:

- [`src/threlte/editor/editorLevelSetup.ts`](../src/threlte/editor/editorLevelSetup.ts) merges legacy `settings.observatory` and `settings.solitude` into `settings.level`.
- The same file injects collision defaults, terrain sculpt defaults, retired lighting migrations, and then strips shared settings back out of legacy buckets.
- The deprecated scene-field audit still knows about `settings.observatory.*` and `settings.solitude.*` in [`scripts/lib/deprecatedSceneFields.mjs`](../scripts/lib/deprecatedSceneFields.mjs).

Impact:

Compatibility code remains active in the normal authoring path. It can reshape scene settings every time the editor normalizes a document, which makes the source of truth hard to reason about.

Recommendation:

Keep compatibility reads only where needed, but stop writing migrations during normal normalization. Add removal conditions for legacy buckets and make old scenes migrate through explicit schema-versioned steps.

### 4. Automatic Optimization Can Override Level Intent

Type: behavior-changing runtime override.

Evidence:

- [`src/threlte/GameCanvasStage.svelte`](../src/threlte/GameCanvasStage.svelte) mounts `PerformanceSystem` with `enableAutomaticOptimization={true}`.
- [`src/threlte/features/performance/systems/Performance.svelte`](../src/threlte/features/performance/systems/Performance.svelte) steps quality down/up after live FPS samples.
- [`src/threlte/features/performance/OptimizationManager.ts`](../src/threlte/features/performance/OptimizationManager.ts) hardcodes base quality profiles and disables dynamic lighting on low tiers.
- [`src/threlte/features/performance/utils/runtimeSceneBudget.ts`](../src/threlte/features/performance/utils/runtimeSceneBudget.ts) converts quality settings into runtime prop, point-light, and shadow policy.

Impact:

The resolved level can change after load based on device and live FPS. This can disable dynamic lighting, reduce light counts, alter post-processing, and change visual quality outside a level-authored render profile being the single owner.

Recommendation:

Make adaptive optimization an explicit render-profile policy visible in the level editor. The runtime may report pressure and apply authored emergency policies, but it should not invent quality transitions. If automatic degradation remains, diagnostics must show the active override and the level profile must be able to opt out per level or per required light group.

### 5. Runtime Point-Light Budget Has Hidden Defaults And Global Kill Switches

Type: behavior-changing runtime override.

Evidence:

- [`src/threlte/features/performance/utils/runtimeSceneBudget.ts`](../src/threlte/features/performance/utils/runtimeSceneBudget.ts) defines tier defaults for `maxVisibleCount`, `maxDistance`, `intensityScale`, `rangeScale`, and low-tier dynamic-light disabling.
- [`src/threlte/features/lighting/RuntimeLightingSystem.svelte`](../src/threlte/features/lighting/RuntimeLightingSystem.svelte) selects budgeted emitters by group priority, intensity, range, camera frustum intersection, hysteresis, and max counts.
- [`src/threlte/editor/EditorEnvironmentPanel.svelte`](../src/threlte/editor/EditorEnvironmentPanel.svelte) exposes point-light budgets, but also displays fallback values when authored fields are missing.

Impact:

The architecture is improved compared with the old hidden player-distance cull, but missing authored budget data still falls back to runtime quality defaults. A creator can see values in the editor that are inherited rather than explicitly authored.

Recommendation:

Require deployed scenes to author `renderProfile.lighting.pointLightBudget` explicitly, including group budgets for fireflies, player, authored lights, and ambient VFX. Editor UI should distinguish inherited values from persisted values. Runtime should execute the resolved authored profile and telemetry should explain every omitted light.

### 6. Firefly Population Contract Is Split

Type: behavior-changing generated content and runtime presentation mismatch.

Evidence:

- [`src/threlte/engine/sceneAdapter.ts`](../src/threlte/engine/sceneAdapter.ts) always adds generated firefly population actors via `createSceneFireflyPopulationActors(scene)`.
- [`src/threlte/engine/sceneFireflyFieldCore.mjs`](../src/threlte/engine/sceneFireflyFieldCore.mjs) resolves population quality without an explicit runtime tier, defaulting to medium.
- `terrainFollow` is exposed in [`src/threlte/editor/EditorFireflyFieldControls.svelte`](../src/threlte/editor/EditorFireflyFieldControls.svelte), but generation places fireflies by center Y plus random height rather than terrain sampling.
- The same core file has hardcoded profile IDs, lost-soul names, response text, profile chance, and fallback dialogue.
- [`src/threlte/features/npc/presentation/RuntimeFireflyNpc.svelte`](../src/threlte/features/npc/presentation/RuntimeFireflyNpc.svelte) resolves lighting and blink behavior at runtime using quality stores.

Impact:

Creators can author firefly controls that are not fully real. Population count, terrain following, interactive content, and runtime presentation do not all share one contract. This explains why firefly behavior can feel like multiple systems even after the old duplicate component was removed.

Recommendation:

Make generated fireflies a manifest-backed NPC population with one explicit contract. Either make count compile-time-only and reject per-tier counts, or cook/select per-tier populations explicitly. Implement terrain-height sampling in the cook/generator or remove the setting until it is real. Move interactive names/profiles/responses into scene-authored content or editor templates.

### 7. Imported GLB Materials And Lights Are Mutated At Runtime

Type: behavior-changing visual/runtime mutation.

Evidence:

- [`src/threlte/components/HeroProp.svelte`](../src/threlte/components/HeroProp.svelte) mutates loaded mesh materials and raises `envMapIntensity` using runtime visual style values.
- [`src/threlte/features/terrain/components/TerrainChunk.svelte`](../src/threlte/features/terrain/components/TerrainChunk.svelte) sends terrain chunks through `HeroProp`, so the mutation affects terrain and props.
- [`src/threlte/components/HeroProp.svelte`](../src/threlte/components/HeroProp.svelte) also traverses loaded assets, hides imported lights, and zeros their intensity outside editor use.

Impact:

Authored GLB materials and imported lights do not render exactly as authored. Runtime silently changes them to fit engine assumptions.

Recommendation:

Move material/light normalization into import/cook validation. Imported lights should be stripped, converted to `ManagedLight`, or reported as import diagnostics. Reflection/material boosts should be explicit material-style or render-profile fields, not generic runtime traversal.

### 8. Ocean And Underwater Effects Bypass Unified Atmosphere

Type: behavior-changing rendering split.

Evidence:

- [`src/threlte/levels/SceneDocumentLevel.svelte`](../src/threlte/levels/SceneDocumentLevel.svelte) reports ocean atmosphere status separately and hardcodes water-related props.
- [`src/threlte/features/ocean/components/OceanComponent.svelte`](../src/threlte/features/ocean/components/OceanComponent.svelte) sets `fog = false` on water materials.
- [`src/threlte/features/ocean/effects/UnderwaterEffect.svelte`](../src/threlte/features/ocean/effects/UnderwaterEffect.svelte) and [`src/threlte/features/ocean/effects/UnderwaterOverlay.svelte`](../src/threlte/features/ocean/effects/UnderwaterOverlay.svelte) implement separate underwater visuals.

Impact:

Water does not participate in the same atmosphere, material fog, post-processing, and lighting ownership path as the rest of the scene. This directly matches prior reports that light/atmosphere does not affect ocean consistently.

Recommendation:

Define a water/underwater atmosphere contract consumed by the unified atmosphere/post stack. Remove `fog:false` bypasses unless explicitly authored. Move water constants into scene/render-profile data and expose them in the editor.

### 9. Post-Processing Has Too Many Runtime Owners

Type: behavior-changing runtime blend.

Evidence:

- [`src/threlte/stores/postProcessingStore.ts`](../src/threlte/stores/postProcessingStore.ts) has hardcoded quality presets.
- [`src/threlte/systems/SimplePostProcessing.svelte`](../src/threlte/systems/SimplePostProcessing.svelte) applies global quality into the post-processing store.
- [`src/threlte/features/performance/utils/runtimeVisualQualityPolicy.ts`](../src/threlte/features/performance/utils/runtimeVisualQualityPolicy.ts) blends atmosphere, style, adaptive quality, and profile values.
- [`src/threlte/stores/runtimeRenderProfileStore.ts`](../src/threlte/stores/runtimeRenderProfileStore.ts), `OptimizationManager`, and `PerformanceSystem` all affect the final runtime tier.

Impact:

A creator cannot inspect one authored profile and know the final post stack. Runtime quality, device profile, and FPS adaptation all participate.

Recommendation:

Make resolved render profile the single source of truth. Adaptive overrides should be explicit layers with diagnostics and a single merge point, not distributed store mutations.

### 10. Runtime Spawn Snapping Overrides Authored Spawn

Type: behavior-changing runtime correction.

Evidence:

- [`src/threlte/features/player/Player.svelte`](../src/threlte/features/player/Player.svelte) defaults `snapSpawnToGround` to true, probes down, and writes the corrected position into runtime player state.
- [`src/threlte/core/GameWorld.svelte`](../src/threlte/core/GameWorld.svelte) does not pass an explicit override.
- Validation checks authored spawn support, not necessarily the corrected runtime landing point.

Impact:

Authored spawn Y can change silently at runtime. That is a direct creator-control violation unless snapping is an authored level/player setting.

Recommendation:

Make spawn snapping explicit in level/player settings. If kept, report the correction distance and warn or fail when it exceeds validation tolerance.

### 11. World Partition Is Player-Radius Streaming With Contract Mismatches

Type: behavior-changing streaming plus validation gap.

Evidence:

- [`src/threlte/engine/runtimeWorldPartition.ts`](../src/threlte/engine/runtimeWorldPartition.ts) validates positive `cellSize` and non-negative `activeRadius`, then selection clamps cell size and filters cells by player position/radius.
- [`src/threlte/levels/SceneDocumentLevel.svelte`](../src/threlte/levels/SceneDocumentLevel.svelte) applies active partition actor IDs to render filtering.
- [`scripts/cook-world-partition.mjs`](../scripts/cook-world-partition.mjs) uses stricter implicit rules for cell size and active radius.
- The same cook script can fall back missing spawn to origin, while runtime scene loading requires finite authored spawn.

Impact:

Streaming is legitimate, but the runtime/cook/validation contracts are not identical. Player-radius culling can look like random object disappearance if the level editor does not make the partition policy obvious.

Recommendation:

Align runtime validation, cook, and audit around one world-partition contract. Turn silent clamps into validation errors unless explicitly supported. Fail partition cooking on missing spawn.

### 12. Terrain Visual Readiness Can Activate Before Chunks Finish

Type: behavior-changing readiness issue.

Evidence:

- [`src/threlte/features/terrain/TerrainRuntime.svelte`](../src/threlte/features/terrain/TerrainRuntime.svelte) marks visual readiness true while active chunk URLs are pending.
- Once collision is ready, this can dispatch terrain-ready and participate in gameplay activation through `SceneDocumentLevel`.

Impact:

Gameplay can activate before required active terrain visuals are fully loaded. This is a readiness contract issue rather than a level-authoring feature.

Recommendation:

Split collision-ready from visual-streaming-ready, or require initial active terrain chunks to finish before gameplay activation.

### 13. Cook/Publish Pipeline Can Hide Or Write Through Failures

Type: behavior-changing pipeline issue.

Evidence:

- [`scripts/cook-runtime-assets.mjs`](../scripts/cook-runtime-assets.mjs) sets `process.exitCode` for hard runtime asset audit failures, but does not block manifest writes in the pre-write blocker path.
- [`scripts/editor-tools/sceneRoutes.cjs`](../scripts/editor-tools/sceneRoutes.cjs) can convert a non-zero `audit-engine` result into success when failures do not string-match the requested level.

Impact:

The system can produce or accept generated artifacts even when hard audits failed, or hide global debt during level publish. This undermines trust in the pipeline.

Recommendation:

Hard audit failures must block writes. Editor publish should consume structured audit JSON with `scope`, `levelIds`, and `blockingForPublish`, not string matching. Global release gates should remain hard where intended, but level publish should use real level-scoped validators.

## Medium Priority Findings

### 14. Level-Specific Editor UI Profiles

Type: behavior-changing UI coupling.

Evidence:

- [`src/threlte/engine/sceneDocumentTypes.ts`](../src/threlte/engine/sceneDocumentTypes.ts) defines `editorPanels.environment` as `shared | observatory | solitude | sci-fi-room | miranda`.
- [`src/threlte/editor/EditorEnvironmentPanel.svelte`](../src/threlte/editor/EditorEnvironmentPanel.svelte) branches on those profile names.

Impact:

The generic editor knows level names and chooses controls by profile branch instead of capabilities. New levels get either shared controls or more hardcoded profile branches.

Recommendation:

Replace named environment profiles with scene-authored capability metadata: water, atmosphere, ambient audio, skybox, lighting, render budget, post stack, and level-specific extension panels.

### 15. Yggdrasil Descriptors In Generic Generation

Type: editor authoring coupling.

Evidence:

- [`src/threlte/editor/editorGeneration.ts`](../src/threlte/editor/editorGeneration.ts) contains many `yggdrasil-*` ID-prefix checks for generation descriptors.

Impact:

Prompt-generation logic for one level lives in a generic editor helper.

Recommendation:

Move descriptors into `node.generation.descriptor`, a level-authored descriptor table, or a named migration/authoring script.

### 16. Skybox Defaults Are Observatory-Specific

Type: behavior-changing fallback.

Evidence:

- [`src/threlte/levels/skyboxPresets.ts`](../src/threlte/levels/skyboxPresets.ts) falls back unknown presets to Observatory.
- [`src/threlte/levels/SceneDocumentLevel.svelte`](../src/threlte/levels/SceneDocumentLevel.svelte) uses Observatory as a diagnostic/default skybox preset.
- [`src/threlte/engine/sceneDocumentTypes.ts`](../src/threlte/engine/sceneDocumentTypes.ts) keeps `skyboxPreset` optional.

Impact:

Missing or invalid skybox authoring becomes Observatory sky instead of an authoring error.

Recommendation:

Require a valid skybox preset for deployed scenes. Use a neutral placeholder only in editor templates, not generic runtime.

### 17. Collision Defaults And Collider Clamps

Type: editor mutation plus validation gap.

Evidence:

- [`src/threlte/editor/editorLevelSetup.ts`](../src/threlte/editor/editorLevelSetup.ts) defaults primitive collision-by-default settings.
- [`src/threlte/editor/editorCollisionLifecycle.ts`](../src/threlte/editor/editorCollisionLifecycle.ts) can materialize fixed physics/collision for eligible primitives.
- [`src/threlte/engine/colliderGeometryCore.mjs`](../src/threlte/engine/colliderGeometryCore.mjs) and [`src/threlte/engine/generatedCollisionProductRuntime.ts`](../src/threlte/engine/generatedCollisionProductRuntime.ts) sanitize/clamp collider dimensions.

Impact:

Editor collision help is useful, but defaulted collision can be mistaken for authored collision. Invalid collider values can be corrected silently instead of rejected.

Recommendation:

If primitive collision defaults remain, mark them as defaulted/materialized in scene data or diagnostics. Reject zero, negative, or sub-min collider dimensions during authoring/cook validation, or persist corrected values explicitly.

### 18. Publish Overrides Some Creator Metadata

Type: behavior-changing editor/publish control.

Evidence:

- [`src/threlte/editor/EditorSavePanel.svelte`](../src/threlte/editor/EditorSavePanel.svelte) lets creators set status/deployed/star navigation.
- [`src/threlte/editor/editorLevelController.ts`](../src/threlte/editor/editorLevelController.ts) forces publish payload metadata such as active/deployed/star-map behavior.

Impact:

Creator-visible metadata controls do not necessarily determine published metadata.

Recommendation:

Keep publish actions explicit, but respect star-map intent or expose a separate "publish to star map" policy.

### 19. Imported Material Fog Participation Is Split

Type: behavior-changing rendering helper.

Evidence:

- [`src/threlte/utils/materialUtils.ts`](../src/threlte/utils/materialUtils.ts) fixes alpha/depth settings and also opts materials into fog.
- [`src/threlte/atmosphere/SceneAtmosphereSystem.svelte`](../src/threlte/atmosphere/SceneAtmosphereSystem.svelte) owns atmosphere diagnostics separately.

Impact:

Atmosphere participation is partly owned by a generic material helper and partly by the atmosphere system.

Recommendation:

Separate depth/alpha repair from atmosphere participation. The atmosphere registry should own fog eligibility.

### 20. Conversation Compatibility And Hardcoded Memory Limits

Type: low-priority compatibility debt.

Evidence:

- [`src/threlte/features/conversation/characters/index.ts`](../src/threlte/features/conversation/characters/index.ts) exposes a compatibility layer for legacy character knowledge APIs.
- [`src/threlte/features/conversation/MemoryManagerAgent.ts`](../src/threlte/features/conversation/MemoryManagerAgent.ts) hardcodes retrieval, compression, and response-token limits.

Impact:

This is less connected to level layout and lighting, but it is another example of legacy compatibility and policy constants living in runtime code.

Recommendation:

Keep only if current callers require it. Otherwise remove the compatibility layer or move runtime policy into config.

## Validation-Only Guardrail Debt

These checks are not direct runtime overrides, but they make the codebase harder to maintain because hard invariants, migration policy, content policy, and advisory hygiene are mixed together.

### Source Guards Mix Hard Contracts With Regression Regexes

Evidence:

- [`scripts/lib/engineAuditSourceGuards.mjs`](../scripts/lib/engineAuditSourceGuards.mjs) contains good hard guards such as no direct runtime light mounts, no reintroduced firefly field component, no generated engine data in source scenes, and no hidden point-light player-distance caps.
- The same file also has brittle regex checks for exact firefly render implementation shape, editor tab presence, and specific old UI controls.

Recommendation:

Split source guards into:

- `contracts`: hard architectural invariants.
- `migrations`: temporary cleanup checks with removal conditions.
- `regression`: targeted tests for known bugs, preferably using exported functions rather than source regexes.
- `advisory`: style/process warnings.

### Generic Audits Contain Content-Specific Policy

Evidence:

- [`scripts/audit-engine-architecture.mjs`](../scripts/audit-engine-architecture.mjs) has Observatory terrain manifest expectations.
- [`scripts/lib/runtimeAssetManifestAudit.mjs`](../scripts/lib/runtimeAssetManifestAudit.mjs) contains hardcoded hero/PBR asset expectations.
- [`scripts/test-publish-pipeline.ts`](../scripts/test-publish-pipeline.ts) has Observatory firefly assertions in broad publish tests.
- [`scripts/release-gate.mjs`](../scripts/release-gate.mjs) hardcodes level lists and includes smoke steps in quick/CI profiles.

Recommendation:

Move level-specific policy to level/import metadata or level-specific contract tests. Derive level coverage from the registry. Keep smoke/browser checks in explicit full/browser profiles, not default static gates.

### Terrain Migration Ledger Is Mixed With Runtime Terrain Contract

Evidence:

- [`scripts/lib/terrainContractAudit.mjs`](../scripts/lib/terrainContractAudit.mjs) enforces durable terrain source/hash/runtime drift checks and also requires migration ledger fields.

Recommendation:

Split `terrain-runtime-contract` from `terrain-migration-ledger`. Runtime source/hash/manifest consistency remains hard. Historical migration bookkeeping becomes advisory or temporary.

## Guardrails Worth Keeping

These are aligned with the target architecture and should be preserved while cleanup happens.

- Centralized lighting registration and mounting: `ManagedLight` registers emitters, `RuntimeLightingController` owns snapshots, and `RuntimeLightingSystem` mounts lights.
- Source guard against direct `T.PointLight`, `T.DirectionalLight`, etc. outside the central lighting system.
- Source guard against reintroducing component-local `SceneFireflyField.svelte`.
- Source guard against hidden point-light player-distance culling.
- Runtime scene manifest validation in [`src/threlte/engine/runtimeSceneManifest.ts`](../src/threlte/engine/runtimeSceneManifest.ts).
- Runtime readiness gate shape in [`src/threlte/engine/levelRuntimeReadinessContractCore.mjs`](../src/threlte/engine/levelRuntimeReadinessContractCore.mjs), after static level IDs are removed.
- Runtime scene loading failing on missing cooked manifests rather than falling back to source scenes.
- Terrain manifest validation and missing baked terrain collision failures.
- World partition readiness validation, after runtime/cook contract mismatch is fixed.
- Collision classification validation, as long as authoring defaults are explicit.

## Recommended Cleanup Sequence

### Phase 1: Stop Hidden Runtime Overrides

1. Make automatic optimization explicit in render profiles, or disable automatic runtime tier changes by default.
2. Require explicit deployed-scene point-light budgets and group budgets.
3. Remove runtime GLB material/light mutation; move it to import/cook diagnostics.
4. Make spawn snapping an explicit level/player setting with diagnostics.
5. Replace skybox Observatory fallback with validation for deployed scenes.

### Phase 2: Consolidate Authoring Source Of Truth

1. Move static level runtime contracts into scene/manifest metadata.
2. Replace level-named editor environment profiles with capability metadata.
3. Turn default scene hydration/repair into explicit schema migrations.
4. Retire `settings.observatory` and `settings.solitude` compatibility writes.
5. Move Yggdrasil descriptor inference into authored node generation metadata.

### Phase 3: Unify Firefly And Lighting Contracts

1. Decide whether generated firefly count is compile-time-only or tier-selected at runtime.
2. Implement or remove `terrainFollow`.
3. Move interactive firefly content defaults into scene data or templates.
4. Require explicit firefly lighting contracts for deployed scenes.
5. Keep active light percentage as the single authoring model and make telemetry show active/total by group.

### Phase 4: Unify Atmosphere, Water, And Post

1. Make water and underwater visuals consume the unified atmosphere/post contract.
2. Remove local `fog:false` bypasses unless explicitly authored.
3. Make resolved render profile the single merge point for post-processing.
4. Move material fog participation into the atmosphere registry.

### Phase 5: Split Validation Into Lanes

1. `contracts`: schema, readiness, runtime purity, generated drift, terrain/source/hash, lighting ownership.
2. `migrations`: legacy scene fields, Agent cleanup checks, terrain migration ledgers, retired APIs.
3. `content-policy`: level-specific hero/PBR/terrain/firefly assertions.
4. `advisory`: budgets, chunk ownership, visual bookmarks, WIP hygiene.

Every non-contract guard should have an owner, scope, and removal condition.

## Definition Of Done For Repairs

- Level editor owns all creator-facing lighting, firefly, atmosphere, water, render, culling, spawn, and budget controls.
- Runtime executes resolved scene/render/manifest contracts without silently patching or changing author intent.
- Missing required authored data fails publish or shows an editor diagnostic; it is not invented at runtime.
- Runtime telemetry explains every light omitted by budget, every active quality override, and every streamed/cull decision.
- Generic systems do not branch on level IDs except in registry, scene data, manifests, tests, or explicitly named one-shot migrations.
- Audits are scoped and categorized, so hard engine contracts are not mixed with temporary cleanup policy.

## Commands And Validation

Parent and sub-agents used read-only inspection commands: `rg`, `find`, `nl`, `sed`, `git status`, and targeted source reads.

Commands not run:

- No type checks.
- No tests.
- No builds.
- No smoke/browser/dev-server checks.

Reason: this was a system audit and documentation change. The repository instructions also say not to run smoke checks by default.

CSS surface area: none.
