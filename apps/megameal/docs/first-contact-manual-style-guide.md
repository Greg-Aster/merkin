# First Contact Manual — Style & Layout Contract

Applies to `src/content/reader/first-contact-manual/*.mdx`.
`forward.mdx` is the visual reference implementation. Match its styling language, class
naming, tone usage, rounded-window structure, and component-free CSS approach. Do not
copy forward-only content blocks into normal chapters — those are clearly marked in
the block inventory below.

**Goal:** every chapter reads as a single designed book. All visual structure comes from
shared imported CSS classes. No Astro components for styling. No per-chapter
`<style>` blocks. No Tailwind class piles in MDX.

---

## CSS system

**Base file:** `src/styles/reader/first-contact-manual.css`

**Threat-flow extension:** `src/styles/reader/first-contact-manual-flow.css`

The base file owns the technical-window system and reusable `fcmi-*` primitives.
The flow extension owns the tone-legend visual pass: stronger legend swatches,
chapter index rails, section-row dots, panel tone rails, and destination-colored
next links. Keep the flow extension small; do not move base layout ownership into it.

**Import at the top of every MDX chapter:**
```js
import '../../../styles/reader/first-contact-manual.css'
import '../../../styles/reader/first-contact-manual-flow.css'
```

The paths resolve from `src/content/reader/first-contact-manual/` up to
`src/styles/reader/`.

### Design tokens

All layout, color, and spacing derive from `--fcmi-*` CSS custom properties set on
`:root` and inherited by `:where([class*="fcmi-"])`. The ones to know:

```
--fcmi-text-rgb / --fcmi-muted-rgb / --fcmi-dim-rgb    text hierarchy (RGB triples)
--fcmi-surface-rgb / --fcmi-surface-2-rgb              background surfaces
--fcmi-accent-rgb / --fcmi-accent-2-rgb / --fcmi-glow-rgb  tone color — changed by fcmi-tone-* classes
--fcmi-radius-xl / -lg / -md / -sm                     border radii
--fcmi-mono / --fcmi-sans                              fonts
```

Do not override token vars inline in MDX. Use `fcmi-tone-*` to change color.

---

## Tone palette

Add `fcmi-tone-{color}` to the outermost element of a section. The class sets the
three accent vars; all children that reference `var(--fcmi-accent-rgb)` update
automatically. Set tone once on the parent — never on children.

| Class | Semantic meaning in this manual |
|---|---|
| `fcmi-tone-red` | CRITICAL / hostile / survival imperative |
| `fcmi-tone-orange` | HIGH / species-level threat / elimination methods |
| `fcmi-tone-yellow` | ELEVATED / caution / helpful-but-dangerous |
| `fcmi-tone-blue` | INFO / procedures / official protocol / neutral data |
| `fcmi-tone-cyan` | Ch. 1 accent (identification) |
| `fcmi-tone-purple` | SPECIAL / chapter hero / cosmic-scale / afterword |
| `fcmi-tone-green` | POSITIVE / rare survival success |
| `fcmi-tone-gray` | Corporate / bureaucratic / Bi-Smart material |

Red is reserved for genuine danger — The Cardinal Rule, Emergency Protocol Hierarchy,
and CRITICAL threat indicators. Do not use it decoratively.

---

## Structural primitives

### Window / shell / frame (three-layer depth)

High-prominence blocks (hero, chapter index, next-link) use a three-layer container system:

```html
<section class="not-prose fcmi-window fcmi-tone-purple">
  <!-- outer: gradient border + scanlines + dot-noise texture -->
  <div class="fcmi-shell">
    <!-- middle: dark glass surface -->
    <div class="fcmi-frame">
      <!-- inner: inset border + radial gradient -->
      [content]
    </div>
  </div>
</section>
```

Simpler blocks (section panels, routing table) use their own shell/frame aliases
(`fcmi-routing-shell` / `fcmi-routing-frame`, `fcmi-section-panel-inner`) that follow
the same depth principle without requiring all three generic classes.

### Corner brackets

Place all four inside any `fcmi-frame`, `fcmi-routing-frame`, or `fcmi-section-panel-inner`:

```html
<span class="fcmi-corner fcmi-corner--tl" aria-hidden="true"></span>
<span class="fcmi-corner fcmi-corner--tr" aria-hidden="true"></span>
<span class="fcmi-corner fcmi-corner--bl" aria-hidden="true"></span>
<span class="fcmi-corner fcmi-corner--br" aria-hidden="true"></span>
```

