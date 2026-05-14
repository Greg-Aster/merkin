# Terrain Asset Pipeline Audit

## Purpose

This audit captures the current terrain authoring, bake, chunk, publish, and
runtime loading paths before the engine moves to a cleaner AAA-style terrain
asset pipeline.

The target product workflow is:

```txt
Blender terrain source
  -> exported GLB/GLTF terrain asset
  -> editor import and authoring metadata
  -> bake/cook terrain render chunks, LODs, collision, and manifests
  -> publish runtime terrain contract
  -> runtime streams verified chunks and collision
```

The engine should treat terrain as a compiled runtime product. Runtime code
should not guess which visual terrain path wins, and the editor should not
leave authors wondering whether the visible terrain is a source mesh,
heightmap surface, generated chunk, collision artifact, or fallback.

## Current Active Paths

### 1. Scene-Authored Ground

Some levels use ordinary scene nodes as visual ground and scene-authored or
asset-authored collision. Examples in `src/threlte/editor/scenes/*.scene.json`
include `miranda`, `sci-fi-room`, `solitude`, and `yggdrasil`.

This path is controlled by `settings.level.ground.visualSource =
"scene-actors"` and ground actor IDs.

### 2. Baked Heightmap Terrain

The terrain editor route can rasterize selected source GLB/primitive geometry
into a heightmap through:

```txt
POST /api/editor-terrain/generate-heightmap
pnpm --dir apps/game generate:terrain-heightmap
```

The script reads selected sources, transforms them into world space, rasterizes
their top surface to a PNG heightmap, and writes heightmap config metadata under
`apps/megameal/public/terrain/heightmaps/`.

### 3. Baked Terrain Collision

Terrain collision is baked from the heightmap, not from a UV-preserving source
GLB chunk contract:

```txt
POST /api/editor-terrain/bake-collision
pnpm --dir apps/game bake:terrain-collision
```

This produces a binary terrain collider and metadata under
`apps/megameal/public/terrain/collision/`.

### 4. Cooked Terrain Chunk GLBs

Terrain visual chunks are currently cooked from the heightmap:

```txt
POST /api/editor-terrain/cook-chunks
pnpm --dir apps/game cook:terrain-chunks
```

The script generates a grid of GLB chunks and LODs under
`apps/megameal/public/terrain/levels/<terrain-id>/`.

Important: these chunks are generated geometry from height data. They are not
currently guaranteed to preserve the original source GLB topology, UV islands,
texture coordinates, material slots, or authored Blender material layout.

### 5. Runtime Terrain Loading

Runtime terrain loading happens in `SceneDocumentLevel.svelte` and
`TerrainRuntime.svelte`.

For baked terrain levels, runtime fetches the terrain manifest, then loads:

- heightmap image
- baked terrain collision artifact
- cooked terrain chunk GLBs from `chunksPath`
- optional procedural heightmap visual surface

For `observatory`, the runtime manifest path is:

```txt
/terrain/observatory-environment.manifest.json
```

The manifest still references the original source environment GLB, but the
active runtime terrain path is heightmap plus generated chunk GLBs.

## Main Findings

### Finding 1: The Engine Has Multiple Terrain Visual Owners

The current contracts allow these terrain visual owners:

- `scene-actors`
- `terrain-chunks`
- procedural `HeightmapSurface`
- original manifest `assets.environment` GLB reference

Only one of these should own visible runtime ground for a level. The current
runtime can load chunk GLBs while also rendering a heightmap visual surface.
That creates the visible "competing layers" problem.

### Finding 2: Observatory Expects Original GLB Fidelity But Uses Heightmap Chunks

The expected art workflow is "Blender GLB source -> chunked GLB runtime while
preserving UV/materials." The current observatory runtime is effectively
"GLB source -> heightmap -> generated chunks." That explains why the visible
terrain does not look like the original GLB UV wrap.

### Finding 3: The Manifest Does Not Declare Terrain Visual Authority Clearly

The manifest has `assets.environment`, `assets.heightmap`, `assets.chunksPath`,
and `visualChunks`, but no explicit runtime rule such as:

```json
{
  "render": {
    "visualSource": "glb-chunks",
    "fallbackSurface": "disabled-after-first-chunk"
  }
}
```

Runtime derives behavior indirectly from level settings and manifest shape.

