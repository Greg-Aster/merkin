# Collision Pipeline Removal Scratchpad

Purpose: shared audit notes for simplifying the collision system before rebuild work. Keep this file current as agents inspect or remove code.

## Current Audit Status

- Scope: `apps/game` collision runtime, editor collision lifecycle, terrain collision workflow, and audit scripts.
- Current repo audit before removals: `pnpm --dir apps/game audit:collision` passed with one info finding: Observatory player spawn relies on baked terrain coverage.
- Current repo audit after first removals: same result, with no new errors or warnings.
- Current repo audit after assist pass on 2026-05-13: same result, with no new errors or warnings.
- Scene inventory:
  - `miranda`: 70 nodes, 43 authored collisions, scene-collider ground.
  - `observatory`: 1 group node, 0 authored collisions, source-linked terrain collision. `lightweight-auto` was enabled but effectively unused for actors; first removal pass normalized it to `authored-only`.
  - `sci-fi-room`: 45 nodes, 35 authored collisions, 8 asset trimesh colliders.
  - `solitude`: 33 nodes, 15 authored collisions, 15 asset trimesh colliders.
  - `yggdrasil`: 173 nodes, 102 authored collisions, 16 asset trimesh colliders, 62 primitive collisions, 15 `proxy: false` metadata entries.
- No active scene currently has `collision.proxy === true`.
- First removal pass has removed the implicit `lightweight-auto` actor-collision runtime path and editor control.

## Pipeline Map

Authoring/editor flow:

1. Scene document nodes store optional `node.collision`, `node.physics`, `node.renderPolicy`, and level collision settings.
2. `editorCollisionDefaults.ts` derives default shapes/intents/channels and editor collider args.
3. `editorCollisionLifecycle.ts` materializes editor proxy collision and marks stale or missing mesh collider states.
4. Bake scripts write mesh/terrain collider products and patch scene metadata.
5. Publish/runtime adaptation sends scene documents through `sceneAdapter.ts`.

Runtime flow:

1. `sceneAdapter.ts` calls `resolveCollisionPolicy(...)` per scene node.
2. `collisionPolicy.ts` resolves authored collision against explicit scene settings; `levelCollisionWorkflow.ts` is now a settings adapter, not a hard-coded level workflow authority.
3. Actor physics data reaches `RuntimeActorNode.svelte`.
4. `runtimeActorCollision.ts` computes collider args from collision size, primitive args, or transform scale.
5. `CollisionBody.svelte` remains the compatibility facade for physics and overlay visibility.
6. `RuntimeCollisionBody.svelte` owns Rapier rigid-body mounting and transform parenting.
7. `RuntimeCollisionCollider.svelte` owns primitive/asset-trimesh collider selection.
8. `CollisionBodyOverlay.svelte` owns debug helper and label rendering.
9. Terrain collision is separate and comes from feature terrain components and terrain manifests.

## Early Removal Targets

- DONE: Hard-coded level workflow table in `src/threlte/engine/levelCollisionWorkflow.ts`; surviving terrain contracts now need to come from scene settings or registry data.
- DONE: Actor id prefix inference in `inferLevelIdFromActorId(...)`; runtime/editor callers should pass level settings explicitly.
- DONE: Static `levelCollisionWorkflows` duplication in `scripts/lib/runtimeSceneManifest.mjs`; scene settings now own the terrain contract.
- DONE: `lightweight-auto` default collision branch and editor control.
- DONE: Dead `actorCollision` workflow field and default-policy editor plumbing after implicit defaults were removed.
- DONE: Stale `proxy: false` / `bakeStatus: notRequired` scene metadata was removed from `yggdrasil.scene.json`.
- DONE 2026-05-13: Editor proxy collision no longer leaks into `CollisionComponent`, runtime scene manifests, or open-coded runtime policy checks. Scene documents may still keep proxy/bake metadata only for editor lifecycle and publish readiness.
  - DONE 2026-05-13: Proxy/bake-state detection is centralized in `src/threlte/engine/editorProxyCollision.ts`; readiness, scene validation, collision review, and editor collision source display now use shared helpers instead of open-coded field checks.
- DONE: Duplicate collider sizing math is centralized through `src/threlte/engine/colliderGeometryCore.mjs` and the typed `src/threlte/engine/colliderGeometry.ts` wrapper.
  - DONE: `src/threlte/levels/runtimeActorCollision.ts`
  - DONE: `src/threlte/editor/editorCollisionDefaults.ts`
  - DONE: `src/threlte/engine/collisionReview.ts`
  - DONE: `src/threlte/engine/levelValidation.ts`
  - DONE: `scripts/lib/runtimeSceneManifest.mjs` imports the runtime-safe `.mjs` core instead of carrying local primitive sizing math.
- DONE: Spawn/walkability support spatial queries shared by review and validation now live in `src/threlte/engine/collisionSpatialQueries.ts`.
- DONE: `CollisionBody.svelte` mixed responsibilities are split into compatibility facade plus runtime/overlay helpers.
  - DONE: Runtime collider selection moved to `src/threlte/collision/RuntimeCollisionCollider.svelte`.
  - DONE: Overlay helpers and labels moved to `src/threlte/collision/CollisionBodyOverlay.svelte`.
  - DONE: Runtime rigid-body transform mode and scene-slot parenting moved to `src/threlte/collision/RuntimeCollisionBody.svelte`.
