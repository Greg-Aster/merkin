#!/usr/bin/env bash
# =============================================================================
# sync-to-temporal-flow.sh
#
# Prepares the temporal-flow-export/ directory from the Merkin monorepo.
# The export is a clean, public version of the blog-core framework with a
# generic example site — no personal content.
#
# The export directory has its own .git repo pointing at the public
# Temporal Flow GitHub repo (separate from Merkin).
#
# Usage:
#   bash scripts/sync-to-temporal-flow.sh
#
# First-time setup (after running this script):
#   cd temporal-flow-export
#   git init
#   git remote add origin https://github.com/YOURUSERNAME/temporal-flow.git
#   git add .
#   git commit -m "feat: monorepo template v2"
#   git push -u origin main
#
# Subsequent syncs:
#   bash scripts/sync-to-temporal-flow.sh
#   cd temporal-flow-export
#   git add .
#   git commit -m "sync: update blog-core from merkin"
#   git push
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MERKIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EXPORT_DIR="$MERKIN_ROOT/temporal-flow-export"

echo "==> Syncing Merkin → temporal-flow-export"
echo "    Source: $MERKIN_ROOT"
echo "    Export: $EXPORT_DIR"
echo ""

# -----------------------------------------------------------------------------
# Helper: rename @merkin/blog-core → @temporal-flow/blog-core in a file
# -----------------------------------------------------------------------------
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

# -----------------------------------------------------------------------------
# 1. Prepare export directory (preserve .git if it exists)
# -----------------------------------------------------------------------------
echo "==> [1/7] Preparing export directory..."

# Preserve the .git dir if it exists
if [[ -d "$EXPORT_DIR/.git" ]]; then
  TMP_GIT=$(mktemp -d)
  cp -r "$EXPORT_DIR/.git" "$TMP_GIT/"
  rm -rf "$EXPORT_DIR"
  mkdir -p "$EXPORT_DIR"
  cp -r "$TMP_GIT/.git" "$EXPORT_DIR/"
  rm -rf "$TMP_GIT"
  echo "    Preserved existing .git directory"
else
  rm -rf "$EXPORT_DIR"
  mkdir -p "$EXPORT_DIR"
  echo "    Created fresh export directory (no .git found — run git init manually)"
fi

mkdir -p "$EXPORT_DIR/packages"
mkdir -p "$EXPORT_DIR/apps"
mkdir -p "$EXPORT_DIR/scripts"
mkdir -p "$EXPORT_DIR/.github/workflows"

# -----------------------------------------------------------------------------
# 2. Copy packages/blog-core (rename @merkin → @temporal-flow)
# -----------------------------------------------------------------------------
echo "==> [2/7] Copying packages/blog-core..."

rsync -a --exclude='node_modules' --exclude='dist' --exclude='.astro' \
  "$MERKIN_ROOT/packages/blog-core/" "$EXPORT_DIR/packages/blog-core/"

# Rename package name in package.json
sed -i 's/"@merkin\/blog-core"/"@temporal-flow\/blog-core"/g' \
  "$EXPORT_DIR/packages/blog-core/package.json"

# Rename all internal references in TypeScript/Astro/Svelte source files
find "$EXPORT_DIR/packages/blog-core/src" -type f \( -name "*.ts" -o -name "*.astro" -o -name "*.svelte" -o -name "*.json" \) | while read -r file; do
  rename_package_refs "$file"
done

echo "    Done — @temporal-flow/blog-core"

# -----------------------------------------------------------------------------
# 3. Copy apps/travel as apps/example (strip personal content)
# -----------------------------------------------------------------------------
echo "==> [3/7] Creating apps/example from apps/travel..."

TRAVEL_SRC="$MERKIN_ROOT/apps/travel"
EXAMPLE_DST="$EXPORT_DIR/apps/example"

# Copy everything except personal content dirs and build artifacts
rsync -a --exclude='node_modules' --exclude='dist' --exclude='.astro' \
  --exclude='src/content/posts' \
  --exclude='src/content/updates' \
  --exclude='public/avatar' \
  --exclude='public/assets/banner' \
  --exclude='public/downloads' \
  --exclude='scripts/new-post.js' \
  "$TRAVEL_SRC/" "$EXAMPLE_DST/"

# Rename package references in copied files
find "$EXAMPLE_DST" -type f \( -name "*.ts" -o -name "*.astro" -o -name "*.svelte" -o -name "*.mjs" -o -name "*.json" \) | while read -r file; do
  rename_package_refs "$file"
