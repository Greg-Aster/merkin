# Monorepo Deploy Workflow Setup

This repository deploys built static output from each site to its own GitHub Pages repository.

Operating model:

- `Greg-Aster/merkin` is the only source-of-truth for site code.
- Target repos (`Temporal-Flow`, `DNDIY.github.io`, `megameal`) are publish targets.
- GitHub Pages content is pushed to each target repo's `gh-pages` branch from this monorepo workflow.
- The `main` branch activity in target repos is not the deploy signal anymore.

Workflow file: `.github/workflows/deploy-sites.yml`

## Required Secret

Create this repository secret in the monorepo:

- `PAGES_DEPLOY_TOKEN`

Recommended token type: Fine-grained PAT with **Contents: Read and write** access to:

- source repo: this monorepo
- target repo: `merkin-travel`
- target repo: `temporal-flow`
- target repo: `DNDIY.github.io`
- target repo: `megameal`

## Optional Repository Variables

Defaults are provided. Add variables only if you need overrides:

- `TEMPORAL_OWNER` (default: `github.repository_owner`)
- `DNDIY_OWNER` (default: `github.repository_owner`)
- `MEGAMEAL_OWNER` (default: `github.repository_owner`)
- `TRAVEL_OWNER` (default: `github.repository_owner`)
- `TRAVEL_REPO` (default: `merkin-travel`)
- `TEMPORAL_REPO` (default: `temporal-flow`)
- `DNDIY_REPO` (default: `DNDIY.github.io`)
- `MEGAMEAL_REPO` (default: `megameal`)
- `TRAVEL_DEPLOY_BRANCH` (default: `gh-pages`)
- `TEMPORAL_DEPLOY_BRANCH` (default: `gh-pages`)
- `DNDIY_DEPLOY_BRANCH` (default: `gh-pages`)
- `MEGAMEAL_DEPLOY_BRANCH` (default: `gh-pages`)

For your current repositories, set:

- `TRAVEL_OWNER=Greg-Aster`
- `TRAVEL_REPO=merkin-travel`
- `TEMPORAL_OWNER=dndiy`
- `DNDIY_OWNER=DNDIY`
- `MEGAMEAL_OWNER=Greg-Aster`

## Target Repository Configuration

For each target repository, configure GitHub Pages to serve:

- Branch: `gh-pages`
- Folder: `/ (root)`

Recommended for publish-only repos:

- Keep historical source commits if you want, but do not develop there.
- Disable or ignore old `main`-branch deploy workflows in target repos.
- Treat `gh-pages` as generated output only.

If a site uses a custom domain:

- Keep a `CNAME` file in the site folder in this monorepo (already present for Temporal-Flow and MEGAMEAL).
- The workflow copies that `CNAME` into the built output before deployment.
- For DNDIY, add `DNDIY.github.io/CNAME` if you want to preserve a custom domain on every deploy.

## Trigger Rules

On push:

- Changes in `packages/blog-core/**` deploy all sites.
- Site-local changes deploy only the affected site.

Manual trigger:

- Use **Actions -> Deploy Sites -> Run workflow**
- Choose one: `all`, `travel`, `temporal`, `dndiy`, `megameal`
