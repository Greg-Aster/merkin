# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
pnpm dev                    # Start Astro development server (port 3000)
pnpm game:dev              # Start game development server (port 3001)  
pnpm start                 # Alias for pnpm dev

# Building and Deployment
pnpm build                 # Build for production + generate search index
pnpm preview               # Preview production build
pnpm game:build            # Build game specifically
pnpm game:preview          # Preview game build

# Code Quality
pnpm format                # Format code with Biome (2-space indent, single quotes)
pnpm lint                  # Lint and fix code issues with Biome (strict rules enabled)
pnpm type-check            # TypeScript type checking without build

# Documentation
pnpm docs:generate         # Generate TypeDoc documentation

# Content Management
pnpm new-post              # Create new post via script
```

## High-Level Architecture

MEGAMEAL is a multimedia storytelling project built with **Astro** and **Svelte 5**, featuring:

### Core Technologies
- **Astro 5.1.6** - Static site generator with dynamic islands
- **Svelte 5** - Component framework (using runes syntax)
- **Threlte** - 3D game engine wrapper for Three.js
- **Tailwind CSS** - Utility-first styling
- **Biome** - Linting, formatting, and import organization
- **TypeScript** - Strict type checking enabled

### Content Architecture
- **Content Collections** (`src/content/`) - Structured content using Astro's content system:
  - `posts/` - Blog posts and timeline stories (MDX)
  - `about/` - Character profiles (Markdown) 
  - `products/` - Store items
  - `quizzes/` - Interactive quiz content (JSON)
- **Static Assets** (`public/`) - Images, videos, 3D models, terrain data
- **Configuration-Driven** (`src/config/`) - Modular config system for UI themes, banners, etc.

### 3D Game Engine (`src/threlte/`)
- **Feature-Based Architecture** - Modular systems in `features/`:
  - `player/` - First-person movement and controls
  - `terrain/` - Heightmap-based terrain with LOD chunks
  - `ocean/` - Dynamic water levels and underwater effects  
  - `conversation/` - Dialogue system with character interactions
  - `multiplayer/` - P2P multiplayer with PeerJS
  - `performance/` - Dynamic quality scaling and LOD management
- **Store-Based State** (`stores/`) - Reactive state management using Svelte stores
- **ECS Components** - Entity-component system for game objects
- **Physics Integration** - Rapier3D physics engine via @threlte/rapier

### Level System
- **Dynamic Level Loading** - Levels are Svelte components that can be swapped
- **Terrain Pipeline** (`tools/`) - Automated GLB → heightmap → chunks pipeline
- **Coordinate System Validation** - Ensures physics/visual alignment across terrain types

### Content Management System
- **Git-Based Workflow** - All content versioned and deployable
- **Asset Processing** - Automated optimization for images, models, and terrain
- **Search Integration** - Pagefind for client-side search
- **RSS/Sitemap Generation** - Automatic feed generation

## Key Implementation Patterns

### Terrain System
The terrain system uses a unified pipeline that processes 3D models into:
1. Heightmaps for physics collision
2. Chunked LOD models for rendering  
3. Manifest files with coordinate bounds

Run terrain processing with:
```bash
node tools/unified-terrain-pipeline.js <config-file>
```

### Performance Management
The game includes adaptive quality scaling:
- `OptimizationManager` automatically adjusts settings based on FPS
- LOD system for terrain chunks and models
- Performance monitoring with configurable targets
- Mobile-optimized settings and controls

### State Management
- **Game State**: Reactive Svelte stores in `src/threlte/stores/`
- **UI State**: Separate stores for UI components  
- **Timeline Data**: Service layer for timeline/story content
- **Configuration**: TypeScript config files for themes and settings

### Content Authoring
- Timeline stories use frontmatter for metadata
- Character profiles support video integration (`/public/about/video/`)
- Interactive elements use Svelte components within MDX
- Quiz system uses JSON format for questions/answers

### Import Path Aliases
The project uses TypeScript path mapping for cleaner imports:
- `@components/*` → `src/components/*`
- `@assets/*` → `src/assets/*`
- `@utils/*` → `src/utils/*`
- `@/*` → `src/*`

## Testing
The project uses browser-based testing for the game engine. No specific test framework is configured - if tests are needed, check existing files first or ask about the preferred testing approach.

## Deployment
Configured for GitHub Pages with:
- Custom domain support (megameal.org)
- Automatic builds on push to main
- Asset optimization and CDN delivery
- Search index generation during build