done

# Update package name in package.json
if [[ -f "$EXAMPLE_DST/package.json" ]]; then
  sed -i 's/"name": "[^"]*"/"name": "@temporal-flow\/example"/g' "$EXAMPLE_DST/package.json"
  # Update build script: remove PDF generation (merkin-specific)
  sed -i 's/ && node \.\.\/\.\.\/scripts\/generate-post-pdfs\.mjs --app \././g' "$EXAMPLE_DST/package.json"
fi

# Update site URL in astro.config.mjs
if [[ -f "$EXAMPLE_DST/astro.config.mjs" ]]; then
  sed -i "s|SITE_URL=https://travel.dndiy.org|SITE_URL=https://example.org|g" "$EXAMPLE_DST/astro.config.mjs"
fi

echo "    Done — apps/example (personal content directories excluded)"

# -----------------------------------------------------------------------------
# 4. Create demo content for the example site
# -----------------------------------------------------------------------------
echo "==> [4/7] Writing demo content..."

mkdir -p "$EXAMPLE_DST/src/content/posts"
mkdir -p "$EXAMPLE_DST/src/content/updates"
mkdir -p "$EXAMPLE_DST/src/content/spec"
mkdir -p "$EXAMPLE_DST/src/content/friends"
mkdir -p "$EXAMPLE_DST/public/avatar"

# Demo post 1: Welcome
cat > "$EXAMPLE_DST/src/content/posts/welcome.md" << 'MDEOF'
---
title: "Welcome to Your New Blog"
published: 2024-01-15
description: "You've successfully set up the Temporal Flow blog template. Here's how to get started."
tags: ["getting-started", "tutorial"]
category: "Guide"
---

# Welcome!

You've successfully set up the **Temporal Flow** blog template. This is your first post.

## What to do next

1. **Edit your profile** — open `src/config/config.ts` and update `profileConfig` with your name and bio
2. **Change the color** — update `themeColor.hue` in `siteConfig` (0–360, try 145 for green or 220 for blue)
3. **Write your first post** — create a new `.md` or `.mdx` file in `src/content/posts/`
4. **Connect with others** — use the Friends panel to add other Temporal Flow sites

## Markdown features

This template supports full **Markdown** with extras:

- Math equations: $E = mc^2$
- Code syntax highlighting
- Image galleries via PhotoSwipe
- Reading time estimates
- Table of contents (for longer posts)

Happy writing!
MDEOF

# Demo post 2: Adding a second site
cat > "$EXAMPLE_DST/src/content/posts/add-another-site.md" << 'MDEOF'
---
title: "How to Add Another Site to Your Blog Family"
published: 2024-02-01
description: "The Temporal Flow monorepo lets you run multiple connected blogs from one codebase."
tags: ["tutorial", "monorepo"]
category: "Guide"
---

# Adding a Second Site

One of the key features of Temporal Flow is that you can run multiple blogs
from a single monorepo — all sharing the same `blog-core` foundation.

## Steps

1. Copy `apps/example/` to `apps/my-new-site/`
2. Update the `package.json` name: `"@temporal-flow/my-new-site"`
3. Update `astro.config.mjs` with your new site's URL
4. Update `src/config/config.ts` — give it a unique hue color and title
5. Add root scripts in the top-level `package.json`:
   ```json
   "dev:my-new-site": "pnpm --filter @temporal-flow/my-new-site dev",
   "build:my-new-site": "pnpm --filter @temporal-flow/my-new-site build"
   ```
6. Add the new site to `pnpm-workspace.yaml` under `apps/*` (already covered if in `apps/`)

## Connecting Sites with Federation

Sites can share posts with each other using the **Friends** panel. Just add a
friend's RSS feed URL and their posts will appear in your feed.

Each site generates `/rss.xml` automatically — share that URL with friends!
MDEOF

# Demo updates entry
cat > "$EXAMPLE_DST/src/content/updates/my-updates.md" << 'MDEOF'
---
title: "Updates"
journalTitle: "My Journal"
maxEntries: 5
current:
  status: "Getting started"
  note: "This is an example updates widget. Edit this file to customize it."
---

## 2024-02-01 | First Entry

location: Home
mileage: 0

Welcome to the updates feed! This is a great way to post quick status updates
that appear in the sidebar widget and on a dedicated journal page.

Edit `src/content/updates/my-updates.md` to add your own entries.
MDEOF

# Demo spec/about page
cat > "$EXAMPLE_DST/src/content/spec/about.md" << 'MDEOF'
---
title: About
---

