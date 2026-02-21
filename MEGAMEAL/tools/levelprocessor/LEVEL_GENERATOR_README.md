# Level Generator Tool

**Professional level creation system for MEGAMEAL that generates complete, production-ready levels with manifests, components, and optimized configurations.**

## 🚀 Quick Start

### Web Interface (Recommended)
1. Start the tools server: `./tools/start.sh` or `node tools/app.js`
2. Open: http://localhost:3001
3. Use the **Level Generator** section (third tool)
4. Fill in your level details and click "Generate Level"

### Command Line Interface
```bash
cd tools/levelprocessor
node level-generator.js "Sci-Fi Room" sci-fi-room interior /models/levels/sci-fi-room.glb --output ./src/threlte/levels
```

## 📋 What Gets Generated

### 1. **Level Manifest** (`/levels/{id}/manifest.json`)
Complete level configuration with:
- Asset paths and physics setup
- Lighting and optimization settings  
- Feature flags (ocean, vegetation, etc.)
- Spawn points and collision configuration

### 2. **Svelte Component** (`/src/threlte/levels/{ComponentName}.svelte`)
Production-ready level component with:
- Proper ECS integration and spawn system
- Performance optimization and LOD
- All requested features (ocean, fireflies, etc.)
- Professional error handling and logging

### 3. **Level Structure**
```
/levels/{id}/
├── manifest.json          # Complete level configuration
└── (ready for assets)     # Heightmaps, chunks, etc.

/src/threlte/levels/
└── {ComponentName}.svelte  # Generated level component
```

## 🎮 Level Types

### **Interior** - Indoor spaces, rooms, ships
- **Physics**: Mesh-based collision
- **Spawn**: Ground level (0, 1, 0)
- **Lighting**: Bright interior lighting
- **Features**: Perfect for sci-fi rooms, ship interiors

### **Terrain** - Outdoor landscapes, islands
- **Physics**: Heightfield collision with terrain system
- **Spawn**: Elevated (0, 20, 0) 
- **Lighting**: Natural outdoor lighting
- **Features**: Supports vegetation, chunked terrain

### **Hybrid** - Complex levels like Observatory
- **Physics**: Advanced heightfield + chunked terrain
- **Spawn**: Custom positioning
- **Lighting**: Dynamic lighting system
- **Features**: All features available (ocean, fireflies, stars)

## ⚙️ Features Configuration

### **Ocean Component**
- Animated water with underwater effects
- Configurable size, animation, and fog
- Integration with lighting system

### **Vegetation System** 
- Nature pack asset distribution
- Performance-optimized LOD
- Terrain-based placement

### **Firefly System**
- ECS-based particle system
- AI conversation integration
- Dynamic lighting effects

### **Star Navigation**
- Timeline integration
- Level transition system
- Interactive star field

## 🔧 Integration Steps

After generation, integrate into your game:

### 1. **Add to Game.svelte**
```javascript
// Import the new level
import SciFiRoom from './levels/SciFiRoom.svelte';

// Add to level registry
const levelRegistry = {
  'observatory': HybridObservatory,
  'sci-fi-room': SciFiRoom,  // Add this line
};
```

### 2. **Update LevelTransitionHandler.svelte**
```javascript
const levelMappings = {
  'sci-fi-room-level': 'sci-fi-room',
  'sci-fi-room': 'sci-fi-room'
};

const validLevels = [..., 'sci-fi-room'];
```

### 3. **Test Level Loading**
```javascript
// In browser console
gameActions.transitionToLevel('sci-fi-room')
```

## 📁 File Examples

### Generated Manifest
```json
{
  "name": "Sci-Fi Room",
  "id": "sci-fi-room",
  "type": "interior",
  "spawn": {
    "position": [0, 1, 0],
    "rotation": [0, 0, 0]
  },
  "physics": {
    "type": "mesh",
    "worldSize": 50
  },
  "lighting": {
    "ambientIntensity": 0.8,
    "directionalLights": [...]
  },
  "features": {
    "ocean": false,
    "vegetation": false,
    "fireflies": true,
    "starMap": false
  }
}
```

### Generated Component Structure
```svelte
<!-- Professional Svelte component -->
<script lang="ts">
  // ECS integration
  export let spawnSystem: any = null;
  export let interactionSystem: any = null;
  export let playerSpawnPoint: [number, number, number] = [0, 1, 0];
  
  // Manifest loading
  let manifest: any = null;
  
  // Proper spawn handling
  function handleEnvironmentReady() {
    // ECS spawn system integration
    // Error handling
    // Event dispatching
  }
</script>

<LevelManager>
  <!-- StaticEnvironment -->
  <!-- LightingComponent -->
  <!-- Optional features based on selection -->
</LevelManager>
```

## 🛠️ Advanced Usage

### Custom Templates
Modify templates in `level-generator.js`:
- `getInteriorTemplate()` - Indoor spaces
- `getTerrainTemplate()` - Outdoor landscapes  
- `getHybridTemplate()` - Complex levels

### Asset Integration
- Place GLB files in `/public/models/levels/`
- Generate heightmaps with Heightmap Generator tool
- Process terrain chunks with Level Processor tool

### Performance Optimization
- All levels include OptimizationManager integration
- Automatic LOD scaling based on device capabilities
- Memory management and cleanup

## 🔍 Troubleshooting

### Common Issues
1. **GLB Path**: Ensure path starts with `/` for public assets
2. **Output Directory**: Must exist or be creatable
3. **Level ID**: Use kebab-case (e.g., `sci-fi-room`)
4. **Component Name**: Auto-generated as PascalCase

### Generated Files Not Working?
1. Check console for manifest loading errors
2. Verify GLB file exists at specified path
3. Ensure level added to Game.svelte registry
4. Test with `gameActions.transitionToLevel('your-id')`

## 🎯 Best Practices

1. **Use Descriptive Names**: "Sci-Fi Research Station" vs "Room 1"
2. **Consistent ID Format**: Use kebab-case for level IDs
3. **Start Simple**: Begin with interior type, add features gradually
4. **Test Early**: Generate and test basic level before adding features
5. **Asset Organization**: Keep GLB files organized in `/models/levels/`

---

**The Level Generator creates professional, production-ready levels that follow MEGAMEAL's architecture standards and integrate seamlessly with the existing ECS, optimization, and feature systems.**