# MEGAMEAL Homepage Billboard Scene Matrix

This document is the Phase 8.1 deliverable for the homepage billboard
refactor. It inventories the current homepage experience, maps duplicated
homepage sections into future billboard scenes, and identifies which assets
can be reused immediately versus which scenes need new material.

## 1. Current homepage inventory

### 1.1 Current first-load homepage stack

| Layer | Current source | Current behavior | Keep / change in billboard system |
| --- | --- | --- | --- |
| Hero banner | `FeaturedProductHeroSlide.astro` mounted into the shared banner slot | First slide is the Snuggaloids-style product widget, including the `featured-product-utilitybar` | Replace with a new intro scene in Phase 8.2 |
| Rotating banner slides | `apps/megameal/src/config/banners/standard.ts` | Sequential mixed-media slides after the first HTML slide | Convert into explicit homepage ad scenes in Phase 8.3 |
| Destination stack | `PortalDestinations.astro` | Large route cards below the banner for timeline, game, archive, store, community | Fold into billboard scenes in Phase 8.4, then remove |
| Editorial block | `FeaturedArc.astro` + `LatestTransmissions.astro` | Static discovery panels beneath the destination stack | Convert to scenes or overlays in Phase 8.5 |
| Sponsored overlay | `FactsWidget.astro` on the first homepage only | Floating bottom-right ad unit with dismiss / restore behavior | Evaluate in Phase 8.6; do not expand scope in 8.1 |

### 1.2 Current banner slide inventory

| Current order | Current asset / source | Current link target | Future scene role | Asset status |
| --- | --- | --- | --- | --- |
| 1 | HTML slot with `FeaturedProductHeroSlide.astro` | product CTA set inside widget | `home-intro` replacement target | Replace entirely |
| 2 | `/assets/banner/universbg0001-0121.webm` | `/timeline/` | `timeline-billboard` | Reuse now |
| 3 | `/assets/banner/cookbook-glitch0001-0049.webm` | `/posts/cookbook/cookbook-index/` | `cookbook-billboard` or reserve scene | Reuse now |
| 4 | `/assets/banner/archive_2.webm` | `/archive/` | `archive-billboard` | Reuse now |
| 5 | `/videos/starmap.webm` | `/game/` | `game-billboard` | Reuse now |
| 6 | `/assets/banner/store_glitch.webm` | `/store/` | `store-billboard` | Reuse now |
| 7 | `/assets/banner/golden-era.webm` | `/community/` | `community-billboard` | Reuse with stronger overlay copy |
| 8 | `/assets/banner/golden-era.webm` | `/posts/introducing-story-mode/` | `story-arc-billboard` or archive variant | Needs replacement or distinct edit |

### 1.3 Current lower-homepage cards and their merge targets

| Current component | Current CTA | Billboard target | Merge note |
| --- | --- | --- | --- |
| `PortalTimelineRoute.astro` | `/timeline/` | `timeline-billboard` | Pull the chronology-console language and live timeline count into the timeline ad scene |
| `PortalSyntheticRoute` tone `game` | `/game/` | `game-billboard` | Pull observatory framing and star-node stat into the game ad scene |
| `PortalSyntheticRoute` tone `story` | `/archive/` | `archive-billboard` | Merge archive-board art direction and arc framing into the archive scene |
| `PortalSyntheticRoute` tone `store` | `/store/` | `store-billboard` | Merge shelf copy, fake pricing, and storefront signage into the store scene |
| `PortalSyntheticRoute` tone `community` | `/community/` | `community-billboard` | Merge network visualization and live-channel language into the community scene |
| `FeaturedArc.astro` | featured series start slug + `/archive/` | `featured-arc-billboard` or archive overlay | Keep discovery value, but shift out of static homepage layout |
| `LatestTransmissions.astro` | latest three post links + `/archive/` | `latest-transmissions-billboard` or transmission overlay | Best as a rotating editorial insert or overlay, not a permanent card grid |

### 1.4 Sponsored overlay inventory

| Area | Current implementation | Notes for later phases |
| --- | --- | --- |
| Surface | `FactsWidget` with `variant="overlay"` | Currently only mounted on homepage page 1 |
| Storage key | `megameal-home-sponsored-overlay-dismissed` | Per-homepage dismissal state already exists |
| Content source | `megaMealUniverseFacts` filtered to `advertisement` entries | Can already rotate store, archive, timeline, game, community, cookbook, and product promos |
| Interaction model | auto-rotating ad card with dismiss / restore buttons | Functionally alive, but stylistically separate from the main billboard system |

## 2. Scene/content matrix

This matrix defines the target scene set for the first billboard pass.

