# Agent 06: Level Migration And Release Gates

## Mission

Classify existing levels by terrain mode, migrate metadata to the new contract,
and add release/audit gates so terrain visual ownership does not regress.

## Context

Existing levels use mixed terrain contracts:

- `observatory` currently uses baked heightmap terrain and cooked visual chunks.
- `yggdrasil` uses scene-authored ground plus authored scene colliders.
- `solitude`, `miranda`, and `sci-fi-room` have scene-authored ground-style
  settings.

The migration should not delete working paths. It should make each path
explicit and validated.

## Ownership

Primary files:

- `apps/game/src/threlte/editor/scenes/*.scene.json`
- `apps/megameal/public/terrain/*.manifest.json`
- `apps/megameal/public/generated/runtime-game-assets/scenes/*.runtime-scene.json`
- `apps/game/scripts/audit-engine-architecture.mjs`
- `apps/game/scripts/audit-chunk-ownership.mjs`
- `apps/game/scripts/check-generated-drift.mjs`
- `apps/game/scripts/release-gate.mjs`

Secondary files if needed:

- `apps/game/src/threlte/levels/level-registry.json`
- `apps/game/ENGINE_MIGRATION_CHECKLIST.md`
- `apps/game/docs/terrain-asset-pipeline-audit.md`

## Requirements

Classify each level as:

```txt
scene-authored
heightfield-terrain
glb-chunk-terrain
```

Then update scene settings and manifests so classification is explicit.

For each level, document:

- current terrain mode
- authoritative visual source
- collision source
- render chunks present or not present
- fallback surface policy
- migration target
- blockers

## Release Gate Rules

Add or update audits to detect:

- multiple authoritative terrain visual sources
- source GLB reference present but not used by the declared terrain mode
- `glb-chunk-terrain` without UV/material preservation metadata
- fallback heightmap surface enabled as primary terrain when chunks are
  authoritative
- terrain chunks missing from a level that declares chunk terrain
- collision source incompatible with terrain mode
- runtime scene manifest drift from authoring scene terrain settings

During transition, warnings are acceptable for levels that are intentionally not
yet migrated. Clearly mark which warnings become blockers after migration.

## Observatory Migration Guidance

Observatory should eventually become:

```txt
glb-chunk-terrain
visualSource: source-glb-chunks
fallbackSurfacePolicy: disabled or debug-only
collision: source-linked terrain collision
```

Do not fake this by renaming heightmap chunks as GLB chunks. If UV/material
preservation is not implemented yet, classify observatory as transitional and
surface the warning honestly.

## Non-Goals

- Do not build the GLB chunk cooker.
- Do not rewrite runtime terrain rendering.
- Do not delete deprecated terrain files until the new pipeline is verified and
  the removal is listed in the report.
- Do not silence generated drift without explaining which command generated the
  changed files.

## Acceptance Criteria

- Every level has explicit terrain classification metadata.
- Audits identify ambiguous terrain ownership.
- Generated runtime scene manifests agree with source scene terrain settings.
- Observatory is either migrated to real `glb-chunk-terrain` or clearly marked
  transitional with warnings.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
```

If generated runtime scenes are updated, state the command used to regenerate
them.
