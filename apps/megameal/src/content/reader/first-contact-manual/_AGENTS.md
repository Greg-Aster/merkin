# First Contact Manual — Agent Instructions

Before editing any `.mdx` file in this directory, read both contract docs:

- `apps/megameal/docs/first-contact-manual-style-guide.md` — component/CSS
  contract (shared components, tone palette, chapter skeleton, frontmatter
  checklist).
- `apps/megameal/docs/first-contact-manual-world-bible.md` — voice, canonical
  statistics, and recurring named entities.

`forward.mdx` is the reference implementation both docs are based on — match its
patterns over any other chapter.

These two docs are also mirrored as on-site posts (`first-contact-manual-style-guide`
and `first-contact-manual-world-bible` under `src/content/posts/`, category "Site
Updates") for human browsing. The `docs/` copies are the source of truth — update
those first, then mirror changes into the posts if they should stay in sync.

This file itself is excluded from the `reader` content collection because Astro's
default glob loader skips any file or directory whose name starts with `_` — it
will not appear as a page on the site.

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
