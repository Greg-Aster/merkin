/**
 * Node.js-Compatible Heightmap Baker for MEGAMEAL Terrain System
 * 
 * This version works around Three.js browser dependencies in Node.js
 * 
 * Usage:
 * node heightmap_baker_node.mjs path/to/terrain.glb
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';

// ES modules dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock browser globals for Three.js
global.self = global;
global.window = global;
global.document = {
  createElement: () => ({}),
  createElementNS: () => ({})
};
global.Image = class Image {
  constructor() {
    this.onload = null;
    this.onerror = null;
  }
};

class HeightmapBaker {
  constructor(THREE, Canvas, GLTFLoader = null) {
    this.THREE = THREE;
    this.Canvas = Canvas;
    this.GLTFLoader = GLTFLoader;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.firstHitOnly = true; // BVH optimization
    this.rayDirection = new THREE.Vector3(0, -1, 0);
  }

  async bakeHeightmap(glbPath, options = {}) {
    console.log('🔥 MEGAMEAL Heightmap Baker (Node.js)');
    console.log('='.repeat(50));
    console.log(`📁 Input GLB: ${glbPath}`);

    // Default options
    const config = {
      resolution: options.resolution || 512,
      worldSize: options.worldSize || 500,
      outputDir: options.outputDir || path.dirname(glbPath),
      ...options
    };

    console.log(`🎯 Resolution: ${config.resolution}x${config.resolution}`);
    console.log(`📏 World size: ${config.worldSize}`);

    // Load GLB file
    const meshes = await this.loadGLBSimple(glbPath);
    console.log(`✅ Loaded ${meshes.length} meshes from GLB`);

    // Analyze terrain bounds
    const bounds = this.analyzeBounds(meshes);
    console.log(`📊 Terrain bounds:`, bounds);

    // If analyze-only mode, just output the bounds and return
    if (options.analyzeOnly) {
      console.log('='.repeat(50));
      console.log('✅ GLB Analysis complete!');
      console.log(`worldSize: ${bounds.worldSize}`);
      console.log(`minHeight: ${bounds.minHeight.toFixed(2)}`);
      console.log(`maxHeight: ${bounds.maxHeight.toFixed(2)}`);
      return { bounds, config };
    }

    // Generate heightmap
    const heightmapData = await this.generateHeightmap(meshes, config, bounds);
    
    // Save files
    const outputPath = await this.saveHeightmap(heightmapData, config, bounds, glbPath);
    
    console.log('='.repeat(50));
    console.log('✅ Heightmap baking complete!');
    console.log(`📁 Output: ${outputPath}`);
    console.log('');
    console.log('🚀 Usage in MEGAMEAL:');
    console.log(`   heightmapUrl: '/terrain/heightmaps/${path.basename(outputPath)}'`);
    console.log(`   worldSize: ${bounds.worldSize}`);
    console.log(`   minHeight: ${bounds.minHeight.toFixed(2)}`);
    console.log(`   maxHeight: ${bounds.maxHeight.toFixed(2)}`);

    return { outputPath, config: { ...config, bounds } };
  }

  async loadGLBSimple(glbPath) {
    console.log('🔄 Loading GLB file...');
    
    // Read GLB file
    const glbData = fs.readFileSync(glbPath);
    
    // Simple GLB parser - we only need vertex positions
    const meshes = await this.parseGLBForVertices(glbData);
    
    return meshes;
  }

  async parseGLBForVertices(glbBuffer) {
    console.log('🔄 Parsing GLB geometry using Three.js GLTFLoader...');
    
    // Check if GLTFLoader is available
    if (!this.GLTFLoader) {
      throw new Error('GLTFLoader is not available. Cannot parse GLB file.');
    }
    
    const loader = new this.GLTFLoader();
    
    // Convert buffer to ArrayBuffer if needed
    const arrayBuffer = glbBuffer.buffer.slice(glbBuffer.byteOffset, glbBuffer.byteOffset + glbBuffer.byteLength);
    
    return new Promise((resolve, reject) => {
      loader.parse(arrayBuffer, '', (gltf) => {
        console.log('✅ GLB parsed successfully');
        
        const meshes = [];
        
        // Extract all meshes from the scene
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            // IMPORTANT: We need to apply the world matrix to get correct vertex positions
            child.updateMatrixWorld(true);
            const worldMesh = child.clone();
            worldMesh.geometry = child.geometry.clone().applyMatrix4(child.matrixWorld);
            meshes.push(worldMesh);
          }
        });
        
        if (meshes.length === 0) {
          reject(new Error('No meshes found in GLB file.'));
        } else {
          console.log(`📦 Extracted and transformed ${meshes.length} meshes from GLB`);
          resolve(meshes);
        }
      }, (error) => {
        console.error('❌ GLB parsing failed:', error);
        reject(new Error('Failed to parse GLB file.'));
      });
    });
  }

  analyzeBounds(meshes) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    meshes.forEach(mesh => {
      const positions = mesh.geometry.attributes.position.array;

      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      }
    });

    return {
      minX, maxX, minY, maxY, minZ, maxZ,
      worldSizeX: maxX - minX,
      worldSizeZ: maxZ - minZ,
      worldSize: Math.max(maxX - minX, maxZ - minZ),
      minHeight: minY,
      maxHeight: maxY,
      heightRange: maxY - minY
    };
  }

  async generateHeightmap(meshes, config, bounds) {
    console.log(`🗺️ Generating ${config.resolution}x${config.resolution} heightmap using ray casting...`);

    const { resolution } = config;
    const { minHeight, maxHeight, heightRange } = bounds;
    
    const heightData = new Float32Array(resolution * resolution);

    let processedSamples = 0;
    let successfulRays = 0;
    const totalSamples = resolution * resolution;

    // Create ray caster for height sampling
    const raycaster = new this.THREE.Raycaster();
    const rayDirection = new this.THREE.Vector3(0, -1, 0);

    // Create a scene and add the loaded meshes to it with BVH acceleration
    const scene = new this.THREE.Scene();
    meshes.forEach((mesh, index) => {
      if (mesh instanceof this.THREE.Object3D) {
        // Generate BVH for geometry acceleration
        if (mesh.geometry) {
          console.log(`🔧 Generating BVH for mesh ${index}...`);
          mesh.geometry.boundsTree = new MeshBVH(mesh.geometry);
          console.log(`✅ BVH generated for mesh ${index} (${mesh.geometry.attributes.position.count} vertices)`);
        }
        scene.add(mesh);
      } else {
        console.warn(`⚠️ Mesh ${index} is not a Three.js Object3D:`, mesh);
        console.warn(`   Type: ${typeof mesh}, Constructor: ${mesh.constructor?.name}`);
      }
    });

    // CRITICAL STEP: Manually update the world matrix for all objects
    // This is required in Node.js where there is no render loop.
    scene.updateMatrixWorld(true);

    const threeObjects = scene.children;
    console.log(`🎯 Setup ${threeObjects.length} meshes for raycasting after matrix update`);
    
    // Debug: Show mesh details
    threeObjects.forEach((obj, index) => {
      const bbox = new this.THREE.Box3().setFromObject(obj);
      console.log(`  Mesh ${index}: ${obj.geometry?.attributes?.position?.count || 0} vertices, bounds:`, 
        `X[${bbox.min.x.toFixed(2)}, ${bbox.max.x.toFixed(2)}]`,
        `Y[${bbox.min.y.toFixed(2)}, ${bbox.max.y.toFixed(2)}]`,
        `Z[${bbox.min.z.toFixed(2)}, ${bbox.max.z.toFixed(2)}]`);
    });

    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        // Convert grid to world coordinates
        const u = x / (resolution - 1);
        const v = z / (resolution - 1);
        
        const worldX = bounds.minX + u * bounds.worldSizeX;
        const worldZ = bounds.minZ + v * bounds.worldSizeZ;

        let height = minHeight; // Default to minimum height

        if (threeObjects.length > 0) {
          // Cast ray from high above downward
          const rayOrigin = new this.THREE.Vector3(worldX, maxHeight + 100, worldZ);
          raycaster.set(rayOrigin, rayDirection);
          
          // Find intersections with all meshes
          const intersections = raycaster.intersectObjects(threeObjects, true);
          
          if (intersections.length > 0) {
            // Use the highest intersection point (closest to ray origin)
            height = intersections[0].point.y;
            successfulRays++;
          }
        }
        
        // Normalize height to 0-1 range
        const normalizedHeight = heightRange > 0 ? (height - minHeight) / heightRange : 0;
        heightData[z * resolution + x] = Math.max(0, Math.min(1, normalizedHeight));

        processedSamples++;
        
        // Progress logging
        if (processedSamples % 25000 === 0) {
          const progress = (processedSamples / totalSamples * 100).toFixed(1);
          const currentSuccessRate = (successfulRays / processedSamples * 100).toFixed(1);
          console.log(`📊 Progress: ${progress}% (${processedSamples}/${totalSamples} samples, ${currentSuccessRate}% success rate)`);
        }
      }
    }

    const successRate = (successfulRays / totalSamples * 100).toFixed(1);
    console.log(`✅ Heightmap data generated: ${heightData.length} samples using ray casting`);
    console.log(`📊 Raycasting success rate: ${successRate}% (${successfulRays}/${totalSamples} hits)`);
    
    if (successfulRays === 0) {
      console.log(`⚠️ WARNING: No successful raycasts! This indicates a serious issue.`);
      console.log(`   - Check that the GLB file contains valid geometry`);
      console.log(`   - Verify the mesh bounds and coordinate system`);
      console.log(`   - Ensure Three.js objects were created correctly`);
    } else if (successRate < 10) {
      console.log(`⚠️ WARNING: Very low raycast success rate (${successRate}%)`);
      console.log(`   - This will result in a mostly black heightmap`);
      console.log(`   - Check mesh positioning and bounds calculation`);
    }
    
    return heightData;
  }

  async saveHeightmap(heightData, config, bounds, inputPath) {
    const { resolution } = config;
    const baseName = path.basename(inputPath, '.glb');
    const outputDir = config.outputDir;
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create canvas for image generation
    const canvas = this.Canvas.createCanvas(resolution, resolution);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(resolution, resolution);

    // Convert heightmap to image data (with optional 180-degree flip)
    const FLIP_HEIGHTMAP = false; // Set to true to enable flipping
    
    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        const srcIndex = z * resolution + x;
        
        // Choose destination based on flip setting
        let dstZ = z, dstX = x;
        if (FLIP_HEIGHTMAP) {
          dstZ = resolution - 1 - z;
          dstX = resolution - 1 - x;
        }
        
        const dstIndex = dstZ * resolution + dstX;
        const pixelIndex = dstIndex * 4;
        const heightValue = Math.floor(heightData[srcIndex] * 255);
        
        imageData.data[pixelIndex] = heightValue;     // R
        imageData.data[pixelIndex + 1] = heightValue; // G
        imageData.data[pixelIndex + 2] = heightValue; // B
        imageData.data[pixelIndex + 3] = 255;         // A
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Save PNG file
    const pngPath = path.join(outputDir, `${baseName}_heightmap.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(pngPath, buffer);

    // Save configuration JSON
    const configPath = path.join(outputDir, `${baseName}_config.json`);
    const configData = {
      heightmapUrl: `/terrain/heightmaps/${baseName}_heightmap.png`,
      worldSize: bounds.worldSize,
      heightScale: bounds.heightRange,
      heightOffset: bounds.minHeight,
      bounds: {
        min: [bounds.minX, bounds.minY, bounds.minZ],
        max: [bounds.maxX, bounds.maxY, bounds.maxZ]
      },
      resolution: `${resolution}x${resolution}`,
      originalGLB: path.basename(inputPath),
      generatedAt: new Date().toISOString()
    };

    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

    console.log(`💾 Saved heightmap: ${pngPath}`);
    console.log(`⚙️ Saved config: ${configPath}`);

    return pngPath;
  }
}

// Main execution function
async function main() {
  // Dynamic imports with browser mocks
  let THREE, Canvas, GLTFLoader = null;
  
  // Try to resolve from parent directory first (tools/node_modules)
  const moduleResolutionPaths = [
    'three',
    '../node_modules/three/build/three.module.js',
    path.resolve(__dirname, '../node_modules/three/build/three.module.js')
  ];
  
  let threeLoaded = false;
  for (const modulePath of moduleResolutionPaths) {
    try {
      THREE = await import(modulePath);
      threeLoaded = true;
      console.log(`✅ Loaded three.js from: ${modulePath}`);
      
      // Apply BVH acceleration patches
      THREE.Mesh.prototype.raycast = acceleratedRaycast;
      console.log(`✅ Applied BVH acceleration patches to three.js`);
      break;
    } catch (e) {
      console.log(`⚠️ Failed to load from ${modulePath}: ${e.message}`);
      continue;
    }
  }
  
  if (!threeLoaded) {
    console.error('❌ three.js not found. Install with: pnpm install three');
    process.exit(1);
  }
  
  // Import GLTFLoader using Node.js import.meta.resolve for reliable path resolution
  try {
    // Use import.meta.resolve to find the three.js module location
    let gltfLoaderPath;
    try {
      // First, try to resolve the three module to get its actual location
      const threeModulePath = import.meta.resolve('three');
      console.log(`🔍 Three.js resolved to: ${threeModulePath}`);
      
      // Build the GLTFLoader path relative to the three module root (not build dir)
      const threeModuleFile = threeModulePath.replace('file://', '');
      console.log(`🔍 Three.js module file: ${threeModuleFile}`);
      
      // Navigate up from three.module.js to the three package root
      const buildDir = path.dirname(threeModuleFile); // /path/to/three/build
      const threePackageRoot = path.dirname(buildDir); // /path/to/three
      console.log(`🔍 Three.js package root: ${threePackageRoot}`);
      
      gltfLoaderPath = path.join(threePackageRoot, 'examples', 'jsm', 'loaders', 'GLTFLoader.js');
      console.log(`🔍 Calculated GLTFLoader path: ${gltfLoaderPath}`);
      
      // Check if file exists before importing
      if (fs.existsSync(gltfLoaderPath)) {
        // Convert back to file:// URL for import
        gltfLoaderPath = 'file://' + gltfLoaderPath;
        console.log(`🔍 Trying GLTFLoader at: ${gltfLoaderPath}`);
      } else {
        console.warn(`⚠️ GLTFLoader file not found at: ${gltfLoaderPath}`);
        throw new Error('GLTFLoader file not found');
      }
      
    } catch (resolveError) {
      console.warn('⚠️ Could not resolve three module, falling back to direct import');
      gltfLoaderPath = 'three/examples/jsm/loaders/GLTFLoader.js';
    }
    
    try {
      const loaderModule = await import(gltfLoaderPath);
      GLTFLoader = loaderModule.GLTFLoader;
      console.log(`✅ Loaded GLTFLoader from: ${gltfLoaderPath}`);
    } catch (importError) {
      console.warn('⚠️ GLTFLoader import failed:', importError.message);
      console.warn('⚠️ GLTFLoader not found, will use fallback mesh generation');
    }
  } catch (e) {
    console.warn('⚠️ GLTFLoader loading failed:', e.message);
    console.warn('⚠️ Will use fallback mesh generation');
  }

  try {
    Canvas = await import('canvas');
    console.log('✅ Canvas module loaded successfully');
  } catch (e) {
    console.error('❌ canvas not found. Install with: pnpm install canvas');
    process.exit(1);
  }

  // CLI usage
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node heightmap_baker_node.mjs <path-to-glb> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --resolution=512    Heightmap resolution (default: 512)');
    console.log('  --worldSize=500     World size override (default: auto-detect)');
    console.log('  --output=./         Output directory (default: same as input)');
    console.log('  --analyze-only      Only analyze GLB bounds, do not generate heightmap');
    console.log('');
    console.log('Example:');
    console.log('  node heightmap_baker_node.mjs terrain.glb --resolution=1024');
    process.exit(1);
  }

  const glbPath = args[0];
  const options = {};

  // Parse command line options
  args.slice(1).forEach(arg => {
    if (arg.startsWith('--resolution=')) {
      options.resolution = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--worldSize=')) {
      options.worldSize = parseFloat(arg.split('=')[1]);
    } else if (arg.startsWith('--output=')) {
      options.outputDir = arg.split('=')[1];
    } else if (arg === '--analyze-only') {
      options.analyzeOnly = true;
    }
  });

  const baker = new HeightmapBaker(THREE, Canvas, GLTFLoader);
  try {
    await baker.bakeHeightmap(glbPath, options);
    console.log('🎉 Baking complete!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('2. Update your level component with the config values shown above');
    console.log('3. Enjoy instant terrain loading! 🚀');
    process.exit(0);
  } catch (error) {
    console.error('❌ Baking failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default HeightmapBaker;