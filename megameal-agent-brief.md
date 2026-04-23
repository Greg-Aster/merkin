# MEGAMEAL — Unified Banner Stage & Product Widget: Agent Brief

## 0. Purpose of this document

This document is context for a coding agent. It contains (a) the creative
thesis of the site so design decisions have a reference frame, (b) the
architectural approach agreed on, and (c) a concrete implementation plan.
Read all three sections before starting work — many small UI decisions only
make sense once the creative thesis is understood.

---

## 1. Creative thesis (the *why*)

MEGAMEAL is a transmedia cosmic-horror / hyper-capitalist parody universe.
The site lives at megameal.org and is built on Astro + Svelte + Threlte +
Tailwind, on top of a custom template called Temporal Flow (also by the
same author).

The site currently reads like a conventional blog CMS with a strong visual
skin — a reverse-chronological content list with navigation cards. The
creative intent is the opposite: the visitor should feel they've entered
a *world*, not arrived at a *website about a world*. Every surface of the
site should feel in-universe. Friction that reveals texture is good.
Friction that hides content is bad.

The central creative decision driving this work: **the store is the
portal into the universe**. Because the universe is a parody of hyper-
capitalism, a fake storefront is the thematically correct point of entry.
Products are not merchandise — products are *story nodes delivered through
a shopping interface*. Each product is a short piece of fiction wearing an
e-commerce UI. The uncanniness of that disguise is the point.

This reframes the site's dominant page pattern. Over time, the product
page becomes the primary content surface, and other surfaces (Timeline,
Archive, Cookbook) become alternative *indexes* into the same underlying
content, viewed through different diegetic lenses:

- Store view — commerce lens
- Timeline view — chronology lens
- Archive view — case-file / redacted-document lens
- Cookbook view — recipe lens

Same underlying data, different windows onto it. This work does not
require committing to that full vision yet, but the data model should be
shaped so it remains possible.

---

## 2. Architectural approach (the *how*)

### 2.1 Unify the banner systems

The site currently has several distinct "banner" systems — video banner,
image banner, timeline banner, viewport/cockpit banner. They share a slot
and sizing contract but little else. These should be unified into one
system before the product widget is built, because the product widget is
not a new banner variant — it is a new kind of interactive experience
that wants to plug into the same slot, and several more such experiences
are coming (cockpit HUD, transmission viewer, surveillance monitor, etc.).

The unified architecture has three layers:

**Layer 1 — The Stage.** One Svelte component, `<BannerStage>`, owns the
banner slot. Its responsibilities:
- Mount the right Scene for the current page.
- Handle transitions between scenes (fade, cut, glitch — scene-selectable).
- Expose a shared context to mounted scenes: theme tokens, audio bus,
  global state (cart, visitor cookie, etc.).
- Pick a scene from a weighted registry when the page allows
  randomization (e.g., the home page).
- Support cookie-based dedup so returning visitors see different scenes.

The stage does NOT know what a product widget is, what a video player
is, what a cockpit is. It only knows how to mount Scenes.

**Layer 2 — Scenes.** A Scene is a self-contained interactive experience
satisfying a common interface. The interface (roughly):

```ts
interface Scene {
  // Props passed by the stage
  props: SceneProps;

  // Events the scene can emit up to the stage / page
  events:
    | { type: 'add-to-cart'; item: CartItem }
    | { type: 'navigate'; href: string }
    | { type: 'open-modal'; modalId: string }
    | { type: 'request-expand' | 'request-collapse' }
    | { type: 'scene-done' };
}
```

Scenes are registered in a central registry that maps scene IDs to
their components + metadata (weight, page-eligibility, media assets).
Adding a new scene is a one-line registration. The existing banner
types should all be ported to scenes as step 1 of this work —
mechanical migration, no behavior change.

**Layer 3 — Scene-internal components.** Inside a scene, regular
components: thumbnails, viewers, panels, 3D canvases. These don't
know about the stage. They're just the internals of their parent scene.

### 2.2 The product widget scene

The product widget is one (very important) scene type. It follows a
familiar e-commerce layout — thumbnails left, main viewer center, product
sheet right, expandable panels below — but with diegetic weirdness baked
in. The layout should read as "Amazon-esque" to a first-time visitor
within a second, because that legibility is what makes the deviations
feel unsettling.

**Thumbnails (left rail).** A vertical strip of media previews.
Thumbnails are polymorphic: each is a `MediaAsset` with a `type` field.
Clicking a thumbnail tells the main viewer to load that asset. Supported
types from day one:

