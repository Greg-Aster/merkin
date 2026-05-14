# Agent 09: Source GLB Asset And Cook Path

## Mission

Make the source GLB terrain chunk path real, reproducible, and honest.

The current dry-run review reported that observatory references
`/models/levels/observatory-environment.glb`, but that source file was missing
from `apps/megameal/public`. A dry run can pass while `sourceExists: false`,
which is useful for diagnostics but not sufficient for a production bake.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/docs/terrain-asset-pipeline-audit.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_00_COORDINATION.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_03_GLB_CHUNK_COOKER.md`

## Ownership

Primary files:

- `apps/game/scripts/cook-terrain-glb-chunks.mjs`
- `apps/game/src/threlte/editor/editorPublishBakePlan.ts`
- `apps/game/scripts/editor-tools/terrainRoutes.cjs`
- `apps/game/src/threlte/editor/scenes/*.scene.json`
- `apps/megameal/public/terrain/*.manifest.json`

Secondary files if needed:

- `apps/game/src/threlte/features/terrain/types.ts`
- `apps/game/src/threlte/features/terrain/terrainManifest.ts`
- `apps/megameal/public/models/levels/`

## Requirements

1. Audit all terrain manifests and scene terrain source references:

   - source URL exists on disk for local development
   - source URL is a valid public runtime path
   - source hash/provenance is recorded when available
   - source missing is a blocker for non-dry-run GLB chunk cooking

2. Update the GLB chunk cooker behavior:

   - `--dry-run` may report `sourceExists: false` without writing outputs.
   - non-dry-run must fail loudly if the source GLB is missing.
   - output metadata must state whether UVs, material slots, tangents, and
     texture references were preserved.
   - do not overwrite a valid heightfield terrain product and call it
     `source-glb-chunks`.

3. Wire publish planning so `glb-chunk-terrain` levels run the GLB chunk cook
   step before runtime asset cook.

4. Document the required authoring placement for source GLBs. If the source
   asset should not live in `public`, document the source directory and copy or
   staging step.

## Non-Goals

- Do not create fake placeholder source GLBs.
- Do not rename generated heightmap chunks as GLB chunks.
- Do not make observatory pass by weakening the cooker's source validation.

## Acceptance Criteria

- Missing source GLB is surfaced as an actionable error.
- Successful GLB chunk cook writes manifest metadata proving source linkage.
- Publish plan includes the GLB chunk cook for `glb-chunk-terrain`.
- Dry-run output is clear enough for editor diagnostics.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game cook:terrain-glb-chunks -- --level=<level> --dry-run
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game audit:engine
```

If a real source GLB is available, also run the non-dry-run cook and report the
changed generated assets.
