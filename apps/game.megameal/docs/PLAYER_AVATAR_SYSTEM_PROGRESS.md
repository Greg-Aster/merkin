# Player Avatar System Progress

Status: implemented with lint caveat
Started: 2026-07-07

## Goal

Centralize player avatar ownership under the player content package so avatar
selection, default avatar assets, and future avatar changes live with the other
configurable player data in `src/levels/player`.

The current default avatar should remain a ball of light, but it should be a
player-owned avatar instead of a multiplayer-owned fallback or an NPC firefly
asset.

## Current Problem

- Remote player rendering currently defines a default avatar inside
  `src/game/runtime/index.ts`.
- That default points at `sprite_npc_firefly_outer_halo`, which is owned by the
  global firefly NPC archetype.
- This splits player avatar behavior across runtime, multiplayer projection, and
  NPC content data.
- Multiplayer should not own avatar identity. It should only project a supplied
  avatar renderable for replicated player entities.

## Target Ownership

- `src/levels/player` owns player avatar data and default player avatar assets.
- `src/levels/player/avatars` owns switchable avatar definitions and selected
  default avatar data.
- `src/levels/levelPackageData.ts` composes required player avatar assets into
  level packages alongside the existing player package assets.
- `src/app/levelPackageDiscovery.ts` and `src/app/mountGameClient.ts` pass the
  selected player avatar into the runtime as package configuration.
- `src/game/runtime/index.ts` consumes a player avatar option and passes it to
  multiplayer replication when multiplayer is enabled.
- `src/multiplayer/systems.ts` remains generic and does not know about the
  default avatar, fireflies, NPC content, or player package files.

## Guardrails

- Do not import `src/editor` from runtime, game systems, multiplayer, or engine
  code.
- Do not put browser, Svelte, Astro, Three, Rapier, or level-package data inside
  `src/multiplayer`.
- Do not put avatar defaults in `src/multiplayer`; multiplayer is a consumer.
- Do not copy player avatar assets into every level package.
- Do not keep NPC firefly asset ids as player defaults.
- Do not edit protected architecture or design documents unless an explicit
  architecture conflict is found and the user approves that reconciliation.

## Implementation Checklist

- [x] Add player avatar data types under `src/levels/player/avatars`.
- [x] Add player-owned default avatar data under `src/levels/player/avatars`.
- [x] Add player-owned default avatar sprite asset, such as
  `sprite_player_avatar_light`.
- [x] Export avatar assets and selected default avatar from the player package.
- [x] Include player avatar assets in `PLAYER_REQUIRED_ASSET_IDS` or an adjacent
  player-required avatar asset list consumed by level package composition.
- [x] Pass selected player avatar through app/package discovery into
  `createMegamealGameRuntime`.
- [x] Replace `multiplayerRemoteAvatar` with a player-avatar runtime option, or
  otherwise remove the multiplayer-specific default path.
- [x] Delete the hardcoded `sprite_npc_firefly_outer_halo` multiplayer default.
- [x] Keep `createRemotePlayerReplicationSystem` generic: it receives a
  renderable and projects remote player entities.
- [x] Update player package validation so the new avatar data is not stripped or
  rejected by the DEV-only player package editor API.
- [x] Update focused player package and multiplayer contract tests.

Note: the DEV-only player package editor API writes `src/levels/player/data.json`.
Avatar data now lives in separate files under `src/levels/player/avatars`, so
the existing player package editor API does not rewrite or strip avatar data.

## Validation Plan

Run focused validation after implementation:

```bash
pnpm --dir apps/game.megameal test:player-package-contract
pnpm --dir apps/game.megameal test:physics-rig-contract
pnpm --dir apps/game.megameal test:multiplayer-contract
pnpm --dir apps/game.megameal test:runtime-scene-contract
pnpm --dir apps/game.megameal test:performance-runtime-contract
pnpm --dir apps/game.megameal type-check
pnpm --dir apps/game.megameal audit:engine-boundaries
pnpm --dir apps/game.megameal build
git diff --check -- apps/game.megameal
```

If implementation touches shared schema, app discovery, or package composition
more broadly, also run:

