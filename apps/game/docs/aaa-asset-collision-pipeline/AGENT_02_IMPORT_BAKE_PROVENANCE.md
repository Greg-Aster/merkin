# Agent 02: Import And Collider Bake Provenance

## Goal

Update the collider bake pipeline so cooked collider artifacts record the source
asset, source bounds, collider bounds, and asset-local alignment metadata needed
by runtime and validation.

## Primary Ownership

- `apps/game/scripts/bake-mesh-collider.mjs`
- `apps/game/scripts/bake-scene-mesh-colliders.mjs`
- collider `.meta.json` shape
- bake documentation

Coordinate field names with Agent 01 before landing.

## Current Problem

The bake pipeline writes collider GLBs and metadata, but the metadata mostly
describes the collider artifact itself. It does not establish the visual/collider
local-space relationship strongly enough for runtime diagnostics or publish
validation. For Root Mound, the collider metadata says the collider is centered
near local origin, but it does not prove that this matches the mounted visual
product.

## Required Work

1. During bake, load the source visual asset and compute visual local bounds from
   the exact asset URL used by the scene node.
2. Compute collider local bounds from the cooked collider output.
3. Write the Agent 01 transform metadata into the collider metadata file.
4. Record provenance:
   - source actor id
   - source asset URL
   - source asset content fingerprint if practical
   - bake command/config
   - triangle budget and resulting triangle count
   - generated timestamp
5. Make stale colliders detectable when the source asset URL or fingerprint no
   longer matches.
6. Update `apps/game/docs/collision-mesh-collider-bake.md` to describe the new
   metadata contract.

## Guardrails

- Do not apply actor world transforms when baking an asset-local collider.
- Do not mutate source visual assets.
- Do not hand-edit generated metadata; regenerate it from the bake script.
- Do not make missing fingerprint support block the whole change if URL and
  bounds metadata can land first.

## Acceptance Criteria

- Collider metadata includes both visual and collider local bounds.
- Collider metadata can tell whether the collider was baked for the current
  source asset.
- Batch bake writes the same metadata shape as single-asset bake.
- Existing colliders without the new metadata remain loadable but are flagged as
  legacy by validation.

## Suggested Verification

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game bake:mesh-collider -- --help
```

Run a targeted bake against one non-critical fixture or one explicitly assigned
asset if the command supports it. Do not regenerate all generated assets unless
the integration lead asks for it.

## Handoff Notes

Report:

- metadata fields added
- whether any generated collider files changed
- how stale source assets are detected
- any asset families that still need regeneration
