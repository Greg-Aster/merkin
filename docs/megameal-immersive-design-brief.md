# MEGAMEAL Immersive Design Brief

## 1. Why this brief exists

MEGAMEAL already has the right narrative thesis: the site should feel like an
in-universe commercial portal, not a blog wearing a horror skin. The problem is
that the current homepage still reads as three separate systems:

- a cinematic banner
- a route-card stack
- an editorial card block

That split weakens the worldbuilding. This brief turns the existing direction
into one coherent visual and interaction language for the long-term project.

It is written against the current MEGAMEAL implementation, especially:

- `apps/megameal/src/layouts/MainGridLayout.astro`
- `apps/megameal/src/pages/[...page].astro`
- `apps/megameal/src/components/home/UniverseHeroSlide.astro`
- `apps/megameal/src/components/home/HomeIntroHeroSlide.astro`
- `apps/megameal/src/components/home/PortalDestinations.astro`
- `apps/megameal/src/components/home/FeaturedArc.astro`
- `apps/megameal/src/components/home/LatestTransmissions.astro`
- `apps/megameal/src/components/home/FeaturedProductBanner.svelte`
- `apps/megameal/src/components/banner-stage/BannerStage.svelte`
- `apps/megameal/src/types/store-scene.ts`

## 2. Core direction

### One-sentence direction

Build MEGAMEAL as a haunted luxury-retail broadcast: part cosmic showroom,
part contaminated museum, part corporate signal intrusion.

### Design thesis

The homepage should feel like a rotating in-universe ad monument. The store
should feel like the most legible, seductive entry point into the fiction. The
archive, timeline, community, and game should feel like alternate interfaces to
the same corrupted system, not separate products.

### What this borrows from the inspiration set

- `RESN`: mischievous interface behavior, deliberate oddness, tactile motion
- `Immersive Garden`: editorial pacing, elegant restraint, cinematic sectioning
- `Active Theory`: spatial navigation, scene-based UI, depth and atmosphere
- `A Number From the Ghost`: surreal memory logic, wandering mood, emotional drift

### What this must not become

- generic glassmorphism with random neon
- a conventional CMS homepage with better animation
- a game UI pasted onto every screen
- a parody storefront that is only funny and not beautiful
- a luxury aesthetic so polished that the horror disappears

## 3. Moodboard

### Emotional keywords

- ceremonial
- predatory
- holy-but-commercial
- obsolete-futurist
- haunted by convenience
- quietly funny
- tenderly wrong

### Visual world

Think of the site as four materials colliding:

1. `Broadcast darkness`
   Deep black-blue space, smoked glass, low-contrast metal, dim monitor glow.

2. `Retail signal gold`
   Coupon amber, hazard saffron, warm ad-light, premium foil accents.

3. `Museum dust`
   Stone gray, archival paper, residue, faded labels, evidence-board texture.

4. `Cosmic contamination`
   Acid cyan, reactor teal, bruise magenta, intermittent blood-orange alarms.

### Spatial metaphors

- `Homepage`: billboard atrium or corporate signal nave
- `Store`: ceremonial marketplace / product reliquary
- `Archive`: evidence vault / sealed records wing
- `Timeline`: observatory console / cosmology board
- `Community`: uplink room / operator lounge
- `Game`: remote instrument / deep-space control deck

### Image direction

- large silhouetted forms over busy compositions
- strong horizon lines and center-axis symmetry
- isolated objects presented like relics
- a mix of clean ad rendering and damaged media texture
- black negative space used as atmosphere, not emptiness

### Typography direction

Typography should feel stratified, not uniform:

- `Display`: loud, branded, cinematic, slightly vulgar
- `Interface`: compact, industrial, uppercase, signal-like
- `Body`: readable, serious, editorial, never default-looking

Recommended role split:

- Display: keep the existing loud horror/commercial energy for logotype moments
- UI labels: dense uppercase mono or technical grotesk
- Body: a sharper serif or sober text face for lore and product prose

