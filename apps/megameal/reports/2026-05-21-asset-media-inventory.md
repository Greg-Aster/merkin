# Megameal Asset And Media Inventory - 2026-05-21

## Commands

- `sed -n '1,220p' AGENTS.md`: passed; repo instructions reviewed.
- `sed -n '1,260p' apps/megameal/AGENTS.md`: passed; Megameal instructions reviewed.
- `sed -n '1,240p' apps/megameal/reports/site-audit-agent-briefs/03-asset-media-inventory.md`: passed; assigned brief reviewed.
- `sed -n '1,220p' apps/megameal/reports/site-audit-agent-briefs/README.md`: passed; handoff format reviewed.
- `git status --short`: passed; worktree was already dirty from other work, and no unrelated files were changed by this audit.
- `sed -n '1,260p' apps/megameal/reports/2026-05-21-link-and-build-audit.md`: passed; previous link/build report reviewed.
- `pnpm --dir apps/megameal audit:links`: failed with expected audit exit; current output is 6 missing internal route targets from 6 references, with no missing asset targets.
- `find apps/megameal/public -type f -printf '%s %p\n' | sort -nr | head -80`: passed with a benign `sort` broken-pipe warning from `head`; captured largest public files.
- `find apps/megameal/dist -type f -printf '%s %p\n' | sort -nr | head -80`: passed early in the audit while `dist/` still contained generated files; later `dist/` was empty, so it was not regenerated.
- Generated HTML asset scan with a read-only Node script: passed; inspected 341 generated HTML files and found 0 missing generated asset references for `src`, `href`, `poster`, and `srcset`-style attributes.
- Source absolute asset scan with a read-only Node script: passed; inspected 386 source files and found 60 missing absolute asset-like references, mostly examples/placeholders/backups plus the active findings below.
- Product/review/video/home media-field scan with a read-only Node script: passed; checked 115 `src`, `poster`, `thumbnail`, `image`, `stillSrc`, `webglStillSrc`, `ktx2StillSrc`, and `videoSrc` values. One actual missing asset was found after excluding route-like values.
- Exact public duplicate scan with a read-only Node script: passed; found 77 exact duplicate groups over 1 MB.
- `du -sh` and `find ... -printf` inventory commands for `public/`, `generated/`, `models/`, `posts/`, `assets/`, and `audio/`: passed.
- `rg` source searches for missing reported assets, media fields, `srcset`, favicons, and social images: passed.
- `file` checks for selected large images: passed.
- `pnpm --dir apps/megameal build`: not run; the assignment required staying read-only except for this report, and build would write generated output.
- `pnpm --dir apps/megameal type-check`: not run; this was report-only with no code changes.
- `pnpm --dir apps/megameal audit:css`: not run; this was report-only with no CSS changes.

## Summary

- Current generated HTML did not show missing asset references when scanned, and the current link audit has no missing image/video/audio targets. The remaining link-audit failures are route targets.
- Active source/content still contains missing image metadata that can produce broken banners, cards, or social images on the next build.
- `apps/megameal/public/` is about 4.1 GB. The largest risk is public deployment of generated/source/editor assets: `public/generated/` is about 3.0 GB, and exact duplicate public assets over 1 MB appear in 77 groups.
- Favicons configured in `src/constants/icon.ts` are present under `public/thumb/`.
- Product/review/video media sources and posters are mostly present; the clear active media miss is the first home intro fallback still at `/assets/banner/ComfyUI_00138_.webp`.

## Findings

### High: Missing Post Social Images

- Source: `apps/megameal/src/content/posts/timelines/end-of-time.mdx:13`
- Evidence: frontmatter uses `image: /posts/generic/contruction.png`, but `public/posts/generic/` only contains `avatar9.png` and `universe.png`.
- Impact: Generated cards and OpenGraph/Twitter image metadata for this post can point at a missing image. The path also appears to contain a typo: `contruction`.
- Suggested owner/fix path: content owner for `src/content/posts/timelines/end-of-time.mdx`; either restore the intended image under `public/posts/generic/` or update the frontmatter to an existing image.

