# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

The Merkin repository is a **multi-project workspace** containing five distinct projects:

1. **MEGAMEAL** - Immersive 3D storytelling game with Astro/Svelte/Threlte
2. **DNDIY** - D&D content platform and community hub
3. **Temporal-Flow** - Decentralized blogging and content sharing platform
4. **Mesh_Hair_Generator** - Blender addon for mesh-based hair generation
5. **mascot-chatbot-cf-worker** - Cloudflare Worker for AI mascot backend

## Project Locations

```
/home/greggles/Merkin/
├── MEGAMEAL/                    # Primary MEGAMEAL version
├── MEGAMEAL (copy)/            # Development copy
├── MEGAMEAL (9-8)/             # Backup version
├── MEGAMEAL (threejs)/         # Three.js experimental version
├── DNDIY/                      # D&D content platform
├── DNDIY.github.io/            # DNDIY GitHub Pages version
├── Temporal-Flow/              # Decentralized blog platform
├── Mesh_Hair_Generator/        # Blender addon
└── mascot-chatbot-cf-worker/   # AI mascot backend service
```

---

## 1. MEGAMEAL

**Path:** `/home/greggles/Merkin/MEGAMEAL/`

### Technology Stack
- **Astro 5.1.6** - Static site generator with dynamic islands
- **Svelte 5** - Component framework (runes syntax)
- **Threlte** - 3D game engine wrapper for Three.js
- **Rapier3D** - Physics engine
- **Tailwind CSS 3.4.17** - Utility-first styling
- **Biome** - Linting/formatting
- **TypeScript** - Strict type checking

### Commands
```bash
pnpm dev              # Astro dev server (port 3000)
pnpm game:dev         # Game dev server (port 3001)
pnpm build            # Production build + search index
pnpm preview          # Preview production build
pnpm format           # Format with Biome (2-space, single quotes)
pnpm lint             # Lint and fix with Biome
pnpm type-check       # TypeScript validation
pnpm docs:generate    # Generate TypeDoc documentation
pnpm new-post         # Create new post via script

# Terrain processing
node tools/unified-terrain-pipeline.js <config-file>
```

### Architecture

**Content System:**
- `src/content/posts/` - Timeline stories (MDX)
- `src/content/about/` - Character profiles (Markdown)
- `src/content/products/` - Store items
- `src/content/quizzes/` - Interactive quizzes (JSON)

**3D Game Engine (`src/threlte/`):**
- Feature-based ECS architecture in `features/`:
  - `player/` - First-person movement and controls
  - `terrain/` - Heightmap-based LOD terrain system
  - `ocean/` - Dynamic water levels and underwater effects
  - `conversation/` - Dialogue system with NPCs
  - `multiplayer/` - P2P multiplayer via PeerJS
  - `performance/` - Adaptive quality scaling and LOD management
- Store-based state management using Svelte stores
- Rapier3D physics integration via @threlte/rapier

**Terrain Pipeline:**
1. GLB models → heightmaps (for physics collision)
2. Heightmaps → chunked LOD models (for rendering)
3. Manifest files with coordinate bounds
4. Coordinate system validation for physics/visual alignment

**Import Path Aliases:**
- `@components/*` → `src/components/*`
- `@assets/*` → `src/assets/*`
- `@utils/*` → `src/utils/*`
- `@/*` → `src/*`

**Important Files:**
- `CLAUDE.md` - Detailed development guide
- `README.md` - Full project documentation
- `cloudflare-worker/README.md` - Room directory service docs

---

## 2. DNDIY

**Path:** `/home/greggles/Merkin/DNDIY/`

### Technology Stack
- **Astro 5.1.6** - Static site generator
- **Svelte 5.23.1** - Component framework
- **Tailwind CSS 3.4.16** - Styling
- **Biome 1.8.3** - Linting/formatting
- **TypeScript 5.7.2** - Type safety
- **Mammoth** - Word document conversion
- **Pagefind 1.2.0** - Client-side search

### Commands
```bash
pnpm dev              # Development server
pnpm build            # Production build + search index
pnpm preview          # Preview production build
pnpm format           # Format with Biome
pnpm lint             # Lint and fix with Biome
pnpm type-check       # TypeScript validation
pnpm new-post         # Create new D&D post
```

