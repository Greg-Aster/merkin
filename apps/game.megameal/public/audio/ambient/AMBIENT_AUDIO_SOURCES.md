# Ambient Audio Sources

This folder contains production ambient tracks and candidate tracks for future
scene music. Runtime scenes must reference only curated production audio through
stable asset IDs in `src/game/assets`.

## Folder Provenance

All audio files currently listed in this folder are original project tracks. No
current production or candidate ambient track in this folder is stock, third
party, or copied from the old runtime. Future additions must either keep this
same original-project provenance or record their different source and usage
rights before promotion.

## Production Manifest Tracks

| Stable ID | File | Owner | Provenance / Usage |
| --- | --- | --- | --- |
| `audio_ambient_portal_deck` | `portal-deck.mp3` | `src/game/assets/ambientAudioAssets.ts` | Original project track; cleared for portal arena playlist music and Observatory `courtyard-breeze` scene music. |
| `audio_ambient_wicked_shadows_whisper` | `Wicked Shadows Whisper.mp3` | `src/game/assets/defaultAssets.ts` | Original project track; cleared for runtime scene music. |
| `audio_ambient_dark_shadows_of_delight` | `Dark Shadows of Delight.mp3` | `src/game/assets/ambientAudioAssets.ts` | Original project track; cleared for runtime scene music. |
| `audio_ambient_shadow_waltz` | `Shadow Waltz.mp3` | `src/game/assets/ambientAudioAssets.ts` | Original project track; cleared for runtime scene music. |
| `audio_ambient_whistling_dreams` | `Whistling Dreams.mp3` | `src/game/assets/ambientAudioAssets.ts` | Original project track; cleared for runtime scene music. |

## Candidate Tracks

These files are not runtime content until a contract owner promotes them to a
stable asset ID, adds them to the selected runtime scene manifest preload and
readiness data, records provenance/licensing here, and validates the scene.

| File | Status | Provenance / Usage |
| --- | --- | --- |
| `2nd half_2nd half(1).mp3` | Candidate | Original project track; not runtime content until promoted. |
| `ComfyUI_00120_.mp3` | Candidate | Original project track; not runtime content until promoted. |
| `Dreamy ambient video game(2).mp3` | Candidate | Original project track; not runtime content until promoted. |
| `Faster.mp3` | Candidate | Original project track; not runtime content until promoted. |
| `Steamboat Dreams.mp3` | Candidate | Original project track; not runtime content until promoted. |
| `Untitled.mp3` | Candidate | Original project track; not runtime content until promoted. |
| `boss-battle-2aup3b.mp3` | Candidate | Original project track; not runtime content until promoted. |
| `shift6_00044_.mp3` | Candidate | Original project track; not runtime content until promoted. |

## Promotion Rules

- Add a stable `audio_*` asset entry in `src/game/assets`.
- Add the promoted audio ID to the owning runtime scene manifest preload and
  readiness assets when first-playable presentation requires it.
- Add scene music or event mappings through `AudioContentManifest`.
- Do not load candidate tracks directly from gameplay, UI, renderer, or browser
  code.
- Confirm the track is still original project audio or record its different
  source/provenance and usage rights here before treating a candidate as
  production runtime content.
