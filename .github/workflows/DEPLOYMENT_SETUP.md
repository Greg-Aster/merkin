# Monorepo Deployment Chain

Canonical delivery flow:

1. Push code to GitHub (`origin`, `Greg-Aster/merkin`).
2. GitHub Action mirrors refs to GitLab.
3. `main` on GitLab CI deploys to Cloudflare Pages via Wrangler.
4. Preview builds run from GitHub Actions to GitHub Pages (manual dispatch).

## Source Of Truth

- Source repo: `Greg-Aster/merkin` (GitHub)
- Mirror repo: `Greg.Aster/merkin` (GitLab)
- Runtime deploy platform: Cloudflare Pages

GitHub should be treated as the write target for development commits.

## Active Automation

- `.github/workflows/mirror-to-gitlab.yml`
  - Triggers on GitHub push (all branches) and manual dispatch.
  - Mirrors branches and tags to GitLab.
  - Requires `GITLAB_TOKEN` secret.
  - Optional variable: `GITLAB_MIRROR_PROJECT_PATH` (default `Greg.Aster/merkin`).

- `.gitlab-ci.yml`
  - Production-only pipeline (runs on `main`).
  - Deploys using `pnpm deploy:*` scripts (`wrangler pages deploy ...`).

- `.github/workflows/dev-pages-preview.yml`
  - Manual-only workflow to preview one selected site (`travel`, `temporal`, `dndiy`, `megameal`).
  - Can preview any ref (defaults to `dev`).
  - Publishes to this repository's GitHub Pages environment.

## Legacy Workflow

- `.github/workflows/deploy-sites.yml` is now manual-only fallback.
- It no longer auto-deploys on push.
- Use only for emergency GitHub Pages publishing.

## Required Secrets

GitHub repository:

- `GITLAB_TOKEN` (token able to push to GitLab mirror repository)

GitLab project (for Cloudflare deploy):

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Domain Notes

- `apps/megameal/src/pages/game.astro` redirects to `https://game.megameal.org/`.
- `apps/megameal/src/pages/host.astro` redirects to `https://game.megameal.org/host`.
- Main story site remains `megameal.org`; game is hosted separately at `game.megameal.org`.