- `image` — static image
- `video` — webm/mp4 with poster frame
- `model3d` — Threlte-rendered 3D model, user-draggable
- `iframe` — embedded arbitrary page (used sparingly, for weirdness)
- `scene` — a nested scene (for later; allows a thumbnail to be a
  mini interactive experience)

Preview renderers must handle each type. On mobile the thumbnails
become a horizontal strip above the viewer.

**Main viewer (center).** A polymorphic renderer that dispatches on the
selected asset's type. Implementations:

- Image: simple `<img>` with zoom-on-hover.
- Video: custom player with diegetic controls (the controls themselves
  can have in-universe branding).
- 3D: Threlte canvas with OrbitControls-equivalent, a soft studio
  lighting rig, and a neutral-to-brand background. Mobile performance
  budget: target 30fps on mid-tier phones; allow a `lowPolyFallback`
  field on `model3d` assets so the heavier model is skipped on
  constrained devices.
- iframe / scene: mount as appropriate, sandboxed where relevant.

**Product sheet (right rail).** Schema-driven — do NOT hardcode
"description, price, availability, reviews." Accept a list of fields,
each with a type. Built-in field types at launch:

- `text` — a block of prose
- `price` — a formatted currency value; supports `quirks` (e.g., the
  value drifts over time)
- `availability` — a stock status string; supports custom values like
  "CLASSIFIED", "DISCONTINUED AFTER ASCENSION", etc.
- `rating` — star rating with count
- `button` — an action button (primary use: add-to-cart); action is
  handled by an `onAction` hook on the product
- `link` — a labeled link to another product, arc, or page
- `meta` — key/value pair for miscellaneous fields (Classification
  Level, Last Known Location, Batch ID, etc.)

Adding new field types later should not require touching the widget
itself — just register a new renderer.

**Expandable panels (below widget).** Clicking certain sheet elements
expands a panel beneath the widget rather than navigating away:

- "See reviews" → reviews panel
- "Specifications" → specs panel
- "Shipping & returns" → policies panel (use this for dystopian
  fine print)
- "Related items" → horizontal rail of other products

Only one panel open at a time. Smooth expand/collapse. Panels are their
own components that receive the product as a prop.

**Reviews as lore delivery.** Reviews are a content type, not hardcoded
strings. A review has:

- `author` (string, or link to a character page)
- `rating` (number)
- `date` (in-universe, so can be anything)
- `body` (MDX — yes, MDX; reviews can include links, media, and
  formatted text)
- `attachments` (optional MediaAssets — a reviewer "photo")
- `verified` (bool — "verified consumer," etc.)
- `flags` (string[] — "flagged by moderators", "removed and restored",
  "author disappeared", etc., rendered as small annotations)

Reviews live in their own content collection so they can be cross-linked,
indexed, and referenced from multiple products or story arcs.

**Quirks (the behavioral weirdness).** Every product can have a `quirks`
array. A quirk is a small, named behavior that fires on specific
interactions. Quirks are the engine of the capitalist-parody payoff —
they make the store feel *wrong* in ways the visitor can feel.

Examples of quirks to support from launch:
- `price-drift` — price value fluctuates every N seconds; never settles
- `add-to-cart-refuses` — add-to-cart button shakes and shows an
  in-character error ("This item cannot be added at this time.")
- `add-to-cart-duplicates` — adds N copies instead of 1
- `add-to-cart-self-fires` — item adds itself on page load
- `unavailable-in-region` — "Not available in your area" badge overrides
  the add-to-cart button and links to a specified destination
- `glitch-on-hover` — image or model briefly replaces with a different
  asset on hover
- `review-links-elsewhere` — reviews contain links that go somewhere
  unexpected when clicked

Quirks should be implemented as a plugin registry so new ones can be
added without touching the widget core.

### 2.3 The cart

The cart is a small reactive Svelte store with `add`, `remove`, `clear`,
and a subscribable state. Two properties matter:

1. **Products can mutate the cart in weird ways.** The cart must be
   exposed to quirks so a product's `onAddToCart` can do something
   other than the default add.
2. **The cart display is itself diegetic.** The cart icon, the cart
   sidebar, and the checkout flow should all be in-universe. They do
   not need to actually process payments — the entire "checkout" is a
   story surface. The end of the checkout flow can lead somewhere
   narrative (a confirmation screen that is itself a story node).

Persistence: cart contents persist in a cookie / localStorage across
sessions. This matters because some quirks are best felt across
visits ("I left, came back, and the weird item was still in my cart").

