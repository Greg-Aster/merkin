# Static Environment Collision Progress

Status: active progress note, not architecture authority
Last updated: 2026-06-28

This document records the current static environment collision implementation, the files touched, the known gaps, and the next steps. It does not replace `ARCHITECTURE.md`, `GAME_ENGINE_DESIGN_DOCUMENT.md`, or `ENGINE_CONTRACT_REGISTER.md`.

## User Requirements Being Tracked

- Importing a level environment GLB should have a repeatable path to collision.
- Collision must be explicit authored or generated data, not renderer-derived runtime magic.
- The system must be reusable across levels, not an Observatory-only hack.
- Collision ownership must stay inside the level package under `src/levels/<level>`.
- The editor may inspect and trigger future tooling, but normal runtime must not depend on `src/editor`.
- The system must support performance budgets suitable for mobile browser targets.
- The system must be maintainable when levels and GLB meshes change frequently.
- The collision system must stay simple, powerful, lightweight, and easy to edit. Do not add broad systems, extra ownership layers, or tooling branches without measured need.

## What Was Implemented

- Added a static environment collision cook script:
  - `scripts/cook-static-environment-collision.ts`
  - package script: `cook:static-environment-collision`
- Added a focused validation script:
  - `scripts/test-static-environment-collision-contract.ts`
  - package script: `test:static-environment-collision-contract`
- Added a generated-drift gate:
  - package script: `check:static-environment-collision`
  - `build` now runs the static environment collision check before type-check/build.
- Added global static collision defaults:
  - `src/levels/global/collisionSettings.ts`
- Removed unused future/streaming collision settings from source config, generated products, types, defaults, and cook validation:
  - `seamPaddingMeters`
  - `nonChunkedTriangleThreshold`
  - `startupRadiusMeters`
  - `activeCollisionRadiusMeters`
  - `unloadRadiusMeters`
- Added a reusable package resolver for generated static environment collision products:
  - `src/levels/staticEnvironmentCollision.ts`
- Extended level package composition so generated collision chunks are resolved as normal level instances:
  - `src/levels/levelPackageData.ts`
- Added Observatory collision source and generated product files:
  - `src/levels/observatory/collision/source.json`
  - `src/levels/observatory/collision/generated.json`
- Wired Observatory to compose the generated collision product:
  - `src/levels/observatory/package.ts`
- Removed the old flat Observatory walkable proxy from level data:
  - `src/levels/observatory/data.json`
- Updated focused runtime/editor contract tests:
  - `scripts/test-runtime-scene-contract.ts`
  - `scripts/test-level-editor-workspace-contract.ts`
- Added read-only level editor inspection for collision source/generated data:
  - `scripts/editor-dev-api.mjs`
  - `src/editor/level/LevelEditorWorkspace.svelte`
- Added DEV-only editor actions for static environment collision:
  - `collision/check`
  - `collision/cook`
  - hash-based stale/current diagnostics shown in the Collision tab
- Added generic walkable grounding from explicit walkable colliders:
  - `src/game/systems/movement.ts`
  - `src/game/runtime/index.ts`
- Updated the current contract/status register:
  - `ENGINE_CONTRACT_REGISTER.md`
- Cleaned an engine-boundary issue found during validation:
  - `src/engine/adapters/three/index.ts`
  - `src/app/mountGameClient.ts`

## Current Observatory Cook Output

Current source config:

- Source config: `src/levels/observatory/collision/source.json`
- Generated product: `src/levels/observatory/collision/generated.json`
- Mode: `automatic-glb`
- Visual source asset: `/assets/game/observatory/observatory-environment.glb`
- Profile: `mobile-dense`
- Chunk size: `64` meters
- Sample spacing: `2` meters
- Source triangle count: `48,246`
- Walkable source triangle count after slope filtering: `47,377`
- Sampled point count: `5,932`
- Generated collision chunk count: `13`
- Generated collision triangle count: `11,408`
- Generated collision ratio: about `24.1%` of the walkable source triangle count
- Source bounds: min `[-99.800819, -0.251673, -98.020256]`, max `[97.325859, 27.506882, 97.326927]`
- Walkable source bounds: min `[-99.800819, -0.251673, -98.020256]`, max `[97.325859, 27.506882, 97.326927]`
- Generated collision bounds: min `[-98, -0.052897, -96]`, max `[96, 27.4899, 96]`

The current cook is still simpler than the visual GLB. It samples walkable source triangles onto a 2 meter grid, then creates chunked mesh colliders from that sampled surface. It is tighter than the earlier 8 meter and 4 meter cooks, but it is still a generated gameplay approximation rather than a final high-fidelity collision product.

