# Repository Guidelines

## Project Structure & Module Organization
- `src/`: Astro site source. Svelte/Threlte UI lives under `src/threlte/**` and components in `src/components/**`. Routes/pages reside in `src/pages/**`.
- `src/content/`: MD/MDX content (posts, timelines, products). Use frontmatter for `title`, `description`, `pubDate`.
- `public/`: Static assets served as-is.
- `cloudflare-worker/`: Room directory Worker (`wrangler`) with entry `src/index.ts`.
- `tools/`: Dev utilities (generators, level/heightmap helpers) — run from this folder when needed.
- `dist/`: Build output (generated). Do not edit.
- `.github/workflows/`: CI (checks) and deploy (GitHub Pages) pipelines.

## Build, Test, and Development Commands
- `pnpm dev` (alias: `pnpm start`): Start Astro dev server.
- `pnpm build`: Build site and generate Pagefind index into `dist/`.
- `pnpm preview`: Serve the production build locally.
- `pnpm type-check`: Strict TypeScript checks.
- `pnpm format` / `pnpm lint`: Format and lint via Biome.
- `pnpm docs:generate`: Generate API docs (TypeDoc).
- Cloudflare Worker: `cd cloudflare-worker && pnpm dev | pnpm deploy`.
Note: pnpm is enforced (`preinstall`). Use Node 20 (matches CI).

## Coding Style & Naming Conventions
- TypeScript-first; avoid `any` (see PR checklist). 2-space indentation.
- Svelte/Threlte components: PascalCase file names; document public props with TSDoc.
- Astro components/pages: PascalCase for components; kebab-case routes.
- Content: kebab-case filenames (`*.md`/`*.mdx`) with required frontmatter.
- Always run `pnpm format && pnpm lint` before committing.

## Testing Guidelines
- No formal unit test suite yet; validate with `pnpm type-check`, `pnpm build`, and manual `pnpm preview`.
- If adding tests, prefer Vitest; co-locate as `*.test.ts` or under `__tests__/`.

## Commit & Pull Request Guidelines
- Commits: imperative, concise subjects; scope when helpful (e.g., `feat(threlte): add LOD system`).
- PRs: follow `.github/pull_request_template.md` — include description, screenshots for UI, and linked issues. Ensure `format`, `lint`, `type-check`, and `build` pass locally.
- Branching: open feature PRs against `develop`; `main` deploys via GitHub Pages.

## Security & Configuration Tips
- Do not commit secrets. Use `.env` (ignored) and `wrangler` secrets for the Worker.
- Keep package manager pinned (`pnpm@9`) and Node 20 to match CI.

