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
# 3. Copy Temporal-Flow as apps/example
# -----------------------------------------------------------------------------
echo "==> [3/7] Creating apps/example from Temporal-Flow..."

TF_SRC="$MERKIN_ROOT/Temporal-Flow"
EXAMPLE_DST="$EXPORT_DIR/apps/example"

# Copy everything except:
#   - build artifacts (node_modules, dist, .astro)
#   - personal photo assets (replaced below with SVG placeholders)
#   - secrets and domain config (.env, CNAME)
#   - generated PDF downloads (Merkin-specific)
rsync -a \
  --exclude='node_modules' --exclude='dist' --exclude='.astro' \
  --exclude='src/assets/avatar' \
  --exclude='src/assets/banner' \
  --exclude='src/assets/images' \
  --exclude='public/downloads' \
  --exclude='CNAME' \
  --exclude='.env' \
  --exclude='.env.*' \
  "$TF_SRC/" "$EXAMPLE_DST/"

# Rename package references in copied files
find "$EXAMPLE_DST" -type f \( -name "*.ts" -o -name "*.astro" -o -name "*.svelte" -o -name "*.mjs" -o -name "*.json" \) | while read -r file; do
  rename_package_refs "$file"
done

# Update package name and strip Merkin-specific build steps from package.json
if [[ -f "$EXAMPLE_DST/package.json" ]]; then
  sed -i 's/"name": "[^"]*"/"name": "@temporal-flow\/example"/g' "$EXAMPLE_DST/package.json"
  sed -i 's/ && node \.\.\/scripts\/generate-post-pdfs\.mjs --app \././g' "$EXAMPLE_DST/package.json"
fi

# Remove CNAME — without it, astro.config.mjs auto-detects the GitHub Pages subpath.
# Users with a custom domain should create apps/example/CNAME containing their domain.
rm -f "$EXAMPLE_DST/CNAME"

echo "    Done — apps/example (full Temporal-Flow copy, personal photos excluded)"

# -----------------------------------------------------------------------------
# 4. Replace personal photo assets with generated SVG placeholders
# -----------------------------------------------------------------------------
echo "==> [4/7] Generating placeholder image assets..."

mkdir -p "$EXAMPLE_DST/src/assets/avatar"
mkdir -p "$EXAMPLE_DST/src/assets/banner"
mkdir -p "$EXAMPLE_DST/public/avatar"

# --- 6 avatar SVGs (different colours, matching avatar1.svg–avatar6.svg filenames) ---
cat > "$EXAMPLE_DST/src/assets/avatar/avatar1.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#7c6ef7"/><circle cx="50" cy="38" r="18" fill="white" opacity="0.9"/><ellipse cx="50" cy="82" rx="28" ry="20" fill="white" opacity="0.9"/></svg>
EOF
cat > "$EXAMPLE_DST/src/assets/avatar/avatar2.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#4a9eff"/><circle cx="50" cy="38" r="18" fill="white" opacity="0.9"/><ellipse cx="50" cy="82" rx="28" ry="20" fill="white" opacity="0.9"/></svg>
EOF
cat > "$EXAMPLE_DST/src/assets/avatar/avatar3.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#2ecc71"/><circle cx="50" cy="38" r="18" fill="white" opacity="0.9"/><ellipse cx="50" cy="82" rx="28" ry="20" fill="white" opacity="0.9"/></svg>
EOF
cat > "$EXAMPLE_DST/src/assets/avatar/avatar4.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#e67e22"/><circle cx="50" cy="38" r="18" fill="white" opacity="0.9"/><ellipse cx="50" cy="82" rx="28" ry="20" fill="white" opacity="0.9"/></svg>
EOF
cat > "$EXAMPLE_DST/src/assets/avatar/avatar5.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#1abc9c"/><circle cx="50" cy="38" r="18" fill="white" opacity="0.9"/><ellipse cx="50" cy="82" rx="28" ry="20" fill="white" opacity="0.9"/></svg>
EOF
cat > "$EXAMPLE_DST/src/assets/avatar/avatar6.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#e74c3c"/><circle cx="50" cy="38" r="18" fill="white" opacity="0.9"/><ellipse cx="50" cy="82" rx="28" ry="20" fill="white" opacity="0.9"/></svg>
EOF
# Also write public/avatar for URL-based references in config.ts
cp "$EXAMPLE_DST/src/assets/avatar/avatar1.svg" "$EXAMPLE_DST/public/avatar/avatar.svg"

echo "    6 avatar SVGs written"