Color comes from `--fcmi-accent-rgb` on the nearest parent with a tone class.

### Typography utilities

| Class | Use |
|---|---|
| `.fcmi-kicker` | Small all-caps monospaced label above a heading |
| `.fcmi-title` | Section heading — cream color, slight text-shadow |
| `.fcmi-emphasis` | Inline accent emphasis (e.g., `<span class="fcmi-emphasis fcmi-tone-red">DON'T</span>`) |
| `.fcmi-caption` | Dim small footnote / source citation |
| `.fcmi-panel-lede` | Large leading paragraph inside a panel body (cream) |
| `.fcmi-panel-copy` | Supporting paragraph inside a panel body (muted) |

---

## Block inventory

Blocks marked **"Forward-only"** appear exclusively in `forward.mdx`. Do not reproduce
them in chapters 1–5 or the afterword.

**Reusable (all chapters):** Hero · Notice · Content panel · Metric grid · Quote card ·
Document excerpt · Callout card · Protocol list · Next chapter link

**Forward-only:** Routing table · Chapter Index · Reference spread + threat legend ·
Survival imperative image

---

### Hero (chapter title block)

One per chapter, immediately after the import line. Always `fcmi-tone-purple`.

```html
<section class="not-prose fcmi-hero fcmi-window fcmi-tone-purple" aria-labelledby="heading-id">
  <div class="fcmi-shell">
    <div class="fcmi-frame fcmi-hero-frame">
      <span class="fcmi-corner fcmi-corner--tl" aria-hidden="true"></span>
      <span class="fcmi-corner fcmi-corner--tr" aria-hidden="true"></span>
      <span class="fcmi-corner fcmi-corner--bl" aria-hidden="true"></span>
      <span class="fcmi-corner fcmi-corner--br" aria-hidden="true"></span>

      <div class="fcmi-hero-header">
        <div class="fcmi-icon-tile fcmi-hero-icon" aria-hidden="true">⚠️</div>
        <div class="fcmi-hero-heading">
          <p class="fcmi-kicker">Foreword</p>
          <h1 id="heading-id" class="fcmi-hero-title">Chapter Title</h1>
        </div>
      </div>

      <blockquote class="fcmi-hero-quote">"Opening quote."</blockquote>
      <p class="fcmi-hero-cite">— <cite>Author Name</cite></p>
    </div>
  </div>
</section>
```

Match the heading level used in the existing `forward.mdx` hero. Do not change heading
levels for visual reasons — if unsure, preserve the existing file's level and flag it.

---

### Routing table (forward only)

The emergency chapter-routing block in "How to Use This Book". Forward-only.
One `fcmi-routing-row` per chapter + afterword.

```html
<section class="not-prose fcmi-routing-window" aria-label="Emergency chapter routing">
  <div class="fcmi-routing-shell">
    <div class="fcmi-routing-frame">
      <span class="fcmi-corner fcmi-corner--tl" aria-hidden="true"></span>
      <span class="fcmi-corner fcmi-corner--tr" aria-hidden="true"></span>
      <span class="fcmi-corner fcmi-corner--bl" aria-hidden="true"></span>
      <span class="fcmi-corner fcmi-corner--br" aria-hidden="true"></span>

      <div class="fcmi-routing-list">
        <a href="/reader/first-contact-manual/chapter-1/" class="fcmi-routing-row fcmi-tone-cyan">
          <span class="fcmi-routing-code">Ch. 1</span>
          <span class="fcmi-routing-title">What is that thing?</span>
          <span class="fcmi-routing-desc">Short triage description.</span>
        </a>
        <!-- Ch.2 yellow / Ch.3 blue / Ch.4 red / Ch.5 orange / Afterword purple -->
      </div>
    </div>
  </div>
</section>
```

---

### Notice (field note / inline alert)

Short standalone notice. Not inside a panel. Use sparingly — one per section max.

```html
<p class="not-prose fcmi-notice fcmi-notice--red">
  <strong>Field note:</strong> Message text.
</p>
```

`fcmi-notice--red` for warnings, `fcmi-notice--blue` for informational notes.

---

### Chapter Index (forward only)

The large reference spread listing all chapters with their sections. Forward-only.