- DONE: Source-GLB terrain chunk authority no longer has to masquerade as generated `terrain-chunks` visuals.
  - `groundContractCore.mjs` accepts `source-glb-chunks` as a terrain chunk visual source.
  - `terrain.source === "source-glb"` classifies as `source-linked-terrain-collision` when no explicit ground collision source is present.
  - Observatory source and runtime scene settings now use `ground.visualSource: "source-glb-chunks"`.
- DONE: Editor terrain chunk predicate cleanup.
  - Added `src/threlte/editor/editorTerrainModeGuards.ts`.
  - `editorTerrainPipeline.ts`, `editorPublishBakePlan.ts`, `EditorPanel.svelte`, and `editorPublishReadiness.ts` now route source-GLB/generated-heightmap chunk checks through shared helpers.
  - Boundary for other agents: prefer adding future terrain chunk classification behavior to `editorTerrainModeGuards.ts` instead of reintroducing local `terrain-chunks` checks in editor files.
- DONE 2026-05-13: Removed duplicated collider sizing math from `scripts/lib/runtimeSceneManifest.mjs`.
  - Added `src/threlte/engine/colliderGeometryCore.mjs` plus `.d.mts`.
  - `colliderGeometry.ts` now wraps the shared core for typed game/editor callers.
  - `runtimeSceneManifest.mjs` now imports `getActorDefinitionCollisionWorldSize(...)` from the shared core.
  - Boundary for other agents: future collider sizing behavior should be added in `colliderGeometryCore.mjs`, then exposed through `colliderGeometry.ts` if typed callers need it.
- DONE 2026-05-13: Removed duplicated collision-channel resolution from `scripts/lib/runtimeSceneManifest.mjs`.
  - Added `src/threlte/engine/collisionChannelsCore.mjs` plus `.d.mts`.
  - `collisionChannels.ts` now wraps the shared core for typed game/editor callers.
  - `runtimeSceneManifest.mjs` now imports `isCollisionChannel(...)` and `resolveCollisionChannel(...)` from the shared core.
  - Boundary for other agents: future collision channel defaulting or valid-channel changes should be added in `collisionChannelsCore.mjs`, then exposed through `collisionChannels.ts` if typed callers need it.
- DONE 2026-05-13: Removed duplicated runtime collision group mapping from `scripts/lib/runtimeSceneManifest.mjs`.
  - Added `src/threlte/constants/physicsGroupsCore.mjs` plus `.d.mts`.
  - `constants/physics.ts` now wraps the shared core for typed Rapier/browser callers.
  - `runtimeSceneManifest.mjs` now imports `hasRuntimeCollisionGroupMapping(...)` from the shared core.
  - Boundary for other agents: future runtime collision layer or group-matrix behavior should be added in `physicsGroupsCore.mjs`, then exposed through `constants/physics.ts` if typed callers need it.
- DONE 2026-05-13: Removed duplicated level runtime contract lookup from `scripts/lib/runtimeSceneManifest.mjs`.
  - Added `src/threlte/engine/levelContractsCore.mjs` plus `.d.mts`.
  - `levelContracts.ts` now wraps the shared core for typed engine callers.
  - `runtimeSceneManifest.mjs` now imports `getLevelRuntimeContract(...)` from the shared core.
- DONE 2026-05-13: Removed level-id/id-prefix firefly presentation branches from `src/threlte/levels/runtimeGameplayPresentation.ts`; the existing Solitude/Yggdrasil tuned firefly values now live in authored scene gameplay data.
- Level-specific migration docs/scripts should not remain in generic runtime paths once the rebuild starts.

## Removal Order Proposal

## Target Contract And Stop Condition

Stop broad simplification once the repo holds this contract:

1. Runtime actor collision is explicit scene-authored collision only; no implicit `lightweight-auto` or level-id actor inference.
2. Runtime terrain collision supports the protected Observatory source-linked terrain path and scene-authored ground actors. Other terrain modes are authoring/migration data until a rebuild target chooses them.
3. Runtime publishing strips editor-only proxy/bake state from `CollisionComponent`; editor proxy metadata may remain only as editor lifecycle/readiness metadata until there is a replacement authoring flow.
4. `runtimeSceneManifest.mjs` remains Node-safe and delegates shared collision sizing, channel, group, and terrain contract logic to `.mjs` cores instead of carrying local copies.
5. Collision review remains human-facing diagnostics; level validation remains build-gating. They may share pure helpers, but do not need to become one system.

Accepted constraints after this simplification pass:

- `groundContractCore.mjs` still carries protected transition vocabulary for Observatory/source-linked terrain and chunked terrain mode. The legacy `ground.visualSource: "terrain-chunks"` alias is no longer accepted, and terrain authority migration warnings now fail as errors.
- `runtimeSceneManifest.mjs` remains the Node-safe build-report adapter until a replacement manifest validator exists. It now delegates terrain contracts, collider sizing, collision policy issues, collision channel resolution, runtime collision group mapping, and level runtime contracts to shared cores.
- ACCEPTED 2026-05-13: Editor proxy metadata remains editor-only lifecycle/readiness state; runtime policy input, runtime manifests, and `CollisionComponent` no longer expose it.
- Observatory terrain is still a protected special case because it is the only working terrain.
- Other agents are actively touching terrain/runtime slices, so continuing broad cleanup risks conflicts.

