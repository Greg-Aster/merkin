# Agent 01: Contract And Store

## Mission

Create the single runtime atmosphere contract and store. This agent defines the
authority that all other atmosphere work consumes.

## Ownership

Primary files:

- `apps/game/src/threlte/engine/sceneDocumentTypes.ts`
- `apps/game/src/threlte/styles/GameplayStyleProfiles.ts`
- `apps/game/src/threlte/styles/runtimeVisualStyleStore.ts`

Create new files if appropriate:

- `apps/game/src/threlte/atmosphere/runtimeAtmosphereTypes.ts`
- `apps/game/src/threlte/atmosphere/runtimeAtmosphereStore.ts`
- `apps/game/src/threlte/atmosphere/buildRuntimeAtmosphere.ts`

Secondary files only if needed:

- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- `apps/game/src/threlte/editor/EditorEnvironmentPanel.svelte`

## Requirements

Define a `RuntimeAtmosphereDefinition` or equivalent that covers:

- distance fog color/density
- height fog color/density/floor/ceiling/falloff
- aerial perspective/sky participation
- mist layer parameters
- bloom settings
- color grading settings
- enabled/disabled state
- source metadata useful for diagnostics

Add one builder from scene settings to runtime atmosphere. It must consume the
existing authored fields:

- `level.style.fog`
- `level.style.haze`
- `level.style.bloom`
- `level.style.colorGrading`
- relevant skybox atmosphere participation fields if retained

Partial authored settings must merge with profile defaults without replacing
missing values with `undefined`.

## Non-Goals

- Do not implement skybox rendering.
- Do not implement ocean shader changes.
- Do not redesign the editor UI.
- Do not delete provisional bridge code unless the new store makes deletion
  trivial and verified.

## Acceptance Criteria

- One typed atmosphere value can be read by runtime systems.
- Existing Atmosphere FX controls can be mapped to that value.
- No runtime consumer has to read `style.haze` or `style.fog` directly after
  the final integration.
- Type-check passes.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec biome check src/threlte/atmosphere src/threlte/styles src/threlte/engine/sceneDocumentTypes.ts
```

If no `src/threlte/atmosphere` directory exists yet, adjust the Biome path and
state the exact command used.