Important rule: do not let every surface use the same voice. MEGAMEAL needs
brand voice, systems voice, and narrative voice.

### Sound and silence

Sound should feel like the building is alive:

- low HVAC-like drones
- soft UI clicks with slight toy-commercial sweetness
- occasional signal sweeps or tuning artifacts
- hover and scene-change sounds only on important actions

Silence matters. Not every movement needs audio.

## 4. Visual system

### Palette

Use a controlled palette with one warm retail lane and one cold systems lane.

```css
:root {
  --mm-bg-void: oklch(0.08 0.02 255);
  --mm-bg-deep: oklch(0.12 0.03 255);
  --mm-surface-0: oklch(0.15 0.03 255 / 0.72);
  --mm-surface-1: oklch(0.19 0.04 255 / 0.8);
  --mm-surface-2: oklch(0.24 0.05 255 / 0.88);

  --mm-text-strong: oklch(0.95 0.01 95);
  --mm-text-body: oklch(0.82 0.03 100);
  --mm-text-muted: oklch(0.66 0.03 100);

  --mm-line-soft: oklch(0.52 0.03 255 / 0.34);
  --mm-line-strong: oklch(0.78 0.06 85 / 0.42);

  --mm-acid-cyan: oklch(0.8 0.14 205);
  --mm-signal-gold: oklch(0.83 0.14 88);
  --mm-alert-red: oklch(0.64 0.21 25);
  --mm-bruise-violet: oklch(0.62 0.17 320);
  --mm-decay-green: oklch(0.72 0.12 155);
}
```

### Surface rules

- Use fewer but more intentional surfaces.
- Prefer layered dark materials over flat black.
- Keep panels semi-translucent only when something meaningful sits behind them.
- Mix one clean premium edge with one damaged edge.

A good surface formula:

```css
.mm-panel {
  background:
    linear-gradient(180deg, rgb(255 255 255 / 0.05), rgb(255 255 255 / 0.015)),
    linear-gradient(180deg, rgb(5 10 24 / 0.84), rgb(3 6 18 / 0.92));
  border: 1px solid var(--mm-line-soft);
  box-shadow:
    0 20px 60px rgb(0 0 0 / 0.35),
    inset 0 1px 0 rgb(255 255 255 / 0.05);
  backdrop-filter: blur(10px) saturate(1.04);
}
```

### Density rules

- Hero scenes: sparse, monumental, one focal statement
- Scene overlays: medium density, 3 to 5 information clusters
- Store sheet: dense but legible, because legibility is part of the joke
- Lore surfaces: slower and calmer than commerce surfaces

### Shape language

- rounded corners are acceptable, but should feel engineered, not playful
- use capsules and pill labels for system signals
- reserve perfect circles for controls, play states, and status beacons
- mix broad radii with thin grid lines and hard rule dividers

## 5. Interaction language

### Global behavior

The site should behave like a reactive environment, not a pile of components.

Every page should have:

- an ambient motion bed
- one dominant focal layer
- one responsive layer that reacts to pointer or scroll
- one small anomalous moment

### Interaction principles

1. `Legibility first, distortion second`
   The visitor should understand the base interaction before the weirdness starts.

2. `Motion should imply machinery`
   Movement should feel driven by stages, shutters, belts, carousels, signals,
   and lenses, not floating divs.

3. `Weirdness should be sparse`
   One off-key moment per view is stronger than ten.

4. `Depth is earned`
   Use parallax and 3D only where it helps hierarchy, orientation, or mood.

5. `Hover means inspection`
   Hover states should feel like the system is scanning, revealing, or pricing.

### Hover vocabulary

- faint border ignition
- localized noise pulse
- asset zoom of 1.02 to 1.05 max
- shimmer wipe across key labels
- tiny copy changes on unstable products
- secondary metadata becoming visible only on attention

Avoid:

- oversized bouncy easing
- huge scale jumps
- permanent cursor gimmicks across the whole site