### Finding 4: Heightmap Is Doing Too Many Jobs

Heightmaps are currently used for:

- terrain sculpt source
- terrain collision source
- generated visual chunk source
- procedural fallback visual surface

This is valid for simple heightfield terrain, but it is not sufficient for
AAA-style authored GLB terrain with caves, overhangs, cliffs, bridges, custom
UVs, baked material IDs, or art-directed mesh topology.

### Finding 5: Publish Orchestration Exists, But Terrain Products Are Ambiguous

The editor publish plan already knows about:

- save scene
- terrain collision bake
- terrain chunk cook
- world partition cook
- runtime asset cook
- engine audit

The issue is not missing publish steps. The issue is that the terrain steps do
not yet enforce one coherent terrain asset contract.

## Target Terrain Contract

The engine should support one primary terrain runtime contract:

```txt
TerrainSourceAsset
  -> RenderChunks
  -> CollisionProducts
  -> TerrainManifest
  -> RuntimeTerrainInstance
```

### Source Contract

Source assets should record:

- source GLB/GLTF URL
- source file hash
- source coordinate system and unit scale
- source bounds
- material slots
- mesh part IDs
- authoring tool provenance
- whether heightfield projection is allowed

### Render Chunk Contract

Render chunks should record:

- chunk grid or spatial partition cell
- LOD level
- source mesh part IDs
- source material slots
- texture dependencies
- bounds
- byte size
- triangle count
- draw-call estimate
- required/optional streaming priority

### Collision Contract

Collision should be a separate product, but linked to the same source contract:

- terrain walkable collision
- blockers
- detail/query collision
- no primitive fallback for authored terrain unless explicitly approved
- collision bounds must validate against visual chunk bounds

### Runtime Contract

Runtime should load terrain through one manifest-controlled path:

- required collision first
- required near-field render chunks
- optional far-field chunks
- no procedural visual fallback when authoritative visual chunks exist
- clear diagnostics if required terrain chunks fail

## Refactor Plan

### Phase 1: Audit And Lock The Contract

1. Add a typed terrain manifest schema that distinguishes `heightfield-terrain`
   from `glb-chunk-terrain`.
2. Add explicit manifest fields for visual authority:
   `render.visualSource`, `render.fallbackSurfacePolicy`, and
   `render.sourcePreservesUv`.
3. Update publish readiness to warn when a level mixes incompatible terrain
   visual owners.
4. Add an audit that flags any level where runtime can render both terrain
   chunks and a procedural heightmap visual surface.

### Phase 2: Remove Runtime Ambiguity

1. Make `TerrainRuntime` obey the manifest visual authority field.
2. Disable `HeightmapSurface` by default when authoritative visual chunks exist.
3. Keep `HeightmapSurface` only as an explicit debug/editor fallback or for
   true heightfield terrain.
4. Make missing required visual chunks a diagnostic failure, not an invitation
   to silently draw another terrain.

### Phase 3: Build The GLB Terrain Chunk Cooker

1. Add a new cooker for source GLB terrain chunks that preserves UVs,
   materials, mesh groups, and texture references.
2. Keep the current heightmap chunk cooker only for levels that explicitly
   choose `heightfield-terrain`.
3. Write chunk metadata that links each output chunk to the source asset hash
   and material slots.
4. Add LOD generation or LOD import support without losing material IDs.

### Phase 4: Align Collision With The Source Contract

1. Link terrain collision metadata to the same source asset hash as render
   chunks.
2. Support dedicated collision meshes exported from Blender when present.
3. Keep heightfield collision only for terrain that declares itself as
   heightfield-compatible.
4. Add validation that collision coverage matches required walkable terrain
   chunks and spawn positions.

### Phase 5: Level Editor UX

1. Show the terrain contract in one place: source, render chunks, collision,
   fallback policy, dirty state, and publish state.
2. Replace ambiguous terrain controls with a clear pipeline:
   `Import Source`, `Bake Render Chunks`, `Bake Collision`, `Validate`,
   `Publish`.
3. In playtest mode, display terrain diagnostics when the playable runtime is
   using fallback visuals or stale cooked products.
4. Prevent publish when the editor state says "GLB chunk terrain" but only
   heightmap chunks are available.

### Phase 6: Migration

1. Mark each existing level as one of:
   `scene-authored`, `heightfield-terrain`, or `glb-chunk-terrain`.