```html
<section class="not-prose fcmi-index" aria-labelledby="chapter-index-heading">
  <div class="fcmi-index-shell">
    <div class="fcmi-index-frame">
      <span class="fcmi-corner fcmi-corner--tl" aria-hidden="true"></span>
      <span class="fcmi-corner fcmi-corner--tr" aria-hidden="true"></span>
      <span class="fcmi-corner fcmi-corner--bl" aria-hidden="true"></span>
      <span class="fcmi-corner fcmi-corner--br" aria-hidden="true"></span>

      <header class="fcmi-index-header">
        <div>
          <p class="fcmi-index-kicker">Reference Contents</p>
          <h2 id="chapter-index-heading" class="fcmi-index-title">Chapter Index</h2>
        </div>
        <p class="fcmi-index-meta">Entries 01–05 / Afterword</p>
      </header>

      <div class="fcmi-index-entries">
        <article class="fcmi-entry fcmi-entry--cyan">
          <div class="fcmi-number">01</div>
          <div class="fcmi-entry-body">
            <a href="/reader/first-contact-manual/chapter-1/" class="fcmi-entry-title">Chapter Title</a>
            <p class="fcmi-entry-desc">One-sentence description.</p>
            <div class="fcmi-section-list">
              <div class="fcmi-section-row">
                <span class="fcmi-section-code">1.1</span>
                <span class="fcmi-section-title">Section Title</span>
              </div>
              <!-- more fcmi-section-row divs -->
            </div>
          </div>
        </article>
        <!-- Ch.2 --yellow / Ch.3 --blue / Ch.4 --orange / Ch.5 --orange -->
        <!-- Afterword: fcmi-entry--purple + <div class="fcmi-number fcmi-number--after">AFTER</div> -->
      </div>
    </div>
  </div>
</section>
```

---

### Reference spread (prose + legend sidebar)

Used for "The Universal Truth About First Contact" — a prose column beside the threat-codes
legend. The legend is defined once here in the forward; later chapters reference the tone
table above instead of recreating it.

```html
<div class="not-prose fcmi-reference-spread">
  <div class="fcmi-prose-stack">
    <p>Prose paragraph.</p>
    <!-- prose paragraphs only — no headings inside fcmi-prose-stack -->
  </div>

  <aside class="fcmi-legend-window fcmi-tone-gray" aria-label="Threat codes">
    <div class="fcmi-legend-header">
      <span class="fcmi-legend-kicker">Tone Legend</span>
      <strong>Threat Codes</strong>
    </div>
    <div class="fcmi-legend-list">
      <div class="fcmi-legend-row fcmi-tone-red">
        <span class="fcmi-dot"></span>
        <span class="fcmi-legend-name">CRITICAL</span>
        <span class="fcmi-legend-meta">Reality-ending</span>
      </div>
      <!-- fcmi-tone-orange HIGH / fcmi-tone-yellow ELEVATED / fcmi-tone-blue INFO -->
      <!-- fcmi-tone-purple SPECIAL / fcmi-tone-green POSITIVE -->
    </div>
    <div class="fcmi-legend-note">
      <p>Note text.</p>
    </div>
  </aside>
</div>
```

---

### Content panel (general-purpose section block)

The workhorse block. Use for analysis, protocols, official excerpts, and any colored
reference section.

```html
<section class="not-prose fcmi-section-panel fcmi-tone-blue" aria-labelledby="heading-id">
  <div class="fcmi-section-panel-inner">
    <span class="fcmi-corner fcmi-corner--tl" aria-hidden="true"></span>
    <span class="fcmi-corner fcmi-corner--tr" aria-hidden="true"></span>
    <span class="fcmi-corner fcmi-corner--bl" aria-hidden="true"></span>
    <span class="fcmi-corner fcmi-corner--br" aria-hidden="true"></span>

    <header class="fcmi-panel-header">
      <div class="fcmi-panel-heading-group">
        <p class="fcmi-kicker">Analysis</p>
        <h3 id="heading-id" class="fcmi-title">Panel Title</h3>
      </div>
      <span class="fcmi-icon-tile" aria-hidden="true">📄</span>  <!-- optional icon -->
    </header>

    <div class="fcmi-panel-body">
      <!-- fcmi-panel-lede, fcmi-panel-copy, fcmi-quote-card, etc. -->
    </div>
  </div>
</section>
```

Add `fcmi-panel--strong` alongside `fcmi-section-panel` for critical-warning panels
(thicker border, stronger glow). Use only for The Cardinal Rule and Emergency Protocol
Hierarchy — not for ordinary information panels.

---

### Metric grid (two-panel statistics layout)

Used for GCFI + Threat Categories. Two `fcmi-section-panel` elements in a responsive grid.

