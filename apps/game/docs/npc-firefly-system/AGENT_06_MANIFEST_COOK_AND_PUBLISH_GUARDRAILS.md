# Agent 06: Manifest Cook And Publish Guardrails

## Mission

Make NPCs a real manifest/publish contract. Runtime cook, publish readiness,
scene architecture audits, and generated drift checks must understand NPCs and
reject invalid data before gameplay.

## Ownership

Primary files:

- `apps/game/scripts/lib/runtimeSceneManifest.mjs`
- `apps/game/scripts/lib/sceneArchitectureAudit.mjs`
- `apps/game/src/threlte/engine/levelValidation.ts`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/game/src/threlte/editor/editorPublishBakePlan.ts`
- `apps/game/scripts/test-publish-pipeline.ts`

Secondary files if needed:

- `apps/game/scripts/cook-runtime-assets.mjs`
- `apps/game/scripts/check-generated-drift.mjs`
- `apps/game/src/threlte/engine/levelContractsCore.mjs`
- `apps/game/src/threlte/engine/levelRuntimeReadinessContractCore.mjs`

## Requirements

Add manifest and publish checks for:

- duplicate NPC ids per level
- invalid NPC archetypes
- unsupported interaction modes
- invalid firefly presentation budgets
- missing read-only body text
- missing or unknown conversation profile ids
- authored firefly NPC count over level budget
- legacy firefly gameplay data after migration cutoff

The runtime scene build report should include NPC counts and firefly NPC counts.
Publish readiness should point to the exact actor id and field causing the
problem.

Do not weaken existing collision, terrain, style-bake, asset, or generated
drift checks to make NPC work pass.

## Acceptance Criteria

- Runtime scene JSON includes NPC data in the same shape runtime consumes.
- Build report includes NPC diagnostics.
- Publish-pipeline tests cover valid and invalid NPC/firefly cases.
- Invalid NPC data fails or warns consistently in source validation and runtime
  manifest validation.
- Observatory recooks cleanly with NPC fireflies.
- No generated file is hand-edited.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game cook:runtime-assets -- --level=observatory
```

If this packet changes global generated manifest behavior, also run:

```bash
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:runtime-assets
```

If those fail on unrelated existing drift, report the exact level/files and do
not bury the failure.

## Handoff Notes

Report which NPC problems are errors versus warnings, and the planned cutoff
for turning any migration warnings into errors.

