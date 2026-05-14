# Agent 13: Code Auditor And Refiner

## Mission

Audit and refine the terrain pipeline work from the other agents. Your job is
to keep the implementation aligned with the engine goal:

```txt
clean authoring contract
  -> reproducible bake/cook products
  -> explicit manifests
  -> validated runtime loading
  -> no orphan paths or one-off level hacks
```

You are not a feature-expansion agent. You are the integration reviewer who
removes accidental debt, catches architectural drift, and makes small cleanup
fixes where they are clearly safe.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/docs/terrain-asset-pipeline-audit.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_00_COORDINATION.md`
- All completed agent reports for Agents 07-12, if available.

## Review Priorities

Check for these problems first:

- generic runtime/editor code hard-codes level IDs such as `observatory`,
  `solitude`, or `yggdrasil`
- new duplicate bake/publish/editor command paths instead of one shared command
  registry or pipeline helper
- manually edited generated runtime JSON instead of generator fixes
- source GLB chunks claimed without real source GLB provenance
- heightmap fallback surfaces still active beside authoritative visual chunks
- validation weakened to make bad data pass
- stale generated terrain artifacts retained without documented ownership
- scripts added but not wired into publish, audit, or release gates
- editor UI added without clear status, disabled state, or error feedback
- large modules made larger when logic should have moved into existing helpers

## Ownership

You may inspect any terrain pipeline file. Likely review targets:

- `apps/game/src/threlte/features/terrain/**`
- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- `apps/game/src/threlte/editor/**`
- `apps/game/src/threlte/engine/**`
- `apps/game/scripts/*terrain*`
- `apps/game/scripts/lib/*terrain*`
- `apps/game/src/threlte/editor/scenes/*.scene.json`
- `apps/megameal/public/terrain/*.manifest.json`
- `apps/megameal/public/generated/runtime-game-assets/scenes/*.runtime-scene.json`

## Allowed Fixes

Make small, targeted fixes when they clearly improve architecture:

- delete unused helper code introduced by agents
- fold duplicate command wrappers into an existing terrain pipeline helper
- move level-specific behavior into scene data or manifests
- correct audit rules that are too weak or too noisy
- update docs when implementation and instructions drift
- regenerate runtime outputs using the approved cook command

## Escalate Instead Of Fixing

Do not personally undertake large feature work. Write a finding instead when a
fix would require:

- redesigning the editor shell
- replacing the GLB chunk cooker
- deleting large generated asset trees
- changing collision semantics
- migrating a level's art source
- broad runtime loader rewrites

## Non-Negotiable Rules

- Do not add new fallback systems.
- Do not silence audits unless the audit is wrong and you can prove it.
- Do not hand-edit generated runtime files as the primary fix.
- Do not special-case observatory in generic code.
- Do not delete user or agent changes unrelated to this terrain pipeline.

## Acceptance Criteria

Your final result should answer:

- Did the other agents reduce technical debt or add new parallel systems?
- Are bake, cook, validate, publish, and runtime loading connected through one
  terrain contract?
- Are generated files reproducible?
- Are editor controls clear enough for level authors?
- Are release gates strong enough to prevent regression?
- What remaining blockers need a new agent brief?

## Required Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
```

If terrain chunking or runtime bundle ownership changed, also run:

```bash
pnpm --dir apps/game audit:chunks
```

If editor UX changed and the smoke is available, run:

```bash
pnpm --dir apps/game editor-ux-smoke
```

If any command fails, report the exact failure and whether it is caused by the
terrain pipeline work or existing unrelated repo state.

## Final Report Format

Lead with findings, ordered by severity:

```txt
Findings
1. [severity] file:line - issue, risk, required fix
2. ...

Cleanup Performed
- files changed
- cruft removed
- generated outputs regenerated

Verification
- command: pass/fail

Remaining Work
- agent-ready follow-up items
```

If there are no findings, say that clearly and list residual risks.
