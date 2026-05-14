# Agent 06: Integration Gate

## Goal

Integrate the asset/collision pipeline work and prove that the engine now has a
reliable AAA-style contract for render/collision alignment.

## Primary Ownership

- final schema consistency
- generated artifact review
- validation command matrix
- docs updates
- regression checks for Yggdrasil and at least one other level with authored
  asset collision

## Required Work

1. Confirm Agents 01-04 agree on field names and transform direction.
2. Confirm runtime applies asset-local alignment exactly once.
3. Confirm debug overlays match actual colliders.
4. Confirm Yggdrasil content repair came from bake/import outputs, not one-off
   runtime or scene offsets.
5. Run validation commands and record results.
6. Update this packet if any agent brief became stale during implementation.
7. Add follow-up tasks only for work that is not required to close the current
   collision drift failure.

## Review Checklist

- Asset-local metadata exists and is typed.
- Collider metadata records visual and collider bounds.
- Stale source assets are detectable.
- Publish readiness flags render/collision drift.
- Required gameplay collision blocks publish when invalid.
- Visual-only assets have explicit non-blocking treatment.
- No generic runtime code special-cases `yggdrasil`.
- Generated assets were regenerated once from the final integrated source state.

## Suggested Verification

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
pnpm --dir apps/game release:gate:quick
```

If any command is unavailable or fails for unrelated existing reasons, capture
the exact failure and state the remaining risk.

## Handoff Notes

Report:

- final command results
- generated files included
- runtime payload impact
- collision readiness impact
- any levels or asset families still using legacy metadata