### 2.4 Home page scene rotation

The home page should be treated as a **cycling ad billboard with links**,
not as a single featured-product slot and not as a conventional CMS home
page. The first thing a visitor sees should be a new animated intro scene
that replaces the old static HTML welcome card and establishes the site as
an in-universe commercial portal.

The opening scene must:

- present a clear identity statement
- establish world tone immediately
- use motion, layered UI, and dynamic elements rather than static copy
- hint at products, broadcasts, propaganda, archive material, and other
  site surfaces
- explicitly invite the visitor into the world

After the intro scene, the banner should continue as a randomized sequence
of billboard-style ads for different parts of the site. These should feel
like commercials, propaganda spots, or system promos rather than neutral
navigation panels. The order should not be predictable on every visit or
refresh.

For now, avoid cookie-based dedup. The desired behavior is lighter:

- intro scene always loads first
- subsequent ad scenes are randomized
- randomness may use weights, but should not persist visitor history

The registry metadata can still support:

- `weight` (base probability)
- `eligiblePages` (which routes can show this scene)
- `minIntervalDays` (reserved for future persistence-aware rotation if
  needed later)

The important architectural change is that existing homepage content that
currently appears as cards below the banner should be merged into the banner
scene system so the banner is not duplicating the same information in two
places. Specifically:

- chronology console overlay should be merged into the timeline / destination
  ad scene
- enter game mode card should be merged into the launch star observatory ad
  scene
- read story arcs card should be merged into the archive ad scene
- browse the store card should be merged into the storefront ad scene
- join the community card should be merged into the community channels ad
  scene

Featured story arc and latest transmissions should also become banner scenes
or overlays instead of static homepage panels.

The target end state for the homepage is:

- navbar
- main animated billboard banner with intro + rotating multimedia ads
- bottom-right sponsored / floating ad unit if it still earns its keep
- footer

That is all. Navigation already exists in the navbar; the banner should be
the primary point of entry into the site's major surfaces.

---

## 3. Data model sketch

All products live as MDX in a content collection so description, reviews,
and metadata sit together and are authorable without code changes.

```ts
// Product frontmatter
interface Product {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  brand?: string;               // in-universe brand (MegaCorp, etc.)
  category?: string[];
  media: MediaAsset[];          // thumbnails + main-viewer sources
  sheet: ProductField[];        // right-rail fields, in order
  panels: PanelConfig[];        // which panels this product shows
  reviews: string[];            // IDs of reviews in the reviews collection
  quirks?: Quirk[];
  relatedProducts?: string[];
  // for scene rotation
  sceneWeight?: number;
  eligiblePages?: string[];
  minIntervalDays?: number;
}

interface MediaAsset {
  id: string;
  type: 'image' | 'video' | 'model3d' | 'iframe' | 'scene';
  src: string;
  thumbnail?: string;
  alt?: string;
  // type-specific fields
  poster?: string;              // video
  lowPolyFallback?: string;     // model3d
  autoplay?: boolean;           // video
  cameraPreset?: string;        // model3d
}

interface ProductField {
  type: 'text' | 'price' | 'availability' | 'rating' | 'button'
      | 'link' | 'meta';
  label?: string;
  value: any;                   // type depends on field type
  quirks?: string[];            // names of quirks attached to this field
}

interface Quirk {
  name: string;
  params?: Record<string, unknown>;
}

// Review frontmatter (separate collection)
interface Review {
  id: string;
  author: string;
  authorLink?: string;
  rating: number;
  date: string;                 // free-form, can be in-universe
  body: string;                 // MDX content
  attachments?: MediaAsset[];
  verified?: boolean;
  flags?: string[];
  linksTo?: string[];           // product/arc/page IDs this review points at
}
```

---

## 4. Milestones

Work proceeds in ordered milestones. Each one leaves the site in a
working, deployable state. Do not combine milestones into a single PR.

### Milestone 1 — BannerStage abstraction
- Create `<BannerStage>` with scene registry, shared context, transition
  layer, and cookie-based scene-rotation utility.
- Do NOT change any user-facing behavior yet. The stage ships empty
  (or wrapping existing banners pass-through) and is not yet used.
- Deliverable: unit-testable stage with a mock scene.

### Milestone 2 — Migrate existing banners to scenes
- Each existing banner type becomes a Scene satisfying the interface.
- Replace the current per-page banner mounting with `<BannerStage>`
  passing the appropriate scene.
