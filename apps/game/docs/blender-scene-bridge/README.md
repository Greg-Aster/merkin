# Merkin Blender Scene Bridge

This bridge is the first safe whole-scene Blender workflow for the game editor.
It is intentionally a transform-delta pipeline, not a giant-GLB replacement
pipeline.

The add-on source lives in:

```txt
apps/blender/merkin_scene_bridge/
```

## What It Does

- Exports a level scene JSON into a Blender package.
- Copies referenced GLB/GLTF assets into that package.
- Imports the package in Blender 5.0 with one editable root object per scene
  node.
- Stores Merkin node identity on Blender objects through custom properties.
- Exports a delta containing position, rotation, and scale changes.
- Applies that delta back onto the original scene JSON.

## What It Does Not Do Yet

- It does not replace mesh assets in the level.
- It does not create or delete game nodes.
- It does not bake collision.
- It does not rewrite terrain chunk products.
- It does not treat a Blender-exported monolithic GLB as the level.

Those are deliberate limits. Game-specific metadata such as collision intent,
prefab identity, gameplay triggers, spawn data, and bake status must stay in
the scene document until explicit contracts are added for each capability.

## Install The Add-On

Build the installable add-on package from the repo root:

```bash
pnpm --dir apps/game blender:addon:package
```

In Blender 5.0:

1. Open `Edit > Preferences > Add-ons`.
2. Choose `Install from Disk`.
3. Select:

   ```txt
   apps/blender/merkin_scene_bridge.zip
   ```

4. Enable `Merkin Scene Bridge`.
5. In the 3D Viewport sidebar, open the `Merkin` tab.

Do not install `apps/blender/merkin_scene_bridge/__init__.py` directly. Blender
5 can install a single `.py` add-on from disk, but this bridge is a package
add-on, so Blender needs `apps/blender/merkin_scene_bridge.zip`.

## Export A Scene Package

From the level editor, use:

```txt
File > Export Level...
```

The editor exports the current in-memory level scene, including unsaved
transform edits, into the visible Blender workspace:

```txt
apps/blender/scene-packages/
```

From the repo root:

```bash
pnpm --dir apps/game blender:scene:export -- --level=yggdrasil
```

This writes a package under:

```txt
apps/blender/scene-packages/<level>-<timestamp>/
```

The file to import in Blender is:

```txt
merkin-scene-package.json
```

## Edit In Blender

Use `Merkin > Import Merkin Scene Package`.

Each game scene node is represented by a root object with custom properties:

- `merkin_node_id`
- `merkin_node_name`
- `merkin_kind`
- `merkin_parent_id`
- `merkin_asset_url`
- `merkin_export_mode`

Move, rotate, and scale those Merkin root objects. For this first version, do
not edit child imported GLB internals if you expect changes to round-trip.

## Export A Delta From Blender

Use `Merkin > Export Merkin Scene Delta`.

This writes:

```txt
merkin-scene-delta.json
```

beside the imported package manifest by default.

## Apply The Delta

From the level editor, use:

```txt
File > Import Level...
```

Select the `merkin-scene-delta.json` exported from Blender. The editor applies
the transform delta to the current scene and marks the level dirty; use normal
Save/Publish after reviewing the imported result.

Preview output without overwriting the source scene:

```bash
pnpm --dir apps/game blender:scene:import -- --delta=apps/blender/scene-packages/<package>/merkin-scene-delta.json
```

Apply directly to the source scene:

```bash
pnpm --dir apps/game blender:scene:import -- --delta=apps/blender/scene-packages/<package>/merkin-scene-delta.json --write
```

After applying a delta, use the level editor and publish/audit workflow as
normal. Collision and runtime products remain separate validated outputs.

## Engine Rules

- The scene JSON remains the authoring source of truth.
- Blender may edit transforms in this first pass.
- Mesh replacement, new nodes, deletes, material changes, and collision bakes
  require explicit future delta contracts.
- Missing asset copies are warnings at package export time and should be fixed
  before expecting a complete Blender scene.
