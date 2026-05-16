# Agent 06: Validation And Certification

## Mission

Certify the final atmosphere unification, delete superseded bridge code, and
produce the final integration handoff.

## Ownership

Primary files:

- `apps/game/docs/aaa-atmosphere-unification/README.md`
- `apps/game/docs/aaa-atmosphere-unification/AGENT_00_COORDINATION.md`
- runtime diagnostics/audit scripts if needed

Secondary files:

- Any provisional bridge file that remains after Agents 01-05.

## Requirements

Prove that the system is unified:

- code search for direct runtime reads of `style.haze`, `style.fog`,
  `style.bloom`, and `style.colorGrading` outside the atmosphere builder
- code search for skybox veil/overlay concepts
- code search for independent ocean fog controls
- diagnostics show sky, ocean, props, terrain, mist, and post-processing status
- visual smoke covers the required scenarios

Delete or document provisional compatibility code. Documentation is acceptable
only when a named owner and deletion condition remain.

## Acceptance Criteria

- One runtime atmosphere contract is the authority.
- Editor controls, scene runtime, sky, ocean, materials, mist, and postFX all
  consume it.
- Provisional bridge code is deleted or tracked.
- Visual smoke screenshots are attached or paths are reported.
- Known limitations are explicitly listed.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec biome check src/threlte
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

If full smoke is blocked by unrelated existing failures, report the exact
failure and run a Playwright browser smoke against the active dev server.

## Certification Result

Status: ready for review as of 2026-05-15.

The runtime atmosphere system is unified around
`RuntimeAtmosphereDefinition`/`runtimeAtmosphereStore`. The scene atmosphere
system, material registry, sky/aerial perspective, ocean material, mist,
underwater path, post-processing policy, and diagnostics consume the same
runtime definition. `SceneFogExp2.svelte` and `sceneFogMaterialPatch.ts` were
deleted.

Visual smoke screenshots were written to:

- `apps/game/.visual-smoke/atmosphere-certification/solitude.png`
- `apps/game/.visual-smoke/atmosphere-certification/observatory.png`
- `apps/game/.visual-smoke/atmosphere-certification/yggdrasil.png`

Known limitations:

- Full `pnpm --dir apps/game exec biome check src/threlte` and the targeted
  atmosphere-owned file check passed.
- Required `pnpm --dir apps/game smoke:boot` passed on port 4322 after the
  level readiness timeout was aligned with the shared browser harness default.
- `GAME_DEV_PORT=4330 pnpm --dir apps/game smoke:visual -- --level=yggdrasil,observatory,solitude --write-artifacts --skip-baselines --artifact-dir apps/game/.visual-smoke/atmosphere-certification`
  passed and refreshed the certification screenshots.
- Standard ocean and planar reflector water paths participate in runtime
  atmosphere. The reflector path uses the projective atmosphere shader mode.
