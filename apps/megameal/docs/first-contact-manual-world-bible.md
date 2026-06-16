# First Contact Manual — World Bible & Voice Guide

Applies to `src/content/reader/first-contact-manual/*.mdx`. Use this to keep facts,
numbers, and voice consistent. `forward.mdx` is the voice reference.

## Narrator & framing

- The manual (forward through chapter 5) is narrated/compiled by **"An Anonymous
  Interstellar Veteran (Redacted)"**.
  - Bio (use verbatim): *"Survivor of multiple unscheduled reality adjustments and
    involuntary jello-fication attempts. Currently enjoys competitive macramé and
    not being eaten."*
  - Voice: a survivor writing a dry, deadpan field guide. Treats horrifying cosmic
    facts with bureaucratic understatement. Black comedy comes from the gap between
    the calm register and the content (vaporization, "jello-fication," "artistic
    repurposing").
- The **afterword** switches narrator to the **"Bi-Smart Corporation Executive
  Research Committee (Names Redacted for Cosmic Security)"**.
  - Bio (use verbatim): *"Corporate entity specializing in existential liability
    documentation, survival equipment durability testing, and maintaining
    profitable business models during species extinction events."*
  - Voice: corporate memo / annual report tone applied to species extinction.
    More "business case" framing, less first-person survivor color.
- In-world setting: `timelineYear: 7.652e3` ("7,652"), the **"awakening-era"**,
  located in **"The Fringes of Known (and Mostly Hostile) Space"**.

## Recurring voice devices

- **Statistical precision as comedy**: cite oddly specific numbers (e.g.
  "47,829 documented first-contact events across 12 galactic sectors",
  "23,847 documented helpful/hostile contact scenarios") then undercut them with an
  absurd example.
- **"DON'T" as the cardinal rule**: the recurring imperative, usually styled as
  `<span class="text-red-400 text-xl font-bold">DON'T</span>`.
- **Bi-Smart Corporation**: the omnipresent, ethically-dubious "Kwik-E-Mart-esque"
  interstellar megacorp. Appears via:
  - Product placement / coupon-code gags ("Shop Smart - Shop Bi-Smart").
  - The standard disclaimer pattern: *"Bi-Smart Corporation assumes no
    responsibility for [escalating absurd list ending in] ... career changes to
    safer professions like bomb disposal, marriage counseling, or competitive
    [X] wrestling."* — vary the wrestling opponent (shark/volcano/etc.) and the
    preceding list per chapter, keep the cadence.
  - Has "survived bankruptcy on 847 separate occasions" — reuse this number if the
    bankruptcy gag recurs.
- **Bureaucratic obfuscation**: official protocols (e.g. "Interstellar Compact
  Mandates, Section 34 Paragraph C Part B Footnote Amanda and the CF") are
  deliberately unreadable, packed with fake cross-references, then summarized in
  one plain sentence that is the only actionable advice.
- **Footnote-style fictional citations**: e.g. "Dr. Yuki Tanaka, Xenobiological
  Threat Assessment Division" — invented experts/divisions for pull-quotes. Keep
  names plausible-but-fictional, one credential each, don't over-explain.

## Canonical statistics (don't contradict these)

- **Galactic Contact Fatality Index (GCFI)**, established in `forward.mdx`:
  - Successful Contact: **0.003%**
  - Catastrophic Failure: **99.997%**, broken down as:
    - Immediate Vaporization: 34.2%
    - Biological Conversion: 28.7%
    - Reality Restructuring: 19.1%
    - Temporal Displacement: 12.3%
    - Artistic Repurposing: 5.7%
  - Source line: *"Compiled from 47,829 documented first-contact events across 12
    galactic sectors."*
- **Known Threat Categories** (also from `forward.mdx`):
  - Hostile Biologics: 47.3%
  - Incompatible Physics: 31.8%
  - Cosmic Indifference: 15.2%
  - Pure Malevolence: 5.7%
- Chapter 3 / Chapter 4 reuse a **23,847 documented [helpful|hostile] contact
  scenarios** dataset for their own breakdowns (helpful aliens ~77% elimination via
  "customer service excellence"; hostile aliens ~54% elimination via military
  superiority, per the Chapter 5 hero quote). When adding new stats, either tie them
  back to one of these two named datasets (47,829 / 23,847) or introduce a new
  dataset explicitly — don't silently imply a third unnamed survey.

## Recurring named entities — reuse before inventing new ones

- **Vel'Tar Consortium** — hostile biologics + incompatible physics + pure
  malevolence, i.e. the "worst of all categories" faction (forward: "Lucky us.").
- **Kepler-442 / Kepler-442b** — site of the "polite nod incident," one of the rare
  GCFI successful-contact cases; also referenced as home of the "Cosmic Architects"
  (chapter 2.6).
- **Kepler-186** — used elsewhere as another example system; keep distinct from
  Kepler-442's "success story" branding.
- **Zorp-Benson Affective Heuristic Analyzer** — fictional instrument used in the
  Interstellar Compact Mandates excerpt; reusable for other bureaucratic-tech gags.
- **Glorgian Death Wasp** — used as a "don't accidentally mimic this mating call"
  joke; reusable as a stock dangerous-fauna reference.

## When adding new world content

- Check this file first for an existing stat, faction, or device that fits before
  inventing a new one — the manual reads as one continuous in-world document, and
  named entities recurring across chapters is what sells that.
- If you add a new recurring number, faction, or catchphrase intended for reuse,
  add it here so later chapters stay consistent.
- Keep the **forward/chapters 1–5 vs afterword** narrator split — don't have the
  survivor voice bleed into the afterword's corporate voice or vice versa.