Decision point: do not keep doing generic cleanup after these blockers are either resolved or consciously accepted. Pick the next rebuild target, then delete only the legacy paths that conflict with that target.

Simplification pass status: DONE ENOUGH. Stop broad cleanup here.

Accepted deferrals:

- Keep `runtimeSceneManifest.mjs` as the Node-safe build-report adapter until a replacement build manifest validator exists. It now delegates terrain contracts, collider sizing, collision policy issues, collision channel resolution, collision group mapping, and level runtime contracts to shared cores.
- Keep editor proxy metadata as editor lifecycle/readiness state until the editor has a replacement authoring flow. It no longer publishes into runtime `CollisionComponent`, and proxy-state detection is centralized.
- Keep Observatory source-linked terrain collision protected until a new terrain collision target replaces it. It is the only working terrain path and resource/collision checks now pass with one terrain collider load.
- Keep `ground.mode: "terrain-chunks"` as the chunked-terrain workflow mode for now. Visual source is explicit; the legacy `ground.visualSource: "terrain-chunks"` alias is rejected.

Next work should be target-driven, not cleanup-driven:

1. Pick the rebuild target: Observatory source-linked terrain replacement, scene-authored primitive-only collision, or editor proxy authoring replacement.
2. Delete only the legacy paths that conflict with that chosen target.
3. Keep `audit:collision`, `test:publish-pipeline`, and Observatory resource profiling as gates.

1. Freeze a small target contract: scene-authored cuboid/cylinder primitive collision plus source-linked Observatory terrain. Do not touch asset trimesh or terrain products yet.
2. Remove unused implicit default collision first:
   - DONE: Delete or disable `lightweight-auto` in editor UI and policy.
   - DONE: Normalize Observatory scene settings to not request auto actor collision.
   - Keep audits checking for implicit default collision until the branch is gone.
3. Collapse level workflow authority:
   - DONE: Delete hard-coded level entries from `levelCollisionWorkflow.ts`.
   - Read terrain/collision roles only from `settings.level.collision` and `settings.level.ground`.
   - DONE: Remove actor-id prefix inference after callers pass level settings.
4. Split `CollisionBody.svelte`:
   - DONE: Runtime primitive volume and trimesh collider selection is isolated in `RuntimeCollisionCollider.svelte`.
   - DONE: Editor overlay/helper path is isolated in `CollisionBodyOverlay.svelte`.
   - DONE: Runtime rigid-body transform/slot ownership moved to `RuntimeCollisionBody.svelte`; `CollisionBody.svelte` remains the compatibility facade that decides physics/overlay visibility.
   - DONE: Staged without changing behavior; old mixed-responsibility branches have been removed from `CollisionBody.svelte`.
5. Centralize collider geometry helpers:
   - DONE: One shared function set for primitive visual size, actor collision world size, and collider args across TypeScript runtime/editor/review/validation.
   - DONE: One shared walkability/spawn support helper for audits and validation.
6. Retire editor proxy runtime fields:
   - DONE 2026-05-13: Editor still needs proxy/bake metadata for live editor materialization and publish readiness, so it remains editor-only scene metadata and preview state.
   - DONE: Stop publishing `proxy`/`bakeStatus` as runtime collision fields; publish/readiness checks now read scene metadata directly.

## Specific Friction Points

- DONE: `SceneDocumentLevel.svelte` terrain runtime loading now accepts `collision.terrain.source === "source-glb"` when a manifest URL is present. The shared rule lives in `src/threlte/levels/sceneTerrainRuntime.ts`.
- DONE: `groundContractCore.mjs` validation copy now says source-linked/baked ground collision accepts `source=baked-heightmap` or `source-glb` with a manifest URL.
- DONE: `groundContractCore.mjs` treats `collision.terrain.source === "source-glb"` as source-linked terrain collision and accepts source-GLB chunk visuals without legacy `terrain-chunks` visual aliasing.
- DONE 2026-05-13: `groundContractCore.mjs` no longer accepts the `authored-ground` mode alias or `ground.visualSource: "terrain-chunks"` alias, and terrain authority migration issues now fail as errors. `ground.mode: "terrain-chunks"` and `source-linked-terrain-collision` remain accepted constraints for Observatory and chunked terrain workflows.
- DONE 2026-05-13: `collisionReview.ts` and `levelValidation.ts` share collision channel/group/sensor/detail policy wording through `describeCollisionPolicyIssue(...)`; `collisionReview` remains human-facing and `levelValidation` remains build-gating.
- ACCEPTED 2026-05-13: `scripts/lib/runtimeSceneManifest.mjs` still owns Node-safe build-report assembly until a replacement manifest validator exists. It now delegates primitive/collider sizing, collision-channel validation/defaulting, runtime collision group mapping, collision policy issue wording, terrain contracts, and level runtime contracts to shared Node-safe cores.
- DONE: `EditorCollisionTabHost.svelte` and `EditorPanel.svelte` no longer expose `Legacy Auto` / `lightweight-auto`.

