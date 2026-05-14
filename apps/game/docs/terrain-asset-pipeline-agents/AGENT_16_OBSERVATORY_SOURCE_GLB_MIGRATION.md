# Agent 16: Observatory Source GLB Migration

## Mission

Complete observatory's real terrain migration from transitional heightfield
chunks to source-preserving GLB chunks.

This is the content/pipeline migration task. Do not fake completion by renaming
heightfield chunks as source GLB chunks.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/docs/terrain-asset-pipeline-audit.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_00_COORDINATION.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_03_GLB_CHUNK_COOKER.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_09_SOURCE_GLB_ASSET_AND_COOK_PATH.md`

## Current State

Observatory is still declared as:

```txt
runtimeMode: heightfield-terrain
visualSource: generated-heightmap-chunks
fallbackSurfacePolicy: disabled
targetMode: glb-chunk-terrain
status: transitional
```

The scene and manifest reference:

```txt
/models/levels/observatory-environment.glb
```

That source asset is not present in the local public asset tree at review time.

## Ownership

Primary files:

- `apps/game/src/threlte/editor/scenes/observatory.scene.json`
- `apps/megameal/public/terrain/observatory-environment.manifest.json`
- `apps/megameal/public/terrain/levels/observatory-environment/**`
- `apps/game/scripts/cook-terrain-glb-chunks.mjs`

Secondary files if needed:

- `apps/game/docs/terrain-source-glb-authoring.md`
- `apps/game/src/threlte/features/terrain/terrainManifest.ts`
- `apps/game/scripts/lib/terrainContractAudit.mjs`

## Requirements

1. Locate, restore, or add the actual observatory source GLB/GLTF exported from
   Blender or the approved authoring tool.
2. Place it at the manifest-declared public source path or update the manifest
   and scene settings to the correct public source URL.
3. Run the source GLB chunk cooker and verify generated chunks preserve:

   - source UV intent
   - material slots
   - source hash/provenance
   - bounds
   - chunk count
   - LOD metadata

4. Update observatory scene and manifest only after the source cook succeeds:

   ```txt
   runtimeMode: glb-chunk-terrain
   visualSource: source-glb-chunks
   fallbackSurfacePolicy: disabled or debug-only
   status: complete
   ```

5. Keep collision honest:

   - If collision remains heightfield-projected, mark it as an approved
     transitional exception or keep migration status transitional.
   - Do not claim full source-linked collision unless it exists.

6. Regenerate runtime assets from the source scene/manifest. Do not hand-edit
   cooked runtime scene JSON.

## Non-Goals

- Do not create a placeholder observatory GLB.
- Do not remove heightfield products until source GLB chunks and gameplay
  collision are validated.
- Do not special-case observatory in generic runtime code.

## Acceptance Criteria

- Source GLB exists and is referenced by scene/manifest.
- Non-dry-run `cook:terrain-glb-chunks` succeeds for observatory.
- Manifest metadata proves source hash and preservation state.
- Runtime terrain visual source is `source-glb-chunks`.
- Observatory no longer has competing heightfield visual layers.

## Verification

Run:

```bash
pnpm --dir apps/game cook:terrain-glb-chunks -- --level=observatory
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
```

If collision remains transitional, report that clearly.
