# MEGAMEAL Astro Baseline Triage

Date: 2026-04-22

Command run:

```bash
pnpm --filter @merkin/megameal astro check
```

Current summary:

- `37` errors
- `56` hints in the emitted log
- dominant non-blocking noise in the log: `ts(6133)` unused declarations and `astro(4000)` inline-script hints

## Priority Buckets

### 1. Bleepy/chat-manager nullability

Primary files:

- `src/components/bleepy/shared-chat-manager.ts` with `6` hard errors
- related diagnostics in `src/components/bleepy/Bleepy.astro`

Interpretation:

- Mostly optional-config and DOM lookup typing.
- This is now the biggest remaining hard-error cluster.

Recommended next step:

- Tighten the shared chat manager config and DOM element typing first, then revisit `Bleepy.astro` once the underlying helper types are stable.

### 2. Audio typing debt

Primary files:

- `src/utils/site-audio.ts` with `5` hard errors
- `src/utils/site-sfx.ts` with `1` hard error

Dominant failures:

- `ts(7016)` missing `howler` declarations
- `ts(18048)` `window.YT` possibly undefined

Interpretation:

- Small, self-contained cleanup.
- Good candidate for a fast correctness-only pass after the chat-manager blocker.

Recommended next step:

- Add `@types/howler` or a local module declaration, then guard `window.YT` access.

### 3. Animation and banner utility drift

Primary files:

- `src/utils/bannerAnimation.ts` with `7` diagnostics
- `src/config/community.config.ts` with `6` diagnostics
- `src/utils/BannerVideoManager.ts` with `3` diagnostics

Interpretation:

- `bannerAnimation.ts` is mostly noise-level unused parameter/type cleanup.
- `community.config.ts` and `BannerVideoManager.ts` should be kept separate from scene-design changes.

Recommended next step:

- Clean these after the higher-leverage hard failures above. They are not the main blockers now.

## Highest-Volume Files

Top files by emitted diagnostics:

| Diagnostics | Errors | File |
| --- | --- | --- |
| 7 | 7 | `src/utils/bannerAnimation.ts` |
| 7 | 6 | `src/components/bleepy/shared-chat-manager.ts` |
| 6 | 6 | `src/config/community.config.ts` |
| 5 | 5 | `src/utils/site-audio.ts` |
| 5 | 5 | `src/components/svelte/PostEditor/utils/fileUtils.ts` |

## Most Common Diagnostic Codes In The Log

These include non-blocking hints/noise as well as hard failures:

| Count | Code | Meaning |
| --- | --- | --- |
| 51 | `ts(6133)` | unused declarations |
| 27 | `ts(2339)` | missing property on type |
| 13 | `ts(2322)` | assignment/prop incompatibility |
| 12 | `ts(18047)` | possibly `null` |
| 9 | `ts(18048)` | possibly `undefined` |
| 7 | `ts(6196)` | declared but never used |
| 7 | `astro(4000)` | inline script processing hint |
| 6 | `ts(2739)` | type missing required properties |
| 5 | `ts(2345)` | invalid argument type |

## Suggested Execution Order

1. `src/components/bleepy/shared-chat-manager.ts`
2. audio typings
3. warning/hint cleanup in animation/community/banner utilities

## Completed In This Pass

- `src/config/banners/index.ts` no longer appears in the `astro check` error set.
- The banner config aggregator was repaired by restoring module-backed references for exported configs, data, type guards, and validators.
- `src/pages/about/[...slug].astro` no longer appears in the targeted `astro check` error output.
- The about page now uses boolean-safe media detection, valid video attributes, and a typed `WeakMap`-based video loop handler instead of ad-hoc properties on generic DOM elements.
- `src/services/TimelineService.ts` no longer appears in the targeted `astro check` error output.
- The timeline service now builds a strict `TimelineEvent[]`, resolves years through a dedicated helper, and no longer reads nonexistent `BlogPostData` fields such as `isLevel`, `levelId`, or ad-hoc `yIndex`.
- `src/layouts/store/StoreLayout.astro` no longer appears in the targeted `astro check` error output.
- The store layout script now uses a typed `window` extension for its cleanup hook and `swup` integration instead of string-indexed globals.
- `src/stores/friendStore.ts` no longer appears in the targeted `astro check` error output.
- The friend store now normalizes optional timeline fields correctly, types external API posts, avoids deprecated string slicing, and proves scraped publish dates before serializing them.

## Separation Rule

While fixing these, do not mix in generated asset cleanup, model moves, or content deletion. The current failure set is already broad enough that correctness work should stay isolated from repository-content reduction.