## Things Not To Remove Blindly

- Terrain/source-linked collision products still used by Observatory.
- Collision group matrix in `constants/physics.ts`; this is a compact runtime contract.
- Existing audits until replacements exist; they are useful guardrails while deleting code.
- Baked mesh collider metadata fields until asset trimesh runtime is replaced or retired.
- `source-linked-terrain-collision` and `approvedHeightfieldException` are transitional, but Observatory currently depends on them.
- Scene `groundActorIds` are active for scene-authored levels and should not be removed with the workflow table.

## Agent Coordination Notes

- IN PROGRESS 2026-05-13: Implementing the first unified runtime readiness contract slice. Scope is a Node-safe engine core that summarizes required actors, required render assets, runtime asset URLs, spawn readiness, and terrain runtime collision readiness for a level; wire TypeScript validation to report it without changing runtime mounting behavior.
- IN PROGRESS 2026-05-13: Assist is removing level-specific legacy settings buckets and the local no-op collision workflow shim from `scripts/lib/runtimeSceneManifest.mjs`. Scope is runtime manifest normalization only; editor environment preset compatibility is not part of this slice.
- DONE 2026-05-13: Assist removed the remaining `authored-ground` ground mode alias by migrating scene settings and fixtures to `scene-authored`, then tightening `groundContractCore.mjs` and `sceneDocumentTypes.ts`. Scope was only the ground mode alias; Observatory's `terrain-chunks` ground mode remains protected.
- DONE 2026-05-13: Tightened `groundContractCore.mjs` by removing legacy `ground.visualSource: "terrain-chunks"` as an accepted visual-source value and promoting terrain authority migration warnings to errors. Scope was limited to visual-source vocabulary, authority diagnostics, and tests; `ground.mode: "terrain-chunks"` remains for the chunked terrain workflow and Observatory remains protected via explicit `visualSource: "source-glb-chunks"`.
- DONE 2026-05-13: Assist removed duplicated collision-policy issue wording from `collisionReview.ts` and `levelValidation.ts` by adding shared policy issue descriptions next to `collisionPolicyIssues.ts`. Scope stayed limited to channel/group/sensor/detail policy messages; review stays human-facing and validation stays build-gating.
- DONE 2026-05-13: Removed the duplicated level runtime contract table from `scripts/lib/runtimeSceneManifest.mjs` by extracting Node-safe `levelContractsCore.mjs` and keeping `levelContracts.ts` as the typed wrapper. Scope was limited to runtime contract lookup; avoided ground contract vocabulary and migration-reference audit slices.
- IN PROGRESS 2026-05-13: Assist is removing hard-coded default level ids from clean generic core helpers by importing `DEFAULT_LEVEL_ID` in `gameShellBootstrap.ts` and `gameShellUiState.ts`. Scope is limited to default-level fallback constants; no terrain, manifest, or migration audit files.
- DONE 2026-05-13: Removed level-id/id-prefix firefly presentation branches from `src/threlte/levels/runtimeGameplayPresentation.ts`. Scope was limited to moving the existing Solitude/Yggdrasil firefly presentation values into authored scene gameplay data plus the generic resolver cleanup; terrain runtime, runtime manifest, ground contract, collision policy, and proxy metadata slices were not touched.
- DONE 2026-05-13: Closed the remaining editor proxy metadata runtime-policy leak by routing `collisionPolicy.ts` proxy/bake checks through `editorProxyCollision.ts` and removing editor-only `proxy`/`bakeStatus` from the runtime policy input type. Scope stayed limited to collision policy helper use plus scratchpad verification; scene documents and editor lifecycle behavior stayed intact.
- DONE 2026-05-13: Started the editor proxy metadata retirement by centralizing proxy/bake-state detection in shared `src/threlte/engine/editorProxyCollision.ts`. Scope was limited to replacing open-coded `proxy`/`bakeStatus` checks in readiness, validation, review, and editor collision defaults; scene fields were not deleted because editor lifecycle tests still depend on them.
- IN PROGRESS 2026-05-13: Auditing level-specific migration references that remain in generic runtime/script paths. Scope is scratchpad inventory and recommendations only; no code edits while terrain runtime, runtime manifest, ground contract, and collision policy files are dirty in other active slices.
- DONE 2026-05-13: Cleaned stale scratchpad pipeline-map wording after the completed collision body and workflow-authority removals. Scope was documentation-only in this scratchpad; active terrain runtime, runtime manifest, and collision policy files were not touched.
- DONE 2026-05-13: Removed the local runtime collision-group mapping duplicate from `scripts/lib/runtimeSceneManifest.mjs` by extracting Node-safe `physicsGroupsCore.mjs` and keeping `constants/physics.ts` as the typed Rapier wrapper. Scope was limited to runtime collision layer/group mapping and manifest imports; avoided the active Observatory collider-fetch work and collision review/validation classification files.
- DONE 2026-05-13: Fixed the duplicate Observatory terrain collider fetch follow-up by caching fetched baked terrain collider buffers by URL in `bakedTerrainCollider.ts`. Scope stayed limited to terrain runtime collider loading/cache behavior; runtime manifest physics-group work was left untouched.
- DONE 2026-05-13: Removed duplicated collision-channel resolution helpers from `scripts/lib/runtimeSceneManifest.mjs` by extracting Node-safe `collisionChannelsCore.mjs` and keeping `collisionChannels.ts` as the typed wrapper. Scope was limited to channel validation/defaulting/resolution; no browser-smoke, terrain-runtime, ground contract, or collider sizing behavior was changed.
- DONE 2026-05-13: Removed duplicated collision policy issue checks/wording from `scripts/lib/runtimeSceneManifest.mjs` by extracting Node-safe `collisionPolicyIssuesCore.mjs` and keeping `collisionPolicyIssues.ts` as the typed wrapper. Scope was limited to channel/group/sensor/detail policy issues.
- DONE: Shared collision policy issue classification for `collisionReview.ts` and `levelValidation.ts` now lives in `src/threlte/engine/collisionPolicyIssues.ts`. Scope was limited to channel mismatch, runtime group mapping, trigger sensor, and detail-mesh nonblocking checks; `runtimeSceneManifest.mjs` was not touched because channel core extraction is already active there.
- DONE 2026-05-13: Verified the remaining Observatory browser-smoke item using the already-running game dev server with `GAME_NO_SERVER=1`. Scope was verification and scratchpad updates only; no terrain runtime, manifest, or collision code changed in this slice.
- DONE: Stale scratchpad status for the completed `CollisionBody.svelte` split was cleaned up. Scope was documentation-only; no runtime code changes.
- DONE: Duplicated baked/source-linked terrain runtime detection shared by `collisionReview.ts` and `levelValidation.ts` now lives in `src/threlte/engine/terrainRuntimeCollision.ts`. Scope was limited to a small engine helper plus those two callers; runtime manifest sizing and browser-smoke files were not touched.
- DONE: The scene loader now instantiates `TerrainRuntime` from source-GLB terrain manifests via `getSceneTerrainRuntimeRequest(...)`; keep this aligned with `hasBakedTerrainRuntime(...)` before tightening `groundContractCore.mjs`.
- DONE: `CollisionBody.svelte` runtime rigid-body ownership split is complete. Scope was limited to collision wrapper files; `boot-check-browser.mjs` and `browserHarness.mjs` were left untouched because those browser-smoke files are already active.
- Avoid deleting `source-linked-terrain-collision` until it has a replacement. It is still the declared collision source for Observatory and the audits currently treat its spawn coverage as an info finding, not a blocker.
- If the next work is deduplication, prefer extracting shared pure helpers for review/validation first. `collisionReview.ts` is useful as human-facing diagnostics, while `levelValidation.ts` is build-gating; they can share support classification without merging their reporting surfaces.
- If the next work is script cleanup, keep `scripts/lib/runtimeSceneManifest.mjs` runnable in Node without TypeScript loader assumptions. A shared `.mjs`/`.mts` core or generated JS helper is safer than importing `src/threlte/engine/colliderGeometry.ts` directly from the script.
- Terrain cleanup note: Observatory still uses `ground.mode: "terrain-chunks"` as a broad chunked-terrain mode, but its visual source is now the explicit `source-glb-chunks`. Removing or renaming the `terrain-chunks` ground mode is a larger schema migration because editor commands and bake-plan code still use it for chunked terrain workflows.
- Completed work note: editor-side predicates now distinguish source-GLB chunk terrain from generated-heightmap chunk terrain through `editorTerrainModeGuards.ts`. This was intentionally not a schema migration.

