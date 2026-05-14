# Agent 04 - Validation, Save, And Publish Gates

## Mission

Separate work-in-progress save validation from production publish validation,
while keeping publish gates strict enough for AAA-quality runtime behavior.

## Current State

- `validateEditorSceneDocument(...)` and
  `validatePublishableEditorSceneDocument(...)` live in
  `editorSceneDocumentValidation.ts`.
- `createLevelBuildReport(...)` in `levelValidation.ts` enforces runtime-level
  collision, spawn, required actor, and manifest rules.
- Runtime readiness rejects legacy authored runtime asset fields such as
  `requiredAssetActorIds`.
- `audit:collision` reports scene-level collision findings through
  `audit-collision-review.ts`.
- Generated runtime scenes are produced by `cook-runtime-assets`.

## Required Contract

- Save should persist valid work-in-progress scene documents.
- Save should not require all publish-readiness conditions unless the data would
  corrupt the scene or make it impossible to reopen.
- Publish should enforce strict readiness:
  - no legacy fields
  - valid spawn
  - required render actors
  - required collision actors
  - required assets
  - no unclassified visible geometry if the level policy requires explicit
    classification
  - generated runtime manifest drift is clean

## Implementation Scope

- Review the difference between editor validation and publish validation.
- Ensure save messages clearly say whether a failure is WIP shape validation or
  publish validation.
- Add an explicit collision classification audit:
  - collidable
  - visual-only
  - disabled
  - missing collision
  - collision-only proxy
- Make unclassified visible geometry a publish blocker for production levels.
- Keep legacy field rejection strict. Do not normalize legacy fields at runtime.

## Tests

- WIP scene with a visible no-collision object can save if explicitly marked as
  WIP, but publish blocks it unless classified.
- Scene with `requiredAssetActorIds` fails publish.
- Scene with `authored-ground` fails publish.
- Scene with valid authored collision and clean generated manifest passes.
- Yggdrasil collision audit reports no unclassified visible geometry after
  Agent 05 completes.

## Out Of Scope

- Do not weaken publish gates to make editing easier.
- Do not hide errors behind autosave fallback behavior.
- Do not add legacy compatibility.

