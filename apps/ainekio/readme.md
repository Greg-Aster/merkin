# Ainekio Site

This app is the public Ainekio website at `https://ainek.io`.

It lives in the Merkin monorepo so it can use the same shared Temporal Flow site architecture as the other Merkin-managed sites.

## Ownership

- app: `apps/ainekio`
- shared site package: `packages/blog-core`
- Cloudflare Pages project: `merkin-ainekio`
- production domain: `ainek.io`

The Ainekio robot project itself remains in `Greg-Aster/Ainekio-bot`. Keep robot hardware, firmware, relay/client code, safety notes, and robot project documentation there. Keep public website content and site styling here.

## Local Development

From the Merkin repo root:

```bash
pnpm dev:ainekio
```

## Build

From the Merkin repo root:

```bash
pnpm build:ainekio
```

## Deploy

From the Merkin repo root:

```bash
pnpm deploy:ainekio
```

The deploy command builds this app and uploads `apps/ainekio/dist` to the Cloudflare Pages project `merkin-ainekio`.

## Domain

Connect `ainek.io` through Cloudflare Pages custom domains on the `merkin-ainekio` project. Do not configure this app as a GitHub Pages site.