## Open Questions

- ANSWERED 2026-05-13: The first rebuild target is not part of this collision-removal scratchpad. Stop broad cleanup here and choose the next target explicitly before deleting more legacy support.
- ANSWERED 2026-05-13: Scene-authored primitive collision is the small target contract for actor collision, but asset trimesh colliders and protected Observatory terrain remain supported until a replacement target is chosen.
- ANSWERED 2026-05-13: Observatory source-linked terrain collision is protected until a replacement terrain collision target exists.
- ANSWERED 2026-05-13: The editor still needs live proxy/bake metadata for generated-asset collision materialization and publish readiness, but that metadata must stay out of runtime collision manifests and runtime policy input.

## Assist Notes 2026-05-13

- DONE: `loadSceneTerrainRuntimeData(...)` accepts `terrainSettings.source === "source-glb"` when a `manifestUrl` is present. `terrainManifest.ts` already normalizes source-GLB chunk manifests, and Observatory's scene settings already supply `runtimeSource: "built-in-manifest"`.
- DONE: Observatory live runtime smoke now has a focused single-profile resource pass after the baked terrain collider loader cache. The pass reached playable runtime, loaded terrain collision, and reports `terrainColliders=1`; existing non-strict performance/resource warnings remain unrelated.
- Keep Observatory source-linked collision artifacts protected for now. They are the only active runtime terrain collider path for that level and the collision audit still reports the spawn as relying on baked terrain coverage.
- DONE: `RuntimeCollisionBody.svelte` now owns the rigid-body props and explicit-transform branch while `CollisionBody.svelte` remains the compatibility facade.