## What "Automatic" Currently Means

The current system is automatic in this limited sense:

- A level owns a collision source config.
- The cook reads the GLB declared by that config.
- The cook extracts triangles from the GLB.
- The cook filters walkable triangles by slope.
- The cook samples the surface into chunked collision meshes.
- The cook validates triangle budgets.
- The cook validates source settings before generation, including known profile IDs, positive sample spacing and budgets, and walkable slope range.
- The generated output is composed into the level package and readiness gate without hand-writing individual collider instances.
- `build` now fails if the checked-in generated product is stale for the current source GLB.
- The level editor can run the same check/cook path through the existing DEV-only level editor API.
- The level editor displays source bounds, walkable bounds, generated collision bounds, walkable triangle count, sampled point count, meters per sample, and generated collision ratio.
- The static collision contract now fails if generated collision X/Z bounds drift from walkable source bounds beyond the configured sample-spacing tolerance.
- The level editor displays the same bounds coverage signal as a maximum X/Z gap against that tolerance.

The current system is not yet automatic in these important senses:

- It does not automatically rerun by file watcher when the GLB file changes.
- It does not stream chunks by player location; that is intentionally deferred until profiling proves it is needed.
- It does not extract non-walkable blocker collision from steep walls or cliffs; use simple explicit blockers or a manual simplified collision GLB only for concrete problem spots.
- It does not emit separate checked-in mobile/desktop/high-quality products; one checked-in product is the active maintainable path.

If the Observatory GLB is changed right now, the rendered terrain can change while the runtime collision remains the old generated product until this command is rerun:

```bash
pnpm --dir apps/game.megameal cook:static-environment-collision -- --level=observatory
```

The check mode can detect stale generated output:

```bash
pnpm --dir apps/game.megameal cook:static-environment-collision -- --level=observatory --check
```

That means the system is reproducible and build-gated, but it is not yet a live asset-watch workflow.

## Current Runtime Behavior

- The render GLB instance `observatory:terrain` remains render-only and does not own an implicit `Collider`.
- Generated static environment collision chunks are composed as fixed `worldStatic` mesh `Collider` instances.
- Generated chunk stable IDs are included in runtime scene readiness as required collision and walkable stable IDs.
- The old `observatory:walkable-proxy` flat floor has been removed.
- Four explicit boundary blockers remain in `src/levels/observatory/data.json`.
- A generic game-system grounding pass reads explicit walkable colliders and updates character `groundY` before the existing kinematic movement clamp runs.

## Current Visual Issue

The original overlay screenshot showed a coarse set of generated collision lines from the earlier `sampleSpacingMeters: 8` cook. The current cook uses the `mobile-dense` `sampleSpacingMeters: 2` profile, but visual/runtime inspection is still required because this remains a simplified generated collision product.

The reported symptom that the player can still pass through or fail to walk on the GLB terrain revealed an important runtime issue: the existing first-person movement system used a simple `CharacterController.groundY` clamp and did not derive player ground height from Rapier mesh contacts. The current fix adds a generic walkable grounding system that samples explicit walkable collider shapes before movement. This is still not a full Rapier character-controller collision solver.

Remaining failure classes to watch:

- the generated surface is too sparse or simplified for the player controller;
- the generated walkable surface does not cover the specific player position;
- the cook uses the visual GLB but the sampled top surface does not match the intended playable route;
- the player capsule/controller contact rules need more exact mesh density around slopes and seams;
- the runtime collision overlay is showing valid generated data, but the generated data is not suitable enough for this terrain.

## Architecture Alignment Check

The current direction aligns with the protected docs in these ways:

- `GAME_ENGINE_DESIGN_DOCUMENT.md` says collider shapes are authored data and mesh colliders must have explicit vertices and triangle indices.
- `GAME_ENGINE_DESIGN_DOCUMENT.md` says render meshes are not collision sources unless a contract explicitly authors equivalent collider data.
- `GAME_ENGINE_DESIGN_DOCUMENT.md` says terrain collision and generated collider products require explicit ownership and readiness validation.
- `ARCHITECTURE.md` says playable scenes load through runtime scene manifests, level loading, and readiness evaluation before player-controlled gameplay is exposed.
- `ARCHITECTURE.md` says readiness checks exact required collision stable IDs and exact required walkable stable IDs.
- `docs/AGENT_OPERATING_CONTRACT.md` says `src/levels/<level>` owns level data and optional editor tooling must not be runtime ownership.

The implementation follows that by generating explicit level-owned collider data and routing it through the level package/readiness path.

## Drift / Risk Check

