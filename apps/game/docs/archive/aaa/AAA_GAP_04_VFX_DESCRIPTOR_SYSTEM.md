# AAA Gap 04: Runtime VFX Descriptor System

## Goal

Create a typed, data-driven VFX descriptor layer for effects that are not adequately represented by simple root or node transform animation.

## Parallel Coordination

Before starting or handing off work, read `AAA_PARALLEL_AGENT_COORDINATION.md`. Follow its file ownership map, merge order, and handoff requirements. Do not edit `AAA_GRAPHICS_REFACTOR_TRACKER.md`, `CRUFT_TODO.md`, or generated manifests unless your assigned task explicitly requires it; otherwise, include proposed tracker/TODO text in your handoff for the integration lead.

## Current State

The current animation descriptor can handle transform loops:

- Root rotation, scale, and position pulses.
- Named node position, rotation, and scale channels.

That is enough for `story-marker`, `anomaly-cluster`, and `bench-growth`, but not enough for:

- `portal-apparatus`
- `courtyard-fountain`
- `command-console`

Those need emissive pulses, opacity, screen behavior, water motion, portal ring effects, and potentially shader uniforms.

## Target Architecture

Add a VFX contract that lives beside prefab asset contracts:

```txt
baked prefab asset
  -> runtime prefab catalog
  -> typed VFX descriptor
  -> RuntimePrefabNode adapter
  -> render-only VFX controller
```

The descriptor should be declarative, auditable, and manifest-friendly. It should not be arbitrary component code hidden in a prefab renderer.

## Suggested Descriptor Shape

Start small:

```ts
type RuntimePrefabVfxContract = {
  status: 'runtime-vfx-descriptor'
  reason: string
  targets: Array<{
    name: string
    material?: {
      opacity?: NumericLoopChannel
      emissiveIntensity?: NumericLoopChannel
    }
    transform?: {
      rotation?: AxisLoopChannels
      position?: AxisLoopChannels
      scale?: AxisLoopChannels
    }
    visibility?: NumericLoopChannel
  }>
}
```

Add shader uniforms only after the simple material and transform cases are working.

## Key Files

- `apps/game/src/threlte/engine/runtimePrefabTypes.ts`
- `apps/game/src/threlte/engine/runtimePrefabCatalog.json`
- `apps/game/src/threlte/engine/runtimePrefabCatalog.ts`
- `apps/game/src/threlte/levels/RuntimePrefabNode.svelte`
- `apps/game/scripts/bake-runtime-prefabs.mjs`
- `apps/game/scripts/audit-engine-architecture.mjs`

## Implementation Steps

1. Add VFX contract types to `runtimePrefabTypes.ts`.
2. Add `assetVfx` or similar section to `runtimePrefabCatalog.json`.
3. Extend prefab audit validation:
   - VFX target names must exist in baked `sourceMeshNames` or GLB node metadata.
   - Numeric channels must be finite.
   - VFX contracts must require baked assets.
4. Extract VFX application logic out of `RuntimePrefabNode.svelte` if it grows beyond a small adapter.
5. Migrate one prefab as proof of concept.
   - Best first candidate: `courtyard-fountain` or `portal-apparatus`.
6. Re-run bake, cook, and smoke.

## Validation

Run:

```bash
pnpm --dir apps/game audit:runtime-prefabs
pnpm --dir apps/game audit:engine
pnpm --dir apps/game type-check
GAME_DEV_PORT=4324 pnpm --dir apps/game smoke:boot
```

Passing conditions:

- VFX contracts fail audit if they target missing nodes.
- No procedural runtime contract remains for a migrated VFX prefab.
- Runtime behavior is driven by descriptor data, not level-specific branches.
- Boot smoke catches missing materials, failed imports, and console errors.

## Do Not

- Do not add one-off portal/fountain/console branches in `RuntimePrefabNode.svelte`.
- Do not couple VFX to editor-only state.
- Do not use VFX descriptors for collision or gameplay readiness.
- Do not bypass asset manifests to load private effect files.

## Done Means

The remaining VFX-heavy prefabs can be baked as assets and animated by typed data contracts, with audits proving all referenced nodes and channels are valid.
