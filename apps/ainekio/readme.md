# Ainekio Site

This app is the public Ainekio website at `https://ainek.io`.

It lives in the Merkin monorepo so it can use the same shared Temporal Flow site architecture as the other Merkin-managed sites.

## Ownership

- app: `apps/ainekio`
- shared site package: `packages/blog-core`
- Cloudflare Pages project: `merkin-ainekio`
- production domain: `ainek.io`

## Agent preparation and project index

The shared handoff is being drafted at `metahuman-os/docs/AGENT_PREP.md` and
is not published yet. Its reviewed version will hold the engineering methods
and architecture instructions. The public [project purpose](src/content/posts/Project-Overview.mdx#project-intent)
only describes the robot's goal; do not put agent instructions on the live site.

### Project Index

- Public route: `/project-guide/`
- Canonical content: `src/content/spec/project-guide.md`
- Rendering: `src/pages/project-guide.astro`, using the shared Markdown and main-grid layout

This is the single cross-repo work queue. Edit the Markdown once; do not maintain
a separate queue in the robot or MetaHuman repositories. Those repositories can
link to the deployed route after publication and retain their own detailed
technical authority. Update the index's observation
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

Working rows have a stable ID, state, technical owner, next action, dependency,
and acceptance condition. Keep implemented foundations out of the open queue;
record their evidence separately. An owner report is distinct from source checks
and connected-hardware validation. Keep the index compact; do not duplicate plans,
audit narratives, or diary articles.

Current technical authority:
- Body transport, deployment and safety: [Body Control integration](https://github.com/Greg-Aster/Ainekio-bot/blob/main/docs/BODY_CONTROL_INTEGRATION.md)
- MetaHuman runtime ownership: [Maintained surface](https://github.com/Greg-Aster/metahuman-os/blob/main/docs/technical/MAINTAINED_SURFACE.md)
- Site overhaul scratchpad: [historical record](PROGRESS_SCRATCHPAD.md), not an active queue

Update the owning technical document before its queue row. Preserve dated evidence
when marking a plan superseded; do not silently turn an old audit into current
status or require hardware assembly before documentation and host-side work.

The index's “Original Ainekio and Ainekio v2” section provides context for the
supported S3 design and the twelve-servo exploration. Keep dated article bodies
and observation dates intact; use small context links when a later development
changes how readers should interpret them. Public naming stays Ainekio / Ainekio v2.
