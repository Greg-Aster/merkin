# AAA Collision System Agent 06 - Diagnostics And Audits

## Goal

Make invisible walls and walk-through meshes validation failures or clear editor
diagnostics, not mysteries discovered by playing the level.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/AAA_COLLISION_SYSTEM_AGENT_COORDINATION.md`
- `apps/game/scripts/audit-engine-architecture.mjs`
- `apps/game/src/threlte/engine/levelValidation.ts`
- `apps/game/src/threlte/engine/runtimeSceneManifest.ts`
- `apps/game/src/threlte/editor/EditorCollisionTabHost.svelte`
- `apps/game/src/threlte/editor/EditorCollisionOverlay.svelte`

## Primary Ownership

- Collision review report
- Audit rules
- Editor diagnostics panel/list
- Validation messages

Avoid changing runtime behavior unless a small helper is required for diagnostics.

## Current Problem

The current architecture audit can pass while these problems remain:

- hidden authored collision will not mount
- collision channel metadata does not map to runtime groups
- large colliders are much bigger than visible mesh bounds
- visual meshes are accidentally player blockers
- walkable ground overlaps baked terrain in confusing ways
- spawn points may sit inside or near blockers
- collider URL or terrain status is hard to understand in the editor

## Work Steps

1. Add a reusable collision review module that can inspect a scene document and
   cooked runtime scene.
2. Report at least these findings:
   - hidden actor with active collision
   - visible actor with default collision
   - visual-only actor with authored collision conflict
   - collider size much larger than known visual bounds
   - missing trimesh collider URL
   - detail/trigger objects that would block the player
   - walkable actors that overlap baked terrain responsibilities
   - spawn point unsupported by walkable terrain or inside a blocker proxy
3. Add an editor-facing collision review list with click-to-select where
   practical.
4. Add command-line output to `audit:engine` or a clearly named new audit command.
5. Make severity explicit:
   - error: invalid runtime contract
   - warning: likely authoring issue
   - info: review suggestion
6. Do not create noisy false failures for intentionally authored scenes. Use
   budgets and explicit exceptions from scene settings when needed.
7. Document any temporary warnings that scene migration agents must resolve.

## Guardrails

- Do not hide failures by adding broad allowlists.
- Do not add per-level hard-coded suppressions in generic audit code.
- Do not make diagnostics depend on a browser-only runtime.
- Do not edit scene content unless needed for a tiny fixture.

## Acceptance Criteria

- There is a repeatable collision review command or audit section.
- The editor can surface collision review findings.
- Current scenes produce useful diagnostics for oversized or confusing colliders.
- Future hidden collision proxies are valid once Agent 01 lands.
- Invalid runtime contracts fail loudly.

## Validation

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
pnpm --dir apps/game release:gate:quick
```

Run any new audit command directly and report the output summary.

## Handoff

Report:

- diagnostics added
- severity model
- current scene findings
- remaining false positives or intentional exceptions
