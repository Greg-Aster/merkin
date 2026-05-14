# Agent 03: GLB Chunk Cooker

## Mission

Create or upgrade the terrain chunk cooker so `glb-chunk-terrain` can stream
chunks derived from a Blender-authored GLB/GLTF while preserving source UVs,
material slots, mesh grouping, and texture references.

## Context

The current `cook-terrain-chunks.mjs` path generates terrain chunk GLBs from a
heightmap. That is valid for `heightfield-terrain`, but it does not satisfy the
target workflow for authored GLB terrain.

Target workflow:

```txt
source terrain GLB
  -> spatially split or partition mesh geometry
  -> preserve material indices and UVs
  -> emit chunk GLBs and LOD metadata
  -> update terrain manifest
```

## Ownership

Primary files:

- `apps/game/scripts/cook-terrain-chunks.mjs`
- new script if cleaner, for example
  `apps/game/scripts/cook-terrain-glb-chunks.mjs`
- `apps/game/scripts/lib/terrainManifestDiscovery.mjs`
- `apps/game/package.json`

Secondary files if needed:

- `apps/game/src/threlte/features/terrain/terrainManifest.ts`
- `apps/megameal/public/terrain/*.manifest.json`

## Requirements

Implement a GLB chunk cooking path that:

- reads source GLB/GLTF from terrain manifest or scene settings
- splits geometry into chunks using world-space bounds or cells
- preserves UV attributes
- preserves normals and tangents when available
- preserves material indices
- preserves texture and material references where practical
- records source asset URL and source hash
- emits per-chunk metadata including bounds, LOD, byte size, triangle count, and
  material slots
- writes chunks under `apps/megameal/public/terrain/levels/<terrain-id>/`
- updates the terrain manifest with a `glb-chunk-terrain` render product

The existing heightmap chunk path should remain available for
`heightfield-terrain`.

## LOD Requirements

Support one of these initially:

- import-authored LOD meshes from source GLB naming/metadata
- generate simple decimated LODs while preserving UV/material indices
- emit LOD0 only and mark missing LOD generation as a validation warning

Do not fake LOD metadata if no lower-detail chunk exists.

## Non-Goals

- Do not use heightmap-generated chunks for `glb-chunk-terrain`.
- Do not strip materials to a single generated terrain material.
- Do not solve collision in this agent beyond writing source metadata needed by
  Agent 04.
- Do not hand-edit generated GLB files.

## Acceptance Criteria

- A command exists to cook GLB terrain chunks for a level.
- Output chunks preserve original UVs/material assignments from the source GLB.
- Manifest records whether chunks preserve source UVs/materials.
- The cooker can run without requiring runtime/browser code.
- Existing heightmap chunk cooking still works.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game cook:terrain-chunks -- --level=observatory --dry-run
```

If you add a new script, also run its dry-run form, for example:

```bash
pnpm --dir apps/game cook:terrain-glb-chunks -- --level=observatory --dry-run
```

After writing generated chunks, run:

```bash
pnpm --dir apps/game audit:chunks
```

Report generated file counts and whether UV/material preservation was verified
by code inspection, metadata, or an automated check.