- No visual or behavioral regressions. This is a mechanical refactor.
- Deliverable: site looks identical; banners are now scenes.

### Milestone 3 — Data model + content collections
- Add Astro content collections for `products` and `reviews`.
- Add TypeScript types as sketched in section 3.
- Add 2–3 placeholder products and 5–10 placeholder reviews for
  development (real content comes later).
- Deliverable: typed content pipeline, example products visible via
  simple test page.

### Milestone 4 — Cart store + diegetic cart UI
- Reactive cart store with add/remove/clear and subscription.
- Cart icon in the site header, cart sidebar/drawer, placeholder
  checkout page.
- Persistence across sessions.
- Deliverable: can add items from a test page and see them in the cart.

### Milestone 5 — Product widget scene (core)
- The full three-column layout: thumbnail rail, polymorphic main
  viewer, schema-driven product sheet.
- Expandable panels below (reviews, specs, related).
- Mobile-responsive (thumbnail rail becomes horizontal above viewer;
  product sheet stacks below viewer).
- Works with all three primary media types: image, video, 3D.
- Deliverable: a fully functioning product page for one placeholder
  product, no quirks yet.

### Milestone 6 — Quirks engine
- Quirk plugin registry.
- Implement the quirks listed in section 2.2.
- Wire quirks to the cart, the sheet, the media viewer, and the
  reviews panel.
- Deliverable: a "showcase product" demonstrating several quirks.

### Milestone 7 — Flagship product: Snuggaloids
- End-to-end integration: real 3D model, real video ad thumbnail,
  real image thumbnails, real reviews (some normal, some linking
  elsewhere, some flagged), "Not available in your area" quirk,
  custom cart behavior.
- This product is both the demo and the integration test.
- Deliverable: /store/snuggaloids is visitor-ready.

### Milestone 8 — Home page billboard system
- Replace the current homepage banner logic with a true billboard-style
  scene system built on `<BannerStage>`.
- Build a new animated intro scene that always loads first on the home page.
- Remove the `featured-product-utilitybar` from the first-load homepage
  experience.
- Randomize subsequent homepage ad scenes so the order is not predictable.
- Refactor existing webm/banner slides so they read as stronger ads for
  different parts of the site rather than simple route promos.
- Add more video / scene variety so the billboard cycle has enough range to
  feel alive.
- Merge homepage destination cards into their corresponding banner scenes so
  the banner carries the information and the old card stack can be removed.
- Move featured story arc / latest transmissions into the banner system as
  scenes or scene overlays instead of static homepage panels.
- Keep a fallback intro/house scene if the randomized pool is empty.
- Deliverable: homepage becomes a polished animated portal with intro scene,
  randomized multimedia ad cycle, and no redundant CMS-style card sections
  beneath it.

### Milestone 8 — Implementation breakdown

Work this milestone in phased passes so the homepage stays deployable while
moving from the current hybrid portal to the final billboard architecture.

**Phase 8.1 — Scene inventory and content mapping**
- Inventory the current homepage banner slides, lower homepage cards, and
  sponsored overlay behavior.
- Map each lower homepage card to a banner-scene target so information is
  merged rather than duplicated.
- Confirm which existing video/webm assets can be reused immediately and
  which need editing, replacement, or entirely new material.
- Deliverable: a scene/content matrix covering intro, timeline, archive,
  store, community, featured arc, and latest transmissions.

**Phase 8.2 — Intro scene**
- Replace the current first-load featured-product banner with a new animated
  intro scene.
- Remove the `featured-product-utilitybar` from the first-load homepage
  experience.
- Make the intro feel like a living commercial gateway using layered motion,
  animated text treatment, dynamic calls to action, and in-universe signals.
- Preserve accessibility and reduced-motion fallbacks from the start.
- Deliverable: homepage loads into a strong, self-contained intro scene
  before any rotating ad content begins.

**Phase 8.3 — Ad-scene pool**
- Refactor the existing homepage banner slides into explicit ad scenes rather
  than a loose set of mixed banner items.
- Make the post-intro rotation randomized instead of strictly sequential.
- Keep support for weights and page eligibility, but do not require cookies
  or persistence for the first production version.
- Add transition and hold timing controls per ad scene so scenes can differ
  in pacing.
- Deliverable: the homepage rotates through a real pool of billboard scenes
  in varied order after the intro.

**Phase 8.4 — Merge current homepage cards into scenes**
- Fold `PortalDestinations` content into the relevant banner scenes:
  timeline, game, archive/story arcs, store, and community.