### Architecture
- Content collections organized by D&D categories
- Character profile pages for NPCs and player characters
- Campaign management with timeline integration
- Full-text search for spells, items, and characters
- Same Astro Islands architecture as MEGAMEAL

---

## 3. Temporal-Flow

**Path:** `/home/greggles/Merkin/Temporal-Flow/`

### Technology Stack
- **Astro 5.1.6** - Static site generator
- **Svelte** - Component framework
- **Tailwind CSS** - Styling
- **Biome** - Linting/formatting
- **Pagefind** - Client-side search
- **Swup** - Smooth page transitions

### Commands
```bash
pnpm install          # Install dependencies
pnpm dev             # Development server
pnpm build           # Production build
pnpm run astro dev   # Astro dev server
```

### Architecture
- **Decentralized content federation** - Connect with other blogs via RSS/JSON
- **Timeline system** - Interactive chronological visualization
- **Banner system** - Multiple types (animated, video, image, timeline)
- **Privacy-focused** - Visitors see only your content
- **Git-based deployment** - Designed for GitHub Pages

**Key Features:**
- Friend content sharing without central server
- RSS and JSON feed support
- Touch-optimized mobile-first design
- Customizable theme with hue selection
- Light/dark mode with automatic detection

---

## 4. Mesh_Hair_Generator

**Path:** `/home/greggles/Merkin/Mesh_Hair_Generator/`

### Technology Stack
- **Blender 4.4.3+** - Base software
- **Python** - Blender addon scripting

### Installation
1. Download `mesh_hair_generator_v15.zip`
2. Blender: `Edit > Preferences > Add-ons > Install`
3. Enable "Mesh Hair Generator"
4. Access via `3D View > Sidebar > Mesh Hair` tab

### Key Features
- **Direct mesh generation** - Bypasses particle system limitations
- **Perfect material inheritance** - Hair matches surface textures
- **Batch processing** - Handle 50,000+ hair strands
- **Two render types:**
  - **Tubes** - Procedural geometry (customizable segments/sides)
  - **Object** - Instanced custom meshes
- **Advanced controls:**
  - Guide curves for hair direction
  - Children system for natural density (0-10 per parent)
  - Surface alignment (follows normals)
  - UV coordinate sampling for color matching
- **GLB export ready** - Single mesh object with proper materials

### Recommended Settings

**For Game Development:**
- Hair Count: 5,000-20,000
- Render As: Tubes
- Segments: 1-2
- Sides: 3-4
- Use Batching: ✓
- Keep Emitter Geometry: ✓

**For High-Quality Renders:**
- Hair Count: 50,000+
- Render As: Tubes or Object
- Segments: 4-6
- Children Count: 3-5
- Use Surface Color: ✓
- Batch Size: 2,000-5,000

**Important:** Version 13.0+ provides 10-100x speed improvement through architectural optimization.

---

## 5. mascot-chatbot-cf-worker

**Path:** `/home/greggles/Merkin/mascot-chatbot-cf-worker/my-mascot-worker-service/`

### Technology Stack
- **Cloudflare Workers** - Serverless deployment platform
- **TypeScript 5.0.0+** - Type-safe development
- **Wrangler** - Cloudflare CLI build tool
- **AI Providers:**
  - Google Gemini (primary)
  - DeepSeek (alternative)

### Commands
```bash
pnpm install          # Install dependencies
pnpm dev             # Local development (wrangler dev)
pnpm deploy          # Deploy to Cloudflare Workers
pnpm wrangler tail   # View live logs
```

### Configuration

**Environment Variables (Secrets):**
- `GEMINI_API_KEY` - Google Gemini API authentication
- `DEEPSEEK_API_KEY` - DeepSeek API authentication (optional)

Set via Cloudflare Dashboard: Workers & Pages → Worker → Settings → Variables

### API Specification

**Endpoint:** POST to deployed worker URL

**Request Payload:**
```json
{
  "provider": "gemini" | "deepseek",
  "message": "User message",
  "persona": "string | object",
  "pageContext": "Where user is",
  "history": [
    {"role": "user", "parts": [{"text": "..."}]},
    {"role": "model", "parts": [{"text": "..."}]}
  ]
}
```

