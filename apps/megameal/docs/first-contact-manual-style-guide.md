# First Contact Manual — Style & Layout Contract

Applies to `src/content/reader/first-contact-manual/*.mdx`. The `forward.mdx` chapter
is the layout reference — when in doubt, match its newest structural patterns: the rounded
technical-window Chapter Index and the full-width survival imperative image.

Goal: every chapter should look like it was assembled from the same component kit.
Drift happens when new sections are built with hand-rolled `<div className="...">`
blocks instead of the shared components in `src/components/reader/`. **Prefer a
component over a raw div every time one fits.**

Primary visual direction: a professional textbook/reference manual with subtle
emergency-interface DNA. The book should feel polished, readable, and official,
not like a generic neon sci-fi HUD. Visual richness should come from reusable
layout, spacing, frames, type hierarchy, and controlled texture — not from extra
jokes, filler copy, or one-off CSS flourishes.

## Component kit (use these, not raw divs)

All live in `src/components/reader/`. Import only what a chapter actually uses.

- **`ManualChapterHero`** — the title block at the top of every chapter (`chapter`,
  `title`, `icon`, `quote`, optional `cite`). Always purple. One per chapter.
- **`ManualChapterIndex`** — the "Chapter Index" section. This is now one of the
  visual anchors of the manual. It should support the rounded technical-window
treatment used by the forward's top-of-book index: rounded glass container,
inset border, corner brackets, subtle scanlines/noise, large faded chapter
numerals, compact ruled section rows, and section-appropriate accent colors.
It also supports the detailed numbered-section layout
  (with `items[].sections`) used by chapters 1–5, and the sidebar "tone legend"
  (`sidebarTitle`/`sidebarItems`/`sidebarNote` or `sidebarPanels`). The forward's
  top-of-book index and per-chapter indexes should both go through this component.
  Sidebar prop guide:
  - `variant="reference"` or equivalent — the preferred textbook/technical-window
    style for the forward index and any polished contents spread
  - `sidebarItems` — flat tone-labeled list (simple one-panel legend)
  - `sidebarPanels` — grouped panels each with their own `items`, `lines`, and
    `note` (richer sidebar; prefer this for the threat-codes legend)
  - `sidebarNote` — footer note appended beneath a `sidebarItems` list
- **`ManualPanel`** — the general-purpose colored card/section container. Use for
  any "boxed callout with a title and body" instead of a hand-written
  `<div className="bg-X-900/15 border border-X-500/30 rounded-lg p-5">...`. Props:
  `tone`, `emphasis` (`subtle`|`strong`), `icon`, `iconStyle` (`soft`|`solid`),
  `title`, `subtitle`. Use `emphasis="strong"` for critical warnings/imperatives
  (thick border); omit it (default `subtle`) for informational panels. Body content
  goes in `<slot />`.
- **`ManualNotice`** — short inline warnings/asides. `variant="bar"` for the
  left-border-strip style, `variant="panel"` (default) for a boxed note.
- **`ManualListGrid`** — the 2-or-3-column "cards with bullet lists" grid (e.g.
  threat category breakdowns, comparison lists). Props: `cards[]`, `columns`.
  Each card: `{ tone?, title, body?, items? }`. Use for simple title + body text or
  title + bullet items. For cards that need custom inner layouts (progress bars,
  stat rows, nested divs), use `ManualPanel` with slot content instead.
- **`ManualComparisonPanel`** — a `ManualPanel` wrapping a 2-column
  `ManualListGrid`, for "X vs Y" sections (e.g. helpful vs hostile, left/right
  doctrine comparisons).
- **`ManualChapterLink`** — the "next chapter" call-to-action card at the end of a
  chapter. One per chapter (except the afterword, which is the end of the book).
- **`ManualTechFrame`** — a restrained technical-window frame for reference sections,
  indexes, official excerpts, tables, and polished textbook-style blocks. Use the
  shared technical-window structure by default: rounded window, layered dark/glass
  background, inset border, subtle scanlines/noise, corner brackets, and small
  monospaced labels. Its color should inherit from the section/tone, not from a
  hard-coded theme.
  This is the preferred wrapper for the refined Chapter Index look.
- **`ManualDangerFrame`** — high-emphasis survival warning frame. Use only for true
  emergency panels or visual moments equivalent to the survival imperative image.
  It may use red as the dominant accent; do not use this for ordinary index entries,
  chapter overviews, or neutral reference content.