# --- 8 banner SVGs (gradient backgrounds, matching 0001.svg–0008.svg filenames) ---
cat > "$EXAMPLE_DST/src/assets/banner/0001.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#1a1a2e"/><stop offset="100%" style="stop-color:#7c6ef7"/></linearGradient></defs><rect width="1200" height="400" fill="url(#g)"/></svg>
EOF
cat > "$EXAMPLE_DST/src/assets/banner/0002.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f2027"/><stop offset="50%" style="stop-color:#203a43"/><stop offset="100%" style="stop-color:#2c5364"/></linearGradient></defs><rect width="1200" height="400" fill="url(#g)"/></svg>
EOF
cat > "$EXAMPLE_DST/src/assets/banner/0003.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#1d2671"/><stop offset="100%" style="stop-color:#c33764"/></linearGradient></defs><rect width="1200" height="400" fill="url(#g)"/></svg>
EOF
cat > "$EXAMPLE_DST/src/assets/banner/0004.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#134e5e"/><stop offset="100%" style="stop-color:#71b280"/></linearGradient></defs><rect width="1200" height="400" fill="url(#g)"/></svg>
EOF
cat > "$EXAMPLE_DST/src/assets/banner/0005.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#2d1b69"/><stop offset="100%" style="stop-color:#11998e"/></linearGradient></defs><rect width="1200" height="400" fill="url(#g)"/></svg>
EOF
cat > "$EXAMPLE_DST/src/assets/banner/0006.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#373b44"/><stop offset="100%" style="stop-color:#4286f4"/></linearGradient></defs><rect width="1200" height="400" fill="url(#g)"/></svg>
EOF
cat > "$EXAMPLE_DST/src/assets/banner/0007.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#3a1c71"/><stop offset="50%" style="stop-color:#d76d77"/><stop offset="100%" style="stop-color:#ffaf7b"/></linearGradient></defs><rect width="1200" height="400" fill="url(#g)"/></svg>
EOF
cat > "$EXAMPLE_DST/src/assets/banner/0008.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0a0a0a"/><stop offset="100%" style="stop-color:#434343"/></linearGradient></defs><rect width="1200" height="400" fill="url(#g)"/></svg>
EOF

echo "    8 banner SVGs written"

# --- Rewrite avatar.config.ts to import SVG files (same 6-slot structure) ---
cat > "$EXAMPLE_DST/src/config/avatar.config.ts" << 'TSEOF'
import type { ImageMetadata } from 'astro'

import avatar1 from '../assets/avatar/avatar1.svg'
import avatar2 from '../assets/avatar/avatar2.svg'
import avatar3 from '../assets/avatar/avatar3.svg'
import avatar4 from '../assets/avatar/avatar4.svg'
import avatar5 from '../assets/avatar/avatar5.svg'
import avatar6 from '../assets/avatar/avatar6.svg'

export interface AvatarConfig {
  avatarList: ImageMetadata[]
  homeAvatar: ImageMetadata
  animationInterval: number
}

export const avatarConfig: AvatarConfig = {
  avatarList: [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6],
  homeAvatar: avatar1,
  animationInterval: 7500,
}

export function getAvatarIndexFromSlug(slug: string = '', avatarCount: number): number {
  if (!slug) return 0
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash) + slug.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash) % avatarCount
}
TSEOF
echo "    avatar.config.ts rewritten (6 SVG avatars)"

# --- Rewrite banners/standard.ts to import SVG files (same 8-slot structure, banners ENABLED) ---
mkdir -p "$EXAMPLE_DST/src/config/banners"
cat > "$EXAMPLE_DST/src/config/banners/standard.ts" << 'TSEOF'
import type {
  BannerAnimationConfig,
  BannerItem,
  BannerItemPreviewDetails,
  ImageBannerItem,
  LinkPreviewInfo,
  StandardBannerData,
  VideoBannerConfig,
} from './types'
import { isImageBannerItem, isVideoBannerItem } from './types'

import banner1 from '@/assets/banner/0001.svg'
import banner2 from '@/assets/banner/0002.svg'
import banner3 from '@/assets/banner/0003.svg'
import banner4 from '@/assets/banner/0004.svg'
import banner5 from '@/assets/banner/0005.svg'
import banner6 from '@/assets/banner/0006.svg'
import banner7 from '@/assets/banner/0007.svg'
import banner8 from '@/assets/banner/0008.svg'

export const standardBannerData: StandardBannerData = {}

export const videoConfig: VideoBannerConfig = {
  autoplay: true,
  muted: true,
  loop: true,
  playsInline: true,
  controls: false,
  preload: 'none',
}

