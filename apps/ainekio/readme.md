# Ainekio Site

This app is the public Ainekio website at `https://ainek.io`.

It lives in the Merkin monorepo so it can use the same shared Temporal Flow site architecture as the other Merkin-managed sites.

## Ownership

- app: `apps/ainekio`
- shared site package: `packages/blog-core`
- Cloudflare Pages project: `merkin-ainekio`
- production domain: `ainek.io`

## Project Index

- Public route: `/project-guide/`
- Canonical content: `src/content/spec/project-guide.md`
- Rendering: `src/pages/project-guide.astro`, using the shared Markdown and main-grid layout

Edit the Markdown once; do not maintain a separate copy in the robot or MetaHuman
repositories. Those repositories can link to the deployed route after publication
and retain their own detailed technical authority. Update the index's observation
date and evidence links when reconciling a new baseline. An index update is not
proof of deployment or hardware qualification.

From the monorepo root, install with `pnpm install --frozen-lockfile`, then run:

```sh
pnpm --filter @merkin/ainekio dev
pnpm --filter @merkin/ainekio type-check
pnpm --filter @merkin/ainekio lint
pnpm build:ainekio
```

After a build, `node apps/ainekio/scripts/check-project-guide.mjs` checks the
rendered route, section anchors, navigation, local links/assets, and the Pagefind
loader. For a subdirectory preview, pass the same base used for the build:

```sh
pnpm --filter @merkin/ainekio test:base-path
SITE_URL=https://greg-aster.github.io SITE_BASE=/merkin/ainekio/ pnpm build:ainekio
SITE_BASE=/merkin/ainekio/ node apps/ainekio/scripts/check-project-guide.mjs
```

Markdown and MDX root-local links are prefixed at build time, so canonical content
works unchanged on both `ainek.io` and the GitHub Pages preview. Astro components
should use `url()` or `getPostUrlBySlug()` for local links and public assets.

Working rows name a next check, repository, state, and dated source. Recheck means
verification is needed, not that the cited issue is known to remain open.
Recorded-complete items are evidence, not a fresh runtime test. Keep the index
compact; do not duplicate plans, audit narratives, or diary articles.

The index's “Original Ainekio and Ainekio v2” section provides context for the
supported S3 design and the twelve-servo exploration. Keep dated article bodies
and observation dates intact; use small context links when a later development
changes how readers should interpret them. Public naming stays Ainekio / Ainekio v2.
