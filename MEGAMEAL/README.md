# 🌊 MEGAMEAL

**An immersive storytelling universe combining interactive narrative, 3D gaming, and multimedia experiences**

[![Live Site](https://img.shields.io/badge/🌐-Live%20Site-brightgreen)](https://megameal.org)
[![Built with Astro](https://img.shields.io/badge/Built%20with-Astro-orange)](https://astro.build)
[![Game Engine](https://img.shields.io/badge/Game%20Engine-Threlte-blue)](https://threlte.xyz)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

> A multimedia storytelling project featuring an interactive timeline, immersive 3D web game, character profiles, and rich narrative content exploring themes of consciousness, time, and culinary adventures across the cosmos.

## 🌟 What is MEGAMEAL?

MEGAMEAL is a comprehensive storytelling universe that spans multiple formats and mediums:

- **🎮 Interactive 3D Game** - First-person exploration with underwater environments and timeline navigation
- **📖 Interactive Timeline** - Explore the story through different time periods and perspectives
- **👥 Character Profiles** - Meet the diverse cast of characters from across time and space
- **🎬 Multimedia Content** - Video content, animations, and visual storytelling
- **📚 Rich Narrative** - Deep lore covering consciousness, corporate intrigue, and temporal mysteries

## 🚀 Live Experience

Visit **[megameal.org](https://megameal.org)** to experience the full interactive universe.

## ✨ Key Features

### 🎮 **Immersive 3D Game**
- **First-Person Exploration** - Navigate underwater observatories and mysterious environments
- **Dynamic Ocean System** - Experience rising water levels with realistic underwater effects
- **Multiple Levels** - Observatory, spaceship, restaurant, infinite library, and personal spaces
- **Cross-Platform** - Optimized for both desktop and mobile devices

### 📖 **Interactive Timeline**
- **Multi-Era Storytelling** - Explore different time periods and their interconnected stories
- **Character Perspectives** - Experience events from multiple viewpoints
- **Rich Media Integration** - Videos, images, and interactive elements enhance the narrative

### 🎭 **Character Universe**
- **Diverse Cast** - From corporate executives to temporal historians and conscious entities
- **Deep Backstories** - Each character has rich lore and interconnected relationships
- **Video Profiles** - Many characters feature video content and visual representations

### 🎬 **Multimedia Content**
- **Video Integration** - Character videos, trailers, and narrative content
- **Interactive Elements** - Quizzes, games, and dynamic content
- **Visual Storytelling** - Rich imagery and animations throughout

## 🛠️ Technical Stack

### Core Technologies
- **[Astro](https://astro.build)** - Static site generator with dynamic capabilities
- **[Svelte 5](https://svelte.dev)** - Reactive component framework
- **[Threlte](https://threlte.xyz)** - 3D graphics framework for the game
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[MDX](https://mdxjs.com)** - Markdown with JSX for rich content

### Game Engine
- **[Three.js](https://threejs.org)** - 3D graphics library
- **[Rapier3D](https://rapier.rs)** - Physics engine
- **WebGL** - Hardware-accelerated graphics

### Content Management
- **Git-based** - All content managed through version control
- **Markdown/MDX** - Content authoring in Markdown with React components
- **Asset Pipeline** - Optimized handling of images, videos, and 3D models

## 🎯 Project Structure

```
MEGAMEAL/
├── src/
│   ├── components/          # Reusable UI components
│   ├── content/            # Story content, characters, timeline
│   ├── threlte/            # 3D game engine components
│   ├── pages/              # Site pages and routing
│   ├── layouts/            # Page layouts
│   └── styles/             # CSS and styling
├── public/                 # Static assets
│   ├── assets/             # Images, avatars, banners
│   ├── videos/             # Video content
│   ├── models/             # 3D models and game assets
│   └── posts/              # Post-specific media
├── docs/                   # Technical documentation
└── tools/                  # Development utilities
```

## 🚦 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/MEGAMEAL.git
cd MEGAMEAL

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Development Commands
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm preview      # Preview production build
pnpm format       # Format code with Biome
pnpm lint         # Lint and fix code issues
```

## 📖 Content Areas

### 🕐 **Timeline Stories**
Explore different eras and events:
- **Digital Awakening** - The emergence of conscious entities
- **Corporate Empire** - The rise of mega-corporations
- **First Contact** - Encounters with otherworldly beings
- **Quantum Time Travel** - Adventures across temporal boundaries
- **End of Time** - The ultimate cosmic conclusion

### 👥 **Character Profiles**
Meet the cast:
- **Merkin** - Mysterious protagonist with temporal abilities
- **Dr. Elara Voss** - Brilliant scientist and researcher
- **Captain Helena Zhao** - Starship commander
- **Maya Okafor** - Corporate executive
- **The Universe (Garfunkel)** - A cosmic conscious entity

### 🎮 **Game Levels**
Explore immersive environments:
- **Observatory** - Underwater research station with rising water
- **Miranda Spaceship** - Futuristic vessel exploration
- **Restaurant** - Mysterious culinary establishment
- **Infinite Library** - Endless knowledge repository

## 🌊 Underwater Game System

The 3D game features a sophisticated underwater system:

```typescript
// Configurable water effects
const underwaterConfig = {
  initialLevel: -6,           // Starting water level
  targetLevel: 8,             // Final water level
  underwaterFogDensity: 0.62, // Murky water visibility
  riseRate: 0.05             // Water level change speed
}
```

**Key Features:**
- **Dynamic Water Levels** - Ocean rises creating time pressure
- **Realistic Physics** - Optimized collision detection
- **Atmospheric Effects** - Murky water with fog and lighting
- **Cross-Platform Controls** - Desktop and mobile optimized

## 🎬 Media Integration

### Video Content
- Character profile videos stored in `/public/about/video/`
- Timeline narrative videos in `/public/videos/`
- Interactive video integration throughout the site

### 3D Assets
- Game models in `/public/models/`
- Terrain systems with LOD optimization
- Texture and material management

### Image Assets
- Character avatars and portraits
- Banner images and backgrounds
- Interactive timeline visuals

## 📱 Responsive Design

- **Mobile-First** - Optimized for mobile devices
- **Touch Controls** - Game supports touch input
- **Adaptive UI** - Interface scales across screen sizes
- **Performance Scaling** - Quality adjusts based on device capabilities

## 🔧 Development

### Adding New Content

**Timeline Stories:**
```bash
# Add new timeline story
touch src/content/posts/timelines/your-story.mdx
```

**Characters:**
```bash
# Add new character profile
touch src/content/about/character-name.md
```

**Game Levels:**
```bash
# Add new game level
touch src/threlte/levels/YourLevel.svelte
```

### Content Structure

Timeline stories use frontmatter:
```markdown
---
title: "Your Story Title"
pubDate: "2024-01-01"
description: "Story description"
banner: "path/to/banner.png"
tags: ["timeline", "sci-fi"]
category: "timeline"
---

Your story content here...
```

## 🚀 Deployment

The site is configured for GitHub Pages with custom domain support:

```bash
# Build for production
pnpm build

# The site automatically deploys to GitHub Pages
# Custom domain configured via CNAME file
```

**Deployment Features:**
- Automatic builds on push to main
- Custom domain support (megameal.org)
- CDN optimization
- RSS feeds and sitemaps

## 🤝 Contributing

We welcome contributions to expand the MEGAMEAL universe!

### How to Contribute
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-story`
3. Add your content or improvements
4. Commit your changes: `git commit -m "Add amazing story"`
5. Push to your fork: `git push origin feature/amazing-story`
6. Submit a Pull Request

### Content Guidelines
- **Timeline Stories** - Should fit within the established universe
- **Character Profiles** - Include backstory and connections to existing lore
- **Game Content** - Follow established technical patterns
- **Media Assets** - Optimize for web delivery

## 📊 Performance

- **Lighthouse Score** - 90+ across all metrics
- **Load Time** - ~2-3 seconds first visit
- **Game Performance** - 60 FPS with quality scaling
- **Mobile Optimized** - Touch controls and responsive design

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Astro Team** - For the excellent static site generator
- **Threlte Team** - For bringing 3D to Svelte
- **Three.js Community** - For the foundational 3D graphics library
- **Open Source Community** - For the amazing tools and libraries

## 🔗 Links

- **[Live Site](https://megameal.org)** - Experience MEGAMEAL
- **[Game Documentation](docs/GAME_DESIGN_DOCUMENT.md)** - Technical game details
- **[Timeline](https://megameal.org/posts/Timeline)** - Interactive story timeline
- **[Characters](https://megameal.org/about)** - Meet the cast
- **[Issues](https://github.com/yourusername/MEGAMEAL/issues)** - Report bugs or request features

---

<p align="center">
  <strong>🌊 Dive into the MEGAMEAL Universe - Where Stories Come Alive 🌊</strong>
</p>