### Scroll vocabulary

Homepage scroll should feel like descending through a program schedule:

- active scene stays luminous
- adjacent scenes dim but remain present
- one strong scene snap per viewport
- transition emphasis on veil, shutter, or crossfade

Archive and store pages should scroll more conventionally, but with:

- gentle reveal masks
- subtle stage dimming
- occasional pinned inventory or document modules

### Scene transition vocabulary

Use only three primary transition modes:

- `fade veil`
  For serene movement between atmospheric scenes.

- `signal cut`
  For abrupt jumps into products, alerts, and reveals.

- `glitch interrupt`
  For rare anomaly beats, price corruption, or forbidden routes.

That matches the existing `BannerStage` transition model cleanly:

- `fade`
- `cut`
- `glitch`

## 6. Homepage direction

### Current issue

The current portal homepage already has strong ingredients, but they are
separated into modules:

- `UniverseHeroSlide` establishes scale
- `HomeIntroHeroSlide` establishes portal framing
- `PortalDestinations` provides route clarity
- `FeaturedArc` and `LatestTransmissions` provide discovery

The long-term homepage should make those feel like one continuous broadcast.

### Target homepage structure

#### Stage 1: `home-intro`

Purpose:

- establish MEGAMEAL as a live in-universe signal
- feel ceremonial, not explanatory
- replace the feeling of "landing on a site"

Content:

- one title statement
- one subline about portal access
- three route CTAs max
- background motion with subtle contamination

Look:

- not a centered glass card
- more like a giant transmission plaque or ad monolith
- strong vertical composition
- atmospheric background, minimal text, premium menace

#### Stage 2: rotating billboard scenes

Each billboard should feel like a campaign, not a card.

Recommended scene family:

- `timeline-billboard`: cosmology, signal cartography, observatory rhetoric
- `store-billboard`: luxury commerce with wrong undertones
- `archive-billboard`: sealed dossiers, evidence grid, reading as investigation
- `game-billboard`: starfield instrumentation and remote navigation
- `community-billboard`: uplink, channel traffic, warm human presence inside cold systems
- `featured-arc-billboard`: prestige trailer for a story line
- `latest-transmissions-billboard`: ticker or signal bulletin, not card grid

#### Stage 3: overlays, not stacked furniture

The current editorial content should return as overlays and inserts:

- transmission ticker
- sponsored corruption card
- scene-specific metadata rail
- live status badges

The homepage should not end up with a hero plus a second homepage underneath it.

### Homepage composition rules

- one giant focal headline
- one dominant CTA cluster
- one supporting metadata cluster
- one atmospheric animation layer
- one route-specific motif

## 7. Store direction

### Core idea

The store is the cleanest doorway into the fiction because commerce is familiar.
That familiarity must stay intact. The unsettling part comes from behavior,
copy, and framing.

### What the current store already gets right

- strong listing hierarchy
- category and availability logic
- featured listing treatment
- schema direction in `store-scene.ts`
- quirk support and media polymorphism

### What to push harder

- make the store feel more ceremonial and less like a styled catalog
- make category pages feel like departments inside a mythic retailer
- make product detail pages feel like reliquaries or showroom bays
- turn reviews and specs into lore surfaces without losing shopping clarity

### Store art direction

The store should look like:

- an expensive department store rendered by a cult
- museum labels colliding with product marketing
- clean product photography invaded by unstable media

### Store module language

- `thumbnail rail`: specimen tray / proof strip
- `main media`: altar, showroom plinth, or product chamber
- `sheet fields`: clean, Amazon-legible hierarchy with one wrong note
- `panels`: dossier drawers or disclosure bays
- `cart`: tray, basket, or intake queue, not generic mini-cart

## 8. CSS implementation brief

### Token groups to create or formalize

- `--mm-bg-*` for environmental layers
- `--mm-surface-*` for cards, drawers, and overlays
- `--mm-text-*` for hierarchy
- `--mm-accent-*` for warm retail and cold systems
- `--mm-shadow-*` for depth
- `--mm-noise-opacity-*` for texture intensity
- `--mm-motion-duration-*` and `--mm-motion-ease-*`