Current risk areas:

- The generated output may still be too coarse for some playable terrain details and needs live visual/player testing after the 2 meter cook.
- The current cook is a V1 foundation, not a AAA-quality final collision pipeline.
- Runtime chunk streaming is not part of the active plan. It is deferred until measured level size, collider count, startup time, memory, or mobile frame cost proves that always-loading the checked-in collision product is too expensive.
- Non-walkable blocker extraction is not part of the active plan. Use simple explicit blockers or a manual simplified collision GLB if the current automatic walkable product fails in a concrete location.
- The editor can check and recook collision, but cannot yet compare render/collision geometry visually beyond the collision overlay.
- The editor now exposes enough collision metrics to diagnose obvious scale, bounds, coverage, and density drift, but it does not yet provide a true render-vs-collision visual diff.

Protected high-level docs were not rewritten to justify this implementation. The only status document updated during implementation was `ENGINE_CONTRACT_REGISTER.md`, and it marks the system as a V1 foundation with future streaming and blocker extraction still incomplete.

## AAA Engine Comparison

This implementation matches AAA engine practice at the ownership level, but not yet at the tooling depth.

Similarities:

- Collision is separate from render geometry.
- Collision is cooked/generated as an explicit asset product.
- Runtime consumes validated collision data instead of guessing from renderer meshes.
- Collision data is budgeted and can be chunked.
- Authoring source and generated product are separate.

Deferred mature-engine features:

- automatic asset import/reimport watcher;
- visual diff tools beyond the current collision overlay;
- multiple collision generation modes such as convex decomposition, exact trimesh, simplified heightfield, and authored proxy mesh;
- checked-in per-platform cook products;
- chunk streaming/unloading at runtime;
- slope, stair, ledge, seam, and capsule-contact validation scenes;
- navmesh or traversal data integration;

These are intentionally deferred. Do not implement them because they appear in an AAA comparison. They need a concrete bug, measured performance problem, or explicit user request.

## Maintainability Plan

Keep this system clean by preserving these ownership rules:

- One source config per level collision package:
  - `src/levels/<level>/collision/source.json`
- One generated collision product per collision cook product:
  - `src/levels/<level>/collision/generated.json`
- Shared defaults live in:
  - `src/levels/global/collisionSettings.ts`
- Reusable resolver logic lives in:
  - `src/levels/staticEnvironmentCollision.ts`
- Runtime consumption stays through:
  - `src/levels/levelPackageData.ts`
  - runtime scene readiness
  - generic `Collider` / `RigidBody` data
- Editor support stays optional and read-only until a specific write/cook contract is added.
- Engine/adapters must not add Observatory branches or implicit render-mesh collision repair.

Maintainability stop rules:

- Do not add runtime chunk streaming, multiple generated product loaders, residency state, or editor streaming previews until profiling or level scale proves they are needed.
- Do not split one collision concern across several editable files unless each file has a clear owner: source config, generated product, shared defaults, resolver, editor view, or focused validation.
- Do not put level-specific collision logic in game runtime, engine modules, adapters, or editor code.
- Do not make large catch-all collision files. If a file starts owning more than one concern, split by owner before adding behavior.
- Do not edit `ARCHITECTURE.md` or `GAME_ENGINE_DESIGN_DOCUMENT.md` to make an implementation look aligned. If implementation and docs conflict, report the conflict and stop before widening the system.
- Prefer removing or deferring planned features over adding machinery that has no measured current need.
- Before adding a new collision file, helper, script, schema branch, or editor control, identify the existing owner and explain why that owner is insufficient. If the gap is not concrete, do not add the file.
- Keep the edit path small: for normal level collision tuning, edit `src/levels/<level>/collision/source.json`, run the cook, and inspect the Collision tab. Avoid workflows that require touching runtime code.

## Scale / Overbuild Checkpoint

Current Observatory generated collision is modest:

- generated collision product size: about `358 KB`;
- visual GLB size: about `5.9 MB`;
- generated chunk count: `13`;
- generated triangle count: `11,408`;
- generated vertex count: `6,270`;
- largest chunk: `2,048` triangles.

For the current mobile-browser target, this does not yet justify a runtime collision streaming system. Loading the current product as explicit fixed/worldStatic mesh colliders is simpler and more maintainable than adding streaming, residency state, chunk activation rules, and editor streaming previews before there is profiling evidence.

The current likely bottleneck is not file size. The risk is runtime CPU behavior from the temporary game-side walkable grounding pass scanning mesh triangles in TypeScript. That pass is useful as a V1 bridge, but the long-term direction should be either:

