# Agent 11: Editor Budget And Profile Validation

## Mission

Clean up the remaining editor/reporting and validation ownership issues from
the NPC audit.

## Ownership

Primary files:

- `apps/game/src/threlte/editor/EditorPerformanceTabHost.svelte`
- `apps/game/src/threlte/engine/levelContracts.ts`
- `apps/game/src/threlte/engine/levelContractsCore.mjs`
- `apps/game/src/threlte/engine/npcValidationCore.mjs`
- `apps/game/src/threlte/engine/npcValidation.ts`
- `apps/game/src/threlte/features/conversation/characters/CharacterRegistry.ts`
- `apps/game/src/threlte/features/conversation/characters/index.ts`
- `apps/game/src/threlte/editor/editorNpcControls.ts`

Secondary files if needed:

- `apps/game/src/threlte/engine/types.ts`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/game/scripts/test-publish-pipeline.ts`

## Requirements

### Editor Firefly Budget Reporting

The editor performance panel must report the active authored firefly NPC count,
not the retired gameplay firefly count.

Expected behavior:

- label can remain `Fireflies`
- value uses `buildReport.fireflyNpcActorCount`
- budget uses `runtimeContract.maxFireflyNpcCount`
- legacy `gameplayFireflyActorCount` can be shown only as a separate legacy
  diagnostic, and only if non-zero

Do not leave the primary UI reporting zero fireflies when the level has NPC
fireflies.

### Contract Naming Cleanup

Review `maxGameplayFireflyCount` and `maxFireflyNpcCount`.

Preferred final state:

- `maxFireflyNpcCount` owns authored NPC firefly budget.
- `maxGameplayFireflyCount` is removed from active UI and validation paths, or
  explicitly retained only for migration tests with a deletion condition.

Do not leave both names as equal active concepts in user-facing surfaces.

### Conversation Profile Validation

The character registry discovers character definition files dynamically. NPC
validation currently has a hard-coded list of known profile ids. That creates a
two-source-of-truth problem.

Choose one durable source:

- Generate/export known profile ids from the character registry in a way usable
  by validation and tests.
- Or move profile id authority to a shared manifest that both the registry and
  validation consume.

Do not keep a manual list in `npcValidationCore.mjs` that must be updated
separately from `features/conversation/characters/definitions/*.ts`.

Keep alias normalization if needed, but keep aliases separate from canonical
profile discovery.

## Acceptance Criteria

- Editor performance panel reports NPC firefly counts and NPC firefly budget.
- No active editor UI depends on legacy gameplay firefly count.
- NPC profile validation uses a shared/discovered canonical profile list.
- Adding a new character definition file does not require editing
  `npcValidationCore.mjs` just to pass validation.
- Publish-pipeline tests cover valid and invalid profile ids after the change.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec biome check src/threlte/editor/EditorPerformanceTabHost.svelte src/threlte/engine/npcValidation.ts src/threlte/engine/npcValidationCore.mjs src/threlte/features/conversation/characters src/threlte/editor/editorNpcControls.ts
pnpm --dir apps/game test:publish-pipeline
```

If editor UI changed, run browser smoke when feasible:

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

## Handoff Notes

Report:

- how firefly budget is now displayed
- whether `maxGameplayFireflyCount` remains anywhere and why
- the final source of truth for known conversation profile ids
- any remaining legacy names retained for migration tests

