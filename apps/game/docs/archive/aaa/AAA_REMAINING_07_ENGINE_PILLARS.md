# AAA Remaining 07 - Engine Pillars

## Mission

Add the missing engine-system foundations that make this more than a graphics demo: animation graph, navigation/pathfinding, save/load, input rebinding, spatial audio, scripting/events, and runtime debug/profiling surfaces. Keep this pass contract-first and vertical-slice driven.

## Baseline Evidence

Searches show graphics, streaming, collision, player, conversation, audio, and interaction systems exist, but there is no mature engine-level contract for several standard game-engine pillars. This agent should not build everything at once. Establish contracts and one narrow runtime slice where practical.

## Ownership

Primary ownership depends on the selected slice:

- Animation: runtime prefab animation descriptors and character/object animation code.
- Navigation: movement, collision, and level manifest data.
- Save/load: game state stores and level state serialization.
- Input: player controls and settings UI.
- Audio: shared audio and runtime audio systems.
- Scripting/events: event bus and gameplay component adapters.
- Debug/profiling: runtime diagnostic stores and overlays.

Coordinate with every owner whose runtime contract is touched.

## Work Packages

1. Choose one pillar for implementation and define contracts for the rest.
   - Recommended first slice: input rebinding or save/load snapshot because scope is bounded.
   - Alternative first slice: animation graph descriptor if it directly supports existing runtime prefabs.

2. Write typed runtime interfaces.
   - Manifest descriptors where content owns behavior.
   - Runtime managers where systems own lifecycle.
   - Stores only for observable state, not hidden engine ownership.

3. Add a thin vertical slice.
   - One level or object.
   - One user-visible behavior.
   - One audit or smoke validation path if practical.

4. Avoid broad rewrites.
   - Do not build a full gameplay framework in one pass.
   - Do not mix AI, save, input, animation, and audio in one giant manager.

5. Document remaining pillars as explicit open contracts.
   - Make future agents able to continue without rediscovering ownership.

## Acceptance Criteria

- At least one missing pillar has a typed contract and a working narrow slice.
- Other pillars have clear contract stubs or documented integration points.
- No runtime/editor boundary regressions.
- No large component absorbs unrelated engine ownership.
- Type-check passes.

## Avoid

- Do not hand-roll complex systems where a proven small library is appropriate.
- Do not add opaque generic scripting blobs without validation.
- Do not store level-critical state only in local component variables.
- Do not make debug UI required for gameplay behavior.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game smoke:engine
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

Add pillar-specific validation if the selected slice affects rendering, audio, input, save/load, or level manifests.

## Handoff

Report:

- Pillar selected for the vertical slice.
- Runtime contracts added.
- Files changed.
- New validation coverage.
- Remaining pillar contracts and risks.