### High: Missing Snuggaliod Emergence Social Image

- Source: `apps/megameal/src/content/posts/timelines/Snuggaliod-Emergence.mdx:15`
- Evidence: frontmatter uses `image: "/posts/generic/imagenotfoupng"`, which has no extension and no matching file in `public/posts/generic/`.
- Impact: Generated cards and OpenGraph/Twitter image metadata for this post can point at a missing image.
- Suggested owner/fix path: content owner for `src/content/posts/timelines/Snuggaliod-Emergence.mdx`; update the frontmatter to the current public asset, likely `/posts/timeline/snuggloid-entity.png` if that is the intended image.

### High: Relative Snuggaliod Image Path In MDX Body

- Source: `apps/megameal/src/content/posts/timelines/Snuggaliod-Emergence.mdx:104`
- Evidence: `<ImageWrapper src="content/posts/timelines/snuggloid-emergence/snuggloid-entity.png" ... />` is a relative path and does not match the existing public asset `public/posts/timeline/snuggloid-entity.png`.
- Impact: On a rebuilt page, this can resolve relative to the post route instead of public root and break the in-body image.
- Suggested owner/fix path: content owner for `src/content/posts/timelines/Snuggaliod-Emergence.mdx`; use a root-relative public path or an imported asset.

### High: Missing Home Intro Fallback Still

- Source: `apps/megameal/src/components/home/homeIntroScreens.ts:11`
- Evidence: first home intro screen uses `stillSrc: '/assets/banner/ComfyUI_00138_.webp'`; `public/assets/banner/` contains `ComfyUI_0144.png`, `ComfyUI_00143_.webm`, and optimized `home-intro-stills/home-intro.webp`, but not `ComfyUI_00138_.webp`.
- Impact: The first home intro fallback image can fail in non-WebGL, loading, or reduced-capability paths even though the WebGL still exists.
- Suggested owner/fix path: home intro/banner owner; point `stillSrc` at an existing public still or restore the missing asset.

### Medium: Missing About Background Image Metadata

- Source: about content frontmatter.
- Evidence: these `backgroundImage` paths do not exist under `public/`:
  - `src/content/about/dr-elara-voss.md:20` -> `/posts/timeline/archive-vault.png`
  - `src/content/about/temporal-historian-collective.md:20` -> `/posts/timeline/collective-consciousness.png`
  - `src/content/about/transmission-data.md:20` -> `/posts/timeline/data-fragments.png`
  - `src/content/about/linda-sue.md:20` -> `/posts/timeline/qarnivor-surface.png`
  - `src/content/about/mysterious-witness.md:20` -> `/posts/timeline/qarnivor-wasteland.png`
  - `src/content/about/gregory-aster.mdx:23` -> `/images/creator-bg.jpg`
- Impact: If these fields are rendered by about cards, detail banners, social metadata, or future layouts, they will produce missing images or fallback-only presentation.
- Suggested owner/fix path: about content owner; align these fields with existing `public/posts/timeline/` and `public/about/` assets or add the intended files.

### Medium: Missing Story Mode Author Avatar

- Source: `apps/megameal/src/content/posts/introducing-story-mode.mdx:7`
- Evidence: `avatarImage: "/assets/avatar/garfunkel.png"` does not exist. A likely related file exists at `public/about/garfunkel.png`.
- Impact: Author/avatar UI can fall back or break for the Story Mode post if this field is rendered.
- Suggested owner/fix path: content owner for `introducing-story-mode.mdx`; update to the current public avatar path or restore the missing avatar asset.

### Medium: Legacy Banner Config Contains Missing Defaults