| Scene id | Purpose | Primary CTA | Sources to merge | Reusable assets now | Gaps / follow-up |
| --- | --- | --- | --- | --- | --- |
| `home-intro` | Always-first gateway scene that establishes MEGAMEAL as an in-universe commercial portal | `/posts/explainer/`, `/store/`, `/timeline/` | Replace current featured product intro; borrow identity beats from `UniverseHeroSlide.astro` and site copy | Existing logo / title treatment only | Needs new motion design and new layout; do not reuse the product utility bar |
| `timeline-billboard` | Sell the chronology map as the master index into the universe | `/timeline/` | Current timeline banner slide + `PortalTimelineRoute.astro` | `universbg0001-0121.webm`, `/posts/timeline/universe.png` | Add stronger commercial copy and count badge treatment |
| `game-billboard` | Sell the observatory as playable access to the world | `/game/` | Current starmap banner slide + game route card | `/videos/starmap.webm`, current observatory synthetic scene language | Needs billboard framing, stats, and CTA hierarchy |
| `archive-billboard` | Sell the archive as the structured reading path / case-file index | `/archive/` | Current archive banner slide + story route card | `/assets/banner/archive_2.webm`, `/posts/timeline/archive.png` | Should absorb story-arc framing so archive and arcs stop competing |
| `store-billboard` | Present the store as the main diegetic portal into the universe | `/store/` | Current store banner slide + store route card | `/assets/banner/store_glitch.webm`, storefront imagery | Needs the strongest overlay copy because this is the thematic front door |
| `community-billboard` | Treat community as a live uplink / transmission surface | `/community/` | Current community banner slide + community route card | `/assets/banner/golden-era.webm` as temporary motion bed | Current clip is semantically weak; acceptable temporary reuse, but should be replaced later |
| `featured-arc-billboard` | Surface one story arc as a promotional feature rather than a static editorial card | featured series start slug | `FeaturedArc.astro` | featured series image from `SERIES_CONFIG` | Needs dedicated scene design or archive-overlay treatment |
| `latest-transmissions-billboard` | Surface recency and freshness without returning to a CMS card grid | latest post link or `/archive/` | `LatestTransmissions.astro` | latest post images already available from manifest content | Needs a ticker / broadcast format rather than three static cards |
| `cookbook-billboard` | Optional secondary scene for culinary-index entry | `/posts/cookbook/cookbook-index/` | current cookbook banner slide | `/assets/banner/cookbook-glitch0001-0049.webm`, `/videos/cookbook.webm`, cookbook cover art | Not required by the 8.1 minimum set, but ready for the 8.3 pool |
| `story-mode-billboard` | Optional archive-adjacent scene for guided reading | `/posts/introducing-story-mode/` | current story-mode banner slide | none distinct yet; current slide duplicates `golden-era.webm` | Needs replacement footage or should be merged into `archive-billboard` |

## 3. Asset readiness assessment

### 3.1 Safe immediate reuses

| Scene | Asset(s) |
| --- | --- |
| Timeline | `/assets/banner/universbg0001-0121.webm`, `/posts/timeline/universe.png` |
| Archive | `/assets/banner/archive_2.webm`, `/posts/timeline/archive.png` |
| Game | `/videos/starmap.webm`, current observatory fallback art |
| Store | `/assets/banner/store_glitch.webm`, `/posts/Mega-Meal-Explained/ultra-headquarters.png` |
| Cookbook | `/assets/banner/cookbook-glitch0001-0049.webm`, `/videos/cookbook.webm`, `/posts/cookbook/cookbook.png` |

### 3.2 Reuse with caveats

| Scene | Asset(s) | Caveat |
| --- | --- | --- |
| Community | `/assets/banner/golden-era.webm` | Motion is usable, but content does not clearly read as "community uplink" without heavier overlay treatment |
| Story arc / story mode | `/assets/banner/golden-era.webm` | Current reuse is too close to the community scene and should not survive the billboard pass unchanged |

### 3.3 Net-new material required

| Scene | Why new material is needed |
| --- | --- |
| `home-intro` | Current first-load experience is product-detail-driven and anchored by the `featured-product-utilitybar`, which directly conflicts with the Phase 8 brief |
| `featured-arc-billboard` | Existing arc card is editorial and card-based, not billboard-native |
| `latest-transmissions-billboard` | Existing treatment is a conventional three-card freshness panel, not an in-universe broadcast scene |

## 4. Decisions locked for Phase 8.2 and 8.3

1. The homepage intro should no longer be product-first. It should be a new
   dedicated `home-intro` scene.
2. The current product widget belongs in the store ecosystem, not as the
   homepage's opening identity statement.
3. The five lower route cards are not permanent homepage furniture. They are
   content sources to be absorbed into billboard scenes.
4. `FeaturedArc` and `LatestTransmissions` remain important discovery tools,
   but they should return as scenes or overlays instead of static blocks.
5. The current slide pool is good enough to begin Phase 8.3 without waiting on
   new video production, except for the intro and the editorial scenes.

## 5. Recommended next implementation order

1. Phase 8.2: build `home-intro` and remove the featured-product utility bar
   from the homepage first-load experience.
2. Phase 8.3: convert the existing banner slide pool into explicit scene
   definitions with randomized post-intro rotation.
3. Phase 8.4: merge the timeline, game, archive, store, and community cards
   into their corresponding scenes and remove the lower route stack.
4. Phase 8.5: reintroduce featured-arc and latest-transmissions discovery as
   billboard-native scenes or overlays.
