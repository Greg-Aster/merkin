# Megameal Accessibility Heuristics - 2026-05-21

## Commands

- `sed -n '1,220p' AGENTS.md`: passed.
- `sed -n '1,260p' apps/megameal/AGENTS.md`: passed.
- `sed -n '1,240p' apps/megameal/reports/site-audit-agent-briefs/README.md`: passed.
- `sed -n '1,260p' apps/megameal/reports/site-audit-agent-briefs/04-accessibility-heuristics.md`: passed.
- `git status --short`: passed. The worktree already had unrelated dirty files from other agents; this audit did not revert or edit them.
- `sed -n '1,220p' apps/megameal/reports/2026-05-21-link-and-build-audit.md`: passed.
- `find apps/megameal/dist -type f -name '*.html' | sort | wc -l`: passed at the start of the pass and found 341 generated HTML files.
- `node <<'NODE' ... generated HTML accessibility heuristic scan ... NODE`: passed against the generated HTML snapshot that existed at the start of the pass.
- `rg '<img|<button|aria-|role=|<h[1-6]' apps/megameal/src packages/blog-core/src`: passed in targeted forms while inspecting source components.
- `rg '<input|<select|<textarea' apps/megameal/src/components apps/megameal/src/pages packages/blog-core/src/components`: passed.
- `rg 'ButtonLink|<ButtonLink' apps/megameal/src packages/blog-core/src`: passed.
- `rg 'on:click|onclick=|addEventListener...' apps/megameal/src/components apps/megameal/src/pages packages/blog-core/src/components`: passed.
- `rg 'packages/blog-core/src/components/SideBar.astro' ...`: failed because that guessed file path does not exist; this was non-blocking and no files were changed.
- `pnpm --dir apps/megameal build`: not run. The assignment required staying read-only except for this report; a build would rewrite `dist/` and generated outputs.
- `pnpm --dir apps/megameal type-check`: not run. This was an audit-only task with no code changes.
- `pnpm --dir apps/megameal audit:css`: not run. This was not a frontend/style change and no CSS was edited.

## Summary

- The generated HTML snapshot had 0 `<img>` tags missing `alt`, but 137 images with empty `alt=""`. Several are clearly decorative, but source review shows the project needs a clearer image-alt ownership policy for thumbnails, reader images, cookbook images, and post cards.
- The strongest source-level issues are unlabeled text inputs in search and CUPPY chat surfaces, missing page-level headings on generated archive taxonomy pages, duplicate/competing `<h1>` ownership in reader and MDX content paths, and non-semantic interactive wrappers used as links/buttons.
- The initial generated snapshot showed 239 HTML files with no `<h1>`, 17 files with multiple `<h1>` elements, and 94 heading level skips. The no-`h1` group is mostly archive taxonomy output; the multiple-`h1` group includes reader pages and content pages with embedded `<h1>` tags.
- During the audit, `apps/megameal/dist/` became empty, apparently due concurrent work outside this agent. I did not rebuild it because the task explicitly required read-only behavior except for this report.

## Findings

### High: Search and CUPPY Chat Inputs Rely on Placeholder Text Instead of Accessible Labels

- Source: `apps/megameal/src/components/Search.svelte:230`, `apps/megameal/src/components/Search.svelte:253`, `apps/megameal/src/components/bleepy/Bleepy.astro:34`, `apps/megameal/src/components/bleepy/BleepyBanner.astro:27`, `apps/megameal/src/components/bleepy/BleepyPostWidget.astro:35`
- Evidence: The desktop and mobile search fields render bare `<input>` elements with placeholders but no `<label>`, `aria-label`, or `aria-labelledby`. The desktop CUPPY chat inputs do the same. The mobile CUPPY input is already labeled with `aria-label="Chat with mascot"`, so the pattern is inconsistent.
- Impact: Screen reader users may only get a generic edit field or placeholder-derived hint, and placeholder text disappears during editing. Voice-control users also get weaker target names.
- Suggested owner/fix path: `Search.svelte` should give both search fields stable accessible names. CUPPY chat components should share one labeled chat-input pattern, likely with an `aria-label` or visually hidden label matching the mobile implementation.