- Source: `apps/megameal/src/config/banners/`.
- Evidence: source scan found missing defaults and fallbacks:
  - `src/config/banners/image.ts` -> `/path/to/your/default/image.jpg`, `/assets/banner/fallback.jpg`
  - `src/config/banners/video.ts` -> `/assets/banner/video-fallback.jpg`
  - `src/config/banners/assistant.ts` -> `/path/to/assistant/background.jpg`, `/assets/assistant/bleepy.png`
  - `src/config/banners/timeline.ts` -> `/posts/timeline/ancient-epoch.png`, `/posts/timeline/transcendent-age.png`, `/posts/timeline/final-epoch.png`, plus other timeline helper defaults
- Impact: These look partly like template/default files, but if any default banner path is reachable, it can emit broken assets.
- Suggested owner/fix path: banner config owner; replace template placeholders with valid defaults or mark these modules as documentation-only/dead if they are not used.

### Medium: Public Asset Tree Is Very Large

- Source: `apps/megameal/public/`.
- Evidence:
  - `public/`: about 4.1 GB, 4635 files.
  - `public/generated/`: about 3.0 GB.
  - `public/models/`: about 286 MB.
  - `public/posts/`: about 370 MB.
  - `public/assets/`: about 247 MB.
  - `public/audio/`: about 75 MB.
  - Extension totals include 1808 `.glb` files at about 2.62 GB, 1050 `.png` files at about 879 MB, 8 `.gif` files at about 118 MB, 11 `.mp4` files at about 148 MB, and 10 `.blend`/`.blend1` files at about 212 MB.
- Impact: Deployment size, local build copy time, cache churn, and CDN storage can be dominated by generated/editor artifacts rather than user-facing page assets.
- Suggested owner/fix path: asset pipeline owner; decide which generated/editor assets belong in deployable `public/` and which should move to source storage, artifact storage, or a game-only asset bucket.

### Medium: Huge User-Facing Media Assets

- Source: largest public image/video files.
- Evidence:
  - `public/posts/Mega-Meal-Explained/gif/logo3.gif` - 47.0 MB, 1024 x 768 GIF.
  - `public/assets/banner/golden-era.webp` - 31.0 MB.
  - `public/posts/Mega-Meal-Explained/gif/running_720p.gif` - 16.9 MB, 720 x 480 GIF.
  - `public/posts/Mega-Meal-Explained/gif/title3.gif` - 12.6 MB, 1024 x 768 GIF.
  - `public/posts/Mega-Meal-Explained/gif/fries1.gif` - 10.4 MB, 1024 x 768 GIF.
  - `public/posts/Mega-Meal-Explained/gif/orings1.gif` - 9.8 MB, 1024 x 768 GIF.
  - `public/assets/portal-demo/slave.mp4` - 33.6 MB.
  - `public/assets/portal-demo/democlip6.mp4` - 23.8 MB.
  - `public/assets/portal-demo/democlip3.mp4` - 20.7 MB.
  - `public/posts/timeline/animated-universe.mp4` - 17.4 MB.
- Impact: Large media can slow page load, increase bandwidth costs, and hurt mobile users if served directly in cards, banners, or posts.
- Suggested owner/fix path: media optimization owner; prioritize GIF-to-video/WebP replacements and route-specific responsive variants for assets that render above the fold.

### Medium: Public Editor/Source Files

- Source: `apps/megameal/public/models/` and `apps/megameal/public/generated/style-lab/`.
- Evidence:
  - `public/models/snuggaliod/Fur.blend` - 107.9 MB.
  - `public/models/snuggaliod/Fur.blend1` - 3.5 MB.
  - `public/generated/style-lab/blender/.../*.blend` and `.blend1` files total over 100 MB among the top entries.
- Impact: `.blend` and `.blend1` files are source/editor artifacts. Serving them from `public/` exposes heavy authoring files to production and inflates build/deploy output.
- Suggested owner/fix path: generated asset owner; inventory whether any runtime route needs these files. If not, move them out of deployable `public/` through a controlled asset-storage migration.

