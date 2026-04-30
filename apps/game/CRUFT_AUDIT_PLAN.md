# Game Cruft Audit Plan

This is the working plan for systematically reviewing `apps/game` file by file.
The goal is to remove cruft without making targeted level fixes that hide
architecture problems.

## Scope

Audit all files under `apps/game` except generated install/build output:

```bash
find apps/game \
  -path 'apps/game/node_modules' -prune -o \
  -path 'apps/game/dist' -prune -o \
  -path 'apps/game/.astro' -prune -o \
  -type f -print | sort
```

Current snapshot:

| Area | Files |
| --- | ---: |
| Root/config/docs | 11 |
| `public` | 76 |
| `scripts` | 13 |
| `src` | 261 |
| Total | 361 |

The file checklist lives in `CRUFT_FILE_INVENTORY.md`.

## Review Outcomes

Every file should end in one of these states:

| State | Meaning |
| --- | --- |
| Keep | File is actively used and belongs where it is. |
| Refactor | File is needed, but responsibilities are mixed or too broad. |
| Move | File is needed, but belongs in another boundary. |
| Merge | File is redundant with another local helper/component. |
| Delete | File is unused, obsolete, generated in the wrong place, or unsafe to keep. |
| Externalize | Runtime code should consume a manifest/cooked artifact instead. |
| Defer | Needs a separate design decision before changing. |

## Rules

- Do not fix one level at a time unless the level data is the actual contract being audited.
- Prefer global engine/editor/runtime boundaries over local patches.
- Do not delete raw or generated assets until ownership, source, and replacement runtime path are clear.
- Do not move files across runtime/editor boundaries without checking imports and bundle impact.
- After each batch, run the smallest checks that cover the changed surface.

## Cruft Questions Per File

For every file, answer:

1. Is it imported or loaded at runtime, editor-only, build-only, or dead?
2. Does it duplicate another file, helper, schema, asset, or store?
3. Is it in the right boundary: runtime, editor, build script, public asset, or authoring source?
4. Does it hard-code level-specific behavior that should be manifest-driven?
5. Does it make browser runtime payload heavier than necessary?
6. Does it bypass readiness, collision, asset, spawn, or validation contracts?
7. Does it need a test, smoke check, audit rule, or build gate?

## Waves

### Wave 0: Baseline

Goal: make future deletions measurable.

- Run `pnpm --dir apps/game type-check`.
- Run `pnpm --dir apps/game smoke:engine`.
- Run `pnpm --dir apps/game audit:engine`.
- Capture bundle warnings and current largest chunks.
- Capture public/runtime asset sizes.

### Wave 1: Generated, Raw, And Static Assets

Focus:

- `public/audio/**`
- `public/ref-image/**`
- `public/style-engine-ref/**`
- `public/vendor/**`
- `performance-baselines.json`

Questions:

- Should this live under `apps/game/public` at all?
- Is it runtime-required, editor-reference-only, or authoring-only?
- Is it duplicated in `apps/megameal/public`?
- Does it need a manifest entry or a cooked output path?

Expected outputs:

- Public asset ownership map.
- Delete/move candidates.
- Runtime asset budget report.

### Wave 2: Scripts And Tooling

Focus:

- `scripts/*.mjs`
- `scripts/lib/*.mjs`
- `package.json`
- `astro.config.mjs`

Questions:

- Does each script still serve a real workflow?
- Are smoke/audit/performance scripts overlapping?
- Can cruft checks become build gates?
- Are scripts writing generated assets into the right location?

Expected outputs:

- Consolidated command map.
- Dead script list.
- Missing audit gates.

### Wave 3: Runtime Engine Contracts

Focus:

- `src/threlte/engine/**`
- `src/threlte/levels/**`
- `src/threlte/core/**`
- `src/threlte/collision/**`

Questions:

- Are runtime contracts independent from editor implementation?
- Are manifests validated before player activation?
- Are spawn, collision, required assets, and readiness explicit?
- Are runtime actors free of editor-only imports?

Expected outputs:

- Runtime/editor import boundary report.
- Manifest validation gaps.
- Level readiness contract TODOs.

### Wave 4: Editor Architecture

Focus:

- `src/threlte/editor/**`

Questions:

- Which files are actual editor UI vs state/controllers/schema?
- Which controllers are too broad?
- Which scene backups are source control noise vs needed recovery data?
- Are editor defaults, packaged scenes, and runtime scene contracts separated?

Expected outputs:

- Editor module map.
- Controller split plan.
- Scene backup retention decision.

### Wave 5: Gameplay Features

Focus:

- `src/threlte/features/**`
- `src/threlte/components/**`
- `src/threlte/systems/**`

Questions:

- Is the feature runtime-ready and manifest-driven?
- Does it duplicate another system/component?
- Does it import editor types or editor helpers?
- Does it load heavy assets or Three examples unnecessarily?

Expected outputs:

- Feature ownership map.
- Runtime bundle reduction targets.
- Feature-specific deletion/refactor candidates.

### Wave 6: UI, Stores, Services, Config

Focus:

- `src/threlte/ui/**`
- `src/threlte/stores/**`
- `src/services/**`
- `src/config/**`
- `src/utils/**`

Questions:

- Is this game UI, Megameal carryover, or dead timeline/site code?
- Are stores scoped correctly?
- Are services still used by the current game path?

Expected outputs:

- Dead site/timeline carryover list.
- Store ownership map.
- UI duplication list.

## Batch Size

Use small batches:

- 5-15 related source files, or
- one feature directory, or
- one public asset class.

Each batch should end with:

- changed files
- deleted/moved files
- checks run
- payload/collision/required-assets impact
- remaining risks

## Starting Point

Start with non-runtime-risk inventory work:

1. Public assets: classify `public/style-engine-ref` and `public/ref-image`.
2. Scripts: classify all 13 scripts and merge duplicate smoke/profile logic.
3. Runtime/editor boundary scan: remove imports from runtime files into editor modules where possible.

