# 🎨 Blender to MEGAMEAL Workflow

Complete guide for creating and using 3D models from Blender in your game.

## 🚀 **Supported File Formats**

### **1. GLTF/GLB (Recommended)**
- **Best for**: Production, web performance, animations
- **Pros**: Single file, fast loading, supports PBR materials
- **Export**: File → Export → glTF 2.0 (.glb/.gltf)

### **2. OBJ + MTL**
- **Best for**: Simple geometry, legacy workflows
- **Pros**: Widely supported, human-readable
- **Export**: File → Export → Wavefront (.obj)

### **3. FBX** *(Coming Soon)*
- **Best for**: Complex animations, Autodesk workflows
- **Export**: File → Export → FBX (.fbx)

## 📁 **File Organization**

```
/public/assets/game/shared/models/
├── trees/
│   ├── pine_01.glb           # GLTF format (recommended)
│   ├── oak_01.obj + .mtl     # OBJ format
│   └── dead_tree.glb
├── rocks/
│   ├── boulder_01.glb
│   └── cliff_face.glb
├── vegetation/
│   ├── fern_cluster.glb
│   └── grass_patch.glb
└── library.json              # Model registry
```

## 🔧 **Blender Export Settings**

### **For GLTF/GLB (Recommended)**

```python
# In Blender Export Dialog:
Format: glTF Binary (.glb)           # Single file
Include:
  ✅ Selected Objects Only
  ✅ Visible Objects  
  ✅ Renderable Objects
  ✅ Active Collection
  
Transform:
  ✅ +Y Up (Important for Three.js)
  
Geometry:
  ✅ Apply Modifiers
  ✅ UVs
  ✅ Normals
  ✅ Tangents (for normal maps)
  ✅ Vertex Colors
  
Materials:
  ✅ Export Materials
  ✅ Export Images
  
Compression:
  ✅ Draco Geometry Compression (optional)
```

### **For OBJ Export**

```python
# In Blender Export Dialog:
Include:
  ✅ Selected Objects
  ✅ Write Materials (.mtl file)
  ✅ Write Textures
  ✅ Triangulate Faces
  
Transform:
  ✅ Forward: -Z Forward
  ✅ Up: Y Up
  ✅ Apply Modifiers
```

## 🎯 **Step-by-Step Workflow**

### **1. Prepare Your Model in Blender**

```python
# Best practices:
✅ Apply all modifiers (Ctrl+A → All Transforms)
✅ Check topology (quads preferred, avoid n-gons)
✅ Proper UV unwrapping
✅ Assign materials with proper names
✅ Set origin point correctly (usually bottom center)
✅ Scale appropriately (1 Blender unit = 1 meter in game)
```

### **2. Export from Blender**

```bash
# GLB Export (Recommended):
File → Export → glTF 2.0 (.glb)
# Choose destination: /public/assets/game/shared/models/[category]/

# OBJ Export (Alternative):
File → Export → Wavefront (.obj)
# Exports both .obj and .mtl files
```

### **3. Update Model Library**

Edit `/public/assets/game/shared/models/library.json`:

```json
{
  "models": {
    "trees": {
      "my_pine_tree": {
        "file": "/assets/game/shared/models/trees/my_pine_tree.glb",
        "format": "glb",
        "scale": 1.0,
        "materials": ["pine_bark", "pine_needles"],
        "tags": ["evergreen", "forest"],
        "description": "Custom pine tree from Blender"
      },
      "my_oak_obj": {
        "file": "/assets/game/shared/models/trees/my_oak.obj",
        "format": "obj",
        "mtl": "/assets/game/shared/models/trees/my_oak.mtl",
        "scale": 1.2,
        "materials": ["oak_bark", "oak_leaves"],
        "tags": ["deciduous", "large"],
        "description": "Oak tree in OBJ format"
      }
    }
  }
}
```

### **4. Enable Model Library in Game**

Uncomment this line in `StarObservatory.ts`:

```typescript
// Initialize forest factory with model library
await this.forestFactory.initialize();
```

### **5. Test in Game**

```bash
# Start dev server
pnpm run dev

# Your models will automatically load and replace procedural generation!
```

## 🎨 **Material Workflow**

### **For PBR Materials**

1. **Create materials in Blender** with Principled BSDF
2. **Connect texture maps**:
   - Base Color → Diffuse texture
   - Normal → Normal map
   - Roughness → Roughness map
   - Metallic → Metalness map

3. **Export will include materials** automatically

### **Using Game's PBR Textures**

You can also use the loaded pine forest textures:

```typescript
// In your model, reference existing texture sets:
"materials": ["pine_bark", "forest_ground", "rock_moss_01"]
```

## 🚀 **Advanced Techniques**

### **1. LOD (Level of Detail)**

Create multiple versions for performance:

```json
{
  "tree_pine_lod0": { "file": "pine_high.glb", "description": "High detail" },
  "tree_pine_lod1": { "file": "pine_med.glb", "description": "Medium detail" },
  "tree_pine_lod2": { "file": "pine_low.glb", "description": "Low detail" }
}
```

### **2. Animations**

GLTF supports animations:

```python
# In Blender:
✅ Create armatures and animations
✅ Export with "Export Animations" enabled
✅ Access animations in game via model.animations
```

### **3. Batch Export Script**

Automate exports with Blender Python:

```python
import bpy
import os

# Select objects by collection
collection = bpy.data.collections["Trees"]
for obj in collection.objects:
    # Export each object individually
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    filepath = f"/path/to/models/trees/{obj.name}.glb"
    bpy.ops.export_scene.gltf(filepath=filepath, use_selection=True)
```

## 📊 **Performance Guidelines**

### **Polygon Counts**
- **Hero models**: 5,000-15,000 triangles
- **Background models**: 1,000-5,000 triangles  
- **Distant/LOD models**: 500-1,000 triangles

### **Texture Sizes**
- **Main textures**: 1024x1024 or 512x512
- **Detail textures**: 256x256 or 128x128
- **Format**: PNG for transparency, JPG for opaque

### **Optimization Tips**
```python
✅ Use Draco compression for GLB
✅ Combine similar materials
✅ Optimize UV layouts
✅ Remove unused vertices
✅ Use power-of-2 texture sizes
```

## 🎮 **Using Models in Code**

### **Get Specific Model**

```typescript
const tree = modelLibrary.getModel('trees', 'my_pine_tree', {
  position: new THREE.Vector3(10, 0, 5),
  rotation: new THREE.Euler(0, Math.PI / 4, 0),
  scale: 1.2
});
scene.add(tree);
```

### **Random Forest Scatter**

```typescript
const forest = modelLibrary.createForestScatter(
  new THREE.Vector3(0, 0, 0), // center
  100,                        // radius  
  25                          // density
);
scene.add(forest);
```

## 🔄 **Current Status**

- **✅ System Ready**: ModelLibrary supports GLB and OBJ
- **✅ Auto-loading**: Models load automatically from manifest
- **✅ Fallback**: Procedural generation when models unavailable
- **⚠️ Models**: Currently using procedural (add your models!)

## 🎯 **Next Steps**

1. **Create your first model** in Blender
2. **Export as GLB** to the models folder
3. **Update library.json** with your model info
4. **Enable model library** in StarObservatory.ts
5. **See your model in game!**

The system seamlessly handles both procedural and model-based content, giving you the best of both worlds! 🚀