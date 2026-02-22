# Merkin Operating Model

## Source of truth

- `Greg-Aster/merkin` is the only repository where code is edited.
- Shared code lives in `packages/blog-core`.
- Site-specific content/config stays in each app directory in this monorepo.

## Site repositories

- `dndiy/Temporal-Flow`
- `DNDIY/DNDIY.github.io`
- `Greg-Aster/megameal`

These repositories are publish targets for GitHub Pages output (`gh-pages`), not authoring repos.

## Practical rule

If you need to change behavior or templates, change `merkin`.
If you need to add posts/media/settings, change the relevant app inside `merkin`.

## Deployment path

1. Commit/push to `merkin`.
2. `.github/workflows/deploy-sites.yml` builds the changed site(s).
3. Workflow pushes built `dist` to target repo `gh-pages` branch.