```bash
pnpm --dir apps/game.megameal test:runtime-scene-contract
pnpm --dir apps/game.megameal lint
```

## Architecture Notes

No architecture or design document changes have been made for this planning
step. The current architecture already supports the intended shape:

- player content data belongs in `src/levels/player`;
- level package composition imports player package data;
- runtime receives composed configuration from the app/package layer;
- multiplayer remains detachable and generic.

If implementation proves that an existing architecture statement conflicts with
this desired ownership model, pause before code completion and reconcile the
specific document with user approval.

## Implementation Notes

- Added `src/levels/player/avatars` as the player-owned avatar package.
- Added `sprite_player_avatar_light` as the player-owned default light-ball
  sprite asset.
- Added `player_avatar_light` as the selected default avatar.
- Composed the avatar sprite into the existing player asset/readiness path via
  `PLAYER_REQUIRED_ASSET_IDS`.
- Exported `selectedPlayerAvatar` through the installed level package and app
  discovery path.
- Replaced the old `multiplayerRemoteAvatar` runtime option with a
  `playerAvatar` runtime option.
- Removed the hardcoded runtime fallback to `sprite_npc_firefly_outer_halo`.
- Left multiplayer replication generic: it receives a renderable and projects
  remote players.

## Ainekio/Sesame Physics Rig Foundation

- Added `player_avatar_ainekio_sesame` beside the default ball-of-light avatar.
- Kept `player_avatar_light` as the selected default avatar.
- Added isolated Ainekio/Sesame rig data under
  `src/levels/player/avatars/ainekio-sesame`.
- Added generic articulated physics-rig runtime support under
  `src/game/physics-rigs`; Ainekio-specific rig dimensions and servo IDs stay
  in the player avatar package.
- Extended the generic physics adapter contract with collider material tuning,
  revolute joints, and motor position targets.
- Added a runtime `submitMotionEvent()` queue for stable
  `servo-target-json-v1` events. The future Ainekio-to-Megameal adapter should
  translate Ainekio motion-module output into this queue instead of changing the
  Ainekio physical motion module.
- Added a DEV-only player avatar package endpoint and Master Control Player
  Package selector that edits `src/levels/player/avatars/data.json` without
  rewriting `src/levels/player/data.json`.
- The implemented simulator foundation is literal physics-driven movement:
  dynamic chassis and limb bodies plus eight revolute servo joints. It does not
  add root-motion displacement.
- Deferred: Ainekio-side adapter repo work, imported Sesame visual robot meshes,
  live locomotion tuning, and hardware/simulator provenance cleanup beyond the
  recorded missing-license note.

## Validation Results

Passed:

```bash
pnpm --dir apps/game.megameal test:player-package-contract
pnpm --dir apps/game.megameal test:physics-rig-contract
pnpm --dir apps/game.megameal test:multiplayer-contract
pnpm --dir apps/game.megameal type-check
pnpm --dir apps/game.megameal audit:engine-boundaries
git diff --check -- apps/game.megameal
```

Also passed for the touched code files:

```bash
pnpm --dir apps/game.megameal exec biome check --write src/game/physics-rigs/index.ts src/game/runtime/index.ts src/levels/player/avatars/index.ts scripts/test-physics-rig-contract.ts
pnpm --dir apps/game.megameal exec biome format --write src/engine/modules/physics/index.ts src/engine/adapters/rapier/index.ts src/game/physics-rigs/index.ts src/game/runtime/index.ts src/app/levelPackageDiscovery.ts src/app/mountGameClient.ts src/levels/global/index.ts src/levels/player/avatars/index.ts src/levels/player/avatars/types.ts src/levels/player/avatars/ainekio-sesame/rig.ts scripts/test-physics-rig-contract.ts scripts/test-player-package-contract.ts package.json
```

Full lint is still blocked by existing unrelated formatting/lint debt:

```bash
pnpm --dir apps/game.megameal lint
```

Current blockers reported by lint are in:

- `src/ui/multiplayer/MultiplayerPanel.svelte`
- `src/app/dev-bridge/gameDevBridgeRuntime.ts`
- `src/levels/player/data.json`
- `src/levels/observatory/skybox.json`
- `scripts/cook-static-environment-collision.ts`