### Structural utility recipes

```css
.mm-stage-shell {
  position: relative;
  overflow: clip;
  border-radius: clamp(1rem, 2vw, 1.75rem);
  background:
    radial-gradient(circle at 50% 0%, rgb(255 213 74 / 0.06), transparent 38%),
    linear-gradient(180deg, rgb(5 10 24 / 0.74), rgb(2 5 14 / 0.94));
  border: 1px solid var(--mm-line-soft);
  box-shadow: 0 30px 80px rgb(0 0 0 / 0.4);
}

.mm-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 2rem;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--mm-signal-gold) 35%, transparent);
  background: rgb(10 16 34 / 0.74);
  color: var(--mm-text-body);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.mm-rule {
  height: 1px;
  background:
    linear-gradient(90deg, transparent, var(--mm-line-strong), transparent);
}

.mm-noise-overlay::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: var(--mm-noise-opacity, 0.08);
  mix-blend-mode: soft-light;
  background-image:
    radial-gradient(circle at 20% 20%, rgb(255 255 255 / 0.08), transparent 18%),
    radial-gradient(circle at 80% 60%, rgb(255 255 255 / 0.05), transparent 22%);
}
```

### Type scale guidance

```css
:root {
  --mm-step--1: clamp(0.72rem, 0.69rem + 0.08vw, 0.82rem);
  --mm-step-0: clamp(0.92rem, 0.88rem + 0.16vw, 1.02rem);
  --mm-step-1: clamp(1.12rem, 1.03rem + 0.45vw, 1.38rem);
  --mm-step-2: clamp(1.42rem, 1.18rem + 1vw, 2rem);
  --mm-step-3: clamp(1.85rem, 1.35rem + 2vw, 3.1rem);
  --mm-step-4: clamp(2.6rem, 1.7rem + 4vw, 5.8rem);
}
```

### Texture rules

- keep noise subtle and mostly visible in light sweeps
- use scanlines only in media and signal states
- use chromatic aberration only during anomaly events
- never stack blur, noise, glow, and grain at full strength together

## 9. Motion brief

### Motion personality

Motion should feel expensive, slow, and mechanical until the world misbehaves.
Then it should become brief, sharp, and slightly rude.

### Motion tokens

```css
:root {
  --mm-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --mm-ease-smooth: cubic-bezier(0.33, 1, 0.68, 1);
  --mm-ease-cut: cubic-bezier(0.55, 0, 0.45, 1);

  --mm-dur-fast: 160ms;
  --mm-dur-base: 320ms;
  --mm-dur-slow: 680ms;
  --mm-dur-scene: 1100ms;
}
```

### Motion patterns

#### 1. `Ambient drift`

Use for:

- star fields
- fog
- halos
- product chamber light

Rules:

- durations between 12s and 40s
- no large translations
- almost always alternate

#### 2. `Reveal mask`

Use for:

- billboard copy
- route metadata
- product title and price

Rules:

- opacity plus clip-path or translateY
- never more than 24px travel
- stagger only 40ms to 90ms

#### 3. `Attention ignition`

Use for:

- CTA hover
- active stage
- featured badge

Rules:

- border brightens before background changes
- scale max 1.02
- allow text color to change last

#### 4. `Signal interruption`

Use for:

- price drift
- cart refusal
- region restriction
- anomaly reveal

Rules:

- 80ms to 180ms bursts
- use 2 to 4 corrupted frames, not long glitch loops
- keep it event-based, never ambient

### Scroll rhythm

Homepage:

- scene settles
- next scene approaches
- current scene dims others
- copy reveals late, after spatial lock-in

Store and archive:

- much calmer
- pinned media and sheet interactions do the heavy lifting

### Reduced motion rules

