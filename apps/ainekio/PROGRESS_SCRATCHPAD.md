# Ainekio Site Overhaul Scratchpad

Updated: 2026-08-27

This is the working record for rebuilding `ainek.io` as an accurate progress
document for the Ainekio robot and its MetaHuman OS integration. It is not an
architecture authority for either source repository.

## Truth Rules

- Treat `/home/greggles/Ainekio` and `/home/greggles/metahuman` as the source
  repositories; verify important claims against current owners and code.
- Separate tracked implementation, active uncommitted work, source validation,
  live runtime evidence, and physical-hardware proof.
- Do not turn plans, named assets, simulator behavior, or protocol completion
  into claims of physical completion.
- Date status snapshots so articles remain honest when development moves again.
- Keep public content free of secrets, local runtime data, private profiles,
  logs, and machine-specific configuration.

## Baseline Audit

- The published site currently has five articles: project overview, parts,
  firmware, software, and discussion.
- Those articles depend on remote Google Docs at runtime and carry hundreds of
  lines of per-post CSS and DOM-repair scripts.
- The content surface omits major current systems: protocol v1, the portable
  body core, gateway/dashboard, simulator parity, camera and audio paths,
  Environment Bridge, Environment Task State, Robot Operator, autonomy modes,
  validation boundaries, and physical bring-up status.
- The project overview has a future-dated `2036-07-04` publication date.
- The visual library is dominated by generic template art and fantasy scenes;
  it does not document the present robot body.
- Generic template remnants remain in the timeline configuration, team page,
  sample assets, and admin-oriented content surfaces.

## Current Source Snapshot

### Ainekio

- Tracked `main` matches `origin/main` at `6ad9051`.
- The tracked repository owns three runtime areas: `Master`, `Slave`, and
  `Emulator`.
- Current tracked work includes the ESP32-S3 controller firmware, protocol-v1
  semantic commands and safety validation, deterministic motion/face/audio
  assets, the gateway and operator dashboard, an authenticated Environment
  adapter, the host body emulator, and the Sesame visual simulator.
- The controller has concrete USB bring-up and firmware validation evidence.
  Full assembled-body validation remains a distinct, incomplete layer.
- `Frame8.blend` and `Frame8.stl` are newer, untracked body-design files. They
  are useful visual references but must be labeled active design work, not a
  published hardware release.

### MetaHuman OS

- Tracked `main` matches `origin/main` at `5191d6fc`.
- Maintained ownership separates Work Coordinator admission, Robot Operator
  scheduling, Environment Mode decisions, Environment Bridge transport, and
  Environment Task State lifecycle/completion.
- Reactive, Semi, and Full modes are implemented as distinct admission modes;
  source/runtime/physical acceptance must remain separate.
- A Robot Status workflow is present as active uncommitted work. The site may
  describe it as in development, but not as completed or released.

## Planned Information Architecture

- A status-led home page with a clear system overview and proof boundaries.
- Start Here: project overview and current status snapshot.
- Body: physical design, parts/power, and firmware/hardware interfaces.
- Runtime: software architecture, protocol and safety, gateway and simulator.
- Intelligence: MetaHuman OS integration, perception/action loop, autonomy.
- Field Notes: focused bring-up articles for camera, voice, motion, and known
  limitations.
- Updates: dated, concise site/project notes rather than a second roadmap.

## Visual Direction

- Use the owner photographs in `public/photos/` as the hard construction
  reference: low open black chassis, four legs, red ridged feet and face module,
  cyan OLED, camera below the display, and exposed boards and wiring.
- Treat `Frame8` as a separate active enclosure revision. Do not depict it as
  installed on the current physical robot.
- Place the construction-faithful robot in intentionally overdramatic science-
  fiction and dystopian landscapes. The contrast between the tiny homemade
  prototype and world-ending scale should be humorous and inspiring.
- Keep one cinematic red, cyan, charcoal, storm, and ruin visual language across
  the hero, article banners, cards, and avatar crops.
- Fantastic settings are editorial illustration, not proof of hardware features,
  physical tests, or project completion.

## Work Log

- [x] Created an official goal and initial plan.
- [x] Read repository instructions and the image-generation workflow.
- [x] Audited current site files, content count, image inventory, and Git state.
- [x] Audited top-level Ainekio ownership and current MetaHuman maintained-source
  boundaries.
- [x] Completed the source-owner and current-status evidence inventory.
- [x] Finalized the article set, taxonomy, and navigation.
- [x] Refactored the home page around status, owner flow, and the field guide.
- [x] Replaced the five remote-document articles with local, durable MDX.
- [x] Added current-status, body, protocol, gateway, vision, voice, MetaHuman,
  and bounded-autonomy field-guide coverage.
- [x] Generated and installed ten construction-faithful cinematic images plus
  avatar crops, using the owner photos as direct references.
- [x] Replaced invalid homepage icon names and verified all six against the
  locally installed Material Symbols collection.
- [x] Used an owner screenshot to repair dark-mode text contrast, strengthen
  homepage card hierarchy, shorten the oversized global banner, and replace all
  ten legacy rotating-banner images with the current robot construction.
- [x] Collapsed the redundant default banner into the homepage project hero;
  standard pages now render without a second large image, while article pages
  retain their own contextual covers.
- [x] Ran focused type, lint, build, icon, route, image-reference, and layout
  checks.
- [x] Reviewed the final diff for stale assets, template remnants, and unrelated
  output.

## Validation Log

- `pnpm type-check` — passed.
- Focused Biome check over all changed Astro/TypeScript files — passed.
- `pnpm build` — passed: 73 static pages built; Pagefind indexed 14 content
  pages and 1,490 words.
- `git diff --check` — passed.
- Published-content audit — ten current field-guide posts, no remote
  `DocsEditorBridge`, page-level `<style>` blocks, invalid text-opacity classes,
  or stale orange-robot copy in active articles/components.
- Icon audit — all six Material Symbols used by the homepage exist in the local
  collection.
- Bannerless-layout audit — built homepage reports `data-banner-scene="none"`,
  zero banner height, and 5rem desktop/mobile navbar clearance.
- Full `pnpm lint` remains nonzero because the unchanged
  `src/pages/friends.astro` has a pre-existing import-order finding. The focused
  changed-file check is clean.
- No dev-server or automated browser smoke harness was run, per repository
  policy. Owner-provided screenshots were used to repair visual contrast,
  banner duplication, and header clearance.
- No CSS file or `<style>` block was added; the homepage redesign uses existing
  utilities and project theme surfaces.
- Temporary STL and external-reference render files were removed from `/tmp`.
