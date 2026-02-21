#!/usr/bin/env node

/**
 * Standalone Level Processor - Uses trimesh via Python
 * Processes GLB files into chunks without external dependencies
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get command line arguments
const [,, inputFile, outputDir, gridX, gridY, lodLevels, enhanceQuality] = process.argv;

if (!inputFile || !outputDir || !gridX || !gridY || !lodLevels) {
  console.error('Usage: node simplified-processor.js <inputFile> <outputDir> <gridX> <gridY> <lodLevels> [enhanceQuality]');
  process.exit(1);
}

const options = {
  inputFile,
  outputDir: path.resolve(outputDir),
  gridX: parseInt(gridX),
  gridY: parseInt(gridY),
  lodLevels: parseInt(lodLevels),
  enhanceQuality: enhanceQuality === 'true'
};

console.log(`🗺️ Starting level processing...`);
console.log(`📁 Input: ${inputFile}`);
console.log(`📂 Output: ${outputDir}`);
console.log(`🔢 Grid: ${gridX}x${gridY}, LODs: ${lodLevels}`);
console.log(`🔧 Enhanced Quality: ${options.enhanceQuality ? 'Enabled' : 'Disabled'}`);

// Create standalone Python script using trimesh
const pythonScript = `
import os
import sys
import numpy as np

try:
    import trimesh
    print("✅ Trimesh imported successfully")
except ImportError:
    print("❌ Trimesh not found. Installing...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "trimesh[easy]"])
    import trimesh
    print("✅ Trimesh installed and imported")

# Check for optional dependencies
try:
    import open3d
    print("✅ Open3D available - advanced LOD simplification enabled")
    has_open3d = True
except ImportError:
    print("ℹ️  Open3D not found - will use basic LOD generation")
    print("   To enable advanced mesh simplification: pip install open3d")
    has_open3d = False

def process_level():
    input_file = "${options.inputFile.replace(/\\/g, '\\\\')}"
    output_dir = "${options.outputDir.replace(/\\/g, '\\\\')}"
    grid_x = ${options.gridX}
    grid_y = ${options.gridY}
    lod_levels = ${options.lodLevels}
    enhance_quality = ${options.enhanceQuality ? 'True' : 'False'}

    print(f"🔥 Loading GLB: {input_file}")

    try:
        scene = trimesh.load(input_file)
        if hasattr(scene, 'geometry'):
            if len(scene.geometry) == 0:
                print("❌ No geometry found in GLB file")
                return False
            meshes = list(scene.geometry.values())
            mesh = trimesh.util.concatenate(meshes) if len(meshes) > 1 else meshes[0]
        else:
            mesh = scene
    except Exception as e:
        print(f"❌ Failed to load GLB: {e}")
        return False

    print(f"✅ Loaded mesh with {len(mesh.vertices)} vertices, {len(mesh.faces)} faces")

    bounds = mesh.bounds
    min_x, _, min_z = bounds[0]
    max_x, _, max_z = bounds[1]

    print(f"📏 Terrain bounds: X[{min_x:.2f}, {max_x:.2f}], Z[{min_z:.2f}, {max_z:.2f}]")

    width = max_x - min_x
    depth = max_z - min_z

    # --- New Robust Chunking Logic ---
    chunks = {f'{x}_{y}': [] for x in range(grid_x) for y in range(grid_y)}

    # Assign each face to a chunk based on its centroid
    for face_idx, face in enumerate(mesh.faces):
        centroid = np.mean(mesh.vertices[face], axis=0)

        # Normalize coordinates to be within the grid [0, 1]
        norm_x = (centroid[0] - min_x) / width if width > 0 else 0
        norm_z = (centroid[2] - min_z) / depth if depth > 0 else 0

        # Calculate chunk index, clamping to be safe
        chunk_x = min(grid_x - 1, int(norm_x * grid_x))
        chunk_y = min(grid_y - 1, int(norm_z * grid_y))

        chunks[f'{chunk_x}_{chunk_y}'].append(face_idx)
    # --- End of New Logic ---

    total_files = 0

    for x in range(grid_x):
        for y in range(grid_y):
            chunk_name = f"chunk_{x}_{y}"
            face_indices = chunks[f'{x}_{y}']

            if not face_indices:
                print(f"⚠️  Chunk{chunk_name} is empty, skipping...")
                continue

            print(f"🔧 Processing {chunk_name} with {len(face_indices)} faces...")

            chunk_mesh = mesh.submesh([face_indices], append=True)
            chunk_mesh.remove_degenerate_faces()
            chunk_mesh.merge_vertices()

            for lod in range(lod_levels + 1):
                try:
                    if lod == 0:
                        lod_mesh = chunk_mesh.copy()
                    else:
                        target_faces = max(10, len(chunk_mesh.faces) // (2 ** lod))
                        lod_mesh = chunk_mesh.simplify_quadric_decimation(target_faces)

                        if enhance_quality:
                            lod_mesh.unmerge_vertices()
                            _ = lod_mesh.vertex_normals

                        reduction = 100 * (1 - len(lod_mesh.faces) / len(chunk_mesh.faces)) if len(chunk_mesh.faces) > 0 else 0
                        print(f"    📉 LOD {lod}: Reduced by {reduction:.1f}% ({len(lod_mesh.faces)} faces)")

                    # --- Ensure visible colors are present ---
                    try:
                        # If no vertex colors exist, bake a neutral greenish vertex color fallback
                        vc = None
                        try:
                            vc = lod_mesh.visual.vertex_colors  # numpy array if present
                        except Exception:
                            vc = None

                        if vc is None or (hasattr(vc, 'shape') and vc.shape[0] != len(lod_mesh.vertices)):
                            import numpy as _np
                            colors = _np.ones((len(lod_mesh.vertices), 4), dtype=_np.uint8) * 255
                            # Simple height-based tint to avoid flat grey
                            if len(lod_mesh.vertices) > 0:
                                y = lod_mesh.vertices[:, 1]
                                y_min = float(y.min()) if y.size > 0 else 0.0
                                y_max = float(y.max()) if y.size > 0 else 1.0
                                span = (y_max - y_min) if (y_max - y_min) != 0 else 1.0
                                y_norm = (y - y_min) / span
                                # Map to a subdued terrain palette
                                r = (180 + 30 * y_norm).astype(_np.uint8)
                                g = (190 + 40 * y_norm).astype(_np.uint8)
                                b = (160 + 20 * y_norm).astype(_np.uint8)
                                colors[:, 0] = r
                                colors[:, 1] = g
                                colors[:, 2] = b
                            lod_mesh.visual.vertex_colors = colors
                            print(f"    🎨 Baked vertex colors for LOD {lod} (fallback)")
                    except Exception as bake_err:
                        print(f"    ⚠️  Vertex color bake failed for LOD {lod}: {bake_err}")

                    filename = f"chunk_{x}_{y}_LOD{lod}.glb"
                    output_path = os.path.join(output_dir, filename)

                    if not os.path.exists(output_dir):
                        os.makedirs(output_dir, exist_ok=True)

                    lod_mesh.export(output_path)
                    print(f"    💾 Saved: {filename}")
                    total_files += 1

                except Exception as e:
                    print(f"    ⚠️  Failed to create LOD{lod} for {chunk_name}: {e}")
                    continue

    print(f"✅ Level processing complete!")
    print(f"📊 Created {total_files} files in {output_dir}")
    return True

if __name__ == "__main__":
    success = process_level()
    sys.exit(0 if success else 1)
`;

// Write the Python script to a temporary file
const scriptPath = path.join(__dirname, 'temp_level_processor.py');
fs.writeFileSync(scriptPath, pythonScript);

// Check if Python is available
function checkPython() {
  return new Promise((resolve) => {
    const commands = ['python3', 'python'];

    function tryCommand(index) {
      if (index >= commands.length) {
        resolve(null);
        return;
      }
      const cmd = commands[index];
      const child = spawn(cmd, ['--version'], { stdio: 'pipe' });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(cmd);
        } else {
          tryCommand(index + 1);
        }
      });

      child.on('error', () => {
        tryCommand(index + 1);
      });
    }

    tryCommand(0);
  });
}

async function processLevel() {
  // Check if Python is available
  const pythonCmd = await checkPython();
  if (!pythonCmd) {
    console.error('❌ Python not found. Please install Python 3.x and ensure it\'s in your PATH.');
    console.error('   Download from: https://www.python.org/downloads/');
    process.exit(1);
  }

  console.log(`✅ Python found (${pythonCmd}), starting processing...`);

  // Ensure output directory exists
  if (!fs.existsSync(options.outputDir)) {
    fs.mkdirSync(options.outputDir, { recursive: true });
  }

  // Run Python with the script
  const pythonArgs = [scriptPath];

  console.log('🚀 Executing Python script:', pythonCmd, pythonArgs.join(' '));

  const child = spawn(pythonCmd, pythonArgs, { 
    stdio: 'inherit',
    cwd: path.dirname(options.inputFile)
  });

  child.on('close', (code) => {
    // Clean up script file
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
    }

    if (code === 0) {
      console.log('🎉 Level processing completed successfully!');
      console.log(`📁 Output files saved to: ${options.outputDir}`);
    } else {
      console.error(`❌ Python script exited with code ${code}`);
    }
    process.exit(code);
  });

  child.on('error', (error) => {
    console.error('❌ Failed to start Python:', error.message);
    // Clean up script file
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
    }
    process.exit(1);
  });
}

processLevel().catch(error => {
  console.error('❌ Processing failed:', error.message);
  process.exit(1);
});
