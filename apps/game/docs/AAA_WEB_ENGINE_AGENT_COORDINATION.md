# AAA Web Engine Agent Coordination

## Purpose

Use this file to keep the next agent batch aligned on the current goal: make the
Threlte/Three.js static web game engine as close as practical to AAA-style
engine standards under browser constraints.

The priority is not maximum graphical ambition at any cost. The priority is:

- clean maintainable code
- explicit architecture boundaries
- editable levels that produce validated runtime output
- adaptive loading across mobile, desktop, and TV profiles
- reduced cruft, orphan code, and confusing overlapping systems

## Active Agent Files

Assign one agent to each file:

- `AAA_WEB_ENGINE_AGENT_01_BUNDLE_SIZE.md`
- `AAA_WEB_ENGINE_AGENT_02_EDITOR_PRODUCTION_UX.md`
- `AAA_WEB_ENGINE_AGENT_03_ARCHITECTURE_CLEANUP.md`
- `AAA_WEB_ENGINE_AGENT_04_PERFORMANCE_CERTIFICATION.md`
- `AAA_WEB_ENGINE_AGENT_05_ART_CONTENT_QUALITY.md`
- `AAA_WEB_ENGINE_AGENT_06_LEVEL_COUPLING_AUDIT.md`

Related existing target docs:

- `AAA_TARGET_06_BROWSER_CHUNK_BUDGET_REDUCTION.md`
- `AAA_TARGET_04_EDITOR_PRODUCTION_UX.md`
- `AAA_TARGET_02_RUNTIME_MODULE_CLEANUP.md`
- `AAA_TARGET_01_STRICT_PERFORMANCE_CERTIFICATION.md`
- `AAA_TARGET_03_PBR_CONTENT_BACKLOG_CLOSURE.md`
- `AAA_GRAPHICS_CONTENT_BACKLOG.md`

## Shared Rules

1. Read `apps/game/AGENTS.md` before editing game code, scene data, generated
   runtime assets, or game-facing assets under `apps/megameal/public`.
2. For core engine contract changes, follow
   `AAA_ENGINE_UPDATE_PROTOCOL.md`: maintain an impact map and update affected
   runtime, editor, generated data, diagnostics, and validation surfaces in a
   staged way.
3. Keep changes scoped to the assigned file and the impact map. If another
   agent owns the surface, document the dependency instead of editing through
   it.
4. Do not weaken budgets, gates, or audits to get a pass.
5. Do not hand-edit generated runtime JSON as the primary fix. Change source
   data or scripts, then regenerate through the owning command.
6. Do not couple runtime gameplay to editor-only code.
7. Do not introduce broad barrel imports that pull editor/debug code into the
   player runtime.
8. Do not add hardcoded level-id branches to generic engine/editor systems.
   Level-specific behavior belongs in scene data, registry metadata, capability
   flags, validation fixtures, or explicitly named authoring scripts.
9. Do not revert unrelated dirty work.
10. Prefer deleting dead paths over wrapping them in compatibility layers, but
   only after proving no live import or manifest reference remains.

## Coordination Order

Recommended order:

1. Agent 01 measures and reduces bundle/chunk issues.
2. Agent 03 cleans architecture boundaries that bundle work exposes.
3. Agent 02 improves editor UX using the cleaner ownership boundaries.
4. Agent 04 expands performance certification once loading boundaries are stable.
5. Agent 05 improves content quality after runtime loading and budgets are known.

Agents can work in parallel if they avoid overlapping write sets. Coordinate
before editing these shared files:

- `apps/game/astro.config.mjs`
- `apps/game/scripts/lib/chunkOwnership.mjs`
- `apps/game/src/threlte/Game.svelte`
- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- `apps/megameal/public/generated/runtime-game-assets/manifest.json`

## Required Validation Baseline

Every agent should run at least:

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game check:generated-drift
```

If runtime architecture, manifests, levels, assets, or generated outputs change:

```bash
pnpm --dir apps/game audit:engine
pnpm --dir apps/game release:gate:quick
```

If Megameal styles or frontend CSS surface area changes:

```bash
pnpm --dir apps/megameal audit:css
```

## Handoff Format

Each agent must report:

- assigned file addressed
- impact map for any core engine contract changed
- files changed
- source-of-truth data changed
- generated files changed and command used to regenerate them
- runtime payload, collision, and required-asset impact
- CSS surface area, if any
- commands run
- remaining risks or follow-up dependencies