- keep opacity changes
- remove tilt, parallax drift, and glitch bursts
- preserve hierarchy and state feedback
- avoid using reduced motion as an excuse for a dead layout

## 10. Interaction recipes by surface

### Homepage intro recipe

1. Background signal field is already alive before copy appears.
2. A branded title plane resolves in 300ms to 500ms.
3. Eyebrow and status copy fade in with delayed certainty.
4. CTAs arrive as if mounted by the system, not popped in.
5. One micro-anomaly occurs before the user scrolls or interacts.

### Billboard scene recipe

1. Establish atmosphere with image or motion bed.
2. Reveal route identity.
3. Reveal 1 strong action.
4. Reveal 1 metric, warning, or system tag.
5. On hover or focus, expose a second layer of lore or commercial detail.

### Store product recipe

1. Thumbnail selection changes the chamber state cleanly.
2. Main asset gets full attention and breathing room.
3. Sheet fields remain familiar and fast to parse.
4. One quirk creates discomfort.
5. Panels below deepen the fiction without breaking product flow.

### Archive recipe

1. Establish case-file or record tone immediately.
2. Let imagery feel recovered, not fully polished.
3. Keep reading path obvious.
4. Use labels, stamps, and sequence markers as navigation aids.

## 11. Practical mapping to current files

### Keep and evolve

- `UniverseHeroSlide.astro`
  Keep the sense of scale, but reduce the current "centered landing-page hero"
  feeling. Rebuild as a scene layer, not a standalone hero card.

- `HomeIntroHeroSlide.astro`
  Keep the portal framing and title-card logic, but replace the centered card
  with a more architectural, stage-native composition.

- `PortalDestinations.astro`
  Keep the route clarity and content model. Move its information into billboard
  scenes and overlays.

- `FeaturedArc.astro`
  Keep the arc logic, but re-art direct it as a prestige campaign insert rather
  than a premium blog card.

- `LatestTransmissions.astro`
  Keep the freshness function, but turn it into a broadcast ticker or rotating
  bulletin surface.

- `FeaturedProductBanner.svelte`
  Keep the product schema and quirk model. Elevate the visual framing so it
  feels like a flagship showroom.

- `BannerStage.svelte`
  This should become the primary runtime for all homepage scenes.

### Retire over time

- route-card homepage stacking as permanent layout furniture
- generic card-grid feeling on the first homepage
- repeated glass card treatment across unrelated surfaces

## 12. Roadmap

### Phase 1: visual tokens and stage language

- formalize palette, surface, shadow, and motion tokens
- create reusable scene-shell classes
- unify badge, kicker, and divider styles

### Phase 2: homepage intro rebuild

- replace the current intro card with a stage-native `home-intro`
- make the opening feel like signal architecture
- reduce explanatory copy, increase atmosphere

### Phase 3: billboard conversion

- convert timeline, store, archive, game, and community into scene campaigns
- absorb route-card content into those scenes
- use `BannerStage` as the single homepage scene runtime

### Phase 4: editorial overlays

- reintroduce arc and transmission discovery as inserts
- convert static homepage sections into overlays, tickers, or interstitial scenes

### Phase 5: store elevation

- unify flagship and non-flagship product pages under the same showroom logic
- strengthen cart, drawer, and checkout as in-universe surfaces
- expand quirk behaviors with stricter visual language

### Phase 6: archive and timeline refinement

- make the archive feel like a vault, not a post index
- make the timeline feel like an observatory instrument, not a feature page

## 13. Quality bar

The redesign is succeeding when:

- the homepage reads as one authored world, not multiple sections
- the store is the clearest and most seductive entry into the fiction
- every major route feels like the same universe seen through a different machine
- motion feels intentional and expensive, not busy
- weirdness is precise enough to be memorable
- mobile still feels atmospheric, not stripped bare

## 14. Short version

If a decision is ambiguous, choose the option that feels:

- more like a place than a page
- more like a campaign than a card
- more legible before it becomes strange
- more ceremonial than generic
- more beautiful than merely clever
