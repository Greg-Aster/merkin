# First Contact Manual — Agent Instructions

Before editing any `.mdx` file in this directory, read both contract docs:

- `apps/megameal/docs/first-contact-manual-style-guide.md` — CSS class system
  contract (`fcmi-*` classes, tone palette, HTML block patterns, chapter skeleton,
  frontmatter checklist).
- `apps/megameal/docs/first-contact-manual-world-bible.md` — voice, canonical
  statistics, and recurring named entities.

`forward.mdx` is the visual reference implementation. Match its styling language,
class naming, tone usage, rounded-window structure, and component-free CSS approach.
Do not copy forward-only content blocks (routing table, full chapter index, threat
legend, survival imperative image) into normal chapters — those are marked in the
style guide.

The base shared CSS file is `src/styles/reader/first-contact-manual.css`.
The threat-code flow extension is
`src/styles/reader/first-contact-manual-flow.css`. Import both at the top of
every active chapter MDX:

    import '../../../styles/reader/first-contact-manual.css'
    import '../../../styles/reader/first-contact-manual-flow.css'

Do not import Astro components for appearance. Every visual block has an `fcmi-*`
CSS class equivalent documented in the style guide. Do not write inline `<style>`
blocks or Tailwind class piles in MDX.

These two docs are also mirrored as on-site posts (`first-contact-manual-style-guide`
and `first-contact-manual-world-bible` under `src/content/posts/`, category "Site
Updates") for human browsing. The `docs/` copies are the source of truth — update
those first, then mirror changes into the posts if they should stay in sync.

This file itself is excluded from the `reader` content collection because Astro's
default glob loader skips any file or directory whose name starts with `_` — it
will not appear as a page on the site.

## Reference-only backup

`working-copy.mdx` is an archival backup of the original combined draft. Use it
only for reference and drift review. Do not edit it, reformat it, or treat it as
current canon unless the user explicitly asks for work on that file. The current
canon is the split manual (`forward.mdx`, `chapter-1.mdx` through
`chapter-5.mdx`, and `afterword.mdx`) plus the docs contracts.

## Written content is human-authored — do not rewrite prose

Every `.mdx` file in this directory contains human-authored narrative text. When
editing these files, agents must not change the substance of what was written:

- **Do NOT change** word choice, sentence structure, voice, or punctuation style
- **Do NOT change** frontmatter metadata (tags, title, description, authorName,
  etc.) without an explicit user request — even to bring them into contract
- **Do NOT replace** ASCII punctuation with Unicode equivalents (e.g. `--` stays
  `--`, `...` stays `...`; do not upgrade to em-dashes or ellipsis characters)
- **Do NOT "fix"** intentional fragments, informal grammar, or deliberate errors
  that may be in-world comedy (e.g. a Bi-Smart coupon saying "you're" instead of
  "your" is probably on purpose)
- **Do NOT add, remove, or reorder** items in narrative lists

**Spelling corrections are the one allowed exception** — fix clear misspellings
(wrong letters in a word, e.g. "cannabalism" → "cannibalism") but do not touch
anything else. When in doubt whether something is a typo or intentional style,
leave it as written and flag it to the user.
