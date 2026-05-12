# AAA Web Engine Agent 05 - Art And Content Quality Pass

## Goal

Move scene content from pipeline-ready toward final-content-ready. The engine can
support AAA-style authored content practices, but each scene still needs
deliberate art direction, materials, lighting, collision validation, and runtime
budget discipline.

## Current Concern

The pipeline supports authored materials, runtime assets, LODs, impostors,
terrain collision, and manifests. The content itself still needs passes that
replace fallback or rough assets with intentional authored output.

## Primary Files

- `apps/game/AAA_GRAPHICS_CONTENT_BACKLOG.md`
- `apps/game/AAA_TARGET_03_PBR_CONTENT_BACKLOG_CLOSURE.md`
- `apps/game/src/threlte/editor/scenes/*.scene.json`
- `apps/game/src/threlte/materials/**`
- `apps/game/src/threlte/styles/**`
- `apps/game/src/threlte/engine/material*`
- `apps/game/scripts/report-aaa-graphics-content-backlog.mjs`
- `apps/game/scripts/cook-runtime-assets.mjs`
- `apps/megameal/public/generated/runtime-game-assets/**`
- `apps/megameal/public/terrain/**`

## Read First

- `apps/game/AGENTS.md`
- `apps/game/ENGINE_ARCHITECTURE.md`
- `apps/game/AAA_TARGET_03_PBR_CONTENT_BACKLOG_CLOSURE.md`
- `apps/game/AAA_GRAPHICS_CONTENT_BACKLOG.md`
- `apps/game/AAA_WEB_ENGINE_AGENT_COORDINATION.md`

## Work Steps

1. Generate the current content backlog:

```bash
pnpm --dir apps/game report:graphics-backlog
```

2. Pick one bounded content pass:
   - one level
   - one hero material family
   - one fallback PBR category
   - one lighting/reflection direction issue
   - one collision/visual parity issue
3. Prefer source scene/material changes over generated JSON edits.
4. Keep material work measurable:
   - authored material slot count
   - fallback slot count
   - texture size
   - draw call impact
   - runtime payload impact
5. Regenerate runtime assets only through the owning scripts.
6. Validate that the scene remains within runtime budgets.
7. Update the backlog only if the report script supports it or the doc is the
   accepted source of truth for that content state.

## Guardrails

- Do not add large unoptimized GLBs directly to runtime paths.
- Do not use visual meshes as collision just because they look walkable.
- Do not introduce 4K textures or large texture payloads without a documented
  hero-asset reason.
- Do not hand-edit generated runtime manifests as the source of truth.
- Do not make every object high fidelity. Use hero/secondary/background tiers.

## Acceptance Criteria

- A bounded content area is visibly and structurally improved.
- Fallback/rough content count decreases or is documented with a reason.
- Runtime manifest and scene build errors remain zero.
- Payload, draw calls, material slots, and collision are considered.
- Generated drift passes.

## Validation

```bash
pnpm --dir apps/game report:graphics-backlog
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:engine
pnpm --dir apps/game release:gate:quick
```

If terrain or collision changes:

```bash
pnpm --dir apps/game bake:terrain-collision
pnpm --dir apps/game cook:terrain-chunks
```

## Handoff

Report:

- level/content area improved
- source files changed
- generated files changed and command used
- fallback count or material quality impact
- runtime payload/draw-call/collision impact
- commands run
- remaining content gaps