- Remove the duplicated lower card section once the corresponding scene has
  absorbed its information.
- Treat these cards as scene content sources, not as permanent homepage UI.
- Deliverable: no duplicated route-promo content below the banner.

**Phase 8.5 — Editorial scenes**
- Convert `FeaturedArc` and `LatestTransmissions` into billboard scenes or
  scene overlays that can appear in the rotation.
- Decide whether they should be standalone scenes, interrupt-style inserts,
  or overlays attached to archive/transmission scenes.
- Preserve their discovery value while making them feel like in-universe
  media rather than editorial widgets.
- Deliverable: featured arc and latest transmissions are available through
  the billboard system instead of static homepage panels.

**Phase 8.6 — Sponsored overlay decision**
- Verify whether the existing bottom-right sponsored overlay is still firing
  and whether its storage/dismiss behavior still feels correct.
- Decide whether to keep it as-is, redesign it to match the billboard
  language, or retire it if it becomes redundant.
- If kept, make sure it complements the homepage rather than fighting for
  attention with the intro scene.
- Deliverable: one intentional sponsored/floating-ad behavior on the
  homepage, not an accidental leftover.

**Phase 8.7 — Homepage cleanup**
- Remove the old homepage lower sections that are no longer needed once their
  content has moved into scenes.
- Confirm the homepage end state is limited to:
  navbar, billboard banner, optional floating ad, footer.
- Keep all other discovery paths reachable from navbar and banner scenes.
- Deliverable: a simplified homepage layout with no residual CMS-style card
  clutter.

**Phase 8.8 — Polish and expansion**
- Punch up the visual treatment of existing ad videos with stronger overlays,
  branding, framing, captions, and more overt commercial language.
- Add more video variety and new scene types so the billboard does not feel
  thin or repetitive.
- Tune randomization, pacing, and transitions so the rotation feels alive
  rather than noisy.
- Deliverable: a visitor-ready rotating billboard system with enough variety
  to feel intentional and sustained.

**Implementation notes**
- Build the intro scene first. The homepage should never regress to opening
  on a single isolated product card.
- Do not remove lower homepage sections until the replacement scene content
  is already in place.
- Prefer scene-level data definitions over hardcoded homepage exceptions.
- If the production `blog-core` stage becomes too rigid for the final scene
  model, plan a controlled migration path rather than bolting more homepage
  one-offs onto the current standard-banner config.

---

## 5. Non-goals for this work

- Tearing down the existing Timeline, Archive, or Cookbook. Those stay
  as they are; this work is additive.
- Implementing actual commerce (payments, shipping, real inventory).
  The store is diegetic. No Stripe, no checkout backend.
- Rewriting the Temporal Flow template itself. All changes live in
  the MEGAMEAL site layer unless a change to the template is
  genuinely required, in which case flag it and propose it separately.
- Preserving the current homepage card stack just because it already exists.
  If the billboard system absorbs that information cleanly, the redundant
  lower homepage cards should be removed rather than protected.

---

## 6. Style, conventions, and gotchas

- Follow the existing code style (Biome is configured).
- Svelte components go in the same directory structure already used.
- Threlte canvases are heavy — lazy-load the 3D viewer only when a
  `model3d` thumbnail is selected, not on initial page load.
- Respect `prefers-reduced-motion` for quirks that animate
  (price-drift, glitch-on-hover, etc.). Provide a static fallback.
- All text-visible UI should be in-universe where possible. When
  placeholder copy is needed, use obviously in-universe placeholders
  ("MegaCorp Item #0000") rather than "Lorem ipsum."
- The site is deployed on Vercel. Keep bundle impact in mind:
  Threlte + a dozen scenes could balloon quickly. Use dynamic imports
  for scenes and lazy-load heavy assets.

---

## 7. Open questions to surface early

The agent should raise these before or during Milestone 3, because the
answers affect the data model:

1. Where should 3D models be stored — in-repo under `public/models/`,
   or on a CDN? Affects build size.
2. Should reviews be authorable in MDX or a simpler frontmatter format?
   MDX is more powerful but adds complexity to the review renderer.
3. Should the cart survive product deletion (stale IDs in the cart)?
   Propose a cleanup strategy.
4. Should quirks be declarative (frontmatter-defined) only, or should
   products also be able to define bespoke one-off quirks in a
   companion `.ts` file? Frontmatter-only is simpler; bespoke allows
   more creative latitude.

---

*End of brief.*
