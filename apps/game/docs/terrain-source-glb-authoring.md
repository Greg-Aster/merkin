# Terrain Source GLB Authoring Placement

Terrain source GLB chunk cooking is intentionally file-system based. The
cooker reads the exported GLB/GLTF directly and writes compiled runtime chunks
under `apps/megameal/public/terrain/levels/<terrain-id>/`.

## Source Asset Rule

Keep large authoring files such as `.blend`, raw captures, and work-in-progress
exports outside the web runtime. Stage the exported terrain source GLB/GLTF that
will be cooked under:

```txt
apps/megameal/public/models/levels/
```

The terrain manifest or scene terrain settings must reference that staged file
with a public URL:

```json
{
  "assets": {
    "sourceGlb": "/models/levels/example-terrain.glb"
  }
}
```

`/models/levels/example-terrain.glb` resolves to:

```txt
apps/megameal/public/models/levels/example-terrain.glb
```

## Provenance

After a successful source GLB cook, the terrain manifest records:

- source public URL
- source SHA-256 hash
- source byte size
- chunk paths and per-chunk metadata
- whether source UVs, material slots, tangents, mesh groups, and texture
  references were preserved

Missing source GLB/GLTF files are allowed in `--dry-run` diagnostics, but are a
hard failure for non-dry-run cooking. Do not use placeholder GLBs to satisfy the
contract.

## Commands

Audit terrain source references:

```bash
pnpm --dir apps/game cook:terrain-glb-chunks -- --audit-sources
```

Dry-run a source GLB chunk cook:

```bash
pnpm --dir apps/game cook:terrain-glb-chunks -- --level=<level> --dry-run
```

Run a production cook only after the level declares
`runtimeMode: "glb-chunk-terrain"` or `visualSource: "source-glb-chunks"`:

```bash
pnpm --dir apps/game cook:terrain-glb-chunks -- --level=<level>
```
