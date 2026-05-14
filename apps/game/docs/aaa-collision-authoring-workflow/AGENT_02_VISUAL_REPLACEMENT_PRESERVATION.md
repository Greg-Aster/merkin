# Agent 02 - Visual Replacement And Collision Preservation

## Mission

Make every visual replacement path preserve authored collision unless the user
explicitly changes collision.

## Current State

- `convertSelectedNodeToMesh()` in `editorAssetController.ts` preserves
  collision while converting a primitive or prefab to an asset.
- `applyCollisionLifecycleToPatch(...)` avoids overwriting existing collision
  when render fields change.
- `applyGeneratedAssetToSelection()` patches kind/asset/prefab/primitive and
  relies on patch application/lifecycle behavior.
- `applyGeneratedVariantToSelectedNode(...)` fits generated variants and patches
  the selected asset.
- The asset replacement picker currently targets asset nodes, not primitive
  blockout nodes.

## Required Contract

All replacement paths must follow the same rules:

1. Existing authored collision is preserved exactly by default.
2. Existing disabled collision remains disabled.
3. Existing visual-only role remains visual-only.
4. Primitive replacement may bake visual scale into the mesh, but collision
   world size must remain equivalent.
5. Mesh collision baking is a separate explicit command.
6. Replacement never changes a simple collider to trimesh automatically.

## Implementation Scope

- Audit all replacement functions:
  - `convertSelectedNodeToMesh`
  - `applyGeneratedAssetToSelection`
  - `applyGeneratedVariantToSelectedNode`
  - asset picker replacement
  - AI mesh replacement flow
- Centralize preservation into a small helper if it removes duplication.
- Keep the helper narrow and typed. Do not create a broad compatibility adapter.
- Add user-facing status messages that say collision was preserved.

## Tests

Add or update tests that prove:

- Primitive with cuboid blocker replaced by asset keeps cuboid blocker.
- Primitive with walkable collision replaced by asset stays walkable.
- Disabled collision remains disabled after replacement.
- Visual-only actor remains visual-only after replacement.
- Generated AI replacement follows the same rules as manual replacement.

## Out Of Scope

- Do not change publish readiness gates.
- Do not bake mesh colliders automatically.
- Do not infer collision from generated mesh bounds unless the user runs a fit
  command.

