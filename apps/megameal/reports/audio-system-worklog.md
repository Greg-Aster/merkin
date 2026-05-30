# Megameal Audio System Worklog

## 2026-05-28

### Current user-reported failure

- Saved audio preference is on.
- Page loads silent as expected.
- Mouse click starts audio.
- Mousewheel scroll does not start audio.
- Browser console reports Howler/AudioContext autoplay prevention when wheel is used.

### Mistakes to avoid repeating

- Do not keep layering new audio backends on top of the existing system.
- Do not treat browser autoplay policy as the whole answer without tracing the local event path.
- Do not restore a snapshot unless it actually contains the gesture behavior being restored.

### History findings

- `30ce6026` from 2026-05-21 is too old for this specific restore: it does not wire mousewheel as a site audio activation gesture.
- `93c0537a` from 2026-05-22 has a wheel listener in `site-audio-activation.ts`, but no explicit `canAttemptSiteAudioUnlock` gate.
- `5d6b6b20` from 2026-05-25 has wheel activation wired and `canAttemptSiteAudioUnlock(event)` allows a wheel event to attempt audio unlock.
- `479c5d73` from 2026-05-26 changed the wheel unlock path so wheel only attempts unlock after prior `hasSiteAudioUserActivation()`, which matches the observed regression pattern where click works but wheel does not.

### Current corrective action

- Undo the native audio rewrite.
- Restore the audio implementation from `5d6b6b20`, the latest identified snapshot before the wheel unlock gating regression.
- Keep this file updated before making further audio architecture changes.

### 2026-05-28 restore result

- Restored the audio path back to the `5d6b6b20` Howler-based implementation instead of keeping the native audio rewrite.
- Kept the restore narrowed to `src/utils/site-audio-activation.ts` and `src/components/client/SiteSfxBridge.svelte`.
- Removed the later middle-button/pointerdown SFX unlock path that was not part of the earlier wheel-unlock behavior.
- Reverted the wheel gate so `canAttemptSiteAudioUnlock(event)` allows a real wheel gesture to attempt unlock again.
- The restored audio files match `5d6b6b20` behavior; `site-audio-activation.ts` only differs from that snapshot by formatter-normalized array layout.
- Did not restore `30ce6026` because that older snapshot did not include mousewheel activation.

### Validation

- `pnpm --dir apps/megameal exec biome check src/utils/site-audio-activation.ts src/components/client/SiteSfxBridge.svelte`: passed.
- `pnpm --dir apps/megameal type-check`: passed.
- `git diff --check`: passed.
- `pnpm --dir apps/megameal audit:css`: passed with 15 existing baseline items and 0 new CSS audit items.
- No browser smoke or dev-server run was performed; the repository instructions leave runtime checks to the user unless explicitly requested.

### Follow-up diagnosis: wheel still warns and does not unlock

- The live wheel SFX path is `SiteSfxBridge.svelte` `handleWheel` -> `siteSfxManager.unlockFromGesture(event)` -> `ensureHowlerAudioContext()` -> `AudioContext.resume()`.
- The browser warning appears because that path asks Howler/WebAudio to start during a `wheel` event and the browser refuses to treat that wheel event as audio-valid activation.
- History shows two conflicting fixes:
  - `5d6b6b20` changed scroll SFX from `playIfUnlocked('scroll')` to `unlockFromGesture(event)` plus `play('scroll')`, which makes wheel attempt to start audio.
  - `479c5d73` then changed wheel unlock to require previous `hasSiteAudioUserActivation()`, which avoids the direct wheel resume attempt but also prevents wheel from being the first sound-starting gesture.
- The current warning is therefore expected from the restored `5d6b6b20` behavior: wheel is being passed through as an unlock attempt, but the current browser blocks the WebAudio context from starting on that event.
- Next fix should not add another audio backend. It should choose one clear contract: either scroll only plays after audio is already unlocked, or audio must be pre-armed/unlocked through a browser-approved event before scroll SFX and ambience can start.

### 2026-05-28 previous-system restore

- Restored the audio plumbing to the `93c0537a` system, before scroll SFX was changed into a direct audio-unlock attempt.
- `SiteSfxBridge.svelte` now uses `siteSfxManager.playIfUnlocked('scroll')` on wheel again instead of calling `unlockFromGesture(event)`.
- `SiteAudioControl.svelte`, `site-audio.ts`, `site-sfx.ts`, and `site-audio-activation.ts` match the `93c0537a` audio behavior. `site-sfx.ts` keeps an ignored optional event parameter only so newer current call sites do not require unrelated edits.
- Removed the later `site-howler-context.ts` helper and the `canAttemptSiteAudioUnlock(event)` gate because they belonged to the failed event-threaded rewrite.
- Remaining diffs from `93c0537a` in `HomeIntroEnvironment.svelte` and `PortalDemoVideoPlayer.astro` are unrelated portal/asset behavior, not audio unlock plumbing.

### Previous-system restore validation

- `pnpm --dir apps/megameal exec biome check src/components/client/SiteAudioControl.svelte src/components/client/SiteSfxBridge.svelte src/utils/site-audio-activation.ts src/utils/site-audio.ts src/utils/site-sfx.ts`: passed.
- `pnpm --dir apps/megameal type-check`: passed.
- `git diff --check`: passed.
- `pnpm --dir apps/megameal audit:css`: passed with 15 existing baseline items and 0 new CSS audit items.

### Code-only architecture cleanup

- Scope correction: no public audio assets are deleted in this cleanup. The user's request is about audio system architecture, not removing source media files.
- Removed the unused `window.playSiteSfx` global hook from `site-sfx.ts`; live callers use the exported `playSiteSfx()` function or the `megameal:sfx` event bridge.
- Removed the ignored event parameter from `siteSfxManager.unlockFromGesture()` and updated call sites so SFX unlock is no longer threaded through wheel/touchmove events.
- Kept wheel SFX playback-only via `siteSfxManager.playIfUnlocked('scroll')`; wheel must not call `unlockFromGesture()`.
- Removed the unused `playfloor-loop` ambience ID from `packages/shared-audio/src/audio-ids.ts`.
- Added comments in `site-audio-activation.ts`, `site-sfx.ts`, and `SiteSfxBridge.svelte` documenting the no-unlock-from-wheel contract.

### Code-only cleanup validation

- `pnpm --dir apps/megameal type-check`: passed.
- `pnpm --filter @merkin/shared-audio type-check`: passed.
- `git diff --check`: passed.
- `pnpm --dir apps/megameal audit:css`: passed with 15 existing baseline items and 0 new CSS audit items.
- `pnpm --dir apps/megameal exec biome check ...`: failed on existing full-file format/import-order debt in `HomeIntroEnvironment.svelte` and `HomeIntroEnvironmentLoader.svelte`; no formatter write was run because it would create broad unrelated churn during this audio cleanup.

### Ambient playlist support

- Kept one Howler-based ambience system; no second playback engine was added.
- `getTracksForPathname()` now returns every matching track at the most specific route length, so duplicate route entries become a page playlist.
- `siteAudioManager` now stores the current track pool, picks a random first track, and advances through a shuffled queue when a non-looping pooled track ends.
- Single-track pages still loop as before.
- Page-level ambient payloads now accept either one track object or an array of track objects.
- Validation: `pnpm --dir apps/megameal type-check`, `pnpm --filter @merkin/shared-audio type-check`, focused `pnpm --dir apps/megameal exec biome check ...`, `git diff --check`, and `pnpm --dir apps/megameal audit:css:changed` passed.
