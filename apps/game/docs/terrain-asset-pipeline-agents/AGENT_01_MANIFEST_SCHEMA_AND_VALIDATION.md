# Agent 01: Manifest Schema And Validation

## Mission

Define the explicit terrain manifest and scene settings contract that separates
`scene-authored`, `heightfield-terrain`, and `glb-chunk-terrain`.

This agent owns schema, typing, and validation. Do not implement the chunk
cooker or runtime visual switching beyond what is necessary to type and
validate the contract.

## Context

Current terrain data is spread across:

- `settings.level.collision.terrain`
- `settings.level.ground`
- terrain manifest `assets`, `physics`, `collision`, and `visualChunks`

This shape allows runtime to infer behavior indirectly. The new system needs
terrain visual authority to be explicit.

## Ownership

Primary files:

- `apps/game/src/threlte/engine/sceneDocumentTypes.ts`
- `apps/game/src/threlte/features/terrain/terrainManifest.ts`
- `apps/game/src/threlte/engine/groundContractCore.mjs`
- `apps/game/src/threlte/engine/groundContractCore.d.mts`
- `apps/game/src/threlte/engine/levelValidation.ts`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/game/scripts/lib/sceneArchitectureAudit.mjs`

Secondary files if needed:

- `apps/game/src/threlte/editor/editorPublishBakePlan.ts`
- `apps/game/scripts/test-publish-pipeline.ts`

## Requirements

Add an explicit terrain mode contract.

Suggested shape:

```ts
type TerrainRuntimeMode =
  | 'scene-authored'
  | 'heightfield-terrain'
  | 'glb-chunk-terrain'

type TerrainVisualSource =
  | 'scene-actors'
  | 'heightmap-surface'
  | 'generated-heightmap-chunks'
  | 'source-glb-chunks'
  | 'none'

type TerrainFallbackSurfacePolicy =
  | 'disabled'
  | 'debug-only'
  | 'until-required-chunks-ready'
  | 'always'
```

Manifest or scene settings must be able to express:

- terrain runtime mode
- authoritative visual source
- fallback surface policy
- whether render chunks preserve source UVs/material slots
- source terrain asset URL and hash, when applicable
- render chunk product metadata
- collision product metadata

## Validation Rules

Add validation that reports errors or warnings for:

- more than one authoritative visual terrain source active
- `glb-chunk-terrain` without source GLB metadata
- `glb-chunk-terrain` using generated heightmap chunks as the authoritative
  visual path
- `heightfield-terrain` claiming source UV preservation
- runtime fallback heightmap surface enabled alongside authoritative source GLB
  chunks, unless explicitly `debug-only`
- terrain collision manifest URL mismatch between scene settings and manifest
- scene-authored ground with missing ground actor IDs

Start with warnings where migration would otherwise break every level. Document
which warnings should become blockers after Agent 06 migration.

## Non-Goals

- Do not create the GLB chunk cooker.
- Do not migrate all levels.
- Do not delete the existing heightmap pipeline.
- Do not special-case observatory in validation logic.

## Acceptance Criteria

- Terrain mode and visual authority are represented in shared TypeScript types.
- Terrain manifest loading normalizes old manifests without crashing.
- Publish readiness exposes mixed terrain ownership as a clear warning.
- Architecture audit or level validation can flag ambiguous terrain ownership.
- Existing levels still load during the transition.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game audit:engine
```

If `audit:engine` fails because other agents have unfinished work, report the
terrain-specific findings separately.
