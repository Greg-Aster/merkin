# AAA Collision System Agent 07 - Scene Migration And Cleanup

## Goal

After the runtime/editor/audit foundation is ready, migrate existing scene
content to the new collision system without creating brittle targeted fixes.

Yggdrasil is an important validation case because it currently has confusing
ground, baked terrain, large blockers, and visual-only roles. It must not become
the reason generic code gets level-specific branches.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/AAA_COLLISION_SYSTEM_AGENT_COORDINATION.md`
- `apps/game/AAA_COLLISION_SYSTEM_AGENT_01_RUNTIME_CONTRACT.md`
- `apps/game/AAA_COLLISION_SYSTEM_AGENT_02_LAYER_MAPPING.md`
- `apps/game/AAA_COLLISION_SYSTEM_AGENT_03_EDITOR_AUTHORING_UX.md`
- `apps/game/AAA_COLLISION_SYSTEM_AGENT_05_TERRAIN_HEIGHTMAP_WORKFLOW.md`
- `apps/game/AAA_COLLISION_SYSTEM_AGENT_06_DIAGNOSTICS_AND_AUDITS.md`
- `apps/game/src/threlte/editor/scenes/*.scene.json`
- `apps/game/src/threlte/levels/level-registry.json`

## Primary Ownership

- Scene document cleanup
- Level collision role cleanup
- Removing stale/default/oversized collision data from authored levels
- Regenerating runtime scene artifacts when required

Do not edit core runtime systems unless explicitly coordinating with the owning
agent.

## Current Problem

Some scenes rely on confusing or risky authored collision:

- large visual ground objects that may overlap baked terrain collision
- huge blocker boxes around complex assets
- visual-only objects that still carry disabled collider payloads
- collision defaults that are hard to distinguish from intentional authored
  collision

## Work Steps

1. Wait for or verify the core contracts from Agents 01, 02, 03, 05, and 06.
2. Run the collision review audit and capture the current findings.
3. For each scene, classify objects into:
   - visual-only
   - collision-only proxy
   - walkable
   - blocker
   - trigger
   - detail
4. Remove stale disabled collision payloads when a visual-only role is the source
   of truth.
5. Replace oversized blockers with explicit proxy shapes or baked collider
   assets.
6. For terrain-heavy scenes, make baked terrain collision the source of truth
   where configured. Visual terrain/ground meshes should be visual-only unless
   intentionally used as authored walkable proxies.
7. Rebuild or publish runtime scene artifacts using the established pipeline.
8. Update scene settings instead of generic code when a level needs a role,
   budget, ground contract, or explicit exception.

## Guardrails

- Do not patch symptoms with hard-coded actor ids in runtime/editor code.
- Do not remove collision from gameplay-critical objects without replacing it
  with a validated proxy or terrain collider.
- Do not leave stale disabled collision blocks if roles/settings express the
  same intent more clearly.
- Do not regenerate broad assets unless required by the collision migration.
- Do not overwrite unrelated user edits.

## Acceptance Criteria

- Existing scenes pass the new collision review with no unresolved errors.
- Yggdrasil has clear terrain responsibility:
  - baked terrain handles terrain collision when configured
  - visual terrain meshes do not create accidental invisible walls
  - authored proxies are explicit and inspectable
- Large blocker boxes are removed, justified, or replaced with better proxies.
- Scene data is easier to understand from the editor.

## Validation

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game release:gate:quick
```

Run any collision review command added by Agent 06.

## Handoff

Report:

- scenes changed
- collision role changes by scene
- generated artifacts updated
- before/after collision review summary
- any remaining content work
