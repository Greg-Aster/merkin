# Solitude Migration Provenance

Status: provenance captured only
Last updated: 2026-06-06
Target future runtime scene: `solitude_runtime`

This file records old Solitude source evidence for the future
`SolitudeLevelContract` implementation packet. The old files listed here are
read-only provenance. They must not become runtime inputs for
`apps/game.megameal`, and old `apps/game` runtime, Svelte, Threlte, Three, or
generated-scene ownership must not be imported or copied.

## Source Evidence Consulted

- `apps/game/src/threlte/levels/level-registry.json` lines 58-72:
  legacy Solitude is active, deployed, aliased as `solitude-level`, sourced
  from scene ID `solitude`, and exposed on the old star map as year 2600 with
  description `Drift out toward Solitude`.
- `apps/game/src/threlte/editor/scenes/solitude.scene.json` lines 2-23:
  source scene ID, updated timestamp, `observatory` skybox preset,
  `violet-dread` atmosphere preset, `lonely-wind` audio preset, spawn
  `[0, 0.8, -24]`, scene-authored ground, scene-authored collision, disabled
  fallback surface policy, ground actors `solitude-ground-plateau` and
  `solitude-ground-dais`, and required walkable surface
  `solitude-ground-plateau`.
- `apps/game/src/threlte/editor/scenes/solitude.scene.json` lines 25-50:
  terrain migration is scene-authored with no render chunks, and the old world
  partition URL is `/runtime-world-partitions/solitude.partition.json` with
  one cell, three resident actors, and thirty streamable actors.
- `apps/game/src/threlte/editor/scenes/solitude.scene.json` lines 52-89:
  old graphics and collision budgets, `solitude-pillar-7` as visual-only, and
  ground actor collision roles.
- `apps/game/src/threlte/editor/scenes/solitude.scene.json` lines 90-108:
  old feature flags include star map, conversations, styles, and ambient
  particles; water is disabled; old global firefly generation is disabled even
  though authored firefly NPC groups exist later in the scene.
- `apps/game/src/threlte/editor/scenes/solitude.scene.json` lines 130-184:
  render profile `solitude-abyssal-neon-ground` used desktop default quality,
  one shadow-casting light, static-environment reflections, and enabled
  tone-mapping, ambient-occlusion, color-grading, bloom, and vignette passes.
- `apps/game/src/threlte/editor/scenes/solitude.scene.json` lines 185-274:
  mobile, desktop, and TV quality-tier overrides plus the old visual bookmark
  at player position `[0, 1.5, -24]`.
- `apps/game/src/threlte/editor/scenes/solitude.scene.json` lines 284-296:
  old ambient particle settings: enabled, count 220, radius 132, height range
  0.35 to 9.5, cyan/magenta colors, opacity 0.22, drift speed 0.14, and sway
  0.62.
- `apps/game/src/threlte/editor/scenes/solitude.scene.json` lines 317-405:
  `solitude-ground-plateau` was an old generated GLB asset, skipped for render
  style, and authored as `walkable/worldStatic` simplified trimesh collision
  with collider artifact URLs and 13,998 collision triangles.
- `apps/game/src/threlte/editor/scenes/solitude.scene.json` lines 409-497:
  `solitude-ground-dais` was an old generated GLB asset, skipped for render
  style, and authored as `walkable/worldStatic` simplified trimesh collision
  with collider artifact URLs and 11,398 collision triangles.
- `apps/game/src/threlte/editor/scenes/solitude.scene.json` lines 1503-2017:
  twelve authored pillar firefly NPC groups exist as click/read-only
  conversation actors with hover-wander behavior and firefly presentation.
- `apps/game/src/threlte/editor/scenes/solitude.scene.json` lines 2019-2187:
  east and west ring fragments were old generated GLB blocker assets with
  `worldStatic` simplified trimesh collision.
- `apps/game/src/threlte/editor/scenes/solitude.scene.json` lines 2203-2241:
  the central `solitude-firefly` authored NPC carries the main `Solitude`
  read-only conversation.
- `apps/game/src/threlte/editor/scenes/solitude.scene.json` lines 2244-2258:
  the old `solitude-ambient-wind` audio region used
  `/audio/ambient/Wicked Shadows Whisper.mp3` at volume 0.28.
- `apps/game/src/threlte/editor/scenes/solitude.scene.json` lines 2261-2275:
  the old `solitude-ring-haze` fog volume used color `#8f9daf`, density
  0.0026, and falloff 10.
- `apps/megameal/public/generated/runtime-game-assets/scenes/solitude.runtime-scene.json`
  lines 4754-4763: old generated build report records 33 actors, 16 asset
  actors, 13 NPC/firefly actors, 15 physics actors, 15 trimesh actors, and one
  visual-only actor.