# About This Blog

Write something about yourself and your blog here.

## What I write about

- Topic 1
- Topic 2
- Topic 3

## Contact

You can reach me at [your@email.com](mailto:your@email.com).
MDEOF

# Placeholder avatar SVG
cat > "$EXAMPLE_DST/public/avatar/avatar.svg" << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#7c6ef7"/>
  <circle cx="50" cy="38" r="18" fill="white" opacity="0.9"/>
  <ellipse cx="50" cy="82" rx="28" ry="20" fill="white" opacity="0.9"/>
</svg>
SVGEOF

# Update config.ts with placeholder values
if [[ -f "$EXAMPLE_DST/src/config/config.ts" ]]; then
  # Replace personal site title, subtitle, hue
  sed -i \
    -e 's/title: ".*"/title: "My Blog"/' \
    -e 's/subtitle: ".*"/subtitle: "A blog about things I care about"/' \
    -e 's/hue: [0-9]*/hue: 250/' \
    "$EXAMPLE_DST/src/config/config.ts"

  # Replace profile info
  sed -i \
    -e 's/name: ".*",/name: "Your Name",/' \
    -e 's/bio: ".*",/bio: "Hello! I write about things that interest me.",/' \
    "$EXAMPLE_DST/src/config/config.ts"

  echo "    Updated config.ts with placeholder values"
fi

echo "    Demo content created"

# -----------------------------------------------------------------------------
# 5. Copy shared scripts
# -----------------------------------------------------------------------------
echo "==> [5/7] Copying scripts..."

cp "$MERKIN_ROOT/scripts/deploy-pages-with-retry.sh" "$EXPORT_DIR/scripts/"
chmod +x "$EXPORT_DIR/scripts/deploy-pages-with-retry.sh"

# Create a generic new-post script for the example
cat > "$EXPORT_DIR/scripts/new-post.js" << 'JSEOF'
#!/usr/bin/env node
/**
 * Create a new blog post with today's date.
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
const postsDir = join(__dirname, '..', 'src', 'content', 'posts')

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
console.log(`Created: src/content/posts/${filename}`)
JSEOF

echo "    Done"

# -----------------------------------------------------------------------------
# 6. Write root workspace config files
# -----------------------------------------------------------------------------
echo "==> [6/7] Writing root config files..."

# pnpm-workspace.yaml
cat > "$EXPORT_DIR/pnpm-workspace.yaml" << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# .npmrc
cat > "$EXPORT_DIR/.npmrc" << 'EOF'
shamefully-hoist=false
EOF

# Root package.json
cat > "$EXPORT_DIR/package.json" << 'EOF'
{
  "name": "temporal-flow",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @temporal-flow/example dev",
    "build": "pnpm --filter @temporal-flow/example build",
    "preview": "pnpm --filter @temporal-flow/example preview",
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

# .gitignore
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

# GitHub Actions workflow for Cloudflare Pages
cat > "$EXPORT_DIR/.github/workflows/deploy.yml" << 'EOF'
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: my-temporal-flow-blog  # ← change this to your CF Pages project name
          directory: apps/example/dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
EOF

echo "    Done"

# -----------------------------------------------------------------------------
# 7. Report
# -----------------------------------------------------------------------------
echo ""
echo "==> [7/7] Sync complete!"
echo ""
echo "    Export directory: $EXPORT_DIR"
echo ""
echo "    Contents:"
find "$EXPORT_DIR" -maxdepth 3 -not -path '*/.git/*' -not -path '*/node_modules/*' \
  | sort | sed 's|'"$EXPORT_DIR"'/||' | sed 's|^|    |'
echo ""

if [[ ! -d "$EXPORT_DIR/.git" ]]; then
  echo "  NEXT STEPS (first time):"
  echo "  ─────────────────────────────────────────────────────────────"
  echo "  cd temporal-flow-export"
  echo "  git init"
  echo "  git remote add origin https://github.com/YOURUSERNAME/temporal-flow.git"
  echo "  git add ."
  echo "  git commit -m 'feat: monorepo template v2'"
  echo "  git push -u origin main"
else
  echo "  NEXT STEPS (sync update):"
  echo "  ─────────────────────────────────────────────────────────────"
  echo "  cd temporal-flow-export"
  echo "  git status          # review changes"
  echo "  git add ."
  echo "  git commit -m 'sync: update blog-core from merkin $(date +%Y-%m-%d)'"
  echo "  git push"
fi
echo ""