### Medium: Exact Duplicate Large Assets

- Source: exact SHA-256 duplicate scan over public files larger than 1 MB.
- Evidence: 77 duplicate groups were found. Largest examples:
  - 31.5 MB duplicate pair: `models/levels/observatory/observatory-environment-2026-05-20T03-59-49-020Z.glb` and `models/levels/observatory-environment.glb`.
  - 6.4 MB duplicate pair: two `generated/style-lab/workspace/world-root-basin-.../source/world-root-basin.glb` files.
  - 5.8 MB duplicate pair: `generated/hunyuan3d/shore-ring/...glb` and `generated/hunyuan3d/well-dais/...glb`.
  - 5.7 MB duplicate group: six different generated/root/trunk/bifrost GLBs have identical contents.
  - 5.4 MB duplicate group: many generated Hunyuan assets share identical contents across dozens of different filenames.
  - 5.0 MB duplicate pair: `generated/runtime-game-assets/manifest.json` and `generated/runtime-game-assets/manifest.previous.json`.
- Impact: Exact duplicates waste deploy size and can hide pipeline issues where distinct asset names are backed by identical placeholder/output files.
- Suggested owner/fix path: generated asset pipeline owner; first separate intentional aliases from accidental generated duplicates, then dedupe by manifest indirection or remove stale historical outputs from deployable public assets.

### Low: SFX Audition Assets Are Public

- Source: `apps/megameal/public/audio/sfx/audition/`.
- Evidence: folder is about 24 MB and contains 239 files. `raw/` is about 20 MB and `shortlist/` is about 4.2 MB. Some shortlist files are exact copies of raw files, for example `40-oga60-sfx_19a.ogg` appears in both `shortlist/` and `raw/open-game-art-60-cc0-sci-fi/`.
- Impact: This looks like useful working/audition material, but it is deployed publicly with the site and duplicates some raw files.
- Suggested owner/fix path: audio owner; decide whether the audition page and raw packs are intended production assets. If not, move raw audition material outside `public/` and keep only selected runtime SFX.

### Low: Favicon Set Is Currently Complete

- Source: `apps/megameal/src/constants/icon.ts` and `apps/megameal/public/thumb/`.
- Evidence: all configured default favicon paths exist:
  - `/thumb/favicon-light-32.png`
  - `/thumb/favicon-light-128.png`
  - `/thumb/favicon-light-180.png`
  - `/thumb/favicon-light-192.png`
  - `/thumb/favicon-dark-32.png`
  - `/thumb/favicon-dark-128.png`
  - `/thumb/favicon-dark-192.png`
- Impact: No current production favicon miss found. The old missing dark 180 reference from the earlier report is not present in `defaultFavicons`.
- Suggested owner/fix path: no asset fix needed unless the design requires a dark 180 icon.

### Low: Admin And Backup Placeholder Paths Are Not Real Assets

- Source: admin/config/example files.
- Evidence: the source scan reports missing placeholder paths such as `/favicon/icon-32x32.png`, `/images/avatar.png`, `/posts/your-image.jpg`, `/src/assets/content-avatar/avatar.png`, `/src/assets/mascot/standard.png`, and paths under `src/config/config_backup/`.
- Impact: These may not render publicly, but they create noise in automated source asset scans and can mislead future agents.
- Suggested owner/fix path: admin/config owner; either keep them clearly marked as examples or replace with existing demo assets if the admin UI renders them.

## Deferred

- Build was not run because it would write generated output outside this report-only assignment.
- Browser/runtime media loading was not checked; this audit stayed with deterministic source, public, and generated-file inspection.
- External YouTube thumbnails were not fetched because network checks are intentionally outside this brief.
- `apps/megameal/dist/` was available early in the audit and then became empty later. I did not regenerate it, so generated HTML findings are based on the earlier scan output from 341 HTML files.
- No assets were deleted or modified.
- No code, content, generated data, routes, or CSS were fixed.
