# Agent 13: Generated Product Artifact And Shape Verification

## Current Blocker

Runtime scene manifests now contain `generatedProduct` entries, but many products
appear as `shape: "cuboid"` with unit-ish local bounds. That may be valid for
some primitive products, but it is not acceptable as a silent placeholder for
mesh-derived collision on complex assets.

The new system cannot claim mesh-derived collision while publishing fallback
cuboids for roots, mounds, trees, or imported meshes unless that is an explicit
manager policy selected by the user.

## Goal

Ensure generated products represent real mesh-derived collision products or
explicit manager-approved primitive products. Prevent placeholder products from
being mounted, overlaid, or published as if they were valid mesh collision.

## Ownership

Primary write scope:

- generated collision product creation/validation
- `scripts/lib/meshCollisionProducts.mjs`
- `scripts/bake-mesh-collider.mjs`
- `scripts/bake-scene-mesh-colliders.mjs`
- runtime manifest validation for generated products
- focused product validation tests

Coordinate with:

- Agent 10 and Agent 11 for product shapes consumed by Rapier adapters.
- Agent 05 for publish gate behavior.
- Agent 08 for level-specific product failures.

## Product Rules

For mesh assets with `quality: simplifiedMesh`, `convexHull`, or `trimesh`:

- product must have an artifact URL or valid generated mesh descriptor.
- product bounds must match generated artifact metadata.
- product shape must match the mount strategy.
- product triangle/vertex count must be recorded when applicable.
- source, policy, and transform fingerprints must match current data.

For primitive products with `quality: primitive`:

- product may be shape-backed.
- product local bounds must reflect primitive args and transform policy.
- product must not masquerade as a mesh-derived simplified product.

For disabled products:

- no live product.
- no publish product.

## Required Validation Failures

Validation must fail when:

- mesh-derived policy creates a placeholder cuboid without explicit primitive
  policy.
- artifact-backed product is missing `artifactUrl`.
- artifact metadata bounds do not match product bounds.
- product shape does not match policy quality.
- source mesh fingerprint is stale.
- transform fingerprint is stale.
- policy fingerprint is stale.

## Yggdrasil Checks

Inspect at minimum:

- `yggdrasil-tree-merged`
- `yggdrasil-mound`
- `yggdrasil-root-east`
- `yggdrasil-root-west`
- `yggdrasil-root-north`
- `yggdrasil-root-south`
- `yggdrasil-root-northeast`
- `yggdrasil-root-northwest`
- `yggdrasil-root-southeast`
- `yggdrasil-root-southwest`

These should not silently publish unit cuboids if policy says
`simplifiedMesh`.

## Acceptance Criteria

- Generated products for complex meshes are artifact-backed or fail validation.
- Runtime product adapter can trust `generatedProduct` without guessing.
- Publish fails placeholder mesh-derived products.
- Yggdrasil root/mound/tree collision products have real artifact provenance.
- Overlay shape reflects product reality.

## Required Commands

```bash
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game exec tsx ./scripts/test-collision-manager.ts
pnpm --dir apps/game cook:runtime-assets
```

If `cook:runtime-assets` fails graphics budgets only, report that separately.
Collision product validation failures are blockers.
