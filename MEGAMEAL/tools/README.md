# MEGAMEAL Development Tools

**Professional-grade level generation system** for MEGAMEAL game development.

## ⚡ TriMesh Physics (Modern Architecture)

MEGAMEAL now uses **TriMesh physics** for solid, precise terrain collision:
- **TriMesh collision**: Built from heightmap data, works everywhere
- **Dynamic chunking**: Loads collision around player for large worlds  
- **Single mode**: Entire terrain as one collider for smaller levels
- **Heightmaps as source**: PNG heightmaps drive TriMesh geometry (not Rapier heightfield)

### 🎯 Performance Recommendations

**Medium/Small Terrain (≤500×500):**
- Use **Single TriMesh** mode (default)
- Downsample `16` → ~30k triangles (best performance)
- Downsample `12` → ~40k triangles (more fidelity)
- Downsample `8` → ~65k triangles (only if needed)

**Large Terrain (kilometers):**
- Use **Chunked TriMesh** mode
- Downsample `8`, chunkVerts `65`, activeRadius `2`
- Keep active triangles under 150k total
- Ensure spawn area coverage (radius 2-3)

**Target Triangle Counts:**
- Single mode: 30-40k triangles optimal
- Chunked mode: 100k-150k active triangles maximum

## 🚀 Super Quick Start

**Completely refactored and simplified!** Just run:

### Option 1: Double-click to start
- **Windows:** Double-click `start.bat`
- **Mac/Linux:** Double-click `start.sh` (or run `./start.sh`)

### Option 2: Command line
```bash
cd tools
node app.js
```

### Option 3: Direct execution
```bash
./tools/app.js
```

**Then open:** http://localhost:3001

## 🎉 What's New - Major Refactor Complete!

The tools system has been **completely refactored** for better maintainability and reliability:

### ✅ **Clean Architecture**
- **Separated concerns**: HTML, CSS, and JavaScript are now in separate files
- **Focused server**: app.js is now clean and only handles API endpoints + static serving
- **Modular templates**: Svelte level templates extracted to separate .svelte files
- **API-based file access**: All project file access goes through secure API endpoints

### ✅ **Fixed Output Paths**
- **Manifests**: Now saved directly to `public/terrain/{levelId}.manifest.json`
- **Heightmaps**: Saved to `public/terrain/heightmaps/`
- **Terrain chunks**: Saved to `public/terrain/levels/{levelId}/`
- **Level components**: Saved to `src/threlte/levels/`

### ✅ **Improved Reliability**
- **GLB analysis**: Now works with proper fallback mesh generation
- **Path resolution**: Fixed all path-related issues with absolute path handling
- **Error handling**: Better error messages and graceful fallbacks
- **File structure**: Proper integration with main project directories

## 🔧 Requirements

- **Node.js** - Already have it if you can run the start scripts
- **Python 3.x** - For level processor (trimesh auto-installs)
- **GLB files** - Your 3D terrain models to process

## 🛠️ Available Tools

### ⚡ **Unified Terrain Pipeline** (RECOMMENDED)
**The complete solution for professional level generation - Now fully working!**

- **Input**: Single GLB terrain model + web configuration form
- **Output**: Production-ready Svelte level components with proper file organization
- **Features**:
  - 📊 **GLB Analysis**: Automatically detects dimensions (500x500, -183 to 10 height range)
  - 🗺️ **Synchronized Assets**: All outputs use the same GLB source for consistency  
  - 🎮 **Proper Integration**: Files saved to correct project directories
  - 🌊 **Feature Integration**: Ocean, terrain, fireflies, vegetation, star navigation
  - 🚀 **Performance Ready**: LOD systems, optimization settings built-in
  - 📁 **Organized Output**: Manifests, heightmaps, and chunks in proper locations
  - ✅ **Level Editor Ready**: Generated manifests automatically appear in Level Editor

**Usage (Web UI):**
- Use **"Unified Pipeline"** tab in the tools UI.
- GLB analysis works with fallback mesh generation.
- Outputs go to `public/terrain/` and `src/threlte/levels/`.

**Usage (CLI JSON):**
```bash
cd tools
node unified-terrain-pipeline.js path/to/config.json
```

The config supports rich features:
```jsonc
{
  "name": "Observatory Environment",
  "id": "observatory-environment",
  "type": "hybrid",               // interior | terrain | hybrid
  "glbPath": "./public/models/levels/observatory-environment.glb",
  "resolution": 1024,
  "gridX": 4,
  "gridY": 4,
  "lodLevels": 3,
  "outputDir": "../public",
  "enableOcean": true,
  "enableVegetation": true,
  "enableFireflies": true,
  "enableStarMap": true,
  "ocean": {
    "size": { "width": 10000, "height": 10000 },
    "enableRising": true,
    "initialLevel": -6,
    "targetLevel": 8,
    "riseRate": 0.01,
    "enableAnimation": true,
    "underwaterFogDensity": 0.62,
    "underwaterFogColor": 533536,
    "surfaceFogDensity": 0.003
  },
  "style": {
    "preset": "ghibli",
    "enabled": true,
    "fog": { "enabled": true, "density": 0.002, "color": "#87CEEB" }
  }
}
```

