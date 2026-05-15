# Agent 04: Ocean, Reflections, And Underwater

## Mission

Make the ocean, reflection path, and underwater effects consume the unified
runtime atmosphere.

## Ownership

Primary files:

- `apps/game/src/threlte/features/ocean/components/OceanComponent.svelte`
- `apps/game/src/threlte/features/ocean/effects/UnderwaterEffect.svelte`
- `apps/game/src/threlte/features/ocean/effects/UnderwaterOverlay.svelte`
- `apps/game/src/threlte/features/ocean/stores/underwaterStore.ts`

Secondary files only if needed:

- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- runtime atmosphere store/types
- runtime diagnostics

## Requirements

The ocean surface must not be a visual exception to atmosphere. It must consume
the same atmosphere contract as terrain and props.

Support:

- standard ocean material path
- planar reflector path, or diagnostics that clearly state reflector atmosphere
  is unsupported until a named follow-up
- reflection/environment intensity compatibility
- underwater fog/tint derived from or explicitly blended with runtime
  atmosphere
- live editor updates

## Non-Goals

- Do not add independent ocean-only fog controls.
- Do not replace ocean rendering wholesale unless the current material structure
  cannot consume the shared contract.
- Do not fake ocean fog with a transparent plane above the water.

## Acceptance Criteria

- Ocean horizon and nearby water respond to Haze Density/Floor/Ceiling.
- Ocean and shoreline terrain look like they are in the same atmosphere.
- Underwater transition remains functional.
- Diagnostics identify whether standard water and reflector water participate.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec biome check src/threlte/features/ocean src/threlte/atmosphere
```

Run browser smoke with a level containing water and capture horizon screenshots.
