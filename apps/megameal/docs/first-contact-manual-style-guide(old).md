# First Contact Manual — Style & Layout Contract

Applies to `src/content/reader/first-contact-manual/*.mdx`. The `forward.mdx` chapter
is the layout reference — when in doubt, match its patterns.

Goal: every chapter should look like it was assembled from the same component kit.
Drift happens when new sections are built with hand-rolled `<div className="...">`
blocks instead of the shared components in `src/components/reader/`. **Prefer a
component over a raw div every time one fits.**

## Component kit (use these, not raw divs)

All live in `src/components/reader/`. Import only what a chapter actually uses.

- **`ManualChapterHero`** — the title block at the top of every chapter (`chapter`,
  `title`, `icon`, `quote`, optional `cite`). Always purple. One per chapter.
- **`ManualChapterIndex`** — the "Chapter Index" section. Supports the detailed
  numbered-section layout (with `items[].sections`) used by chapters 1–5, and the
  sidebar "tone legend" (`sidebarTitle`/`sidebarItems`/`sidebarNote` or
  `sidebarPanels`). The forward's top-of-book index and per-chapter indexes should
  both go through this component. Sidebar prop guide:
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

## Standard chapter skeleton

1. Frontmatter (see checklist below)
2. Imports (only components used in this file)
3. `<ManualChapterHero ... />`
4. `---`
5. `## Chapter Overview` — 2–3 paragraphs, no components
6. `---`
7. `## Chapter Index` — `<ManualChapterIndex items={[...]} sidebarPanels={...} />`
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
- Don't invent new gradient/border color combos for hero-style blocks — that's
  `ManualChapterHero` (purple) or `ManualChapterLink` (tone-based).
- Don't nest raw `<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">` card
  grids — that's `ManualListGrid`.
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
  componentize it. Omit `seriesPart` from frontmatter.
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