- **`ManualSectionRows`** — compact textbook-style section rows. Use for subsection
  lists inside `ManualChapterIndex` and other reference layouts. Section numbers
  should use monospaced type; rows should be ruled or leader-lined, not chip-heavy.
- **`ManualSurvivalImperative`** — the full-width "DON'T" image figure. Forward only
  unless a chapter has an equivalent key image.

If a layout need doesn't fit any of these, extend the component (add a prop/variant)
rather than writing a one-off styled div in the MDX. That keeps the drift contained
to one file instead of N chapters.

## Tone palette (consistent meaning across the book)

Pick the `tone` prop to match meaning, not just to vary color:

| Tone     | Meaning in this manual                                  |
|----------|----------------------------------------------------------|
| `red`    | CRITICAL / hostile / reality-ending                       |
| `orange` | HIGH / species-level threat / elimination methodology    |
| `yellow` | ELEVATED / caution / "helpful but dangerous"              |
| `blue`   | INFO / procedures / official protocol / neutral data      |
| `purple` | SPECIAL / chapter hero / unique cosmic-scale cases        |
| `green`  | POSITIVE / rare survival success                          |
| `gray`   | Corporate / bureaucratic / Bi-Smart material              |
| `cyan`/`teal` | Secondary accents inside index/sidebar lists only — don't introduce as a primary section tone |

The "🎨 Threat Codes" legend in `forward.mdx` is the canonical definition of this
palette — new chapters should reuse it via `ManualChapterIndex`'s `sidebarPanels`,
not redefine it.

## First Contact visual system

The newer forward index and the "First, Last, and Only Truly Reliable Rule" image
are the strongest visual references. Future styling should borrow their shared
structure and polish while allowing each section of the site to keep its own color
palette.

This section is a **shape, typography, gradient, and component behavior contract**.
It is not a fixed color palette. Agents should preserve the existing tone colors of
each section unless the user explicitly asks for a color change.

### Base visual principle

The manual should read as a professional textbook/reference document that has been
subtly shaped by emergency-interface and technical-window design.

Default behavior:

- keep prose areas readable, calm, and book-like
- use rounded windows and layered panels for high-value reference sections
- use color semantically through existing `tone` props and site tokens
- use gradients, inset borders, corner brackets, and microtype for polish
- avoid adding decorative copy merely to make a section feel alive

Do not make the whole manual look like a generic neon HUD, trading-card grid, or
video-game menu. The design should feel official and tactile, not gimmicky.

### Color discipline

Color is controlled by the existing site/theme/tone system. Do not hard-code a new
universal color family into future MDX documents.

Rules:

- Preserve the existing tone palette unless the user asks otherwise.
- `red` remains reserved for critical warnings, hostile states, survival imperatives,
  or true danger moments.
- `orange`, `yellow`, `blue`, `purple`, `green`, `gray`, `cyan`, and `teal` retain
  their semantic meanings from the tone palette.
- A component may use the local tone color for borders, glows, labels, section rules,
  and corner brackets.
- Neutral surfaces should usually remain dark, translucent, or glass-like, but the
  accent color should come from the component tone or parent section.
- Do not convert unrelated sections to blue, red, amber, or any other global color
  merely because one reference page used that color successfully.

The important part is consistency of **form**: rounded windows, layered depth,
clean type, technical framing, and restrained gradients.

### Shape language

Use the survival imperative image and the refined Chapter Index as shape references:

- large rounded outer windows
- smaller rounded inner panels
- inset border lines
- corner bracket marks
- thin technical rules
- small decorative ticks/dots used sparingly
- strong negative space
- compact technical labels
- panel depth through soft inner glow, not heavy shadows
- grid alignment that feels like a textbook spread, not a random card wall

Recommended radii:

```css
--manual-radius-window: 1.5rem;
--manual-radius-panel: 1rem;
--manual-radius-small: 0.625rem;
```

Use these values as proportions, not as mandatory exact values. If the global site
already has radius tokens, map this system onto those tokens instead of creating
redundant ones.

### Gradient and surface language

Panels should feel layered, polished, and lightly dimensional.

Preferred surface recipes:

- dark translucent base surface
- subtle top-to-bottom linear gradient
- faint radial glow from one corner or edge
- inset highlight line at the top
- soft inner glow using the local tone color
- low-opacity border using the local tone color
- optional second inset border for important reference windows

Avoid:

- flat single-color boxes when a section is meant to feel designed
- harsh neon floods
- thick glowing borders on ordinary content
- heavy drop shadows that make panels look like floating app cards
- random gradients that do not use the current tone or site palette

