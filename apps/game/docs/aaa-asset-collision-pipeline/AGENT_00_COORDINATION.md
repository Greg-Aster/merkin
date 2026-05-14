# Agent 00: Coordination And Ownership

## Mission

Coordinate the asset/collision pipeline work so the final system behaves like a
small production engine pipeline: source assets are imported, cooked, validated,
mounted at runtime, and debugged through explicit data contracts.

## Problem Statement

Yggdrasil currently exposes a class of failure where an actor's visual mesh and
collision mesh are both under the same actor transform, but the collider appears
below or otherwise offset from the visual mesh. The root cause is not a single
bad `position` value. It is the absence of a shared asset-local transform
contract between:

- source GLB import
- render asset mounting
- collider bake output
- runtime collider construction
- collision debug helpers
- publish/readiness validation

## Current Relevant Files

- `apps/game/src/threlte/levels/RuntimeActorNode.svelte`
- `apps/game/src/threlte/levels/RuntimeActorRenderContent.svelte`
- `apps/game/src/threlte/components/HeroProp.svelte`
- `apps/game/src/threlte/collision/CollisionBody.svelte`
- `apps/game/src/threlte/collision/AssetTrimeshCollider.svelte`
- `apps/game/src/threlte/collision/assetTrimeshColliderGeometry.ts`
- `apps/game/scripts/bake-mesh-collider.mjs`
- `apps/game/scripts/bake-scene-mesh-colliders.mjs`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/game/src/threlte/editor/scenes/yggdrasil.scene.json`
- `apps/megameal/public/generated/runtime-game-assets/scenes/yggdrasil.runtime-scene.json`
- `apps/megameal/public/generated/runtime-game-assets/collision/yggdrasil/`

## Agent Slices

- Agent 01 defines the typed asset-local transform contract.
- Agent 02 updates bake/import provenance and metadata.
- Agent 03 applies the contract in runtime render/collision mounting.
- Agent 04 adds validation and editor diagnostics.
- Agent 05 repairs Yggdrasil content through the new pipeline.
- Agent 06 runs integration checks and closes gaps.

## Dependency Order

1. Agent 01 should land before any schema-dependent implementation.
2. Agents 02 and 03 can proceed in parallel after the contract exists, but must
   coordinate field names.
3. Agent 04 should consume the contract after Agents 01 and 02 define metadata.
4. Agent 05 should wait until bake/runtime behavior is stable.
5. Agent 06 integrates last.

## Shared Rules

- Keep generic engine code level-agnostic.
- Treat generated files as build outputs unless the brief explicitly regenerates
  them.
- Preserve the separation between render meshes and collision meshes.
- Make missing or mismatched collision loud in editor/readiness diagnostics.
- Do not make a visual-only asset become a blocking collider by accident.
- Do not introduce runtime guesses that depend on current load order.

## Acceptance Criteria

- The codebase has one documented asset-local transform contract.
- Runtime render and collision paths consume that contract consistently.
- Collider metadata records enough provenance to diagnose drift.
- Editor validation reports assets whose visual and collider bounds diverge.
- Yggdrasil affected assets are fixed without one-off scene offsets.

## Handoff Requirements

Each agent reports:

- files changed
- generated artifacts changed or intentionally not changed
- validation commands run
- collision and runtime asset impact
- remaining risks or follow-up work
