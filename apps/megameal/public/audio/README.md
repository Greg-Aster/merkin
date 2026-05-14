Place site-wide audio assets here.

Recommended structure:

- `ambient/`
- `sfx/`
- `ui/`

Suggested naming:

- `ambient/portal-loop.ogg`
- `ambient/archive-hum.ogg`
- `sfx/nav-select.ogg`

Use compressed loop-friendly formats such as `.ogg` or `.mp3`.
Keep ambient tracks trimmed, seamless, and modest in file size so the site stays fast.






Implementation Plan

This is the concrete repo plan I’d use for this monorepo.

Phase 1: Shared Data Layer

Create two new packages.

New files:

packages/shared-content/package.json
packages/shared-content/tsconfig.json
packages/shared-content/src/types.ts
packages/shared-content/src/normalize-post.ts
packages/shared-content/src/normalize-product.ts
packages/shared-content/src/normalize-quiz.ts
New files:

packages/shared-data/package.json
packages/shared-data/tsconfig.json
packages/shared-data/src/build/build-posts-manifest.ts
packages/shared-data/src/build/build-timeline-manifest.ts
packages/shared-data/src/build/build-game-stars-manifest.ts
packages/shared-data/src/index.ts
packages/shared-data/generated/.gitkeep
Change these files:

package.json
add root scripts:
build:shared-data
build:megameal:full
build:game:full
Purpose:

stop the game from reading MEGAMEAL content directly at runtime/build time
generate canonical static JSON once, then let both apps consume it
Phase 2: Replace Cross-App Content Loading in Game

The current fragile file is apps/game/src/content/config.ts. It reaches directly into apps/megameal/src/content/posts, which is exactly the coupling that needs to go.

Change these files:

apps/game/src/content/config.ts
remove cross-app glob() loader usage entirely
apps/game/src/services/TimelineService.ts
refactor to read from packages/shared-data/generated/game-stars.json
apps/game/src/services/TimelineService.client.ts
keep client filtering only, no content ownership
apps/game/src/pages/index.astro
import shared manifest instead of depending on local content collection behavior
New generated outputs to consume:

packages/shared-data/generated/posts.json
packages/shared-data/generated/timeline.json
packages/shared-data/generated/game-stars.json
Purpose:

remove the existing game build warning about content collection assumptions
make the game a pure consumer of shared static data
Phase 3: Main Site Consumption of Shared Data

The main site can stay Astro-content-first for now, but it should start using shared manifests where integration matters.

Change these files:

apps/megameal/src/pages/[...page].astro
apps/megameal/src/components/home/PortalDestinations.astro
apps/megameal/src/components/home/FeaturedArc.astro
apps/megameal/src/pages/archive/index.astro
Use shared data first for:

route counts
timeline summary cards
game destination metadata
archive summary surfaces
Purpose:

keep the site and game reading the same normalized story graph
Phase 4: Shared Audio Conventions

Create one shared audio/config package.

New files:

packages/shared-audio/package.json
packages/shared-audio/tsconfig.json
packages/shared-audio/src/audio-ids.ts
packages/shared-audio/src/site-audio-profile.ts
packages/shared-audio/src/game-audio-profile.ts
Then migrate:

apps/megameal/src/config/audio.ts
apps/megameal/src/utils/site-sfx.ts
apps/game/src/threlte/systems/Audio.svelte
Purpose:

same audio vocabulary across both apps
different per-app mixes, same IDs and behavior model
Phase 5: Cleanup and Deployment

Change:

package.json
Add/fix scripts:

build:shared-data
build:megameal:full
build:game:full
deploy:all should include shared-data generation plus separate Megameal and game deploys
Recommended Order of Work

Build packages/shared-content and packages/shared-data.
Refactor apps/game/src/content/config.ts out of the game.
Switch apps/game/src/services/TimelineService.ts to generated manifests.
Move audio config into packages/shared-audio.
Tighten deploy scripts.
Key Architectural Rule

After this pass:

apps/game should never reach into apps/megameal/src/content/*
both apps should depend on packages/shared-data/generated/*
megameal.org/game should redirect to game.megameal.org, not proxy the game
