# Travel App Scaffold

This app is a clean travel-blog starter that lives inside the `merkin` monorepo.

## What is shared vs local

- Shared code: `@merkin/blog-core` (schema, utilities, shared components)
- Local per-site content: `src/content/posts/*.md`
- Local per-site presentation: `src/config/site.ts`, `src/styles/global.css`

## Commands

From monorepo root:

- `pnpm dev:travel`
- `pnpm build:travel`

## Next setup steps

1. Set `siteConfig.url` in `src/config/site.ts` to your real domain.
2. Update branding text/colors in `src/config/site.ts` and `src/styles/global.css`.
3. Add your real posts under `src/content/posts/`.
