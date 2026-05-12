# AAA Remaining 01 - Runtime Authoring Cruft

## Mission

Remove editor-only and authoring-only metadata from shipped gameplay runtime payloads. Runtime level data should describe only gameplay, render, physics, interaction, audio, terrain, spawn, streaming, and validated diagnostics needed by the browser game.

## Baseline Evidence

Current runtime scene manifest generation still emits actor `editor` metadata with fields such as `legacyKind`, `locked`, `generation`, and `collisionSource`. `ActorDefinition` still allows an `editor` bag. Cooked runtime scene JSON also contains those fields.

## Ownership

Primary ownership:

- `apps/game/scripts/lib/runtimeSceneManifest.mjs`
- `apps/game/src/threlte/engine/types.ts`
- `apps/game/src/threlte/engine/runtimeSceneManifest.ts`
- `apps/game/src/threlte/engine/runtimeSceneDocumentLoader.ts`
- Runtime scene validation and architecture audit scripts.

Coordinate with:

- Streaming agent for readiness metadata.
- Collision agent if collision provenance moves.
- Editor agent if editor UI reads runtime actor metadata.
- CI agent before adding hard gates.

## Work Packages

1. Define the runtime actor contract.
   - Remove `editor?: Record<string, unknown>` from shipped `ActorDefinition`.
   - Add explicit runtime fields only when gameplay needs them.
   - Keep build-only provenance in `buildReport`, not inside `levelDefinition.actors`.

2. Move collision provenance.
   - If `collisionSource` is useful, put it under build diagnostics or a typed collision diagnostics report.
   - Runtime collision behavior should come from `physics`, `terrain`, or collider manifest fields.

3. Stop emitting editor payload into runtime actors.
   - Remove `editor` from `adaptSceneNodeToActorDefinition`.
   - Regenerate runtime scene manifests.

4. Add a failing runtime purity audit.
   - Fail if generated runtime scene actor payloads contain `editor`, `legacyKind`, `locked`, or `generation`.
   - Fail if runtime imports editor-only modules in gameplay bundles.
   - Wire the audit into `audit:engine` or release gate after it is stable.

5. Update runtime readers.
   - Replace any runtime reads of `actor.editor` with typed runtime fields or build diagnostics.
   - Ensure gameplay still loads only cooked manifests.

## Acceptance Criteria

- No generated runtime scene actor contains `editor`, `legacyKind`, `locked`, or `generation`.
- `ActorDefinition` has no generic editor bag.
- Runtime purity audit fails on any reintroduced editor metadata.
- Gameplay boot and visual smoke still pass.
- `check:generated-drift` passes after regeneration.

## Avoid

- Do not move editor metadata into a new generic runtime bag.
- Do not weaken missing cooked-manifest failures.
- Do not make runtime code import editor helpers to recover lost metadata.
- Do not hand-edit generated runtime JSON.

## Validation

```bash
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game type-check
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

## Handoff

Report:

- Runtime schema fields removed or replaced.
- Generated runtime files changed.
- Any runtime reads of old editor metadata that were migrated.
- Audit added or updated.
- Commands run and failures, if any.