```html
<div class="not-prose fcmi-metric-grid">
  <section class="not-prose fcmi-section-panel fcmi-tone-orange" aria-labelledby="gcfi-heading">
    <!-- panel header (see above) -->
    <div class="fcmi-panel-body">
      <div class="fcmi-stat-stack">

        <section class="fcmi-stat-card fcmi-tone-green">
          <div class="fcmi-stat-head">
            <span>Successful Contact:</span>
            <strong>0.003%</strong>
          </div>
          <div class="fcmi-progress" aria-hidden="true">
            <span class="fcmi-progress-fill" style={{width: '0.3%'}}></span>
          </div>
          <p>Description.</p>
        </section>

        <div class="fcmi-stat-breakdown">
          <div class="fcmi-data-row fcmi-tone-red"><span>Label</span><strong>34.2%</strong></div>
          <!-- more data rows with tone classes -->
        </div>

        <p class="fcmi-caption">*Source footnote.</p>
      </div>
    </div>
  </section>

  <section class="not-prose fcmi-section-panel fcmi-tone-purple" aria-labelledby="threats-heading">
    <!-- panel header -->
    <div class="fcmi-panel-body">
      <div class="fcmi-card-stack">
        <section class="fcmi-mini-card fcmi-tone-red">
          <div class="fcmi-mini-head">
            <span class="fcmi-dot"></span>
            <strong>Category Name</strong>
            <span>47.3%</span>
          </div>
          <p>Description.</p>
        </section>
        <!-- more fcmi-mini-card sections -->
      </div>
      <p class="fcmi-caption fcmi-notice--blue"><strong>Note:</strong> ...</p>
    </div>
  </section>
</div>
```

---

### Quote card

Pull-quote / expert citation. Nested inside a panel body.

```html
<figure class="fcmi-quote-card fcmi-tone-blue">
  <blockquote>"Quote text."</blockquote>
  <figcaption>— Attribution, Title</figcaption>
</figure>
```

---

### Document excerpt

Bureaucratic / official document quoted text.

```html
<section class="fcmi-document-excerpt fcmi-tone-gray">
  <p class="fcmi-excerpt-label">Excerpt: Source Document Title</p>
  <blockquote>"...long official text..."</blockquote>
</section>
```

---

### Callout card

Secondary annotation box inside a panel (e.g., "Bureaucratic Reality Check").

```html
<section class="fcmi-callout-card fcmi-tone-blue">
  <h4>Callout Title</h4>
  <p>Content.</p>
</section>
```

---

### Protocol list

Numbered step sequences. Nested inside a `fcmi-panel--strong` panel body.

```html
<div class="fcmi-protocol-stack">
  <section class="fcmi-protocol-row fcmi-tone-red">
    <span class="fcmi-protocol-num">1</span>
    <div>
      <h4>DEFCON ∞: DON'T</h4>
      <p>Description.</p>
    </div>
  </section>
  <!-- more rows: fcmi-tone-orange, fcmi-tone-yellow -->
</div>
```

---

### Survival imperative image

The full-width "DON'T" figure. Forward only, unless a chapter has an equivalent full-bleed image.

```html
<figure class="not-prose fcmi-imperative">
  <img
    src="/first-contact/dont.webp"
    alt="Critical survival imperative: don't approach, don't signal, don't investigate, don't even think."
    width="2048"
    height="650"
    loading="eager"
    decoding="async"
  />
</figure>
```

No Astro component needed — `.fcmi-imperative` handles the rounding and overflow.

---

### Next chapter link

End of every chapter except the afterword.

```html
<a class="not-prose fcmi-next-link fcmi-window fcmi-tone-blue"
   href="/reader/first-contact-manual/chapter-1/"
   aria-label="Continue to Chapter 1: Title">
  <div class="fcmi-shell">
    <div class="fcmi-frame fcmi-next-link-frame">
      <span class="fcmi-corner fcmi-corner--tl" aria-hidden="true"></span>
      <span class="fcmi-corner fcmi-corner--tr" aria-hidden="true"></span>
      <span class="fcmi-corner fcmi-corner--bl" aria-hidden="true"></span>
      <span class="fcmi-corner fcmi-corner--br" aria-hidden="true"></span>

      <span class="fcmi-next-link-number" aria-hidden="true">01</span>
      <span class="fcmi-next-link-body">
        <span class="fcmi-kicker">Next Chapter</span>
        <strong class="fcmi-next-link-title">Chapter 1: Full Title</strong>
        <span class="fcmi-next-link-subtitle">TAGLINE SUBTITLE</span>
      </span>
      <span class="fcmi-next-link-arrow" aria-hidden="true">→</span>
    </div>
  </div>
</a>
```