Example pattern, using semantic variables rather than fixed colors:

```css
.manual-window {
  border-radius: var(--manual-radius-window, 1.5rem);
  border: 1px solid color-mix(in srgb, var(--manual-accent) 34%, transparent);
  background:
    radial-gradient(circle at 85% 12%, color-mix(in srgb, var(--manual-accent) 16%, transparent), transparent 36%),
    linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018)),
    var(--manual-surface, rgba(8, 10, 16, 0.88));
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.08),
    inset 0 0 32px color-mix(in srgb, var(--manual-accent) 10%, transparent),
    0 24px 70px rgba(0,0,0,0.28);
}
```

If `color-mix()` support is a concern, use existing project tokens or static RGBA
values inside the component CSS, not inside MDX.

### Texture language

Allowed texture motifs:

- very subtle scanlines
- low-opacity paper/noise grain
- faint radial glow
- soft vignette
- barely visible technical linework
- inset frame borders

Keep these effects quiet. They should be felt before they are noticed. Never reduce
readability for texture.

Use `prefers-reduced-motion` and avoid animated scanlines unless the user explicitly
requests motion.

### Typography

Use typography to create polish before adding decoration:

- large faded chapter numerals as anchors
- clean linked chapter titles
- descriptions in quieter text
- monospaced section numbers
- compact ruled section rows
- small uppercase eyebrow labels only where they clarify section function
- consistent letter spacing for labels and metadata
- strong line-height and spacing for textbook readability
- no extra lore copy just to make a section look designed

The Chapter Index should remain fast to scan. Do not add "use when," "primary
action," joke warnings, or fictional routing instructions unless the user explicitly
requests a more narrative index.

### Index style contract

The polished Chapter Index is now the main reference model for future MDX styling.
Its success comes from structure, not color.

Index entries should use:

- a rounded outer reference window
- an inner frame or inset border
- corner brackets or technical ticks
- a concise header area
- large faded chapter numbers
- clear linked titles
- short existing descriptions
- compact section rows
- monospaced section codes
- subtle section dividers or leader lines
- tone-aware accent colors inherited from data/props

Index entries should not use:

- large warning styling unless the entry itself is a warning
- extra explanatory paragraphs
- fictional routing lines
- oversized decorative icons
- new one-off color systems
- repeated Tailwind class piles inside MDX

### Component implementation rule

If a visual motif appears more than once, it belongs in a component, variant, or
utility class. Do not rebuild the rounded technical-window style with new Tailwind
piles inside each MDX file.

Future agents should update or extend:

- `ManualChapterIndex`
- `ManualTechFrame`
- `ManualDangerFrame`
- `ManualSectionRows`
- `ManualPanel`
- shared CSS/design tokens

rather than inserting raw layout/styling directly into chapter MDX.

### Token guidance

Use existing project variables where possible. If new tokens are needed, define
semantic tokens for shape, surface, text, and accent behavior instead of fixed
section colors.

Preferred semantic set:

```css
--manual-surface: rgba(8, 10, 16, 0.88);
--manual-surface-soft: rgba(255, 255, 255, 0.045);
--manual-surface-strong: rgba(255, 255, 255, 0.075);
--manual-text: rgba(255, 255, 255, 0.94);
--manual-text-muted: rgba(225, 232, 242, 0.68);
--manual-accent: currentColor;
--manual-accent-soft: color-mix(in srgb, var(--manual-accent) 48%, transparent);
--manual-accent-faint: color-mix(in srgb, var(--manual-accent) 16%, transparent);
--manual-border: color-mix(in srgb, var(--manual-accent) 28%, transparent);
--manual-glow: color-mix(in srgb, var(--manual-accent) 18%, transparent);
--manual-radius-window: 1.5rem;
--manual-radius-panel: 1rem;
--manual-radius-small: 0.625rem;
--manual-mono: "IBM Plex Mono", "Courier New", monospace;
--manual-sans: inherit;
```

Do not duplicate these if equivalent tokens already exist. Component CSS should map
existing tone colors to `--manual-accent`, then reuse the same structural styling
across sections.


## Standard chapter skeleton

1. Frontmatter (see checklist below)
2. Imports (only components used in this file)
3. `<ManualChapterHero ... />`
4. `---`
5. `## Chapter Overview` — 2–3 paragraphs, no components
6. `---`
7. `## Chapter Index` — `<ManualChapterIndex variant="reference" items={[...]} sidebarPanels={...} />` when the polished rounded reference treatment is appropriate
8. Numbered `## N.M Section Title` sections, each built from `ManualPanel` /
   `ManualListGrid` / `ManualComparisonPanel` / `ManualNotice`
