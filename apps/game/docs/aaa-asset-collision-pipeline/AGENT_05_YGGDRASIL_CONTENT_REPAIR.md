# Agent 05: Yggdrasil Content Repair

## Goal

Use the improved pipeline to repair Yggdrasil assets whose visual and collision
meshes are misaligned, starting with Root Mound and then scanning nearby authored
asset colliders.

## Primary Ownership

- `apps/game/src/threlte/editor/scenes/yggdrasil.scene.json`
- Yggdrasil collider generated outputs, if regeneration is required
- Yggdrasil runtime scene generated output, if regeneration is required
- focused visual/collision smoke evidence

Wait for Agents 01-04 before broad regeneration.

## Current Problem

`yggdrasil-mound` has a visual asset and a cooked collider asset under the same
actor transform, but the collider can appear below the visual mesh. The scene
should not be repaired by nudging the actor or adding an invisible offset that
only fixes one viewport. The content should be repaired through source asset,
collider bake, metadata, and validation.

## Required Work

1. Inventory Yggdrasil asset actors with enabled collision.
2. Identify assets where visual bounds and collider bounds drift beyond the new
   tolerance.
3. Regenerate collider metadata and collider assets through the bake pipeline for
   affected nodes.
4. If the source visual asset has a bad origin, either:
   - fix the source/import contract, or
   - record an explicit asset-local alignment transform in metadata.
5. Regenerate the runtime scene manifest only through the approved scene/runtime
   build path.
6. Verify the collision overlay against the visual mesh in editor/runtime.

## Guardrails

- Do not add `if levelId === 'yggdrasil'` to runtime code.
- Do not solve Root Mound by changing actor Y unless the visual placement itself
  is wrong.
- Do not hand-edit collider metadata that should come from the bake script.
- Do not make decorative detail collision block the player.

## Acceptance Criteria

- Root Mound visual and collision overlays align in asset-local and world space.
- Other Yggdrasil collision actors are inventoried with pass/fail status.
- Any regenerated collider metadata uses the new contract.
- Publish readiness has no blocker for required Yggdrasil collision alignment.

## Suggested Verification

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game bake:scene-mesh-colliders -- --level=yggdrasil
```

Run any available runtime scene or release gate command that validates generated
scene/collision outputs. If the broad bake creates unrelated churn, stop and
coordinate with Agent 06 before committing generated files.

## Handoff Notes

Report:

- assets scanned
- assets regenerated
- generated files changed
- remaining Yggdrasil visual-only or legacy collider exceptions
- screenshots or smoke evidence if available
