# AAA Parallel Agent Coordination

Use this file while the six AAA gap agents are working in parallel. The goal is to prevent conflicting edits, hidden regressions, and noisy generated-output churn.

When the six gap agents are ready to unify their work, use `AAA_INTEGRATION_AGENT_INSTRUCTIONS.md` as the integration-agent handoff.

## Integration Lead Rules

One person or agent should act as integration lead. The integration lead owns:

- Merge order.
- Generated manifest regeneration.
- Final `CRUFT_TODO.md` and `AAA_GRAPHICS_REFACTOR_TRACKER.md` updates.
- Final validation command run.
- Resolving conflicts in shared engine contracts.

Individual agents should avoid broad cleanup outside their assigned gap.

## Current Gap Agents

| Gap | Brief | Primary Risk | Integration Status |
| --- | --- | --- | --- |
| 01 | `AAA_GAP_01_PREFAB_MIGRATION.md` | Conflicts with VFX descriptor work in prefab catalog/runtime node files. | Integrated: all deployed prefabs are baked assets or variant assets; `proceduralContracts=0`. |
| 02 | `AAA_GAP_02_PBR_MATERIALS.md` | Generated asset/manifest churn; possible texture budget regression. | Integrated engine-side: material backlog regenerated with `missingRecommendedSlots=443`, `unapprovedRecommendedSlots=0`; authored PBR work remains content backlog. |
| 03 | `AAA_GAP_03_LOD_RETOPOLOGY.md` | Cooked variant churn; possible bounds or placement regression. | Integrated: `lodTargetMisses=0`; visual smoke passed for representative levels. |
| 04 | `AAA_GAP_04_VFX_DESCRIPTOR_SYSTEM.md` | Shared engine contract changes; must land before VFX-heavy prefab migrations. | Integrated: VFX descriptors validate baked source mesh targets; `assetVfx=3`. |
| 05 | `AAA_GAP_05_LIGHTING_POSTFX_REFLECTIONS.md` | Scene schema, visual baselines, and performance budget changes. | Integrated: runtime scene audit reports render profiles present; visual smoke passed. |
| 06 | `AAA_GAP_06_EDITOR_PIPELINE_UX.md` | Editor component overlap and possible duplicate readiness calculations. | Integrated: publish-readiness plumbing validates against cooked manifest/audit data; editor boot smoke passed for both editor URLs. |

## Monitor Snapshot

Last monitor snapshot: 2026-05-10.

Final checks from the integrated worktree:

- `pnpm --dir apps/game type-check`: passing
- `pnpm --dir apps/game lint`: passing
- `pnpm --dir apps/game audit:runtime-prefabs`: passing with `prefabs=22`, `proceduralContracts=0`, `assetAnimations=4`, `assetVfx=3`, `payload=1042.4KB`
- `pnpm --dir apps/game audit:engine`: passing with `lodTargetMisses=0`, `missingRecommendedSlots=443`, `unapprovedRecommendedSlots=0`, and runtime scene render profiles present
- `pnpm --dir apps/game smoke:engine`: passing
- `GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot`: passing
- `GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:visual`: passing

Process note:

- The integration lead regenerated prefab assets, cooked runtime manifests, the impostor atlas, and `AAA_GRAPHICS_CONTENT_BACKLOG.md` from the final source state.

## File Ownership Map

| File Area | Preferred Owner | Notes |
| --- | --- | --- |
| `runtimePrefabTypes.ts` | Gap 04 | Gap 01 should not redefine VFX contracts independently. |
| `runtimePrefabCatalog.json` | Gap 01 / Gap 04 | Gap 04 owns schema additions; Gap 01 owns migrated prefab entries after schema lands. |
| `RuntimePrefabNode.svelte` | Gap 04 | Gap 01 should keep runtime node edits minimal unless only using existing animation descriptor support. |
| `bake-runtime-prefabs.mjs` | Gap 01 / Gap 04 | Gap 04 owns VFX audit extensions; Gap 01 owns bake-plan entries. |
| Runtime generated manifests | Integration lead | Agents may run cooks locally, but final generated manifests should be regenerated once after integration. |
| `AAA_GRAPHICS_CONTENT_BACKLOG.md` | Integration lead | Regenerate after final cook, not from every partial patch. |
| `AAA_GRAPHICS_REFACTOR_TRACKER.md` | Integration lead | Avoid six agents editing the same log concurrently. |
| `CRUFT_TODO.md` | Integration lead | Individual agents can propose checklist changes in handoff notes. |
| Editor Svelte files | Gap 06 | Other agents should not alter editor UX except for typed data plumbing. |
| Lighting/profile schema | Gap 05 | Other agents should not add separate render-profile concepts. |
| Asset material/source files | Gap 02 | Must preserve provenance and runtime budgets. |
| LOD/cooked variant logic | Gap 03 | Must not loosen audit thresholds as a shortcut. |

