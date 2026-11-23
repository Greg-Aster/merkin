#!/usr/bin/env bash
# =============================================================================
# sync-to-temporal-flow.sh
#
# Builds a fresh standalone Temporal Flow template export from the current
# Merkin source tree. The canonical sources are:
#
#   - Temporal-Flow/
#   - packages/blog-core/
#
# The script no longer maintains a persistent temporal-flow-export/ archive in
# this repo. By default it writes to /tmp/temporal-flow-template-export. To sync
# into an external checkout of the public template repo, set:
#
#   TEMPORAL_FLOW_EXPORT_DIR=/path/to/temporal-flow bash scripts/sync-to-temporal-flow.sh
#
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MERKIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_EXPORT_DIR="${TMPDIR:-/tmp}/temporal-flow-template-export"
EXPORT_DIR="${TEMPORAL_FLOW_EXPORT_DIR:-$DEFAULT_EXPORT_DIR}"
EXPORT_DIR="$(realpath -m "$EXPORT_DIR")"

if [[ "$EXPORT_DIR" == "/" || "$EXPORT_DIR" == "$HOME" ]]; then
  echo "Refusing unsafe export target: $EXPORT_DIR" >&2
  exit 1
fi

if [[ "$EXPORT_DIR" == "$MERKIN_ROOT" || "$EXPORT_DIR" == "$MERKIN_ROOT/"* ]]; then
  echo "Refusing to write template exports inside the Merkin repo: $EXPORT_DIR" >&2
  echo "Use the default /tmp export or set TEMPORAL_FLOW_EXPORT_DIR to an external checkout." >&2
  exit 1
fi

echo "==> Building Temporal Flow template export"
echo "    Source app: $MERKIN_ROOT/Temporal-Flow"
echo "    Source core: $MERKIN_ROOT/packages/blog-core"
echo "    Export: $EXPORT_DIR"
echo ""

rename_package_refs() {
  local file="$1"
  if [[ -f "$file" ]]; then
    sed -i \
      -e 's/@merkin\/blog-core/@temporal-flow\/blog-core/g' \
      -e 's/@merkin\/travel/@temporal-flow\/example/g' \
      -e 's/@merkin\/megameal/@temporal-flow\/example/g' \
      "$file"
  fi
}

rewrite_package_refs_under() {
  local dir="$1"
  find "$dir" -type f \( \
    -name "*.ts" -o \
    -name "*.astro" -o \
    -name "*.svelte" -o \
    -name "*.mjs" -o \
    -name "*.json" \
  \) | while read -r file; do
    rename_package_refs "$file"
  done
}

echo "==> [1/6] Preparing export directory..."
mkdir -p "$EXPORT_DIR"
if [[ -d "$EXPORT_DIR/.git" ]]; then
  echo "    Preserving existing external .git metadata"
else
  echo "    No .git metadata found; this is a disposable export unless you initialize it"
fi

find "$EXPORT_DIR" -mindepth 1 \
  ! -path "$EXPORT_DIR/.git" \
  ! -path "$EXPORT_DIR/.git/*" \
  -exec rm -rf {} +

mkdir -p "$EXPORT_DIR/packages" "$EXPORT_DIR/apps" "$EXPORT_DIR/scripts" "$EXPORT_DIR/.github/workflows"

echo "==> [2/6] Copying packages/blog-core..."
rsync -a --delete \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.astro' \
  "$MERKIN_ROOT/packages/blog-core/" "$EXPORT_DIR/packages/blog-core/"

sed -i 's/"@merkin\/blog-core"/"@temporal-flow\/blog-core"/g' \
  "$EXPORT_DIR/packages/blog-core/package.json"
rewrite_package_refs_under "$EXPORT_DIR/packages/blog-core/src"

echo "==> [3/6] Copying current Temporal-Flow template app..."
TF_SRC="$MERKIN_ROOT/Temporal-Flow"
EXAMPLE_DST="$EXPORT_DIR/apps/Temporal-Flow"

rsync -a --delete \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.astro' \
  --exclude='public/downloads' \
  --exclude='CNAME' \
  --exclude='.env' \
  --exclude='.env.*' \
  "$TF_SRC/" "$EXAMPLE_DST/"

rewrite_package_refs_under "$EXAMPLE_DST"

if [[ -f "$EXAMPLE_DST/package.json" ]]; then
  sed -i 's/ && node \.\.\/scripts\/generate-post-pdfs\.mjs --app \.//g' "$EXAMPLE_DST/package.json"
fi

rm -f "$EXAMPLE_DST/CNAME"

if [[ -f "$EXAMPLE_DST/tailwind.config.cjs" ]]; then
  sed -i 's|"\.\./packages/blog-core/src/|"../../packages/blog-core/src/|g' "$EXAMPLE_DST/tailwind.config.cjs"
