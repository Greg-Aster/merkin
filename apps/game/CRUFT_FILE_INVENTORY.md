# Game File Inventory

Generated from:

```bash
find apps/game \
  -path 'apps/game/node_modules' -prune -o \
  -path 'apps/game/dist' -prune -o \
  -path 'apps/game/.astro' -prune -o \
  -type f -print | sort
```

Status key: `unreviewed`, `keep`, `refactor`, `move`, `merge`, `delete`,
`externalize`, `defer`.

## Root

| Status | File |
| --- | --- |
| unreviewed | `AGENTS.md` |
| unreviewed | `ENGINE_ARCHITECTURE.md` |
| unreviewed | `ENGINE_MIGRATION_CHECKLIST.md` |
| unreviewed | `astro.config.mjs` |
| unreviewed | `biome.json` |
| unreviewed | `package.json` |
| unreviewed | `performance-baselines.json` |
| unreviewed | `tailwind.config.cjs` |
| unreviewed | `tsconfig.json` |

## Public Assets

| Status | File |
| --- | --- |
| unreviewed | `public/CNAME` |
| unreviewed | `public/audio/ambient/Dark Shadows of Delight.mp3` |
| unreviewed | `public/audio/ambient/Faster.mp3` |
| unreviewed | `public/audio/ambient/Shadow Waltz.mp3` |
| unreviewed | `public/audio/ambient/Untitled.mp3` |
| unreviewed | `public/audio/ambient/Whistling Dreams.mp3` |
| unreviewed | `public/audio/ambient/Wicked Shadows Whisper.mp3` |
| unreviewed | `public/audio/ambient/meta_3.mp3` |
| unreviewed | `public/audio/ambient/piano synth.mp3` |
| unreviewed | `public/audio/ambient/portal-deck.mp3` |
| unreviewed | `public/audio/ambient/retro video game, new age, electric guitar fake.mp3` |
| unreviewed | `public/audio/sfx/interface-back.mp3` |
| unreviewed | `public/audio/sfx/interface-click-tone.mp3` |
| unreviewed | `public/audio/sfx/interface-open.mp3` |
| unreviewed | `public/audio/sfx/interface-sweep.mp3` |
| unreviewed | `public/audio/sfx/select-click.mp3` |
| unreviewed | `public/ref-image/ComfyUI_0147.png` |
| unreviewed | `public/ref-image/Hunyaun example.json` |
| unreviewed | `public/ref-image/comfy_image_example.json` |
| unreviewed | `public/style-engine-ref/1856.jpg` |
| unreviewed | `public/style-engine-ref/ComfyUI_0020 (copy).png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2023-09-28 20-05-35.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-01-12 14-14-25.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-01-17 18-07-55.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-01-17 18-08-47.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-01-17 18-27-26.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-01-17 18-48-21.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-01-24 19-32-17.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-01-29 18-14-15.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-04-17 12-36-53.jpg` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-04-18 15-56-07.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-04-21 13-48-21.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-04-23 13-16-40.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-05-09 16-02-22.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-05-09 16-03-24.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-05-09 16-05-45.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-05-09 16-12-22.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-05-09 16-16-00.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-08-26 10-58-38.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-08-28 13-56-44.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-09-01 13-08-21.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-09-02 18-52-20.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-09-02 18-52-31.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-09-02 18-52-52.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-09-02 18-53-41.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-09-02 18-53-59.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-09-02 18-54-31.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-09-02 18-55-13.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-10-29 15-23-06.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-11-07 20-21-11.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-11-13 16-38-43.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2024-11-18 11-52-40.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2025-01-03 10-56-10.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2025-01-16 11-08-22.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2025-02-09 15-10-42.png` |
| unreviewed | `public/style-engine-ref/Screenshot from 2025-02-24 18-12-12.png` |
| unreviewed | `public/style-engine-ref/avatar.png` |
| unreviewed | `public/style-engine-ref/banner.png` |
| unreviewed | `public/style-engine-ref/celluloid-shot0008.jpg` |
| unreviewed | `public/style-engine-ref/celluloid-shot0021.jpg` |
| unreviewed | `public/style-engine-ref/celluloid-shot0022.jpg` |
| unreviewed | `public/style-engine-ref/celluloid-shot0023.jpg` |
| unreviewed | `public/style-engine-ref/cookbook.png` |
| unreviewed | `public/style-engine-ref/dance2.png` |
| unreviewed | `public/style-engine-ref/golden-era.png` |
| unreviewed | `public/style-engine-ref/king.png` |
| unreviewed | `public/style-engine-ref/main-title.png` |
| unreviewed | `public/style-engine-ref/merkin.png` |
| unreviewed | `public/style-engine-ref/wendi.png` |
| unreviewed | `public/style-engine-ref/ww2.png` |
| unreviewed | `public/vendor/onnxruntime/ort-wasm-simd-threaded.jsep.mjs` |
| unreviewed | `public/vendor/onnxruntime/ort-wasm-simd-threaded.jsep.wasm` |
| unreviewed | `public/vendor/onnxruntime/ort.webgpu.min.mjs` |
| unreviewed | `public/vendor/tfjs/tfjs-backend-wasm-simd.wasm` |
| unreviewed | `public/vendor/tfjs/tfjs-backend-wasm-threaded-simd.wasm` |
| unreviewed | `public/vendor/tfjs/tfjs-backend-wasm.wasm` |

## Scripts

| Status | File |
| --- | --- |
| unreviewed | `scripts/audit-engine-architecture.mjs` |
| unreviewed | `scripts/bake-terrain-collision.mjs` |
| unreviewed | `scripts/boot-check-browser.mjs` |
| unreviewed | `scripts/boot-check.mjs` |
| unreviewed | `scripts/cook-runtime-assets.mjs` |
| unreviewed | `scripts/dev-app.mjs` |
| unreviewed | `scripts/dev-tools.mjs` |
| unreviewed | `scripts/generate-terrain-heightmap.mjs` |
| unreviewed | `scripts/lib/browserHarness.mjs` |
| unreviewed | `scripts/performance-baseline.mjs` |
| unreviewed | `scripts/profile-level-resources.mjs` |
| unreviewed | `scripts/profile-three-runtime.mjs` |
| unreviewed | `scripts/smoke-check.mjs` |

## Source

The source inventory is large; keep this section synchronized with the command
above as files are removed or moved.

| Status | File |
| --- | --- |
| unreviewed | `src/config/editorApi.ts` |
| unreviewed | `src/config/timelineconfig.ts` |
| unreviewed | `src/content.config.ts` |
| unreviewed | `src/env.d.ts` |
| unreviewed | `src/layouts/GameLayout.astro` |
| unreviewed | `src/pages/index.astro` |
| unreviewed | `src/services/TimelineConfig.ts` |
| unreviewed | `src/services/TimelineService.client.ts` |
| unreviewed | `src/services/TimelineService.ts` |
| unreviewed | `src/shims/rapier3d-compat.ts` |
| unreviewed | `src/threlte/Game.svelte` |
| unreviewed | `src/threlte/GameCanvasStage.svelte` |
| unreviewed | `src/threlte/collision/CollisionBody.svelte` |
| unreviewed | `src/threlte/components/**` |
| unreviewed | `src/threlte/constants/physics.ts` |
| unreviewed | `src/threlte/core/**` |
| unreviewed | `src/threlte/editor/**` |
| unreviewed | `src/threlte/engine/**` |
| unreviewed | `src/threlte/features/**` |
| unreviewed | `src/threlte/levels/**` |
| unreviewed | `src/threlte/services/TimelineDataService.ts` |
| unreviewed | `src/threlte/stores/**` |
| unreviewed | `src/threlte/styles/**` |
| unreviewed | `src/threlte/systems/**` |
| unreviewed | `src/threlte/tests/validate-performance.ts` |
| unreviewed | `src/threlte/ui/**` |
| unreviewed | `src/threlte/utils/**` |
| unreviewed | `src/utils/content-utils.ts` |
| unreviewed | `src/utils/starUtils.ts` |

For exact source file expansion, run:

```bash
find apps/game/src apps/game/scripts -type f | sort | sed 's#^apps/game/##'
```

