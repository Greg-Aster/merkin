# Portal Field Terrain Intent

Status: implemented foundation
Started: 2026-06-06

## Intent

Replace the portal arena's built-in flat floor visual with a large authored GLB
field that reads as a Scottish moor at night: dark grass, peat, uneven ground,
small tufts, and low rolling micro-displacement. The field should extend beyond
the camera's visible range for the player movement bounds so the level no
longer reads as a small test platform.

The target engine must keep the existing architecture:

```text
GLB terrain is render content.
Collision remains explicit authored game data.
Rapier receives cooked/proxy collider shapes through the physics adapter.
No gameplay system reads Three meshes or GLB node data as source of truth.
```

## Current Source

Before this packet, `portal_arena_runtime` used:

- `mesh_arena_floor` as `builtin://arena-floor`,
- `material_arena_floor` as `builtin://tile-green`,
- `portal_arena_floor` as a scaled box renderable,
- a fixed solid/world box collider with `halfExtents: [12, 0.05, 12]`,
- player movement bounds of `x/z = -10..10`.

That was correct for the first vertical slice, but it is not a production level
floor.

## Implementation Direction

This packet will:

- add an authored generated GLB asset under `public/assets/game/terrain/`,
- keep provenance so the asset can be reproduced later through generic terrain
  import/generation tooling,
- replace the portal arena floor renderable with the GLB mesh asset,
- remove the portal arena floor's unused built-in material dependency,
- expand the portal arena floor collision proxy and player movement bounds,
- tune the portal arena render profile toward moonlit night-field lighting,
- validate the portal runtime scene manifest and engine boundaries.

## Lighting Follow-Up

The portal field has scene-profile lighting plus a player-carried local light.
The portal arena render profile provides ambient light, two directional
moon/fill lights, and cubemap environment lighting. The stable player instance
also carries a warm point `Light` so nearby dark ground remains readable.

Current source ownership:

- portal scene-profile lighting lives in `src/game/levels/renderProfiles.ts`,
- the portal floor and gate prefabs have no `Light` components,
- the portal player instance in `src/game/levels/portalArenaLevel.ts` adds the
  steady player-carried point light,
- authored `Light` components already exist in the new engine for Miranda
  point lights and are projected through `LightSyncSystem`.

The implemented foundation uses the engine's existing `Transform + Light`
projection model. It does not copy the legacy Svelte/Threlte lighting
controller, point-light budget controller, hidden player-radius culling, or
renderer-local mutation path.

Initial tuning is conservative: a warm, low-radius point light that helps the
player read immediate ground detail without flattening the night moor.
Charge/release can later request a temporary brighter pulse through gameplay
events if the old interaction feel is still desired.

## AAA Collision Direction

For a AAA-style game, the best collision system is layered rather than one
universal collider type:

- Character traversal should use simple, stable collision proxies such as boxes,
  capsules, convex hulls, heightfields, or carefully cooked triangle meshes.
- Small visual displacement should usually stay visual only. It should not make
  the player jitter or snag.
- High-detail render meshes should not be the default physics source. Use them
  as source art for offline/cooked collision products when detail is actually
  needed.
- Large worlds should use streaming collision sectors or terrain chunks with a
  broadphase-friendly spatial partition.
- Gameplay-critical surfaces should have authored metadata: intent, channel,
  material, footstep surface, slope rules, nav tags, and traversal costs.
- Dynamic gameplay objects should prefer primitives or convex decomposition;
  static world terrain can use heightfield or triangle-mesh collision when
  cooked and validated.

For this portal field slice, the correct first step is a large explicit flat
solid collision proxy. The visual GLB can carry micro-displacement without
making player movement unstable. A later terrain contract can replace the proxy
with cooked terrain collision chunks when the engine has a durable import/cook
pipeline.

## Progress

- Intent documented.
- `PortalFieldTerrainContract` added to the contract register.
- The former deterministic one-off generator was retired; future regeneration
  must use generic terrain import/generation tooling.
- Generated GLB added at `public/assets/game/terrain/portal_field_moor.glb`.
- `portal_arena_floor` now renders the GLB field and keeps explicit box
  collision as the stable gameplay proxy.
- Portal arena movement bounds now stay inside the generated field's visible
  coverage.
- Runtime-scene validation now asserts the portal field asset, collider proxy,
  missing old floor material dependency, and movement bounds.
- Player-carried lighting foundation added: the stable portal player instance
  now has a warm point `Light`, and portal scene readiness requires that stable
  light ID.
- Focused terrain validation passes through `test:runtime-scene-contract`.
- Current app validation passes for `type-check`, `lint`, and build in later
  cleanup gates; historical unrelated blockers are no longer active.