### High: Archive Taxonomy Pages Can Render Without a Page-Level Heading

- Source: `apps/megameal/src/pages/archive/category/[category].astro:29`, `apps/megameal/src/pages/archive/tag/[tag].astro:25`, `apps/megameal/src/components/ArchivePanel.astro:13`, `packages/blog-core/src/components/ArchivePanel.astro:33`
- Evidence: The category and tag routes pass only `<ArchivePanel>` into `MainGridLayout`. The shared archive panel starts with a plain `<div>` and then year rows; it does not emit a route-specific `<h1>`. The generated HTML scan reported 239 pages without an `<h1>`, with archive category/tag pages dominating the examples.
- Impact: Assistive-tech users do not get a clear page title/landmark heading after navigation. Search engines and automated QA also lose a basic page-structure signal.
- Suggested owner/fix path: Add a route-owned heading for archive taxonomy pages, for example `Archive: <tag>` or `Archive Category: <category>`, before `ArchivePanel`, or extend `ArchivePanel` with an explicit heading prop.

### Medium: Reader and MDX Content Paths Compete for `<h1>` Ownership

- Source: `apps/megameal/src/components/reader/ReaderBanner.astro:104`, `apps/megameal/src/components/reader/ReaderPage.astro:105`, `apps/megameal/src/content/posts/store/store-placeholder.mdx:26`, `apps/megameal/src/content/posts/timelines/miranda-bloody-mary/access-denied.mdx:33`
- Evidence: `ReaderBanner` renders the book title as `<h1>`, and `ReaderPage` renders the entry title as another `<h1>`. Some MDX content also includes hand-authored `<h1>` elements inside pages that are likely already title-owned by the layout. The generated snapshot reported 17 multi-`h1` pages, including reader routes and content pages.
- Impact: Multiple top-level headings can make page structure noisy and inconsistent. Users navigating by heading may hear the banner, layout, and content all claim top-level ownership.
- Suggested owner/fix path: Decide which layer owns the only page `<h1>`. Banner display titles should usually be `<p>`, `<div>`, or a lower heading if the route body owns the page title. MDX content should generally start at `<h2>` when the layout renders the post title.

### Medium: Interactive Link/Button Semantics Are Implemented With Wrappers in Several Shared Components

- Source: `packages/blog-core/src/components/control/ButtonLink.astro:9`, `packages/blog-core/src/components/control/ButtonLink.astro:10`, `packages/blog-core/src/components/widget/Categories.astro:43`, `packages/blog-core/src/components/banner-stage/BannerStage.astro:498`, `packages/blog-core/src/components/banner-stage/BannerStage.astro:506`, `apps/megameal/src/components/store/ProductCard.astro:185`, `packages/blog-core/src/components/control/BackToTop.astro:7`
- Evidence: `ButtonLink` nests a `<button>` inside an `<a>`, and `Categories` uses that component for category links. `BannerStage` renders clickable banner slides as `<div role="button" tabindex="0">` and then drives navigation in JavaScript. `ProductCard` uses a focusable `<div role="link">` with click and keydown handlers. `BackToTop` attaches click behavior to a wrapping `<div>` around a real button.
- Impact: Nested interactive elements and scripted `div` controls are more fragile for screen readers, keyboard users, browser link affordances, and automated accessibility tools. They can also create confusing focus and activation behavior when nested descendants are interactive.
- Suggested owner/fix path: Use native elements where possible: anchor-as-button styling for navigation, real `<button>` for actions, and avoid nesting a button inside an anchor. For full-card navigation, prefer a real stretched anchor or a clearly scoped primary link rather than a role-based wrapper with nested controls.

### Medium: Image Alt Text Policy Is Inconsistent Across Meaningful and Decorative Media

