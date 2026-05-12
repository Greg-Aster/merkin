# AAA Next 02: Runtime And Authoring Separation

## Goal

Remove bake-only and authoring-only logic from the shipped gameplay runtime so the browser game loads only runtime assets, runtime manifests, and runtime adapters.

## Coordination

Before starting, read `AAA_NEXT_AGENT_COORDINATION.md`. This agent owns runtime/authoring boundary cleanup. Coordinate with the CI/release agent before adding new audit gates, and with the prefab/material agents before moving shared bake modules.

## Agent Assignment

Make the runtime/authoring boundary provable, not just conventional. Your job is to ensure shipped gameplay chunks cannot import bake-only mesh/source modules, and to leave an audit trail that catches future regressions.

Priority target: verify the current zero-procedural-runtime state, then add or tighten guards for bake-source imports in runtime code and built chunks.

## Current Baseline

- Runtime levels load cooked scene manifests.
- `proceduralContracts=0`.
- Procedural prefab descriptor modules now live under `scripts/lib/runtimePrefabBakeSources` as bake-only source geometry.
- Runtime prefab catalog resolution is asset/variant/animation/VFX driven; deployed prefabs should not rely on runtime procedural mesh construction.
- Remaining work is to prove that runtime gameplay chunks cannot import bake-only modules and to keep the boundary documented.

## Target Architecture

Authoring and bake modules should not be imported by runtime gameplay bundles.

Preferred shape:

```txt
authoring/bake descriptor source
  -> bake scripts
  -> generated GLBs and manifests
  -> runtime catalog asset URLs
  -> RuntimePrefabNode renders assets only
```

Runtime fallback paths should exist only as explicit migration adapters with removal dates.

## Work Packages

1. Identify shipped authoring imports.
   - Use bundle/chunk ownership audit and `rg`.
   - Confirm that `scripts/lib/runtimePrefabBakeSources/**` modules are not included in gameplay runtime chunks.
   - Confirm old `src/threlte/engine/runtimePrefab*Meshes.ts` modules are gone or marked forbidden.

2. Harden bake descriptor ownership.
   - Keep bake-owned source location under `scripts/lib/runtimePrefabBakeSources`.
   - Keep runtime types separate from bake mesh descriptors.
   - Avoid circular imports from scripts back into runtime-only modules.

3. Simplify runtime prefab resolution.
   - Runtime should resolve known prefab types to baked asset URL, variant asset URL, animation descriptor, and VFX descriptor.
   - Unknown or missing asset URLs should fail diagnostics, not render hidden fallback geometry.

4. Add an audit guard.
   - Fail if runtime gameplay code imports bake-only modules.
   - Fail if a deployed prefab has no runtime asset URL or variant URL.

5. Update docs.
   - Mark any moved files in `CRUFT_TODO.md`.
   - Record the boundary in `ENGINE_ARCHITECTURE.md`.

## Key Files

- `apps/game/src/threlte/engine/runtimePrefabCatalog.ts`
- `apps/game/src/threlte/engine/runtimePrefabRegistry.ts`
- `apps/game/src/threlte/engine/runtimePrefabTypes.ts`
- `apps/game/src/threlte/levels/RuntimePrefabNode.svelte`
- `apps/game/scripts/bake-runtime-prefabs.mjs`
- `apps/game/scripts/lib/runtimePrefabBakeSources/`
- `apps/game/scripts/lib/chunkOwnership.mjs`
- `apps/game/scripts/audit-chunk-ownership.mjs`
- `apps/game/CRUFT_TODO.md`

## Validation

Run:

```bash
pnpm --dir apps/game audit:runtime-prefabs
pnpm --dir apps/game audit:engine
pnpm --dir apps/game smoke:engine
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
```

Confirm the built client does not include bake-only modules in runtime chunks.

## Do Not

- Do not delete bake source before verifying regenerated prefab assets are stable.
- Do not reintroduce runtime procedural contracts.
- Do not move generated public assets into `apps/game/src`.
- Do not make `RuntimePrefabNode.svelte` responsible for asset baking or validation.

## Done Means

- Runtime gameplay imports no bake-only prefab geometry modules.
- Prefab bake still works.
- Runtime prefab audit still reports `proceduralContracts=0`.
- Chunk ownership audit catches future boundary violations.
