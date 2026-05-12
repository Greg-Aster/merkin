# Runtime Asset Import Conventions

Runtime scenes reference web-ready GLB/GLTF URLs, but those URLs must still map
back to human-owned import metadata before the cooker publishes runtime
variants.

## Source folders

- `apps/megameal/public/generated/hunyuan3d` contains AI/generated source GLBs
  selected for level use.
- `apps/megameal/public/generated/style-lab/sources` contains Style Lab source
  GLBs selected for level use.
- `apps/megameal/public/models/polyhaven` contains third-party model sources.
- `apps/megameal/public/generated/runtime-game-assets/prefabs` contains baked
  procedural prefab source GLBs. These are generated authoring outputs, not
  final tiered runtime variants.
- `apps/megameal/public/generated/runtime-game-assets` contains cooked tiered
  runtime output and must not be used for raw source drops except the prefab
  bake source family above.

## Naming

- Hero assets: `hero-<subject>-<variant>.glb`.
- Set dressing: `<kit>-<prop>-<variant>.glb`.
- Prefabs: `<prefab-type>/<prefab-type>[-variant].glb`.
- Terrain render chunks: `<level>-terrain-chunk-<cell>-lod<level>.glb`.
- Collision sources: `<level-or-asset>-collision-<shape>.glb`.
- Impostor sources: `<asset-id>-impostor.<ext>`.

Every source URL used by a scene must match an import family or an explicit
entry in `import-manifest.json`.
