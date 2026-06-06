# Legacy Game Archival Readiness

Date: 2026-06-06

Scope: `/home/greggles/Merkin/apps/game` archival/removal readiness for the
`apps/game.megameal` migration.

## Summary

The normal game website path is already cut over to `apps/game.megameal`.
`apps/game` is not tracked by git and is ignored by `.gitignore`. Historical
source evidence from the old app is now captured as checked-in provenance notes
in target-engine migration docs; those `apps/game/...` paths are not active
runtime dependencies. The root command, workspace, lockfile, manual launcher,
Blender README, and audio README archival blockers are now retired or
reframed. Blender scene bridge packaging now has an owner under `apps/blender`,
and generated old-engine provenance is accepted as historical metadata by the
legacy-reference audit. Do not delete the local old folder without explicit
user approval because that is a destructive local operation.

## Current State

- Root `dev:game`, `build:game`, `build:game:full`, `deploy:game:static`,
  `deploy:game`, and `deploy:all` select `@merkin/game-megameal` or
  `apps/game.megameal/dist`.
- Root `dev:stack` runs `pnpm dev:game`, so it follows the new
  `apps/game.megameal` runtime.
- Root legacy aliases targeting `@merkin/game` or `apps/game/dist` have been
  removed.
- `start-game-manual-refresh.sh` now launches the current game through
  `pnpm dev:game` and translates an optional first argument into Astro's
  `--port` flag.
- `.gitignore` contains `apps/game/`, and `git ls-files apps/game` returns no
  tracked files.
- `pnpm-workspace.yaml` lists active app packages explicitly and no longer uses
  `apps/*`.
- `pnpm-lock.yaml` no longer has an `apps/game` importer entry.
- `apps/blender/package-scene-bridge-addon.sh` owns packaging
  `merkin_scene_bridge.zip`; the old `apps/game` Blender package command is
  retired.
- `pnpm audit:legacy-game-references` scans repository text files and fails
  active root/workspace/source/script references to the old app while allowing
  documented historical/provenance citations.

## Remaining References

Expected historical references:

- `apps/game.megameal` migration docs retain old `apps/game` path citations as
  checked-in provenance notes and explicitly ban imports/copies from the old
  runtime.
- `ENGINE_CONTRACT_REGISTER.md` records `LegacyRuntimeCutover`, the old-engine
  import ban, retired legacy aliases, the Blender bridge packaging owner, and
  the legacy-reference audit.
- Generated/provenance files under `apps/megameal/public/generated/` contain
  historical workflow or source-scene paths pointing at `apps/game`. These are
  accepted as historical metadata by the audit and must not be treated as active
  runtime dependencies.

## Addressed Source-Evidence Item

- Old `apps/game` scene and audio references in
  `docs/GAME_ENGINE_MIGRATION_PLAN.md` are now documented as historical
  provenance citations only. Future migration work must continue from
  checked-in target-engine docs/contracts, or add a checked-in evidence note
  before relying on any local old-app source. This does not mean full content
  migration is complete; it means the existing documented evidence is no
  longer a live dependency on the old app folder.

## Removal Gate

No tracked active runtime, package, workspace, lockfile, or root script
dependency currently requires local `apps/game`.

Before deleting the local ignored folder:

1. Get explicit user approval for the destructive local deletion.
2. Run `pnpm audit:legacy-game-references`.
3. Run the target-engine validation gate if the deletion is part of a broader
   migration commit.
4. Preserve any newly discovered evidence in checked-in docs or target-engine
   contracts before deleting the folder.

## Safe Archival Plan

1. Move any newly needed reference evidence into checked-in docs or target
   engine data contracts before relying on local old-app source.
2. Use `apps/blender/package-scene-bridge-addon.sh` for the Merkin scene bridge
   add-on zip.
3. Keep generated/provenance files that still point at old `apps/game`
   workflows or source scenes as historical metadata unless a future owner
   explicitly regenerates or removes them.
4. Confirm normal game commands still point only at `@merkin/game-megameal`.
5. Run focused validation for the target engine and a package-script reference
   scan.

## Readiness Verdict

Ready for explicit-approval local deletion, but not a blind-delete target.

The old app is off the normal runtime/deploy path, out of git, excluded from
workspace discovery, removed from the lockfile importer list, and no longer
targeted by root legacy aliases or the manual-refresh launcher. Blender bridge
packaging is owned by `apps/blender`, and generated provenance that names the
old app is accepted as historical metadata. The folder can be removed only
after explicit user approval because it is ignored local state.
