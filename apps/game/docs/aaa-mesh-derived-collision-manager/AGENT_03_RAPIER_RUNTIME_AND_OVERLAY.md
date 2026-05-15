# Agent 03: Rapier Runtime And Overlay

## Goal

Make edit mode, playtest mode, and gameplay use the same Collision
Manager-generated Rapier state. The overlay must show actual Rapier colliders
only.

## Ownership

Primary write scope:

- `src/threlte/collision/*`
- Rapier integration components
- editor/playtest collision mounting boundary
- overlay component

Coordinate before editing:

- manager API with Agent 02
- editor controls with Agent 04
- runtime manifest consumption with Agent 05
- deletion of old overlays with Agent 06

## Required Runtime Rule

No component should independently infer collision from scene node data. The path
must be:

```txt
actor source -> Collision Manager product -> Rapier collider
```

Runtime may consume baked manager products from a manifest. Editor/playtest may
consume live manager products. Both paths must use the same product adapter.

## Overlay Rule

The collision overlay is not a scene overlay. It is Rapier state.

Allowed:

- `world.debugRender()`
- direct Rapier collider/shape inspection
- diagnostics derived from the manager state plus Rapier handles

Not allowed:

- drawing from authored `collision.size`
- drawing from stale scene collider metadata
- drawing from visual mesh bounds and calling it collision
- independent helper meshes that do not correspond to Rapier colliders

## Component Work

Replace or rewrite:

- old helper overlays
- old collision body overlay components
- old editor-only fake collision renderers
- runtime/editor split paths that create different physics for the same actor

Keep only components that consume manager products.

## Transform Semantics

- Actor transform applies to render and collision consistently.
- Position/rotation changes update Rapier body/collider transform immediately.
- Scale changes must produce a corresponding live collision update through the
  manager.
- Mesh changes must destroy the old collider and mount the new one after
  generation.

## Acceptance Criteria

- In edit mode, enabling collision overlay shows exactly what Rapier sees.
- In playtest mode, the player collides with the same shapes visible in edit
  overlay before entering playtest.
- In gameplay, the same runtime adapter path is used.
- Applying a variant cannot leave the old collider mounted.
- Applying a variant cannot render an overlay from stale source data.
- Removed components have no live imports.

## Tests / Verification

- Unit tests for manager-product-to-Rapier args.
- Component smoke test or Playwright check for overlay nonblank after colliders
  exist.
- Manual Yggdrasil check: world tree/root variant change regenerates visible
  Rapier overlay aligned to the mesh.
- Search confirms old fake overlay components are deleted or unused.
