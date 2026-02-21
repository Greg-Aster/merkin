"""
Blender Heightmap Exporter for MEGAMEAL Terrain System

This script converts your existing Blender terrain mesh into a heightmap image
that can be used with the industry-standard HeightmapTerrainCollider.

Usage:
1. Open your terrain .blend file in Blender
2. Select your terrain mesh object
3. Run this script (Scripting tab > New > Paste > Run)
4. The heightmap will be saved to the same directory

Benefits over GLTF approach:
- No runtime mesh loading or raycasting
- Instant height sampling
- Minimal memory usage
- Standard content pipeline
"""

import bpy
import bmesh
import numpy as np
from mathutils import Vector
import os

def export_terrain_heightmap():
    """Export selected terrain mesh as heightmap image"""
    
    # Get active object
    obj = bpy.context.active_object
    if not obj or obj.type != 'MESH':
        print("❌ Please select a mesh object")
        return
    
    mesh = obj.data
    print(f"🏔️ Exporting heightmap from mesh: {obj.name}")
    
    # Get mesh bounds
    bbox = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    min_x = min(v.x for v in bbox)
    max_x = max(v.x for v in bbox)
    min_y = min(v.y for v in bbox)
    max_y = max(v.y for v in bbox)
    min_z = min(v.z for v in bbox)
    max_z = max(v.z for v in bbox)
    
    world_size_x = max_x - min_x
    world_size_y = max_y - min_y
    height_range = max_z - min_z
    
    print(f"📏 Terrain bounds: X({min_x:.1f} to {max_x:.1f}), Y({min_y:.1f} to {max_y:.1f}), Z({min_z:.1f} to {max_z:.1f})")
    print(f"📐 World size: {world_size_x:.1f} x {world_size_y:.1f}, Height range: {height_range:.1f}")
    
    # Choose heightmap resolution based on terrain size
    # Rule of thumb: 1 pixel per world unit, clamped to reasonable range
    resolution_x = max(256, min(2048, int(world_size_x)))
    resolution_y = max(256, min(2048, int(world_size_y)))
    
    # Make it square for simplicity (most game engines prefer square heightmaps)
    resolution = max(resolution_x, resolution_y)
    # Round to nearest power of 2 + 1 (optimal for physics engines)
    resolution = 2 ** int(np.log2(resolution)) + 1
    
    print(f"🖼️ Generating {resolution}x{resolution} heightmap...")
    
    # Create bmesh for ray casting
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.transform(obj.matrix_world)  # Apply world transform
    
    # Ensure face indices are valid
    bm.faces.ensure_lookup_table()
    
    # Create BVH tree for fast ray casting
    import bmesh.utils
    from mathutils.bvhtree import BVHTree
    
    bvh = BVHTree.FromBMesh(bm)
    
    # Generate heightmap data
    heightmap = np.zeros((resolution, resolution), dtype=np.float32)
    
    for y in range(resolution):
        for x in range(resolution):
            # Convert pixel coordinates to world coordinates
            u = x / (resolution - 1)  # 0 to 1
            v = y / (resolution - 1)  # 0 to 1
            
            world_x = min_x + u * world_size_x
            world_y = min_y + v * world_size_y
            
            # Cast ray downward from high above
            ray_origin = Vector((world_x, world_y, max_z + 100))
            ray_direction = Vector((0, 0, -1))
            
            # Find intersection with mesh
            location, normal, index, distance = bvh.ray_cast(ray_origin, ray_direction)
            
            if location:
                # Normalize height to 0-1 range
                normalized_height = (location.z - min_z) / height_range if height_range > 0 else 0
                heightmap[y, x] = normalized_height
            else:
                # No intersection - use minimum height
                heightmap[y, x] = 0
    
    bm.free()
    
    # Convert to 16-bit for better precision
    heightmap_16bit = (heightmap * 65535).astype(np.uint16)
    
    # Create Blender image
    image_name = f"{obj.name}_heightmap"
    
    # Remove existing image if it exists
    if image_name in bpy.data.images:
        bpy.data.images.remove(bpy.data.images[image_name])
    
    # Create new image
    img = bpy.data.images.new(image_name, width=resolution, height=resolution, alpha=False)
    
    # Convert heightmap to image pixels (flip Y axis for correct orientation)
    pixels = np.zeros((resolution, resolution, 4), dtype=np.float32)
    for y in range(resolution):
        for x in range(resolution):
            height_value = heightmap[resolution - 1 - y, x]  # Flip Y
            pixels[y, x] = [height_value, height_value, height_value, 1.0]  # Grayscale
    
    # Flatten and assign to image
    img.pixels = pixels.flatten()
    img.update()
    
    # Save image to file
    blend_filepath = bpy.data.filepath
    if blend_filepath:
        directory = os.path.dirname(blend_filepath)
        heightmap_path = os.path.join(directory, f"{obj.name}_heightmap.png")
    else:
        heightmap_path = f"/tmp/{obj.name}_heightmap.png"
    
    # Set image file format and save
    img.file_format = 'PNG'
    img.save_render(heightmap_path)
    
    print(f"✅ Heightmap saved: {heightmap_path}")
    print(f"📊 Stats: {resolution}x{resolution}, {height_range:.1f}m height range")
    print(f"🎮 Use in MEGAMEAL with:")
    print(f"   heightmapUrl: '{os.path.basename(heightmap_path)}'")
    print(f"   worldSize: {max(world_size_x, world_size_y):.0f}")
    print(f"   heightScale: {height_range:.1f}")
    print(f"   heightOffset: {min_z:.1f}")
    
    # Generate configuration file
    config_path = heightmap_path.replace('.png', '_config.json')
    import json
    
    config = {
        "heightmapUrl": f"/terrain/heightmaps/{os.path.basename(heightmap_path)}",
        "worldSize": max(world_size_x, world_size_y),
        "heightScale": height_range,
        "heightOffset": min_z,
        "originalMesh": obj.name,
        "resolution": f"{resolution}x{resolution}",
        "bounds": {
            "min": [min_x, min_y, min_z],
            "max": [max_x, max_y, max_z]
        }
    }
    
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"⚙️ Config saved: {config_path}")
    
    return heightmap_path, config

def export_all_terrain_objects():
    """Export heightmaps for all objects with 'terrain' in their name"""
    terrain_objects = [obj for obj in bpy.context.scene.objects 
                      if obj.type == 'MESH' and 'terrain' in obj.name.lower()]
    
    if not terrain_objects:
        print("❌ No terrain objects found (objects with 'terrain' in name)")
        return
    
    print(f"🏔️ Found {len(terrain_objects)} terrain objects:")
    for obj in terrain_objects:
        print(f"  - {obj.name}")
    
    for obj in terrain_objects:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        export_terrain_heightmap()
        obj.select_set(False)

# Main execution
if __name__ == "__main__":
    print("=" * 60)
    print("🗺️ MEGAMEAL Heightmap Exporter")
    print("=" * 60)
    
    # Check if we have a selected object
    if bpy.context.active_object and bpy.context.active_object.type == 'MESH':
        export_terrain_heightmap()
    else:
        # Try to find terrain objects automatically
        export_all_terrain_objects()
    
    print("=" * 60)
    print("✅ Heightmap export complete!")
    print("")
    print("🚀 Next steps:")
    print("1. Replace TerrainCollider with HeightmapTerrainCollider")
    print("2. Use the config values shown above")
    print("3. Enjoy instant height sampling! 🎮")