## Recommended Merge Order

1. Gap 04 core VFX descriptor contract.
   - Lands shared types, catalog shape, audit validation, and runtime adapter.
   - Does not need to migrate every prefab in the same patch.

2. Gap 01 `growth-planter` migration.
   - Can land before full portal/fountain/console VFX migration if it uses existing node transform descriptors.

3. Gap 01 VFX-heavy prefab migrations.
   - `courtyard-fountain`, `portal-apparatus`, and `command-console` should land after Gap 04.

4. Gap 03 LOD/retopology.
   - Integrate before final visual smoke if it changes Yggdrasil geometry, bounds, or budgets.

5. Gap 02 PBR material pass.
   - Integrate after major geometry changes to reduce repeated cooking.

6. Gap 05 lighting/post/reflection.
   - Integrate after geometry/material changes if it includes updated visual baselines.

7. Gap 06 editor UX.
   - Integrate last if it displays final readiness categories from the manifest and audit data.

This order can change if an agent returns a small independent patch, but Gap 04 should precede VFX-heavy prefab migration.

## Agent Handoff Requirements

Each agent should report:

- Files changed.
- Generated files changed.
- Commands run.
- Commands not run and why.
- Runtime payload impact.
- Collision/readiness impact.
- Budget impact.
- Remaining risks.
- Whether they touched `CRUFT_TODO.md`, `AAA_GRAPHICS_REFACTOR_TRACKER.md`, or generated manifests.

Agents should prefer handing off proposed tracker/TODO text instead of editing shared tracker files during parallel work.

## Integration Review Checklist

For each returned patch:

- [ ] Read the patch before running commands.
- [ ] Check for unrelated edits.
- [ ] Confirm no retired runtime fallback path was reintroduced.
- [ ] Confirm source assets and runtime assets remain separate.
- [ ] Confirm budgets were measured, not guessed.
- [ ] Confirm generated manifests were either intentionally updated or left for final integration.
- [ ] Run the smallest relevant audit first.
- [ ] Only then run broader smoke checks.

## Monitoring Commands

Use these to watch integration health without changing files:

```bash
git status --short apps/game apps/megameal/public/generated/runtime-game-assets
pnpm --dir apps/game audit:runtime-prefabs
pnpm --dir apps/game audit:engine
pnpm --dir apps/game type-check
```

After integrating generated asset or scene changes:

```bash
pnpm --dir apps/game bake:runtime-prefabs
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game report:graphics-backlog:write
pnpm --dir apps/game audit:engine
GAME_DEV_PORT=4324 pnpm --dir apps/game smoke:boot
```

For rendering/profile changes:

```bash
pnpm --dir apps/game smoke:visual
pnpm --dir apps/game smoke:engine
```

## Conflict Rules

- If two agents change the same type or schema, prefer the narrower explicit contract and make the second patch adapt to it.
- If two agents regenerate manifests, discard both generated outputs and regenerate once after source integration.
- If a patch raises a budget, require the measured audit line that forced the change.
- If a patch loosens an audit, require a clear reason and a replacement validation path.
- If a patch adds a one-off level branch, reject it unless the branch is an explicit temporary adapter with a removal note.

## Final Integration Done Means

- `runtimePrefabCatalog.json` has no unplanned procedural runtime contracts.
- `AAA_GRAPHICS_CONTENT_BACKLOG.md` matches the latest cooked manifest.
- `AAA_GRAPHICS_REFACTOR_TRACKER.md` and `CRUFT_TODO.md` reflect the integrated state.
- `pnpm --dir apps/game type-check` passes.
- `pnpm --dir apps/game audit:engine` passes.
- `pnpm --dir apps/game smoke:engine` passes.
- `GAME_DEV_PORT=4324 pnpm --dir apps/game smoke:boot` passes.
- Any visual/profile work also passes `pnpm --dir apps/game smoke:visual` or clearly documents why it could not run.