export const bannerList: BannerItem[] = [
  { type: 'image', src: banner1, alt: 'Banner 1' } as ImageBannerItem,
  { type: 'image', src: banner2, alt: 'Banner 2' } as ImageBannerItem,
  { type: 'image', src: banner3, alt: 'Banner 3' } as ImageBannerItem,
  { type: 'image', src: banner4, alt: 'Banner 4' } as ImageBannerItem,
  { type: 'image', src: banner5, alt: 'Banner 5' } as ImageBannerItem,
  { type: 'image', src: banner6, alt: 'Banner 6' } as ImageBannerItem,
  { type: 'image', src: banner7, alt: 'Banner 7' } as ImageBannerItem,
  { type: 'image', src: banner8, alt: 'Banner 8' } as ImageBannerItem,
]

export const bannerLinks: (string | null)[] = bannerList.map(() => null)

export const defaultBanner: BannerItem = bannerList[0]

export const linkPreviewData: Record<string, LinkPreviewInfo> = {}

export const animationConfig: BannerAnimationConfig = {
  enabled: true,
  interval: 5000,
  transitionDuration: 1000,
  direction: 'alternate',
  randomStart: true,
  pauseOnHover: true,
  pauseOnMobileTouch: true,
  resumeAfterNavigation: true,
  smoothTransitions: true,
  motion: {
    enabled: true,
    mode: 'alternate',
    duration: 6000,
    scale: 1.03,
    panDistance: 1.5,
    easing: 'linear',
    alternate: true,
  },
}

export const iconSVGs: Record<string, string> = {
  'arrow-up-right-from-square':
    '<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>',
}

export function getBannerAnimationSettings(): BannerAnimationConfig { return animationConfig }
export function getVideoConfig(): VideoBannerConfig { return videoConfig }
export function getBannerLink(index: number): string | null { return bannerLinks[index] ?? null }
export function hasAnyBannerLinks(): boolean { return bannerLinks.some(l => l && l.trim() !== '') }
export function getLinkPreviewData(url: string): LinkPreviewInfo {
  return linkPreviewData[url] || { title: 'Explore More', description: 'Click to visit this page', icon: 'arrow-up-right-from-square' }
}
export function getIconSVG(n: string): string { return iconSVGs[n] || iconSVGs['arrow-up-right-from-square'] }
export function getBannerItem(index: number): BannerItem | null { return bannerList[index] ?? null }
export function getBannerCount(): number { return bannerList.length }
export function validateStandardBannerConfig(): { isValid: boolean; warnings: string[] } {
  return { isValid: true, warnings: [] }
}
export function getBannerItemPreviewDetails(index: number): BannerItemPreviewDetails | null {
  if (index < 0 || index >= bannerList.length) return null
  const item = bannerList[index]
  const linkUrl = bannerLinks[index]
  const hasValidLink = !!(linkUrl && linkUrl.trim() !== '' && linkUrl !== '#')
  const previewData = getLinkPreviewData(hasValidLink ? (linkUrl as string) : '')
  return {
    hasValidLink,
    originalHref: hasValidLink ? (linkUrl as string) : '',
    urlForDisplay: '',
    previewTitle: previewData.title,
    previewDescription: previewData.description,
    previewIconSVG: getIconSVG(previewData.icon),
    isVideoButton: isVideoBannerItem(item),
  }
}
export const standardBannerConfig = {
  data: standardBannerData, bannerList, bannerLinks, defaultBanner, linkPreviewData,
  animation: animationConfig, video: videoConfig, iconSVGs,
  getBannerAnimationSettings, getVideoConfig, getBannerLink, hasAnyBannerLinks,
  getLinkPreviewData, getIconSVG, getBannerItemPreviewDetails, getBannerItem,
  getBannerCount, validateStandardBannerConfig, isVideoBannerItem, isImageBannerItem,
}
TSEOF
echo "    banners/standard.ts rewritten (8 SVG gradient banners, banners enabled)"

# Update config.ts avatar path to point at the public SVG
if [[ -f "$EXAMPLE_DST/src/config/config.ts" ]]; then
  sed -i 's|avatarFilename: ".*"|avatarFilename: "avatar.svg"|g' "$EXAMPLE_DST/src/config/config.ts"
  sed -i 's|avatar: "/src/content/avatar/.*"|avatar: "/avatar/avatar.svg"|g' "$EXAMPLE_DST/src/config/config.ts"
fi

# Enable banners in config.ts (set banner.enable to true)
if [[ -f "$EXAMPLE_DST/src/config/config.ts" ]]; then
  sed -i 's/enable: false,\(.*\)\/\/ banner/enable: true,\1\/\/ banner/' "$EXAMPLE_DST/src/config/config.ts"
fi

echo "    Done"

# -----------------------------------------------------------------------------
# 4. (No demo content needed — full Temporal-Flow content is the demo)
# -----------------------------------------------------------------------------
echo "==> [4/7] Content note: using full Temporal-Flow content as demo (no skeleton posts)"

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

# GitHub Actions workflow for GitHub Pages
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
          path: apps/example/dist

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