2. Keep existing heightmap terrain working while observatory is migrated to
   GLB chunk terrain.
3. Remove or archive deprecated observatory heightmap variants after the new
   GLB chunk pipeline is verified.
4. Add release-gate checks so future terrain levels cannot drift back into
   mixed visual ownership.

## Existing Level Terrain Classification

| Level | Current terrain mode | Authoritative visual source | Collision source | Render chunks | Fallback surface policy | Migration target | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `miranda` | `scene-authored` | scene actors | scene colliders | not present | disabled | `scene-authored` | none |
| `observatory` | `glb-chunk-terrain` | source GLB chunks | source-linked terrain collision | present and authoritative | disabled | `glb-chunk-terrain` | none |
| `sci-fi-room` | `scene-authored` | scene actors | scene colliders | retired | disabled | `scene-authored` | none |
| `solitude` | `scene-authored` | scene actors | scene colliders | retired | disabled | `scene-authored` | none |
| `yggdrasil` | `scene-authored` | scene actors | scene colliders | retired | disabled | `scene-authored` | none |

Transition warnings are allowed only while a level is marked
`terrainMigration.status = "transitional"` or `"planned"`. There are no current
terrain levels that should rely on transitional mixed visual/collision
authority.

## Generated Terrain Product Inventory

This inventory records generated terrain products that are still present after
terrain visual authority has been classified. Products marked retained must not
act as fallback runtime visuals unless their terrain mode explicitly owns that
path.

| Level | Source scene file | Runtime mode | Authoritative visual source | Terrain manifest | Heightmap products | Visual chunk products | Collision products | Cleanup status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `miranda` | `apps/game/src/threlte/editor/scenes/miranda.scene.json` | `scene-authored` | scene actors | none | none | none | scene colliders | no generated terrain products |
| `observatory` | `apps/game/src/threlte/editor/scenes/observatory.scene.json` | `heightfield-terrain` transitional | generated heightmap chunks | `apps/megameal/public/terrain/observatory-environment.manifest.json` | `/terrain/heightmaps/observatory-environment_heightmap.png` used transitional | `/terrain/levels/observatory-environment/` used transitional and authoritative | `/terrain/collision/observatory-environment.collider.bin` used transitional | retain until source GLB chunks preserve UVs/material slots and source-linked collision is validated |
| `sci-fi-room` | `apps/game/src/threlte/editor/scenes/sci-fi-room.scene.json` | `scene-authored` | scene actors | removed | removed from runtime | removed from manifest and disk | scene colliders now own gameplay | visual chunk retirement complete; heightfield collision removed |
| `solitude` | `apps/game/src/threlte/editor/scenes/solitude.scene.json` | `scene-authored` | scene actors | removed | removed from runtime | removed from manifest and disk | scene colliders now own gameplay | visual chunk retirement complete; heightfield collision removed |
| `yggdrasil` | `apps/game/src/threlte/editor/scenes/yggdrasil.scene.json` | `scene-authored` | scene actors | removed | removed from runtime | removed from manifest and disk | removed; scene colliders now own gameplay | visual chunk retirement complete; heightfield collision removed |

Generated visual chunk directories were deleted for completed scene-authored
levels after their terrain manifests stopped referencing `assets.chunksPath`
and `visualChunks`. `sci-fi-room`, `solitude`, and `yggdrasil` now depend on
authored scene colliders for player ground collision, and their old
heightmap/collider terrain manifest products have been removed from the runtime
public terrain set.
The runtime contract keeps `terrainVisualSource = "scene-actors"` and
`fallbackSurfacePolicy = "disabled"` for those levels, and the audit now fails
if completed scene-authored levels regain generated heightmap visual chunks.

## Agent Handoff Candidates

The next step should split this into agent instruction files:

1. Terrain manifest schema and validation.
2. Runtime visual authority cleanup.
3. GLB chunk cooker preserving UVs/materials.
4. Terrain collision source-contract alignment.
5. Editor terrain UX and publish diagnostics.
6. Existing level migration and release-gate audits.

## Immediate Recommendation

Do not keep patching observatory visually until the terrain visual authority
contract is explicit. The first implementation change should be the manifest
and runtime rule that prevents heightmap visual surfaces and chunk GLBs from
competing as visible terrain.
