# Agent 02: Scene Atmosphere System And Materials

## Mission

Replace ad hoc scene fog ownership with a `SceneAtmosphereSystem` that applies
the runtime atmosphere contract to standard scene materials, terrain, and GLTF
props.

## Ownership

Primary files:

- `apps/game/src/threlte/components/SceneFogExp2.svelte`
- `apps/game/src/threlte/systems/sceneFogMaterialPatch.ts`
- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- `apps/game/src/threlte/features/terrain/components/HeightmapSurface.svelte`

Create new files if appropriate:

- `apps/game/src/threlte/atmosphere/SceneAtmosphereSystem.svelte`
- `apps/game/src/threlte/atmosphere/atmosphereShaderChunks.ts`
- `apps/game/src/threlte/atmosphere/atmosphereMaterialRegistry.ts`

Secondary files only if needed:

- GLTF/runtime actor material mounting files under `src/threlte/levels`
- runtime diagnostics store/types

## Requirements

Implement shared atmosphere participation for fog-capable scene materials.
Support:

- global distance fog
- height fog based on world-space height
- live updates when editor controls change
- late-created materials from streamed actors or async loaders
- diagnostics for materials that participate or bypass atmosphere

The system must not rely on a one-time scene traversal only. It needs either a
material registration path, a refresh signal tied to runtime actor/material
creation, or another explicit mechanism that works with streamed assets.

## Non-Goals

- Do not own skybox-specific rendering.
- Do not own ocean-specific shader behavior.
- Do not add visible mist planes as the main fog implementation.

## Acceptance Criteria

- Standard GLTF materials and terrain respond to the same atmosphere contract.
- Height fog can sit close to the ground while tall geometry remains visible.
- Provisional `sceneFogMaterialPatch.ts` is either deleted/replaced or explicitly
  retained with a deletion condition in `AGENT_00_COORDINATION.md`.
- Diagnostics report participant counts and bypassed render paths.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec biome check src/threlte/atmosphere src/threlte/components src/threlte/levels src/threlte/features/terrain/components
```

Also run a browser smoke and capture screenshots for low and high height-fog
settings.