**Usage (CLI overrides):**
You can override JSON fields with flags using dot-notation:
```bash
node unified-terrain-pipeline.js path/to/config.json \
  --collisionMode=trimesh \
  --trimesh.downsample=8 \
  --trimesh.mode=single \
  --trimesh.chunkVerts=65 \
  --trimesh.activeRadius=3 \
  --enableOcean=true \
  --ocean.enableRising=true \
  --ocean.initialLevel=-6 \
  --ocean.targetLevel=8 \
  --ocean.riseRate=0.01 \
  --ocean.underwaterFogDensity=0.62 \
  --ocean.underwaterFogColor=533536 \
  --style.fog.color=#87CEEB
```

**TriMesh Physics Options:**
- `--collisionMode=trimesh|heightfield` - Physics collision type (default: trimesh)
- `--trimesh.downsample=16` - Downsample factor: 16 (~30k tris), 12 (~40k), 8 (~65k), 4 (~130k)
- `--trimesh.mode=single|chunked` - Single collider or dynamic chunks
- `--trimesh.chunkVerts=65` - Vertices per chunk (chunked mode only)
- `--trimesh.activeRadius=2` - Active chunks around player: 2 (~100k tris), 3 (~200k), 4 (~400k)
All overrides are merged into the loaded JSON and printed before the run.

### 🎮 **Level Editor** (NEW!)
**Interactive 3D preview and level management.**

- **Automatic Detection**: Finds all generated level manifests in `public/terrain/`
- **3D Preview**: Full Three.js-powered level visualization
- **Chunk Visualization**: See terrain chunks and LOD levels
- **Integrated Workflow**: Seamlessly works with Unified Pipeline output

**Usage:**
- Use **"Level Editor"** tab in web interface
- Load levels generated by Unified Pipeline
- Preview terrain chunks and heightmaps in 3D

### 🗻 Heightmap Generator
- **Input**: GLB terrain files
- **Output**: PNG heightmaps + JSON config files
- **Features**: Multiple resolution options, auto-detect world size
- **Use**: Terrain physics collision and visual effects

### 🗺️ Level Processor  
- **Input**: Large GLB terrain models
- **Output**: Optimized chunk files with LODs
- **Features**: Triangle-based chunking, quadratic decimation LODs
- **Technology**: Python + trimesh (auto-installs if needed)
- **Use**: High-performance terrain streaming

### 🎆 Cubemap Converter
- **Input**: Equirectangular skybox images (HDR, EXR, JPG, PNG)
- **Output**: 6 optimized cube face images 
- **Features**: Multiple resolutions, WebP/PNG/JPG formats
- **Technology**: Sharp image processing + custom projection math
- **Use**: Optimized skyboxes for Three.js CubeTextureLoader

## 🌟 Unified Pipeline: The Complete Solution

The **Unified Terrain Pipeline** solves the asset synchronization problem by ensuring all outputs use the same GLB source:

### 🔄 **Pipeline Steps**
1. **GLB Analysis** - Automatically determines true model dimensions and bounds
2. **Heightmap Generation** - Creates physics collision heightmaps from geometry
3. **Chunk Processing** - Generates optimized visual chunks with LOD levels
4. **Level Generation** - Creates production-ready Svelte components with all features
5. **Validation** - Ensures all outputs are synchronized and consistent

### 🎯 **Generated Level Features**
Generated Svelte components include everything from HybridObservatory.svelte:

- **🌊 Ocean System**: Underwater effects, water physics, fog transitions
- **🏔️ Terrain System**: Unified chunk-based terrain with collision
- **✨ Firefly AI**: Enhanced with conversation system integration
- **🌟 Star Navigation**: Timeline data integration and level transitions
- **🌱 Vegetation System**: Nature pack integration with LOD optimization
- **⚡ Performance Systems**: LOD management, optimization settings
- **🎨 Style Systems**: Modern feature-based architecture
- **🤖 ECS Integration**: Compatible with entity-component systems

### 📊 **Example Workflow**
1. **Upload GLB**: Place your terrain model in `public/models/levels/`
2. **Use Unified Pipeline**: 
   - GLB Path: `public/models/levels/your-terrain.glb`
   - Level Name: `My Terrain Level`
   - Level ID: `my-terrain-level`
   - Select desired features (Ocean, Vegetation, etc.)
3. **Auto-Analysis**: Tool detects dimensions automatically
4. **Generate**: Creates all files in proper locations
5. **Level Editor**: Manifests appear automatically for 3D preview

