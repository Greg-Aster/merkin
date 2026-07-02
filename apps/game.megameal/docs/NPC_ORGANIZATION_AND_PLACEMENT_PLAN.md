# NPC Organization And Placement Plan

Status: implemented foundation

## Goal

NPC authoring stays level-owned while the editor presents large NPC populations
as organized collections instead of one long instance list. Runtime systems
continue to consume generic `Npc`, `MovementBehavior`, `LightModulation`,
`InteractionTarget`, and `Conversation` components without species branches.

## Implemented Scope

- NPC group files may declare `collections` with stable IDs, labels, and
  optional descriptions.
- NPC instances may assign `collectionId`; instances without a collection remain
  valid and appear as unassigned in the editor.
- NPC groups and instances may declare `placement.mode`.
  - `absolute` preserves authored world-space Y.
  - `walkable-ground` resolves Y from generated static walkable collision at the
    authored X/Z and applies optional `heightOffset`.
- The level package resolves placement before runtime scene composition, so
  runtime consumers still receive ordinary transforms and movement base
  positions.
- The level editor owns NPC organization UI through `NpcEditorPanel.svelte`
  instead of embedding the full NPC tab in `LevelEditorWorkspace.svelte`.

## Owner Boundaries

- Source data remains under `src/levels/<level>/npcs`.
- Global archetypes remain under `src/levels/global/npcs`.
- Placement resolution lives under `src/levels` as package composition logic.
- Editor organization controls live under `src/editor/level` and save through
  the existing DEV-only file-owner API.
- No engine, adapter, or gameplay runtime path branches on fireflies or any
  other NPC species.

## Validation

- `test:npc-contract` verifies Observatory preserves the authored firefly
  population and resolves walkable-ground placement above generated collision.
- `test:level-editor-workspace-contract` verifies the NPC editor panel remains
  the organized NPC authoring surface and keeps file-scoped saves.
- `test:static-environment-collision-contract` verifies the generated collision
  product used by placement remains valid.