9. `---`
10. `## Conclusion` (or chapter-specific closing heading)
11. `<ManualChapterLink href="/reader/first-contact-manual/chapter-N+1/" ... />`

## Frontmatter checklist

Copy `forward.mdx`'s frontmatter block and adjust per-chapter. Keep these consistent
across all files:

- `authorName`: `"An Anonymous Interstellar Veteran (Redacted)"` — use parentheses,
  not `[Redacted]` (forward currently has the bracket variant; fix when touched).
- `authorBio`: exact shared sentence — see world bible.
- `image`: a real chapter-specific image under `/first-contact/` when one exists;
  fall back to `/posts/timeline/chronos.png` only if no custom art exists yet.
- `timelineYear: 7.652e3`, `timelineEra: "awakening-era"`,
  `timelineLocation: "The Fringes of Known (and Mostly Hostile) Space"`,
  `isKeyEvent: true`, `showImageOnPost: false`, `bannerType: "image"`,
  `category: "MEGA MEAL"`, `draft: true`, `series: "first-contact-manual"`,
  `seriesTitle: "The Interstellar Traveler's First Contact Manual"`,
  `contentFormat: "manual"`.
- `seriesPart`: chapter number (1–5). Omit for forward/afterword.
- `tags`: always include `First Contact`; add 2–4 chapter-specific tags, no more.

## Do not modify human-authored prose

The narrative text in every chapter is written by a human. Do not change word
choice, sentence structure, punctuation style, frontmatter metadata (tags, titles,
descriptions), or anything else in the authored content without an explicit user
request. Do not upgrade ASCII punctuation (`--`, `...`) to Unicode equivalents.
Spelling corrections (wrong letters in a word) are the only exception — everything
else is off-limits unless asked. See `_AGENTS.md` for the full rule.

## Things to avoid

- Don't hand-write `bg-{color}-900/NN border border-{color}-500/30 rounded-lg p-N`
  combinations — that's a `ManualPanel`.
- Don't recreate the rounded technical-window index styling with one-off
  MDX divs — that belongs in `ManualChapterIndex`, `ManualTechFrame`, or shared CSS.
- Don't invent new gradient/border color combos for hero-style blocks — that's
  `ManualChapterHero` (purple) or `ManualChapterLink` (tone-based).
- Don't nest raw `<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">` card
  grids — that's `ManualListGrid`.
- Don't use red as a general aesthetic accent. Red is reserved for critical warnings
  and survival imperative moments.
- Keep inline `<span className="...">` styling only for small one-off emphasis
  (e.g. the red `DON'T`), not for structural layout.

## Prose style

- `## Chapter Overview` (or `## Document Overview` for the forward) should be 2–3
  paragraphs of plain prose — no components, no sub-headers.
- Statistical callouts must use one of the two canonical named datasets (47,829
  documented first-contact events; 23,847 documented helpful/hostile scenarios). If
  neither fits, introduce a new dataset with an explicit source label rather than
  implying a third unnamed survey.
- Never end a list with a dangling placeholder fragment like "...and angry robot
  butlers others" — complete every sentence. No "others" orphans without a closing
  thought ("...and countless others." is fine).

## Forward and afterword skeleton deviations

These two files are exceptions to the standard chapter skeleton and should not be
forced into the numbered-section pattern:

- **Forward** — uses a "How to Use This Book" emergency routing table (raw `<div>`
  anchor grid, lines 47–83 of `forward.mdx`). This pattern is intentional and
  approved: no component handles tone-coded triage links at this size. Do not
  componentize it. The forward's Chapter Index is the canonical example of the
  polished rounded technical-window index style. Preserve its clean
  textbook function: do not add filler, jokes, or fictional routing copy to the
  index. Omit `seriesPart` from frontmatter.
- **Afterword** — uses the Bi-Smart Corporation narrator (different `authorName` and
  `authorBio`; see world bible). Has heavier raw-div styling reflecting its corporate
  memo aesthetic; it is exempt from the standard skeleton until a dedicated refactor.
  Omit `seriesPart` from frontmatter.

## Frontmatter: afterword narrator

For the afterword only, override the standard author fields:

```yaml
authorName: "Bi-Smart Corporation Executive Research Committee (Names Redacted for Cosmic Security)"
authorBio: "Corporate entity specializing in existential liability documentation, survival equipment durability testing, and maintaining profitable business models during species extinction events."
```