- `apps/megameal/public/generated/runtime-game-assets/scenes/solitude.runtime-scene.json`
  lines 4769-4882: old publish readiness was false because
  `terrain-runtime-collision-declared` failed for
  `solitude-ground-plateau`; required walkable and collision actors were
  present.
- `apps/megameal/public/generated/runtime-game-assets/scenes/solitude.runtime-scene.json`
  lines 4884-4912: old runtime activation required manifest, asset, collision,
  partition, spawn, physics, and player gates, with `solitude-ground-plateau`
  and `solitude-ground-dais` as required collision actor IDs and no terrain
  manifest URL.
- `apps/megameal/public/generated/runtime-game-assets/scenes/solitude.runtime-scene.json`
  lines 4923-4954: old terrain readiness still had no runtime collision
  manifest, required walkable actors were the two ground actors, and old
  runtime asset URLs numbered 16 generated GLBs.
- `apps/megameal/public/generated/runtime-game-assets/scenes/solitude.runtime-scene.json`
  lines 4956-4980: old collision diagnostics list authored collision actors
  and mark only `solitude-pillar-7` as visual-only.
- `apps/megameal/public/generated/runtime-game-assets/scenes/solitude.runtime-scene.json`
  lines 6120-6122: old generated runtime scene points at
  `/runtime-world-partitions/solitude.partition.json`.
- `apps/megameal/public/runtime-world-partitions/solitude.partition.json`
  lines 1-21: old partition metadata was generated by `cook-world-partition`
  with cell size 80, active radius 1, and staged render/collision streaming
  readiness gates.
- `apps/megameal/public/runtime-world-partitions/solitude.partition.json`
  lines 23-61: old initial cell `0,0` required 16 render actors and 13
  collision actors.
- `apps/megameal/public/runtime-world-partitions/solitude.partition.json`
  lines 63-99: old resident actors were `solitude-ambient-wind`,
  `solitude-firefly`, and `solitude-ring-haze`; old streamable actors included
  the ground, ring, pillars, and pillar-firefly groups.
- `apps/megameal/public/runtime-world-partitions/solitude.partition.json`
  lines 100-184: old partition had one initial cell containing 30 actors,
  16 render actor IDs, 13 collision actor IDs, estimated 40,000 triangles, and
  `requiredForSpawn: true`.

## Migration Implications

- The future packet needs a `SolitudeLevelContract` row before runtime/data
  implementation begins.
- The target engine must own new assets, prefabs, level data, render profile,
  runtime scene manifest, audio content manifest entries, collision/walkable
  IDs, and validation. The old scene JSON, generated runtime scene JSON, and
  old partition JSON remain evidence only.
- The old spawn to preserve as authored target data is `[0, 0.8, -24]`; the
  old visual bookmark uses `[0, 1.5, -24]` and should be treated as camera
  framing evidence, not a separate spawn owner.
- The future level must explicitly own both walkable surfaces:
  `solitude-ground-plateau` and `solitude-ground-dais`. The old failure around
  missing `solitude-ground-plateau` runtime collision manifest means the new
  packet must include readiness and negative validation for required walkable
  and collision stable IDs before it can become playable.
- Old generated GLB candidates and collider products must go through the
  current generated-asset/import/cook contracts before runtime use. Do not load
  the old generated runtime scene or old generated collision URLs directly.
- The old world partition had only one initial cell. The future packet still
  needs an explicit decision: use no streaming for the target-engine foundation
  or create a target-owned partition/cook product with validation. Do not
  preserve the old partition as runtime data without a new owner.
- Ambient particles and authored firefly NPCs are separate evidence streams.
  The implementation packet should choose between target-owned deterministic
  firefly population data, ambient particle field data, or a staged subset,
  and document unsupported behavior as future work.
- The old `lonely-wind` preset and audio region point to a concrete ambient
  track. The target packet should migrate this through `AudioManifestAndEvents`
  and scene music or spatial emitter contracts, not through direct playback.
- The old render profile requested shadows, static-environment reflections,
  and post-processing. The target packet should translate only currently
  supported render-profile data and mark unsupported effects as explicit future
  work.
- Portal-arena transition to `solitude_runtime` must not be added until the
  target runtime scene manifest, content graph validation, runtime-scene
  negative tests, and contract-register row exist and pass.

## Current Status

- Provenance capture is complete for the old registry row, scene JSON,
  generated runtime scene JSON, and old world partition JSON.
- No `src/` files were changed by this provenance task.
- No runtime behavior is implemented by this file.
- Solitude remains not migrated to `apps/game.megameal`.