### 📁 **Output Structure** (Fixed!)
```
public/terrain/
├── my-terrain-level.manifest.json       # Level manifest (Level Editor finds here)
├── heightmaps/
│   ├── terrain_heightmap.png            # Physics heightmap
│   └── terrain_config.json              # Heightmap metadata
└── levels/
    └── my-terrain-level/                 # Terrain chunks
        ├── chunk_0_0_LOD0.glb           # Visual terrain chunks
        ├── chunk_0_1_LOD0.glb           # (All LOD levels)
        └── ...

src/threlte/levels/
└── MyTerrainLevel.svelte                # Svelte component
```

## 💡 Benefits

✅ **Complete Automation** - One command generates everything needed  
✅ **Asset Synchronization** - All outputs use identical GLB source  
✅ **Production Ready** - Generated levels match professional standards  
✅ **Feature Complete** - All modern game systems included  
✅ **Zero Installation** - No npm install, minimal dependencies  
✅ **Performance Optimized** - LOD systems and optimization built-in  
✅ **AI Enhanced** - Conversation system integration included  
✅ **Real-time Feedback** - See progress and results instantly  
✅ **Cross-Platform** - Works on Windows, Mac, Linux  

## 🔧 How It Works

1. **Unified Pipeline** - Single command processes GLB through all steps
2. **Modern Level Generator** - Creates Svelte components matching your architecture
3. **Asset Synchronization** - GLB analysis ensures consistent dimensions across all outputs
4. **Feature Integration** - Automatically includes ocean, terrain, AI, and performance systems
5. **Built-in HTTP Server** - Web interface for easy configuration and monitoring

## 📁 File Structure (Refactored!)

```
tools/
├── app.js                         # Clean, focused server (< 1000 lines!)
├── app/                           # Separated web interface
│   ├── index.html                # Main UI structure
│   ├── styles.css                # All styling
│   └── client.js                 # Client-side functionality
├── unified-terrain-pipeline.js    # Complete level generation pipeline
├── heightmap-generator/
│   └── heightmap_baker_node.mjs   # GLB analysis + heightmap generation
├── levelprocessor/
│   ├── level-generator.js         # Modern Svelte level generator
│   ├── templates/                 # Extracted Svelte templates
│   │   ├── interior.template.svelte
│   │   └── terrain.template.svelte
│   └── simplified-processor.js   # Trimesh-based chunk processor
├── cubemap-converter/
│   └── cubemap-converter.js       # Skybox conversion tool
├── start.sh / start.bat           # Startup scripts
└── README.md                      # This updated file
```

### 🏗️ **Architecture Improvements**
- **Modular Design**: HTML, CSS, JS separated for maintainability
- **Template System**: Svelte templates externalized from JavaScript strings  
- **API-First**: All file access through secure API endpoints
- **Clean Server**: app.js focused only on API + static serving
- **Better Security**: No direct file system access from client

## 🎯 Usage Tips

### **Unified Pipeline (Recommended)**
- Use the **"Unified Pipeline"** tab for complete level generation
- Start with the provided `observatory-config.json` as a template
- Enable features you need: ocean, vegetation, fireflies, star navigation
- **GLB Analysis** feature automatically detects model dimensions - no guesswork!

### **Individual Tools**
- Use individual tools only for specific tasks or debugging
- **Heightmap Generator**: For terrain physics collision
- **Level Processor**: For chunk optimization 
- **Cubemap Converter**: For skybox optimization

### **Development Workflow**
- **Keep running** while developing - no need to restart
- **Bookmark** http://localhost:3001 for quick access
- **Works offline** - no internet required
- **Safe** - only accessible from your computer
- Generated levels are immediately ready to integrate into your game

## 🆘 Troubleshooting

### ✅ **Fixed Issues** (After Refactor)
- **Pipeline exit code 1**: Fixed with proper absolute path handling
- **GLB analysis "undefined"**: Fixed with fallback mesh generation  
- **Level name "undefined"**: Fixed API response to include levelId
- **No level manifests found**: Fixed manifest location to `public/terrain/`
- **Complex path errors**: Fixed with API-based file access

### **Unified Pipeline Issues**
If pipeline still fails:
- ✅ **GLB Analysis**: Now works with fallback mesh generation
- ✅ **Path Issues**: All paths now use absolute resolution
- ✅ **Output Directories**: Automatically created in correct locations

### **Port Already in Use**
Server automatically finds available port starting from 3001.

### **Python/Trimesh Issues** 
Level processor auto-installs trimesh. Python 3.x still required for terrain chunking.

### **Level Editor "No manifests found"**
- ✅ **Fixed**: Level Editor now looks in `public/terrain/` 
- ✅ **Auto-Detection**: Generated manifests appear automatically
- Run Unified Pipeline to generate manifest files

### **Generated Level Integration**
**Now Automatic!** Files are saved to correct project directories:
1. ✅ **Manifests**: `public/terrain/{levelId}.manifest.json`
2. ✅ **Heightmaps**: `public/terrain/heightmaps/`  
3. ✅ **Terrain chunks**: `public/terrain/levels/{levelId}/`
4. ✅ **Svelte components**: `src/threlte/levels/`
5. Add to `Game.svelte` levelRegistry and test!

---

**Happy developing!** 🎮✨
