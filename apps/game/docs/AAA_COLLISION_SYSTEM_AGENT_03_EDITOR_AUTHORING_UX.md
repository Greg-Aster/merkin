# AAA Collision System Agent 03 - Editor Collision Authoring UX

## Goal

Make collision authoring in the level editor usable and explicit. The editor
should offer professional collision actions instead of forcing users to edit
low-level fields and manual collider URLs.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/AAA_COLLISION_SYSTEM_AGENT_COORDINATION.md`
- `apps/game/src/threlte/editor/EditorInspectorForm.svelte`
- `apps/game/src/threlte/editor/EditorPropertiesShelf.svelte`
- `apps/game/src/threlte/editor/editorInspectorController.ts`
- `apps/game/src/threlte/editor/editorCollisionDefaults.ts`
- `apps/game/src/threlte/engine/collisionPolicy.ts`

## Primary Ownership

- Collision inspector UI
- Inspector controller actions
- Editor affordances for common collision operations

Avoid changing runtime collision group behavior. That belongs to Agent 02.
Avoid building collider asset generation. That belongs to Agent 04.

## Current Problem

The editor exposes `Solid / Collider`, intent, channel, body type, size, and a
manual URL field. It does not expose the workflow users actually need:

- make selected mesh visual-only
- make selected mesh a blocker
- make selected mesh walkable
- make selected mesh a trigger
- create collision-only proxy from selected mesh
- fit proxy to visual bounds
- choose cuboid/cylinder/trimesh shape explicitly
- see whether collision is authored, defaulted, disabled, or inherited

## Work Steps

1. Add a clear collision mode section:
   - Visual Only
   - Blocker
   - Walkable
   - Trigger
   - Detail
   - Collision Proxy
   - Disabled
2. Add explicit collider shape selection:
   - Box
   - Cylinder
   - Trimesh asset
3. Show collision source status:
   - authored
   - default policy
   - disabled
   - visual-only role
   - missing collider asset
4. Add one-click controller actions:
   - `setVisualOnly`
   - `setBlocker`
   - `setWalkable`
   - `setTrigger`
   - `setDetail`
   - `createCollisionProxyFromSelection`
   - `fitColliderToVisualBounds`
5. When creating a proxy, create a separate actor with collision enabled and
   render disabled. Do not hide physics by using render visibility semantics
   unless Agent 01 has completed the runtime contract.
6. Make "Match Collider To Visual" use actual bounds metadata when available
   and clearly warn when falling back to transform scale.
7. Keep the UI compact and production-oriented. Avoid adding another confusing
   panel that duplicates the same controls.

## Guardrails

- Do not add level-specific buttons.
- Do not silently convert detailed visual meshes into player blockers.
- Do not generate a collider asset in this agent. Call into Agent 04's pipeline
  if it exists, or leave a documented integration point.
- Do not add large page-level style blocks.
- Keep editor and player runtime chunks separated.

## Acceptance Criteria

- A level author can mark a mesh visual-only in one action.
- A level author can create a blocker/walkable/trigger proxy in one action.
- The editor clearly shows whether the selected object has authored collision.
- Shape can be selected without editing raw JSON.
- Collision-only proxy authoring is possible once Agent 01 lands.

## Validation

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
pnpm --dir apps/game release:gate:quick
```

If CSS or Megameal-facing UI surfaces are touched, also run:

```bash
pnpm --dir apps/megameal audit:css
```

## Handoff

Report:

- new authoring actions
- controller functions added or changed
- CSS surface added, if any
- any integration points left for Agent 04 or Agent 06
