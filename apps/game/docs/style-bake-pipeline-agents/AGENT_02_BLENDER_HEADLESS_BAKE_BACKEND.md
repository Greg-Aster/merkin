# Agent 02: Blender Headless Bake Backend

## Mission

Add a Blender headless backend that can create geometry-aware stylized assets
without manual per-mesh editing.

This backend should run from the editor bake pipeline and produce normal GLB
runtime assets. The runtime should not need special NPR rendering to display the
result.

## Ownership

Primary files or new files:

- `apps/game/scripts/blender-style-bake.py`
- `apps/game/scripts/bake-style-asset.mjs`
- `apps/game/scripts/editor-tools/styleRuntimeContext.cjs`
- `apps/game/scripts/editor-tools/styleRoutes.cjs`
- `apps/game/scripts/lib/styleBakeProducts.mjs`

Secondary files if needed:

- `apps/game/package.json`
- `apps/game/src/threlte/editor/editorStyleApi.ts`
- `apps/game/src/threlte/editor/editorStyleController.ts`

## Backend Requirements

The Blender backend must support:

- headless execution through `blender --background --python`
- input GLB path
- output GLB path
- output metadata path
- profile ID or style profile name
- texture size
- AO strength
- cavity strength
- curvature strength
- line strength
- brush/noise strength
- geometry simplification
- optional bevel/weighted normal cleanup
- output tier: preview/runtime/hero

It should bake or generate:

- base color texture
- roughness/metallic texture
- normal texture
- AO/cavity/curvature driven color variation
- optional baked line texture
- optional attached line geometry only when enabled

## Command Shape

Suggested command:

```bash
blender --background --python apps/game/scripts/blender-style-bake.py -- \
  --input <source.glb> \
  --output <styled.glb> \
  --metadata-output <styled.json> \
  --profile-id painterly-storybook \
  --texture-size 512 \
  --ao-strength 0.8 \
  --cavity-strength 0.65 \
  --curvature-strength 0.45 \
  --line-strength 0.35 \
  --brush-strength 0.25 \
  --geometry-simplification 0.0 \
  --output-tier runtime
```

The Node editor route should detect Blender availability and fail loudly with a
clear message when Blender is unavailable.

## Quality Bar

- Preserve source object scale and origin unless explicitly configured.
- Preserve usable UVs when present.
- If UVs are missing, generate usable UVs inside Blender and record that fact in
  metadata.
- Do not output massive textures by default.
- Do not keep unused source textures in the generated GLB.
- Do not silently change object topology unless geometry simplification or
  line-geometry output was explicitly requested.
- Do not write outside approved generated/style-bake locations.

## Integration Requirements

The backend must return a style bake product through the same manager contract
owned by Agent 01.

The editor API should support at least two modes:

- `procedural-material`: current Node-only deterministic bake
- `blender-geometry`: new Blender-backed bake

The procedural material backend can remain as a preview/fallback backend, but
it must not bypass the manager.

## Non-Goals

- Do not build editor UI controls beyond minimal API fields.
- Do not add runtime shaders.
- Do not migrate every existing asset.
- Do not make AI generation part of this backend.

## Acceptance Criteria

- A headless Blender command produces a GLB from a source GLB.
- The output GLB contains baked style maps and no unused source textures.
- The output metadata records source fingerprint, settings, and generator.
- The editor API can invoke the backend and return the product.
- Missing Blender produces a clear editor-facing error.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game bake:style-asset -- --input <source.glb> --output /tmp/procedural-style-test.glb --texture-size 64
blender --background --python apps/game/scripts/blender-style-bake.py -- --input <source.glb> --output /tmp/blender-style-test.glb --metadata-output /tmp/blender-style-test.json --texture-size 128
pnpm --dir apps/game exec gltf-transform inspect /tmp/blender-style-test.glb --format md
```

If Blender is unavailable in the environment, report that explicitly and include
the Node/procedural bake verification.