fi

echo "==> [4/6] Writing template workspace files..."
cat > "$EXPORT_DIR/pnpm-workspace.yaml" << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

cat > "$EXPORT_DIR/.npmrc" << 'EOF'
shamefully-hoist=false
EOF

cat > "$EXPORT_DIR/package.json" << 'EOF'
{
  "name": "temporal-flow",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter temporal-flow dev",
    "build": "pnpm --filter temporal-flow build",
    "preview": "pnpm --filter temporal-flow preview",
    "new-post": "node scripts/new-post.js",
    "build:all": "pnpm -r build",
    "lint:all": "pnpm -r lint",
    "format:all": "pnpm -r format",
    "type-check:all": "pnpm -r type-check"
  },
  "devDependencies": {
    "pnpm": "^9.0.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
EOF

cat > "$EXPORT_DIR/.gitignore" << 'EOF'
# Dependencies
node_modules/
**/node_modules/

# Build artifacts
dist/
**/dist/
public/downloads/
**/public/downloads/
.astro/
**/.astro/

# Logs and temp files
*.log
*.tmp
.DS_Store

# IDE/system
.vscode/
.idea/
.claude/

# Environment/secrets
.env
.env.*
!.env.example

# Cache
.pnpm-store/
*.tsbuildinfo
EOF

echo "==> [5/6] Writing template helper files..."
cp "$MERKIN_ROOT/scripts/deploy-pages-with-retry.sh" "$EXPORT_DIR/scripts/"
chmod +x "$EXPORT_DIR/scripts/deploy-pages-with-retry.sh"

cat > "$EXPORT_DIR/scripts/new-post.js" << 'JSEOF'
#!/usr/bin/env node
/**
 * Create a new Temporal Flow post with today's date.
 * Usage: node scripts/new-post.js "My Post Title"
 */
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const title = process.argv[2] || 'New Post'
const date = new Date().toISOString().split('T')[0]
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const filename = `${date}-${slug}.md`
const postsDir = join(__dirname, '..', 'apps', 'Temporal-Flow', 'src', 'content', 'posts')

mkdirSync(postsDir, { recursive: true })

const content = `---
title: "${title}"
published: ${date}
description: ""
tags: []
category: ""
---

Write your post here.
`

const filepath = join(postsDir, filename)
writeFileSync(filepath, content)
console.log(`Created: apps/Temporal-Flow/src/content/posts/${filename}`)
JSEOF
chmod +x "$EXPORT_DIR/scripts/new-post.js"

cat > "$EXPORT_DIR/.github/workflows/deploy.yml" << 'EOF'
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v5

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build
        env:
          SITE: ${{ steps.pages.outputs.origin }}
          BASE_PATH: ${{ steps.pages.outputs.base_path }}

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: apps/Temporal-Flow/dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
EOF

cat > "$EXPORT_DIR/README.md" << 'MDEOF'
# Temporal Flow - Blog Family Starter Kit

A pnpm monorepo for running interconnected Astro blogs from one codebase, with a shared `blog-core` package powering the app.

The template is generated from the current Merkin sources:

- `Temporal-Flow/`
- `packages/blog-core/`

## Quick Start

```bash
pnpm install
pnpm dev
```

Open `http://localhost:4321`.

## Configure Your Site

Edit `apps/Temporal-Flow/src/config/config.ts`.

## Writing Posts

```bash
pnpm new-post "My Post Title"
```

## Adding a Second Site

```bash
cp -r apps/Temporal-Flow apps/my-travel-blog
```

Then update the copied app's package name and config.

## Deploying

GitHub Pages is configured in `.github/workflows/deploy.yml`.

For Cloudflare Pages, use:

- Build command: `pnpm build`
- Output directory: `apps/Temporal-Flow/dist`

## Architecture

- `packages/blog-core/` is the shared component, layout, schema, and style package.
- `apps/Temporal-Flow/` is the starter site and the source for template-style deployments.

## License

[MIT](apps/Temporal-Flow/LICENSE.md)
MDEOF

echo "==> [6/6] Regenerating export lockfile..."
(cd "$EXPORT_DIR" && pnpm install --silent 2>/dev/null || pnpm install)

echo ""
echo "==> Temporal Flow template export complete"
echo "    Export: $EXPORT_DIR"
echo ""
if [[ -d "$EXPORT_DIR/.git" ]]; then
  echo "Next steps for publishing:"
  echo "  cd \"$EXPORT_DIR\""
  echo "  git status"
  echo "  git add ."
  echo "  git commit -m 'sync: update template from Temporal-Flow source'"
  echo "  git push"
else
  echo "Disposable export written. To publish, rerun with TEMPORAL_FLOW_EXPORT_DIR pointing"
  echo "at an external checkout of the public template repository."
fi