**Dual Persona Support:**
- **Legacy (Simple String):** `"persona": "You are CUPPY, a cute cupcake mascot."`
- **Modern (Rich Object):** Complex JSON with name, species, personality, traits, knowledge, behavior

**Payload Fields:**
- `provider` - AI service to use ("gemini" or "deepseek")
- `message` - User's current message
- `persona` - AI personality (string or object)
- `pageContext` - Contextual information about user location
- `history` - Previous conversation turns (optional)

### Architecture
- **Multi-provider abstraction** - Switch between AI services
- **Conversation history** - Maintains context across turns
- **Rich persona system** - Supports simple and complex character definitions
- **Context awareness** - Considers page context and user location
- **Backwards compatible** - Handles both legacy and modern persona formats
- **Serverless scaling** - Automatically scales with Cloudflare infrastructure

**Use Cases:**
- In-game NPCs (MEGAMEAL fireflies, characters)
- Website chatbots
- Interactive mascots
- Context-aware AI assistants

---

## Cross-Project Patterns

### Common Technology Stack
All web projects (MEGAMEAL, DNDIY, Temporal-Flow) share:
- **Astro** - Static site generator with Islands architecture
- **Svelte** - Interactive component framework
- **Tailwind CSS** - Utility-first styling
- **TypeScript** - Type safety with strict configuration
- **Biome** - Code quality (linting/formatting)
- **Pagefind** - Client-side search
- **pnpm** - Package manager

### Architecture Patterns
- **Islands Architecture** - Static HTML with dynamic Svelte components
- **Content Collections** - Git-based content management via Markdown/MDX
- **Modular Structure** - Consistent `src/` organization (components, services, stores, config)
- **Type-Driven** - Strong TypeScript usage across all projects
- **API Separation** - Backend services isolated (Cloudflare Workers)

### Development Workflow
- Standard pnpm scripts for build/dev/deploy
- Linting and formatting with Biome
- TypeScript type checking pre-build
- Pagefind search indexing during build
- GitHub Actions for CI/CD and deployment

---

## Working with This Repository

### Code Quality Standards
- **Formatting:** 2-space indentation, single quotes (enforced by Biome)
- **Linting:** Strict Biome rules enabled across all projects
- **Type Safety:** Strict TypeScript configuration
- **Import Organization:** Use path aliases (`@components/*`, `@utils/*`, etc.)

### Testing
- Web projects use browser-based testing for game engine and interactive components
- No specific test framework configured - check existing files before adding tests

### Deployment
- **MEGAMEAL:** GitHub Pages with custom domain (megameal.org)
- **Temporal-Flow:** GitHub Pages with GitHub Actions
- **DNDIY:** GitHub Pages configuration
- **mascot-chatbot-cf-worker:** Cloudflare Workers via `pnpm wrangler deploy`

### Common Tasks

**Creating New Content:**
```bash
# MEGAMEAL timeline story
touch src/content/posts/timelines/your-story.mdx

# MEGAMEAL character profile
touch src/content/about/character-name.md

# MEGAMEAL game level
touch src/threlte/levels/YourLevel.svelte

# DNDIY post
pnpm new-post

# Temporal-Flow blog post
touch src/content/posts/your-post.mdx
```

**Running Terrain Processing (MEGAMEAL):**
```bash
node tools/unified-terrain-pipeline.js <config-file>
```

**Deploying Mascot Backend:**
```bash
cd mascot-chatbot-cf-worker/my-mascot-worker-service
pnpm wrangler deploy
```

---

## Important Documentation Files

- **MEGAMEAL:** `/home/greggles/Merkin/MEGAMEAL/CLAUDE.md` - Detailed development guide
- **MEGAMEAL:** `/home/greggles/Merkin/MEGAMEAL/README.md` - Full project documentation
- **Temporal-Flow:** `/home/greggles/Merkin/Temporal-Flow/readme.md` - Setup and features
- **DNDIY:** `/home/greggles/Merkin/DNDIY/readme.md` - Project information
- **Mesh Hair Generator:** `/home/greggles/Merkin/Mesh_Hair_Generator/mesh_hair_generator_README.md` - Installation and usage guide
- **Mascot Chatbot:** `/home/greggles/Merkin/mascot-chatbot-cf-worker/my-mascot-worker-service/README.md` - API documentation