Tone matches the target chapter. Afterword link uses `fcmi-tone-purple`.

---

## Standard chapter skeleton

```
1. Frontmatter (see checklist below)
2. import '../../../styles/reader/first-contact-manual.css'
3. Hero block
      <section class="fcmi-hero fcmi-window fcmi-tone-purple">
4. ---
5. ## Document Overview / ## Chapter Overview
      2–3 plain prose paragraphs. No blocks, no sub-headings.
6. [Forward only] ## How to Use This Book
      Prose + routing table + notice
7. ---
8. [Forward only] Chapter Index
      <section class="fcmi-index">
9. ---
10. ## Section Heading — prose paragraph(s)
      [fcmi-section-panel / fcmi-metric-grid / fcmi-reference-spread / etc.]
      [repeat for each section]
11. ---
12. ## Conclusion — plain prose
13. Next chapter link
      <a class="fcmi-next-link fcmi-window">
```

All custom HTML blocks must have `not-prose` on the outermost element.
Plain `## Markdown headings` and prose paragraphs go between blocks without wrappers.

---

## Frontmatter checklist

Copy from `forward.mdx` and adjust per-chapter:

- `authorName`: `"An Anonymous Interstellar Veteran (Redacted)"` — parentheses, not brackets
- `authorBio`: exact bio sentence — see world bible
- `image`: `/first-contact/chapter-N.webp` or fall back to `/posts/timeline/chronos.png`
- `timelineYear: 7.652e3`, `timelineEra: "awakening-era"`,
  `timelineLocation: "The Fringes of Known (and Mostly Hostile) Space"`
- `isKeyEvent: true`, `showImageOnPost: false`, `bannerType: "image"`, `category: "MEGA MEAL"`
- `draft: true`, `series: "first-contact-manual"`,
  `seriesTitle: "The Interstellar Traveler's First Contact Manual"`, `contentFormat: "manual"`
- `seriesPart`: chapter number (1–5). **Omit** for the forward and afterword.
- `tags`: always include `First Contact`; add 2–4 chapter-specific tags, no more than 5 total.

**Afterword only:** override `authorName` and `authorBio` with the Bi-Smart Corporation
executive committee — see world bible for exact text.

---

## Prose style

- `## Chapter Overview` (or `## Document Overview` in the forward) should be 2–3 plain prose
  paragraphs — no components, no sub-headers.
- Statistical callouts must use one of the two canonical named datasets (47,829 documented
  first-contact events; 23,847 documented helpful/hostile scenarios). If neither fits, introduce
  a new dataset with an explicit source label rather than implying a third unnamed survey.
- Never end a list with a dangling placeholder fragment like "...and angry robot butlers others"
  — complete every sentence.

---

## Do not modify human-authored prose

See `_AGENTS.md` for the complete rule. Summary: spelling corrections only. Do not change
word choice, sentence structure, frontmatter metadata, ASCII punctuation (`--`, `...`),
or intentional in-world comedy errors.

---

## Forward and afterword deviations

- **Forward** includes the Routing Table and Chapter Index — both are forward-only blocks.
- **Afterword** uses the Bi-Smart Corporation narrator (different frontmatter), heavier corporate
  tone, and is exempt from the standard numbered-section skeleton until a dedicated refactor.
- Neither file uses `seriesPart` in frontmatter.

**Afterword narrator (frontmatter only):**
```yaml
authorName: "Bi-Smart Corporation Executive Research Committee (Names Redacted for Cosmic Security)"
authorBio: "Corporate entity specializing in existential liability documentation, survival equipment durability testing, and maintaining profitable business models during species extinction events."
```

---

## Things to avoid

- **No `<style>` blocks in MDX** — all CSS lives in `first-contact-manual.css`
- **No Tailwind class piles in MDX** — use `fcmi-*` classes
- **No hardcoded hex/rgba values** — use `fcmi-tone-*` to change accent color
- **No Astro component imports for styling** — use `fcmi-*` HTML patterns instead. Functional
  components providing behavior, data handling, or image optimization are allowed when plain
  MDX cannot reasonably substitute.
- **No inline `style="..."` attributes** except `style={{width: 'X%'}}` on `.fcmi-progress-fill`
- **Nested tones only for semantic sub-items** — legend rows, stat cards, data rows,
  protocol rows, and mini-cards may carry their own `fcmi-tone-*`. Do not add tone
  classes to structural containers or decorative spans merely to vary color.
- **No red for decoration** — `fcmi-tone-red` is for genuine danger only
