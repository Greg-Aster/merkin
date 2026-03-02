# Merkin Monorepo — Next Steps

This file tracks remaining work from the MEGAMEAL monorepo integration (started Feb 2026).

---

## Immediate / High Priority

### 0. Verify GitHub -> GitLab mirror health
- [ ] In GitHub repo settings, set secret `GITLAB_TOKEN`
- [ ] (Optional) set GitHub variable `GITLAB_MIRROR_PROJECT_PATH` if mirror path differs from `Greg.Aster/merkin`
- [ ] Push a non-main branch and confirm `.github/workflows/mirror-to-gitlab.yml` succeeds
- [ ] Confirm mirrored branch appears in GitLab

### 1. Verify apps/megameal in production
- [ ] Push to main, confirm GitLab CI runs `deploy-megameal` job
- [ ] Verify `megameal.org` is serving the new build from `apps/megameal/dist/`
- [ ] Test all routes: homepage, blog posts, `/quiz/`, `/store/`, `/about/`, `/game` (should redirect)
- [ ] Test Bleepy mascot loads and responds
- [ ] Test search (pagefind)

### 2. Set up game.megameal.org (separate game repo)
- [ ] Create a new git repo for the game engine (extracted from MEGAMEAL/)
- [ ] Create Cloudflare Pages project named `merkin-megameal-game`
- [ ] Add custom domain `game.megameal.org`
- [ ] Set up CI/CD for the game repo
- [ ] Update `apps/megameal/src/pages/game.astro` redirect URL once the game domain is live

### 3. Archive the old MEGAMEAL/ directory
- [ ] Once `apps/megameal/` is confirmed working in production, the old `MEGAMEAL/` at the repo root is no longer the source of truth for the blog
- [ ] The game engine code can be moved to its own repo (above)
- [ ] Consider removing `MEGAMEAL/` from Merkin repo to reduce size (it has large model/terrain files)

---

## Medium Priority

### 4. Migrate Temporal-Flow and DNDIY to apps/ format
Both `Temporal-Flow/` and `DNDIY.github.io/` are still at the repo root (legacy structure).
Goal: move them into `apps/temporal/` and `apps/dndiy/` like travel and megameal.
- [ ] Create `apps/temporal/` as workspace app (same pattern as apps/travel)
- [ ] Move content from `Temporal-Flow/src/content/` to `apps/temporal/src/content/`
- [ ] Update CI jobs to watch `apps/temporal/**/*`
- [ ] Repeat for DNDIY → `apps/dndiy/`
- [ ] Update `pnpm-workspace.yaml` if needed
- [ ] Archive/remove old root-level `Temporal-Flow/` and `DNDIY.github.io/` dirs

### 5. Remove duplicate local components from all sites
Each site (travel, Temporal-Flow, DNDIY) has its own full copy of `src/components/` that
duplicates what's in `packages/blog-core/`. True monorepo means these should be removed.
- [ ] Audit which components in each site are IDENTICAL to blog-core (safe to delete)
- [ ] For each identical component: delete local copy, update import paths to use `@merkin/blog-core`
- [ ] For components that are site-specific overrides: keep locally or promote to blog-core
- [ ] Start with `apps/travel` (safest, newest structure), then Temporal-Flow, then DNDIY
- [ ] Verify each site builds after removing local components

### 6. Update Navbar across all sites with MEGAMEAL-quality version
MEGAMEAL's Navbar.astro is 2.5x more advanced but has bleepy integration.
- [ ] Create a blog-core Navbar that includes the generic improvements (fullscreen toggle, responsive layout)
- [ ] Keep bleepy-specific code only in apps/megameal
- [ ] Update all sites to use the improved blog-core Navbar

---

## Lower Priority / Future

### 7. RSS feed fixes
- [ ] Both `DNDIY.github.io/src/pages/rss.xml.ts` and `Temporal-Flow/src/pages/rss.xml.ts` have uncommitted changes (shown in git status) — review and commit if intentional

### 8. Hydration mismatch bug (Temporal-Flow, DNDIY)
- Known bug: `https://svelte.dev/e/hydration_mismatch` in FriendContentIntegrator
- Cause: browser-only state accessed during SSR in friendStore.ts / setting-utils.ts
- [ ] Investigate wrapping browser-only store access in `if (browser)` guards
- [ ] Test fix on Temporal-Flow first

### 9. Consider PostCard.astro promotion to blog-core
MEGAMEAL's PostCard.astro is more advanced (responsive design, better image handling).
Currently each site has its own PostCard. Consider:
- [ ] Create a generic PostCard.astro in blog-core that accepts config via props
- [ ] Remove local PostCard.astro from each app
- Blocked by: PostCard imports from local i18n and config

### 10. Unify i18n across all sites
Currently each app has its own `src/i18n/` directory. The content is likely near-identical.
- [ ] Move i18n to blog-core
- [ ] Update all apps to use `@merkin/blog-core` i18n exports
