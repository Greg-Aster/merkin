# Agent 10: Runtime Manifest Recook And Drift

## Mission

Bring checked runtime scene manifests into the new NPC build-report contract
without hiding unrelated collision or budget debt.

The audit found that `runtimeSceneManifest.ts` now requires `npcActorCount` and
`fireflyNpcActorCount`, but some checked runtime scene manifests still lack
those fields. Because runtime loading validates manifests before activation,
this can break levels that were not touched by the firefly migration.

## Ownership

Primary files and generated outputs:

- `apps/game/src/threlte/engine/runtimeSceneManifest.ts`
- `apps/game/scripts/lib/runtimeSceneManifest.mjs`
- `apps/game/scripts/cook-runtime-assets.mjs`
- `apps/megameal/public/generated/runtime-game-assets/scenes/*.runtime-scene.json`
- `apps/megameal/public/generated/runtime-game-assets/manifest.json`
- `apps/megameal/public/generated/runtime-game-assets/manifest.previous.json`

Secondary files if needed:

- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/game/scripts/check-generated-drift.mjs`
- `apps/game/scripts/test-publish-pipeline.ts`

## Requirements

### Runtime Manifest Compatibility

Decide whether the project should:

1. recook all checked runtime scene manifests immediately, or
2. add a temporary manifest migration/default for missing NPC counters.

Preferred completion path is recooking all checked runtime scene manifests so
the contract is explicit everywhere. If that creates unrelated collision churn,
document the affected levels and do not hand-edit generated files.

If a temporary compatibility default is used, it must be:

- limited to runtime scenes with no `actor.npc` entries
- documented with owner and deletion condition
- rejected by final certification once all scenes are recooked

### Drift Separation

Separate the new NPC-counter drift from pre-existing collision drift:

- missing `npcActorCount` / `fireflyNpcActorCount` is NPC contract drift
- stale mesh-collision-manager v1 products are collision drift

Do not call the NPC-counter drift unrelated. It was introduced by the new
manifest contract and must be closed or deliberately migrated.

### Generated Files

Use owning scripts only:

```bash
pnpm --dir apps/game cook:runtime-assets
```

Or, for scoped investigation:

```bash
pnpm --dir apps/game cook:runtime-assets -- --level=<levelId>
```

Do not use manual JSON edits for generated runtime scenes or manifests.

## Acceptance Criteria

- All checked runtime scene manifests either include correct NPC counters or
  pass an explicit temporary compatibility path with a deletion condition.
- `validateRuntimeSceneManifest` does not fail solely because a non-NPC level
  lacks newly added NPC counters.
- `check:generated-drift` no longer reports missing NPC counter drift.
- Any remaining `check:generated-drift` failures are collision or budget issues
  listed by level and actor.
- Generated runtime manifest changes were produced by the cook script.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:runtime-assets
```

If `audit:runtime-assets` still fails on collision products, report exact
levels and actor groups. Do not weaken the audit.

## Handoff Notes

Report:

- whether all runtime scenes were recooked or a temporary default was added
- which generated files changed
- whether missing NPC counter drift is gone
- any remaining collision or budget drift by level

