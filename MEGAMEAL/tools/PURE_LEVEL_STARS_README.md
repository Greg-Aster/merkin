# Pure Level Stars System - TypeScript

## Overview

The Pure Level Stars System is a TypeScript-based solution for managing level navigation stars that directly load game levels without requiring blog posts. This is separate from the timeline event stars system.

## Architecture

### Key Differences from Timeline Event Stars

- **Timeline Event Stars**: Require MDX blog posts, show "View Event" button, part of content management
- **Pure Level Stars**: No blog posts required, show "Enter Level" button, pure navigation elements

### Files

- `pure-level-stars.ts` - Main TypeScript implementation
- `pure-level-stars.d.ts` - Type definitions
- `pure-level-stars-config.json` - Generated configuration (auto-created)

## Features

### Automatic Level Detection
- Scans `/src/threlte/levels/` for Svelte level files
- Extracts metadata (GLB paths, features, spawn points)
- Suggests appropriate eras and years based on naming patterns

### Constellation System
- Groups level stars by era into themed constellations
- Automatic positioning with radius and height variations
- Configurable constellation themes (mystical, castle, urban, tech, space)

### Type Safety
- Full TypeScript interfaces for all data structures
- Compile-time validation of level star configurations
- IDE support with autocomplete and error checking

### Scalability
- Dynamic level detection - new levels are automatically discovered
- JSON configuration for easy editing and version control
- CLI interface for development workflow

## Usage

### CLI Commands

```bash
# Scan for level files
npx tsx pure-level-stars.ts scan

# Refresh entire system (scan + update config)
npx tsx pure-level-stars.ts refresh

# Show system status
npx tsx pure-level-stars.ts status

# List all level stars
npx tsx pure-level-stars.ts stars
```

### API Integration

The system integrates with the development tools server:

```javascript
// Get level stars data
fetch('/api/pure-level-stars?action=stars')

// Get system status
fetch('/api/pure-level-stars?action=status')

// Refresh system
fetch('/api/pure-level-stars?action=refresh')
```

### Game Integration

```typescript
import { PureLevelStarsManager } from './tools/pure-level-stars';

const manager = new PureLevelStarsManager();
const levelStars = manager.getLevelStars();

// Use level stars in your game's star system
levelStars.forEach(star => {
  // star.isLevel === true
  // star.levelId contains the level to load
  // star.position contains 3D coordinates
});
```

## Configuration

The system generates a `pure-level-stars-config.json` file with:

```json
{
  "constellations": {
    "near-future": {
      "name": "Near Future",
      "basePosition": [25, 25, 25],
      "radius": 20,
      "maxStars": 8,
      "theme": "tech"
    }
  },
  "stars": [
    {
      "id": "level-star-sci-fi-room",
      "title": "Sci Fi Room",
      "levelId": "sci-fi-room",
      "position": [77, 27, 50],
      "isLevel": true,
      "type": "level-star"
    }
  ]
}
```

## Development Workflow

1. **Add New Level**: Create a new Svelte component in `/src/threlte/levels/`
2. **Auto-Detection**: Run `npx tsx pure-level-stars.ts refresh`
3. **Constellation**: Level star automatically positioned in appropriate constellation
4. **Game Integration**: Level star appears in game's starmap with "Enter Level" functionality

## Era Detection Rules

The system automatically suggests eras based on level naming:

- `sci-fi`, `space` → far-future (2500)
- `medieval`, `castle` → medieval (1200)
- `modern`, `city` → modern (2024)
- `ancient`, `temple` → ancient (-500)
- `observatory` → near-future (2150)
- Default → near-future (2100)

## Benefits

1. **Separation of Concerns**: Level navigation separate from content management
2. **Automatic Scaling**: New levels automatically get stars
3. **Type Safety**: Compile-time validation prevents runtime errors
4. **Developer Experience**: CLI tools and clear interfaces
5. **Game Design**: Direct level loading without content creation overhead