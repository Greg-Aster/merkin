# AAA Remaining 03 - PBR Backlog Closure

## Mission

Reduce approved fallback material slots and make hero-visible assets use authored PBR material maps. Generated placeholder materials can exist during authoring, but shipping-quality content needs explicit material completeness.

## Baseline Evidence

The current content backlog reports `missingRecommendedSlots=355` and `unapprovedRecommendedSlots=0`. This means missing material slots are approved fallbacks, not unknown failures. It does not mean the assets are AAA content.

## Ownership

Primary ownership:

- `apps/game/AAA_GRAPHICS_CONTENT_BACKLOG.md`
- `apps/game/scripts/report-aaa-graphics-content-backlog.mjs`
- `apps/game/scripts/cook-runtime-assets.mjs`
- Runtime asset manifest material metadata.
- Source assets under game-facing public asset paths.

Coordinate with:

- Import pipeline owner if source metadata changes.
- Rendering agent for visual targets.
- Performance agent for texture memory budgets.
- CI agent before making zero fallback a hard gate.

## Work Packages

1. Pick hero-visible material families.
   - Prioritize assets visible in the first playable camera path.
   - Use backlog family counts to choose the highest-impact slice.

2. Author or wire material slots.
   - Base color.
   - Normal.
   - Roughness.
   - Metalness where applicable.
   - Occlusion where applicable.
   - Emissive where applicable.

3. Preserve device tier budgets.
   - Do not add oversized textures to fix an audit count.
   - Ensure cooked variants fit mobile, desktop, and TV profiles.

4. Regenerate manifests and backlog.
   - Use the cook/report scripts.
   - Do not hand-edit backlog counts.

5. Add stricter policy for hero assets.
   - It is acceptable for low-priority generated placeholders to retain approved fallbacks.
   - Hero-scene assets should fail if required PBR slots are missing after the vertical slice is declared complete.

## Acceptance Criteria

- `missingRecommendedSlots` decreases from the current baseline.
- `unapprovedRecommendedSlots` remains `0`.
- Hero-visible assets in the selected slice have authored material maps.
- Texture sizes and cooked payload stay within profile budgets.
- Visual smoke still passes.

## Avoid

- Do not mark missing slots approved without art rationale.
- Do not replace one fallback with another generated flat texture and call it authored.
- Do not raise texture budgets to hide asset problems.
- Do not manually edit generated manifest counts.

## Validation

```bash
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game report:graphics-backlog:write
pnpm --dir apps/game audit:engine
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:visual
```

## Handoff

Report:

- Families improved.
- Material slots added.
- Backlog count before and after.
- Runtime payload and texture budget impact.
- Visual artifacts or remaining fallbacks.