- Source: `apps/megameal/src/components/PostCard.astro:114`, `apps/megameal/src/components/reader/ReaderPage.astro:112`, `apps/megameal/src/components/reader/ReaderBanner.astro:35`, `apps/megameal/src/components/reader/ReaderBanner.astro:120`, `apps/megameal/src/components/reader/ReaderBanner.astro:168`, `apps/megameal/src/components/cookbook/CookbookReaderPage.astro:158`, `apps/megameal/src/pages/videos/index.astro:89`, `apps/megameal/src/pages/videos/index.astro:203`, `apps/megameal/src/pages/videos/[...slug].astro:120`
- Evidence: The generated snapshot had 0 images missing `alt`, but 137 images with `alt=""`. Some empty alt usage is correct for blurred backgrounds and decorative overlays. Other cases are content-bearing thumbnails, reader entry images, recipe images, and related media cards. Post cards also use a generic `alt="Cover Image of the Post"` for the main image rather than a title-specific value.
- Impact: Users who cannot see the page may miss meaningful media context, especially in card grids and reader/cookbook pages where the image helps identify the entry.
- Suggested owner/fix path: Document a local rule: decorative duplicate/background images get `alt=""` and often `aria-hidden="true"`; primary thumbnails and content images get specific alt text derived from title/name/context. Apply that rule in `PostCard`, reader, cookbook, and video listing components.

### Medium: Heading Levels Skip for Visual Styling in Content and Utility Cards

- Source: generated snapshot; examples include `reader/first-contact-manual/chapter-1/index.html`, `reader/first-contact-manual/chapter-2/index.html`, `reader/first-contact-manual/afterword/index.html`, `apps/megameal/src/content/reader/first-contact-manual/afterword.mdx:325`, `apps/megameal/src/content/reader/first-contact-manual/afterword.mdx:423`, `apps/megameal/src/pages/404.astro:57`
- Evidence: The generated snapshot reported 94 heading skips. Examples included `h3 -> h6`, `h2 -> h5`, and `h1 -> h3`. The first-contact manual MDX uses lower heading levels such as `<h5>` and `<h6>` for small visual labels, and the 404 cards jump from the page `<h1>` to card `<h3>` headings.
- Impact: Heading navigation can feel arbitrary because heading level is carrying visual size instead of document hierarchy.
- Suggested owner/fix path: Use semantic heading order for document sections and style them with classes. Visual micro-labels should usually be `<p>`, `<div>`, or `<span>` rather than `h5`/`h6` unless they are true nested headings.

### Low: Decorative Slider Stops Are Hidden Buttons

- Source: `apps/megameal/src/components/MegaMealReviewSlider.astro:50`, `apps/megameal/src/components/MegaMealReviewSlider.astro:53`, `apps/megameal/src/components/MegaMealReviewSlider.astro:58`, `apps/megameal/src/components/MegaMealReviewSlider.astro:59`
- Evidence: The review slider renders decorative track stops as `<button type="button" tabindex="-1" aria-hidden="true">`. The generated snapshot flagged 5 empty/aria-hidden buttons on `videos/mega-meal-explained/index.html`.
- Impact: Because the stops are `tabindex="-1"` and `aria-hidden="true"`, this is probably low user impact. Still, decorative controls should not be buttons because they are not intended to be activated or announced.
- Suggested owner/fix path: Convert decorative stops to `<span>` or `<div aria-hidden="true">`, keeping the real range input as the only control.

## Generated Snapshot Details

- HTML files scanned at the start: 341.
- Images missing `alt`: 0.
- Images with `alt=""`: 137.
- Empty named links: 0.
- Empty buttons: 5, all from the hidden review slider stop pattern.
- Possible unlabeled form controls: 2 in `store/index.html`, but source review showed these are wrapped in labels with visually hidden text, so they were treated as parser false positives.
- Pages with multiple `<h1>` elements: 17.
- Pages with no `<h1>` element: 239.
- Heading level skips: 94.
- Positive `tabindex` values: 0.
- Non-native `role="button"` uses in generated output: 56, mainly clickable banner slides.
- `aria-hidden` focusable-looking elements: 5, all review slider stop buttons with `tabindex="-1"`.

## Deferred

- No browser crawl or Playwright accessibility pass was run; this was the static accessibility-heuristics brief, not the browser-runtime brief.
- No full WCAG certification was attempted.
- No external accessibility checker was run because network access was restricted and the task was scoped to static local inspection.
- No rebuild was run because this agent was instructed to stay read-only except for this report. The generated HTML snapshot should be regenerated and rescanned after the current parallel code changes settle.
- No code, content, route, asset, generated data, or CSS fixes were made.
