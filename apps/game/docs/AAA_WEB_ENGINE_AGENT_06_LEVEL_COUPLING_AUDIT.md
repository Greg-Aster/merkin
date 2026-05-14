# AAA Web Engine Agent 06 - Level Coupling Audit

## Goal

Remove brittle level-specific branches from generic engine/editor code. The game
engine should support new or frequently changing levels by reading capabilities
from data, not by adding targeted code fixes for each level.

## Current Concern

Searches still reveal direct references to level ids and node ids in generic
modules. Some are acceptable content fixtures, but generic runtime/editor systems
should not depend on hardcoded names such as `observatory`, `solitude`, or
`yggdrasil`.

## Primary Files

- `apps/game/src/threlte/Game.svelte`
- `apps/game/src/threlte/GameCanvasStage.svelte`
- `apps/game/src/threlte/core/GameWorld.svelte`
- `apps/game/src/threlte/ui/RoomJoinOverlay.svelte`
- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/EditorEnvironmentPanel.svelte`
- `apps/game/src/threlte/editor/EditorNodeRenderContent.svelte`
- `apps/game/src/threlte/editor/editorGeneration.ts`
- `apps/game/src/threlte/editor/editorStyleBatchSelection.ts`
- `apps/game/src/threlte/editor/editorLevelSetup.ts`
- `apps/game/scripts/lib/runtimeSceneManifest.mjs`
- `apps/game/scripts/audit-engine-architecture.mjs`

## Read First

- `apps/game/AGENTS.md`
- `apps/game/ENGINE_ARCHITECTURE.md`
- `apps/game/AAA_WEB_ENGINE_AGENT_COORDINATION.md`

## Work Steps

1. Audit direct level references:

```bash
rg -n "\\b(miranda|observatory|sci-fi-room|solitude|yggdrasil|world-tree)\\b" apps/game/src apps/game/scripts -g '*.{ts,js,mjs,cjs,svelte,json}'
```

2. Classify each hit:
   - allowed source data: registry, scene JSON, manifests
   - allowed content script: file is explicitly level/asset-specific
   - allowed test/fixture: visual smoke or migration fixture
   - suspect generic code: runtime/editor/loading/performance logic
3. For suspect generic code, replace level checks with one of:
   - level registry metadata
   - `settings.level` scene data
   - runtime manifest capability or budget data
   - node metadata/material/render policy
   - a named migration adapter isolated to legacy conversion
4. Avoid compatibility wrappers that keep the hardcoded branch alive.
5. If a level-specific behavior is truly content-specific, move it into scene
   data or a clearly named content module.
6. Add or update validation so the generic capability is required where needed.

## Guardrails

- Do not edit generated runtime JSON as the source of truth.
- Do not move scene-specific art direction into the player runtime.
- Do not break existing legacy migration unless the migration is no longer
  needed and you prove it.
- Do not treat visual smoke fixtures as engine code; fixtures may reference
  level ids.
- Do not remove default-level behavior. Route it through `DEFAULT_LEVEL_ID` and
  registry metadata.

## Acceptance Criteria

- At least one generic hardcoded level branch is removed.
- Any remaining direct level ids in edited files are justified as data,
  fixtures, migrations, or content-specific authoring.
- New-level behavior comes from data or capabilities.
- Existing levels still boot and validate.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:engine
```

If runtime flow changes:

```bash
pnpm --dir apps/game release:gate:quick
```

## Handoff

Report:

- direct level references removed
- remaining references and why they are acceptable
- data/capability source introduced
- files changed
- commands run
- remaining level-coupling risks

