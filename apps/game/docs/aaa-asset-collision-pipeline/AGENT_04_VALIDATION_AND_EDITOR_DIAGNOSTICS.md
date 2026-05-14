# Agent 04: Validation And Editor Diagnostics

## Goal

Make render/collision drift visible before runtime play. The editor and publish
readiness checks should identify missing collider metadata, stale collider bakes,
and visual/collider bounds mismatches.

## Primary Ownership

- `editorPublishReadiness.ts`
- editor collision/scene diagnostic surfaces
- any existing audit script that validates runtime scene or collision data
- focused validation tests or fixtures

## Current Problem

The editor can show that an actor has collision, but it does not yet enforce that
the cooked collider matches the visual asset's local bounds and source
provenance. That lets a level publish with collision that is present but
misaligned.

## Required Work

1. Add validation for asset actors with enabled collision:
   - missing collider URL
   - missing collider metadata URL
   - missing asset-local metadata
   - stale source asset URL or fingerprint
   - visual/collider bounds drift beyond tolerance
   - excessive collider triangles for the actor's intent
2. Surface the result in publish readiness with actionable commands.
3. Add editor diagnostics where collision is inspected so authors can see whether
   an asset is:
   - valid
   - legacy metadata
   - stale
   - bounds drift
   - missing required collision
4. Keep visual-only assets valid when they are explicitly marked visual-only.
5. Make warnings and blockers distinct. Gameplay blockers, walkables, and spawn
   support surfaces should block publish when invalid.

## Guardrails

- Do not turn every decorative visual mismatch into a hard blocker.
- Do not let required blocker/walkable collision pass as a warning.
- Do not rely on object names or level ids to choose severity.
- Do not duplicate validation logic between editor UI and publish readiness; use
  shared helpers where practical.

## Acceptance Criteria

- Publish readiness can flag Root Mound-style drift.
- Editor diagnostics explain which bake command or asset action is needed.
- Required collision failures are blockers.
- Visual-only assets have an explicit path to pass validation.

## Suggested Verification

```bash
pnpm --dir apps/game type-check
```

If there is an engine audit command for the touched validation surface, run it
and report the result. If none exists, call that out and recommend the missing
audit entry.

## Handoff Notes

Report:

- validation categories added
- publish readiness behavior for legacy assets
- diagnostics UI surfaces touched
- any remaining blind spots