## Verification Log

- `pnpm --dir apps/game type-check` passes after removing implicit actor collision, hard-coded workflow fallbacks, and dead `actorCollision` editor plumbing.
- `pnpm --dir apps/game test:publish-pipeline` passes after the removals.
- `pnpm --dir apps/game audit:collision` passes after the removals; Observatory still reports only `spawn-relies-on-baked-terrain`.
- `pnpm --dir apps/game exec tsx ./scripts/test-editor-collision-lifecycle.ts` passes after keeping proxy lifecycle editor-side.
- `pnpm --dir apps/game type-check` passes after centralizing collider sizing helpers in `colliderGeometry.ts`.
- `pnpm --dir apps/game test:publish-pipeline` passes after the collider sizing helper cleanup.
- `pnpm --dir apps/game audit:collision` passes after the collider sizing helper cleanup; Observatory still reports only `spawn-relies-on-baked-terrain`.
- `pnpm --dir apps/game exec tsx ./scripts/test-editor-collision-lifecycle.ts` passes after the collider sizing helper cleanup.
- `pnpm --dir apps/game type-check` passes after splitting runtime collider and overlay rendering out of `CollisionBody.svelte`.
- `pnpm --dir apps/game test:publish-pipeline` passes after the `CollisionBody.svelte` split.
- `pnpm --dir apps/game audit:collision` passes after the `CollisionBody.svelte` split; Observatory still reports only `spawn-relies-on-baked-terrain`.
- `pnpm --dir apps/game exec tsx ./scripts/test-editor-collision-lifecycle.ts` passes after the `CollisionBody.svelte` split.
- `pnpm --dir apps/game type-check` passes after extracting shared collision spatial queries.
- `pnpm --dir apps/game test:publish-pipeline` passes after extracting shared collision spatial queries.
- `pnpm --dir apps/game audit:collision` passes after extracting shared collision spatial queries; Observatory still reports only `spawn-relies-on-baked-terrain`.
- `pnpm --dir apps/game exec tsx ./scripts/test-editor-collision-lifecycle.ts` passes after extracting shared collision spatial queries.
- `pnpm --dir apps/game audit:collision` passes after the 2026-05-13 assist pass; Observatory still reports only `spawn-relies-on-baked-terrain`. Initial sandbox run failed because `tsx` could not create `/tmp/tsx-1000/*.pipe`, then passed when rerun outside the sandbox.
- `pnpm --dir apps/game test:publish-pipeline` passes after accepting source-GLB terrain runtime loading.
- `pnpm --dir apps/game type-check` passes after accepting source-GLB terrain runtime loading.
- `pnpm --dir apps/game audit:collision` passes after accepting source-GLB terrain runtime loading; Observatory still reports only `spawn-relies-on-baked-terrain`. Initial sandbox run failed because `tsx` could not create `/tmp/tsx-1000/*.pipe`, then passed when rerun outside the sandbox.
- `pnpm --dir apps/game exec tsx ./scripts/test-editor-collision-lifecycle.ts` passes after accepting source-GLB terrain runtime loading.
- `pnpm --dir apps/game type-check` passes after source-GLB terrain chunk visual-source cleanup.
- `pnpm --dir apps/game test:publish-pipeline` passes after source-GLB terrain chunk visual-source cleanup.
- `pnpm --dir apps/game exec tsx ./scripts/test-editor-collision-lifecycle.ts` passes after source-GLB terrain chunk visual-source cleanup.
- `pnpm --dir apps/game audit:collision` passes after source-GLB terrain chunk visual-source cleanup; Observatory still reports only `spawn-relies-on-baked-terrain`.
- `pnpm --dir apps/game type-check` passes after moving runtime rigid-body ownership into `RuntimeCollisionBody.svelte`.
- `pnpm --dir apps/game exec tsx ./scripts/test-editor-collision-lifecycle.ts` passes after moving runtime rigid-body ownership into `RuntimeCollisionBody.svelte`.
- `pnpm --dir apps/game audit:collision` passes after moving runtime rigid-body ownership into `RuntimeCollisionBody.svelte`; Observatory still reports only `spawn-relies-on-baked-terrain`. Initial sandbox run failed because `tsx` could not create `/tmp/tsx-1000/*.pipe`, then passed when rerun outside the sandbox.
- `pnpm --dir apps/game test:publish-pipeline` passes after moving runtime rigid-body ownership into `RuntimeCollisionBody.svelte`.
- `pnpm --dir apps/game type-check` passes after introducing `editorTerrainModeGuards.ts`.
- `pnpm --dir apps/game test:publish-pipeline` passes after introducing `editorTerrainModeGuards.ts`.
- `pnpm --dir apps/game exec tsx ./scripts/test-editor-collision-lifecycle.ts` passes after introducing `editorTerrainModeGuards.ts`.
- `pnpm --dir apps/game audit:collision` passes after introducing `editorTerrainModeGuards.ts`; Observatory still reports only `spawn-relies-on-baked-terrain`.
- `pnpm --dir apps/game type-check` passes after extracting `terrainRuntimeCollision.ts`.
- `pnpm --dir apps/game test:publish-pipeline` passes after extracting `terrainRuntimeCollision.ts`.
- `pnpm --dir apps/game audit:collision` passes after extracting `terrainRuntimeCollision.ts`; Observatory still reports only `spawn-relies-on-baked-terrain`. Initial sandbox run failed because `tsx` could not create `/tmp/tsx-1000/*.pipe`, then passed when rerun outside the sandbox.
- `pnpm --dir apps/game exec tsx ./scripts/test-editor-collision-lifecycle.ts` passes after extracting `terrainRuntimeCollision.ts`.
- `pnpm --dir apps/game type-check` passes after moving collider sizing into `colliderGeometryCore.mjs`.
- `pnpm --dir apps/game test:publish-pipeline` passes after moving collider sizing into `colliderGeometryCore.mjs`.
- `pnpm --dir apps/game exec tsx ./scripts/test-editor-collision-lifecycle.ts` passes after moving collider sizing into `colliderGeometryCore.mjs`.
- `pnpm --dir apps/game audit:collision` passes after moving collider sizing into `colliderGeometryCore.mjs`; Observatory still reports only `spawn-relies-on-baked-terrain`.
- `pnpm --dir apps/game type-check` passes after extracting `collisionPolicyIssues.ts`.
- `pnpm --dir apps/game test:publish-pipeline` passes after extracting `collisionPolicyIssues.ts`.
- `pnpm --dir apps/game audit:collision` passes after extracting `collisionPolicyIssues.ts`; Observatory still reports only `spawn-relies-on-baked-terrain`. Initial sandbox run failed because `tsx` could not create `/tmp/tsx-1000/*.pipe`, then passed when rerun outside the sandbox.
- `pnpm --dir apps/game exec tsx ./scripts/test-editor-collision-lifecycle.ts` passes after extracting `collisionPolicyIssues.ts`.
- `pnpm --dir apps/game type-check` passes after moving collision-channel resolution into `collisionChannelsCore.mjs`.
- `pnpm --dir apps/game test:publish-pipeline` passes after moving collision-channel resolution into `collisionChannelsCore.mjs`.
- `pnpm --dir apps/game exec tsx ./scripts/test-editor-collision-lifecycle.ts` passes after moving collision-channel resolution into `collisionChannelsCore.mjs`.
- `pnpm --dir apps/game audit:collision` passes after moving collision-channel resolution into `collisionChannelsCore.mjs`; Observatory still reports only `spawn-relies-on-baked-terrain`. Initial sandbox run failed because `tsx` could not create `/tmp/tsx-1000/*.pipe`, then passed when rerun outside the sandbox.
- `pnpm --dir apps/game type-check` passes after moving runtime collision group mapping into `physicsGroupsCore.mjs`.
- `pnpm --dir apps/game test:publish-pipeline` passes after moving runtime collision group mapping into `physicsGroupsCore.mjs`.
- `pnpm --dir apps/game exec tsx ./scripts/test-editor-collision-lifecycle.ts` passes after moving runtime collision group mapping into `physicsGroupsCore.mjs`.
- `pnpm --dir apps/game audit:collision` passes after moving runtime collision group mapping into `physicsGroupsCore.mjs`; Observatory still reports only `spawn-relies-on-baked-terrain`. Initial sandbox run failed because `tsx` could not create `/tmp/tsx-1000/*.pipe`, then passed when rerun outside the sandbox.
- `pnpm --dir apps/game type-check` passes after centralizing editor proxy collision-state detection in `editorProxyCollision.ts`.
- `pnpm --dir apps/game test:publish-pipeline` passes after centralizing editor proxy collision-state detection in `editorProxyCollision.ts`.
- `pnpm --dir apps/game exec tsx ./scripts/test-editor-collision-lifecycle.ts` passes after centralizing editor proxy collision-state detection in `editorProxyCollision.ts`.
- `pnpm --dir apps/game audit:collision` passes after centralizing editor proxy collision-state detection in `editorProxyCollision.ts`; Observatory still reports only `spawn-relies-on-baked-terrain`. Initial sandbox run failed because `tsx` could not create `/tmp/tsx-1000/*.pipe`, then passed when rerun outside the sandbox.
- `GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot --no-server` was attempted against the shared dev server. Sandbox run could not fetch localhost; escalated no-server run reached the browser harness but failed on unrelated editor tab selectors (`Save / Publish`) before completion.
- `GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game profile:resources --levels=observatory --settle-ms=500` passes against the shared dev server. Observatory reaches playable runtime and loads terrain collision in each profile (`terrainColliders=1` in the multi-profile run), with existing non-strict performance/resource warnings.
- `GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game profile:resources --levels=observatory --profile=desktop-high-chromium-1080p --settle-ms=500 --write-json=/tmp/observatory-resource-profile.json` passes and writes a focused report. It confirms playable Observatory runtime and terrain collision loading, but reports `terrainColliderLoads=2` as a non-strict budget warning in that run.
- `pnpm --dir apps/game type-check` passes after caching baked terrain collider buffers by URL.
- `pnpm --dir apps/game test:publish-pipeline` passes after caching baked terrain collider buffers by URL.
- `pnpm --dir apps/game exec tsx ./scripts/test-editor-collision-lifecycle.ts` passes after caching baked terrain collider buffers by URL.
- `pnpm --dir apps/game audit:collision` passes after caching baked terrain collider buffers by URL; Observatory still reports only `spawn-relies-on-baked-terrain`. Initial sandbox run failed because `tsx` could not create `/tmp/tsx-1000/*.pipe`, then passed when rerun outside the sandbox.
- `GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game profile:resources --levels=observatory --profile=desktop-high-chromium-1080p --settle-ms=500 --write-json=/tmp/observatory-resource-profile-cache.json` passes after caching baked terrain collider buffers by URL. Initial sandbox run could not fetch localhost, then passed outside the sandbox against the shared server and reports `terrainColliders=1`.
- `pnpm --dir apps/game type-check` passes after moving Solitude/Yggdrasil firefly presentation tuning into scene gameplay data.
- `pnpm --dir apps/game test:publish-pipeline` passes after moving Solitude/Yggdrasil firefly presentation tuning into scene gameplay data.
- `pnpm --dir apps/game audit:collision` passes after moving Solitude/Yggdrasil firefly presentation tuning into scene gameplay data; Observatory still reports only `spawn-relies-on-baked-terrain`. Initial sandbox run failed because `tsx` could not create `/tmp/tsx-1000/*.pipe`, then passed when rerun outside the sandbox.
- `pnpm --dir apps/game type-check` passes after tightening terrain authority validation in `groundContractCore.mjs`.
- `pnpm --dir apps/game test:publish-pipeline` passes after tightening terrain authority validation in `groundContractCore.mjs`.
- `node --input-type=module -e "<scene terrain authority diagnostics>"` confirms all authored editor scenes have zero terrain authority errors/warnings after tightening `groundContractCore.mjs`.
- `pnpm --dir apps/game audit:collision` passes after tightening terrain authority validation in `groundContractCore.mjs`; Observatory still reports only `spawn-relies-on-baked-terrain`. Initial sandbox run failed because `tsx` could not create `/tmp/tsx-1000/*.pipe`, then passed when rerun outside the sandbox.
- `pnpm --dir apps/game type-check` passes after sharing collision-policy issue wording between review and validation.
- `pnpm --dir apps/game test:publish-pipeline` passes after sharing collision-policy issue wording between review and validation.
- `pnpm --dir apps/game type-check` passes after extracting Node-safe collision policy issue checks/wording for `runtimeSceneManifest.mjs`.
- `pnpm --dir apps/game test:publish-pipeline` passes after extracting Node-safe collision policy issue checks/wording for `runtimeSceneManifest.mjs`.
- `pnpm --dir apps/game type-check` passes after removing the `authored-ground` ground mode alias.
- `pnpm --dir apps/game test:publish-pipeline` passes after removing the `authored-ground` ground mode alias.
- `pnpm --dir apps/game type-check` passes after extracting `levelContractsCore.mjs`.
- `pnpm --dir apps/game test:publish-pipeline` passes after extracting `levelContractsCore.mjs`.
- `pnpm --dir apps/game audit:collision` passes after extracting `levelContractsCore.mjs`; Observatory still reports only `spawn-relies-on-baked-terrain`. Initial sandbox run failed because `tsx` could not create `/tmp/tsx-1000/*.pipe`, then passed when rerun outside the sandbox.
- `pnpm --dir apps/game type-check` passes after routing runtime policy proxy/bake checks through `editorProxyCollision.ts`.
- `pnpm --dir apps/game test:publish-pipeline` passes after routing runtime policy proxy/bake checks through `editorProxyCollision.ts`.
- `pnpm --dir apps/game exec tsx ./scripts/test-editor-collision-lifecycle.ts` passes after routing runtime policy proxy/bake checks through `editorProxyCollision.ts`.
- `pnpm --dir apps/game audit:collision` passes after routing runtime policy proxy/bake checks through `editorProxyCollision.ts`; Observatory still reports only `spawn-relies-on-baked-terrain`. Initial sandbox run failed because `tsx` could not create `/tmp/tsx-1000/*.pipe`, then passed when rerun outside the sandbox.
- `pnpm --dir apps/game type-check` passes after removing editor-only `proxy`/`bakeStatus` from `CollisionPolicyInput`.
- `pnpm --dir apps/game test:publish-pipeline` passes after removing editor-only `proxy`/`bakeStatus` from `CollisionPolicyInput`.
- `pnpm --dir apps/game exec tsx ./scripts/test-editor-collision-lifecycle.ts` passes after removing editor-only `proxy`/`bakeStatus` from `CollisionPolicyInput`.
- `pnpm --dir apps/game audit:collision` passes after removing editor-only `proxy`/`bakeStatus` from `CollisionPolicyInput`; Observatory still reports only `spawn-relies-on-baked-terrain`. Initial sandbox run failed because `tsx` could not create `/tmp/tsx-1000/*.pipe`, then passed when rerun outside the sandbox.