- keep generated collision coarse enough that the grounding pass remains cheap; or
- move player-ground contact to the physics/query layer through a focused character-controller or downward raycast contract.

Do not continue building more collision infrastructure just because a mature engine would eventually have it. Add the next layer only when one of these conditions is true:

- generated collision product size or load time is measurably hurting mobile startup;
- always-loaded collider count or triangle count is measurably hurting mobile frame time;
- the player can still fall through or snag on the current generated product after live testing;
- a new imported level is large enough that a single generated product is clearly unreasonable;
- editor users need a specific workflow, such as choosing an authored simplified collision GLB or seeing render-vs-collision mismatch.

## Active Stabilization Plan

The active plan is no longer to keep adding collision systems. The active plan is to stabilize the lightweight V1 and only add code when a concrete bug or measured mobile-browser cost requires it.

1. Live-test the current 2 meter `mobile-dense` Observatory collision in the game.
2. If the player falls through, floats above, or snags at a specific place, first try source-setting changes in `src/levels/observatory/collision/source.json` and recook. Do not change runtime code first.
3. If automatic sampling cannot solve a specific bad area, use the smallest explicit data fix: a simple blocker in level data or an explicit manual simplified collision GLB. Keep it level-owned.
4. If movement remains wrong after collision data is valid, isolate that as a focused character-grounding bug. Do not expand the cook, editor, or runtime streaming system to hide movement behavior.
5. Keep editor work limited to the existing Collision tab diagnostics unless a missing field blocks debugging.
6. Keep validation focused: generated-drift check, static collision contract, runtime scene contract, editor workspace contract, boundary audit, lint, and build.
7. Revisit deferred mature-engine features only when profiling or repeated level authoring proves the V1 path is insufficient.

## Deferred / No-Build Items

These items are explicitly not active work:

- runtime collision chunk streaming;
- multiple checked-in collision products per profile;
- automatic file watching or import/reimport daemons;
- non-walkable blocker extraction from every steep triangle;
- navmesh generation;
- convex decomposition;
- broad visual diff workbenches;
- new collision editor windows;
- adapter-side collision repair for render meshes;
- Observatory-specific runtime branches.

Do not implement these without a concrete bug report, measured performance problem, or explicit user request.

Completed since this note was created:

- Step 1 is implemented through `check:static-environment-collision` and the `build` preflight.
- Step 2 is implemented through DEV-only `/editor/level/` collision check/cook actions.
- Step 3 has an initial improvement: Observatory now uses 2 meter `mobile-dense` sampling and generated walkable collision covers the player spawn X/Z in focused validation.
- Step 4 has an initial guard: `manual-collision-glb` mode now requires an explicit `collisionAssetUrl`.
- Step 5 has an initial profile owner: global static collision profiles now distinguish default `mobile`, tuned `mobile-dense`, and `desktop` cook settings. Separate checked-in per-platform products remain future work.
- Step 5 also has an input guard: the cook rejects malformed source settings before it can emit generated collision.
- Step 8 has an initial data/system validation: the static collision contract checks that generic walkable grounding updates the character controller from generated mesh collision.
- Step 9 has an initial diagnostics pass: generated products now carry source bounds, walkable bounds, collision bounds, walkable triangle count, sampled point count, meters per sample, and generated collision ratio; the level editor Collision tab displays these values plus a bounds coverage gap. A true render-vs-collision visual diff remains future work.

## Validation Already Run For The Current Implementation

- `pnpm --dir apps/game.megameal cook:static-environment-collision -- --level=observatory`
- `pnpm --dir apps/game.megameal check:static-environment-collision`
- `pnpm --dir apps/game.megameal cook:static-environment-collision -- --level=observatory --check`
- `pnpm --dir apps/game.megameal test:static-environment-collision-contract`
- `pnpm --dir apps/game.megameal test:runtime-scene-contract`
- `pnpm --dir apps/game.megameal test:level-editor-workspace-contract`
- `pnpm --dir apps/game.megameal test:collision-overlay-contract`
- `pnpm --dir apps/game.megameal type-check`
- targeted Biome check over the collision-lane files
- `pnpm --dir apps/game.megameal audit:engine-boundaries`
- `pnpm --dir apps/game.megameal build`
- `git diff --check -- apps/game.megameal pnpm-lock.yaml`

Full `pnpm --dir apps/game.megameal lint` is currently blocked by formatting drift in `src/levels/observatory/npcs/fireflies.json`, which is outside this collision packet and was intentionally left untouched.

No dev server or browser smoke check was run for the implementation pass, in keeping with the repository instruction not to run smoke checks unless explicitly requested.
