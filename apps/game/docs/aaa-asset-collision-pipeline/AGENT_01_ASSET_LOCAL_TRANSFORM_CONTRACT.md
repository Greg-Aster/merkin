# Agent 01: Asset-Local Transform Contract

## Goal

Define the engine contract that says how a source asset's visual mesh, collision
mesh, bounds, sockets, pivots, and runtime metadata share one local coordinate
space.

## Primary Ownership

- Type definitions for asset transform metadata.
- Shared helpers for serializing, validating, and applying asset-local matrices.
- Documentation comments that explain the contract.

Avoid editing generated Yggdrasil assets in this slice.

## Current Problem

Actor transforms are explicit, but asset-local transforms are implicit. The
engine can mount a visual GLB and a collider GLB under the same actor group while
still letting them disagree because their internal roots, pivots, or normalized
bounds are not represented as a first-class contract.

## Required Work

1. Find the existing runtime asset, scene, and collision metadata types.
2. Add a small typed structure for asset-local transform metadata. It should
   support at least:
   - source asset URL
   - source node or mesh name when available
   - visual local bounds
   - collider local bounds
   - visual-to-physics local matrix or equivalent TRS
   - coordinate-space version
3. Add helper functions to:
   - create identity transform metadata
   - validate finite matrix/TRS values
   - compare visual and collider bounds with a tolerance
   - apply the transform to Three objects or collider vertices without duplicating
     math in unrelated components
4. Document the rule: actor transform places an instance in the world; asset-local
   metadata aligns the cooked products inside that actor.
5. Keep the schema backward-compatible for existing assets that have no metadata
   yet. Missing metadata should be diagnosable, not fatal for every legacy asset.

## Guardrails

- Do not encode Yggdrasil-specific behavior.
- Do not add separate transform conventions for visual and physics.
- Do not hide a bad asset by silently recentering collision at runtime.
- Do not add a broad new manifest system if the existing runtime metadata can
  carry the contract.

## Acceptance Criteria

- There is one exported type or interface for asset-local alignment metadata.
- Existing code can identify whether an asset has no metadata, identity metadata,
  or non-identity metadata.
- Bounds comparison logic is testable without mounting a Threlte scene.
- The contract is documented in code or adjacent docs.

## Suggested Verification

```bash
pnpm --dir apps/game type-check
```

If tests exist near the chosen helper module, add or update focused tests for
finite values and bounds comparison.

## Handoff Notes

Report:

- exact contract fields
- where backward compatibility is handled
- any metadata fields that Agent 02 must write
- any helper Agent 03 should use at runtime
