#!/usr/bin/env node

/**
 * Unified Terrain Pipeline - Complete Level Generation System
 * * Combines heightmap generation, level processing, and level generation
 * into a single, synchronized workflow that ensures all outputs use
 * the same source GLB file for consistency.
 * 
 * DIMENSIONAL CONSISTENCY FEATURES:
 * * Loads bounds data from heightmap generation config files
 * * Passes exact heightOffset/heightScale to prevent vertical mismatches
 * * Injects bounds data into level manifests for runtime coordinate system unification
 * * Ensures rectangular terrain dimensions are preserved through the pipeline
 * 
 * * Usage: node unified-terrain-pipeline.js <config.json>
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class UnifiedTerrainPipeline {
  constructor() {
    this.config = null;
    this.results = {
      heightmap: null,
      heightmapConfig: null,
      chunks: null,
      level: null
    };
  }

  async run(configPath) {
    console.log('🚀 MEGAMEAL Unified Terrain Pipeline');
    console.log('='.repeat(60));

    // Load configuration
    await this.loadConfig(configPath);
    
    // Validate inputs
    await this.validateInputs();

    // Defensive type-check
    await this.performDefensiveTypeCheck();

    // Step 1: Generate heightmap from GLB
    console.log('\n📍 Step 1: Generating heightmap from GLB geometry...');
    await this.generateHeightmap();

    // Step 2: Process GLB into chunks
    console.log('\n📍 Step 2: Processing GLB into optimized chunks...');
    await this.processChunks();

    // Step 3: Generate level manifest and component
    console.log('\n📍 Step 3: Generating level manifest and component...');
    await this.generateLevel();

    // Step 4: Validate synchronization
    console.log('\n📍 Step 4: Validating output synchronization...');
    await this.validateOutputs();

    this.printSummary();
  }

  async loadConfig(configPath) {
    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      this.config = JSON.parse(configData);
      console.log(`✅ Configuration loaded from ${configPath}`);
      
      // Validate required fields
      const required = ['name', 'id', 'type', 'glbPath'];
      for (const field of required) {
        if (!this.config[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Set defaults
      this.config.resolution = this.config.resolution || 1024;
      this.config.gridX = this.config.gridX || 4;
      this.config.gridY = this.config.gridY || 4;
      this.config.lodLevels = this.config.lodLevels || 3;
      this.config.outputDir = this.config.outputDir || '../public';
      // Feature toggles defaults
      this.config.enableOcean = this.config.enableOcean ?? false;
      this.config.enableVegetation = this.config.enableVegetation ?? false;
      this.config.enableFireflies = this.config.enableFireflies ?? false;
      this.config.enableStarMap = this.config.enableStarMap ?? false;
      // Optional feature configs
      this.config.ocean = this.config.ocean || {};
      this.config.style = this.config.style || {};
      
    } catch (error) {
      console.error('❌ Failed to load configuration:', error.message);
      process.exit(1);
    }
  }

  async validateInputs() {
    const { glbPath } = this.config;
    
    // Check if GLB file exists
    if (!fs.existsSync(glbPath)) {
      console.error(`❌ GLB file not found: ${glbPath}`);
      process.exit(1);
    }

    console.log(`✅ Input GLB validated: ${glbPath}`);
  }

  async analyzeGLB() {
    console.log('🔬 Analyzing GLB for validation...');
    const { glbPath } = this.config;
    const bakerPath = path.join(__dirname, 'heightmap-generator', 'heightmap_baker_node.mjs');
    const args = [bakerPath, glbPath, '--analyze-only'];

    return new Promise((resolve) => {
      const child = spawn('node', args, { stdio: 'pipe' });
      let stdout = '';
      child.stdout.on('data', (data) => stdout += data.toString());
      child.on('close', (code) => {
        if (code === 0) {
          const worldSizeMatch = stdout.match(/worldSize:\s+([0-9.]+)/);
          const worldSize = worldSizeMatch ? parseFloat(worldSizeMatch[1]) : null;
          resolve(worldSize);
        } else {
          resolve(null);
        }
      });
    });
  }

  async performDefensiveTypeCheck() {
    const detectedWorldSize = await this.analyzeGLB();
    if (detectedWorldSize === null) {
      console.warn('⚠️ Could not determine GLB world size. Skipping defensive type check.');
      return;
    }

    const { type } = this.config;
    const isSmall = detectedWorldSize < 100;

    if (type === 'terrain' && isSmall) {
      console.warn('\n' + '='.repeat(60));
      console.warn('⚠️ DEFENSIVE TYPE-CHECK WARNING ⚠️');
      console.warn(`  Level type is 'terrain' but model size is very small (${detectedWorldSize.toFixed(1)} units).`);
      console.warn('  This will likely cause errors, as terrains expect large models.');
      console.warn('  Consider changing the level type to "interior" in your config file.');
      console.warn('='.repeat(60) + '\n');
    } else if (type === 'interior' && !isSmall) {
      console.warn('\n' + '='.repeat(60));
      console.warn('⚠️ DEFENSIVE TYPE-CHECK WARNING ⚠️');
      console.warn(`  Level type is 'interior' but model size is large (${detectedWorldSize.toFixed(1)} units).`);
      console.warn('  This may work, but "terrain" or "hybrid" might be more appropriate.');
      console.warn('='.repeat(60) + '\n');
    } else {
      console.log('✅ Defensive type-check passed.');
    }
  }

  async generateHeightmap() {
    const { glbPath, resolution, outputDir, id } = this.config;
    
    const heightmapDir = path.join(outputDir, 'terrain', 'heightmaps');
    const heightmapToolPath = path.join(__dirname, 'heightmap-generator', 'heightmap_baker_node.mjs');
    
    // Create output directory
    if (!fs.existsSync(heightmapDir)) {
      fs.mkdirSync(heightmapDir, { recursive: true });
    }

    const args = [
      heightmapToolPath,
      glbPath,
      `--resolution=${resolution}`,
      `--output=${heightmapDir}`
    ];

    const success = await this.runCommand('node', args, 'Heightmap Generation');
    
    if (success) {
      // Store results
      const heightmapImagePath = path.join(heightmapDir, `${path.basename(glbPath, '.glb')}_heightmap.png`);
      const heightmapConfigPath = path.join(heightmapDir, `${path.basename(glbPath, '.glb')}_config.json`);
      
      this.results.heightmap = {
        imagePath: heightmapImagePath,
        configPath: heightmapConfigPath
      };
      
      // Read and parse the heightmap config file
      try {
        const configData = fs.readFileSync(heightmapConfigPath, 'utf8');
        this.results.heightmapConfig = JSON.parse(configData);
        
        // Calculate dimensional information for logging
        const bounds = this.results.heightmapConfig.bounds;
        const worldSizeX = bounds ? bounds.max[0] - bounds.min[0] : this.results.heightmapConfig.worldSize;
        const worldSizeZ = bounds ? bounds.max[2] - bounds.min[2] : this.results.heightmapConfig.worldSize;
        const aspectRatio = worldSizeX / worldSizeZ;
        const isRectangular = Math.abs(aspectRatio - 1.0) > 0.05;
        
        console.log(`✅ Heightmap config loaded with dimensional consistency data:`);
        console.log(`   📐 Dimensions: ${worldSizeX.toFixed(1)} x ${worldSizeZ.toFixed(1)} ${isRectangular ? '(rectangular)' : '(square)'}`);
        console.log(`   📏 Aspect ratio: ${aspectRatio.toFixed(3)}`);
        console.log(`   📊 Height range: ${this.results.heightmapConfig.heightOffset.toFixed(2)} to ${(this.results.heightmapConfig.heightOffset + this.results.heightmapConfig.heightScale).toFixed(2)}`);
        console.log(`   🎯 Bounds: [${bounds.min.map(v => v.toFixed(1)).join(', ')}] to [${bounds.max.map(v => v.toFixed(1)).join(', ')}]`);
      } catch (error) {
        console.error('⚠️ Failed to read heightmap config:', error.message);
        this.results.heightmapConfig = null;
      }
      
      console.log(`✅ Heightmap generated successfully`);
      console.log(`📁 Saved heightmap image: ${heightmapImagePath}`);
      console.log(`📄 Saved heightmap config: ${heightmapConfigPath}`);
    } else {
      console.error('❌ Heightmap generation failed');
      process.exit(1);
    }
  }

  async processChunks() {
    const { glbPath, gridX, gridY, lodLevels, outputDir, id } = this.config;
    
    const chunksDir = path.join(outputDir, 'terrain', 'levels', id);
    const processorPath = path.join(__dirname, 'levelprocessor', 'simplified-processor.js');
    
    // Ensure GLB path is absolute
    const absoluteGlbPath = path.isAbsolute(glbPath) ? glbPath : path.resolve(glbPath);
    
    const args = [
      processorPath,
      absoluteGlbPath,
      chunksDir,
      gridX.toString(),
      gridY.toString(),
      lodLevels.toString()
    ];

    const success = await this.runCommand('node', args, 'Chunk Processing');
    
    if (success) {
      this.results.chunks = {
        directory: chunksDir,
        gridSize: `${gridX}x${gridY}`,
        lodLevels: lodLevels
      };
      
      console.log(`✅ Chunks processed successfully`);
      console.log(`📁 Saved terrain chunks to: ${chunksDir}`);
      
      // Count and log chunk files
      try {
        const chunkFiles = fs.readdirSync(chunksDir).filter(f => f.endsWith('.glb'));
        console.log(`📊 Created ${chunkFiles.length} chunk files (${gridX}x${gridY} grid with ${lodLevels + 1} LOD levels each)`);
      } catch (e) {
        console.log(`📊 Chunk files created in: ${chunksDir}`);
      }
    } else {
      console.error('❌ Chunk processing failed');
      process.exit(1);
    }
  }

  async generateLevel() {
    const { name, id, type, glbPath, outputDir } = this.config;
    const { LevelGenerator } = require('./levelprocessor/level-generator.js');
    
    // Level components go to src/threlte/levels
    const projectRoot = path.resolve(__dirname, '..');
    const levelOutputDir = path.join(projectRoot, 'src', 'threlte', 'levels');
    
    // Manifests go to terrain directory (where editor expects them)
    const terrainManifestDir = path.join(outputDir, 'terrain');
    
    // Create output directory
    if (!fs.existsSync(levelOutputDir)) {
      fs.mkdirSync(levelOutputDir, { recursive: true });
    }

    const generator = new LevelGenerator();
    
    const levelOptions = {
      name,
      id,
      type,
      gridX: this.config.gridX,
      gridY: this.config.gridY,
      glbPath: `/models/levels/${path.basename(glbPath)}`,
      heightmapPath: this.results.heightmap ? `/terrain/heightmaps/${path.basename(this.results.heightmap.imagePath)}` : null,
      chunksPath: this.results.chunks ? `/terrain/levels/${id}/` : null,
      outputDir: levelOutputDir,
      manifestDir: terrainManifestDir, // Separate location for manifests
      enableOcean: this.config.enableOcean || false,
      enableVegetation: this.config.enableVegetation || false,
      enableFireflies: this.config.enableFireflies || false,
      enableStarMap: this.config.enableStarMap || false,
      // Pass rich feature configs through to the generator/manifest
      ocean: this.config.ocean,
      style: this.config.style,
      // Add height data from heightmap config
      worldSize: this.results.heightmapConfig ? this.results.heightmapConfig.worldSize : 500,
      minHeight: this.results.heightmapConfig ? this.results.heightmapConfig.heightOffset : 0,
      maxHeight: this.results.heightmapConfig ? this.results.heightmapConfig.heightOffset + this.results.heightmapConfig.heightScale : 100,
      // Add bounds data for dimensional consistency
      bounds: this.results.heightmapConfig ? this.results.heightmapConfig.bounds : null,
      // TriMesh physics configuration (modern physics approach)
      collisionMode: this.config.collisionMode || 'trimesh',
      trimesh: {
        downsample: this.config.trimesh?.downsample ?? 16,
        mode: this.config.trimesh?.mode ?? 'single',
        chunkVerts: this.config.trimesh?.chunkVerts ?? 65,
        activeRadius: this.config.trimesh?.activeRadius ?? 2
      }
    };

    try {
      const result = await generator.generateLevel(levelOptions);
      
      if (result.success) {
        this.results.level = result;
        console.log(`✅ Level generated successfully with dimensional consistency:`);
        console.log(`📁 Saved level manifest: ${result.manifestPath}`);
        console.log(`🎮 Saved Svelte component: ${result.componentPath}`);
        
        // Log dimensional consistency information for the generated level
        if (this.results.heightmapConfig && this.results.heightmapConfig.bounds) {
          const bounds = this.results.heightmapConfig.bounds;
          const worldSizeX = bounds.max[0] - bounds.min[0];
          const worldSizeZ = bounds.max[2] - bounds.min[2];
          console.log(`🎯 Generated manifest includes bounds data for rectangular terrain support:`);
          console.log(`   📐 Physics collider will use: ${worldSizeX.toFixed(1)} x ${worldSizeZ.toFixed(1)} dimensions`);
          console.log(`   🔄 Runtime will load exact generation parameters from _config.json`);
        }
        console.log(`🆔 Level ID: ${result.levelId}`);
      } else {
        throw new Error('Level generation returned unsuccessful');
      }
    } catch (error) {
      console.error('❌ Level generation failed:', error.message);
      process.exit(1);
    }
  }

  async validateOutputs() {
    let issues = [];

    // Check heightmap files exist
    if (this.results.heightmap) {
      if (!fs.existsSync(this.results.heightmap.imagePath)) {
        issues.push(`Heightmap image not found: ${this.results.heightmap.imagePath}`);
      }
      if (!fs.existsSync(this.results.heightmap.configPath)) {
        issues.push(`Heightmap config not found: ${this.results.heightmap.configPath}`);
      } else {
        // Validate heightmap config consistency
        try {
          const heightmapConfig = JSON.parse(fs.readFileSync(this.results.heightmap.configPath, 'utf8'));
          
          // Version validation
          if (!heightmapConfig.generatedAt) {
            issues.push('Heightmap config missing generation timestamp');
          }
          
          if (heightmapConfig.resolution !== `${this.config.resolution}x${this.config.resolution}`) {
            issues.push(`Heightmap resolution mismatch: expected ${this.config.resolution}x${this.config.resolution}, got ${heightmapConfig.resolution}`);
          }
          
          // Check if GLB source matches
          const expectedGLB = path.basename(this.config.glbPath);
          if (heightmapConfig.originalGLB !== expectedGLB) {
            issues.push(`GLB source mismatch: heightmap was generated from ${heightmapConfig.originalGLB}, but level uses ${expectedGLB}`);
          }
          
          // Add synchronization metadata
          heightmapConfig.pipelineVersion = '1.0.0';
          heightmapConfig.synchronizedWith = {
            levelId: this.config.id,
            glbPath: expectedGLB,
            generatedBy: 'unified-terrain-pipeline',
            syncedAt: new Date().toISOString()
          };
          
          fs.writeFileSync(this.results.heightmap.configPath, JSON.stringify(heightmapConfig, null, 2));
          
        } catch (error) {
          issues.push(`Invalid heightmap config JSON: ${error.message}`);
        }
      }
    }

    // Check chunk files exist
    if (this.results.chunks && fs.existsSync(this.results.chunks.directory)) {
      const chunkFiles = fs.readdirSync(this.results.chunks.directory);
      const expectedChunks = this.config.gridX * this.config.gridY * (this.config.lodLevels + 1);
      
      if (chunkFiles.length < expectedChunks) {
        issues.push(`Expected ${expectedChunks} chunk files, found ${chunkFiles.length}`);
      }
    }

    // Check level files exist
    if (this.results.level) {
      if (!fs.existsSync(this.results.level.manifestPath)) {
        issues.push(`Level manifest not found: ${this.results.level.manifestPath}`);
      }
      if (!fs.existsSync(this.results.level.componentPath)) {
        issues.push(`Level component not found: ${this.results.level.componentPath}`);
      }
    }

    if (issues.length > 0) {
      console.error('⚠️ Validation issues found:');
      issues.forEach(issue => console.error(`  - ${issue}`));
    } else {
      console.log('✅ All outputs validated successfully');
    }

    return issues.length === 0;
  }

  async runCommand(command, args, description) {
    console.log(`[START] ${description}`);
    console.log(`🔄 Running: ${command} ${args.join(' ')}`);
    
    return new Promise((resolve) => {
      const child = spawn(command, args, { 
        stdio: 'inherit',
        shell: process.platform === 'win32'
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ ${description} completed successfully`);
          console.log(`[END] ${description}`);
          resolve(true);
        } else {
          console.error(`❌ ${description} failed with code ${code}`);
          console.log(`[END] ${description}`);
          resolve(false);
        }
      });

      child.on('error', (error) => {
        console.error(`❌ Failed to start ${description}:`, error.message);
        resolve(false);
      });
    });
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 UNIFIED TERRAIN PIPELINE COMPLETE');
    console.log('='.repeat(60));
    
    console.log(`\n📊 Generated Files for Level: "${this.config.name}" (${this.config.id})`);
    console.log('='.repeat(60));
    
    if (this.results.heightmap) {
      console.log(`\n🗺️ HEIGHTMAP FILES:`);
      console.log(`   Image: ${this.results.heightmap.imagePath}`);
      console.log(`   Config: ${this.results.heightmap.configPath}`);
    }
    
    if (this.results.chunks) {
      console.log(`\n🧩 TERRAIN CHUNK FILES:`);
      console.log(`   Directory: ${this.results.chunks.directory}`);
      console.log(`   Grid: ${this.results.chunks.gridSize}, LOD Levels: ${this.results.chunks.lodLevels + 1}`);
      
      // Count actual files if possible
      try {
        const fs = require('fs');
        const chunkFiles = fs.readdirSync(this.results.chunks.directory).filter(f => f.endsWith('.glb'));
        console.log(`   Files Created: ${chunkFiles.length} GLB chunk files`);
      } catch (e) {
        console.log(`   Files: Multiple GLB chunk files created`);
      }
    }
    
    if (this.results.level) {
      console.log(`\n📋 LEVEL FILES:`);
      console.log(`   Manifest: ${this.results.level.manifestPath}`);
      console.log(`   Component: ${this.results.level.componentPath}`);
      console.log(`   Level ID: ${this.results.level.levelId}`);
    }

    console.log('\n🚀 Next Steps:');
    console.log('='.repeat(30));
    console.log('✅ Files are automatically saved to correct project directories!');
    console.log(`1. Add level "${this.config.id}" to Game.svelte levelRegistry`);
    console.log(`2. Test with: gameActions.transitionToLevel("${this.config.id}")`);
    console.log('3. Use Level Editor to preview your generated level in 3D');
    console.log('4. All files are synchronized and use the same GLB source!');
    
    console.log('\n📁 File Organization:');
    console.log('='.repeat(30));
    console.log('• Manifests → public/terrain/{levelId}.manifest.json');
    console.log('• Heightmaps → public/terrain/heightmaps/');
    console.log('• Chunks → public/terrain/levels/{levelId}/');
    console.log('• Components → src/threlte/levels/');
  }
}

// Example configuration
const exampleConfig = {
  "name": "Observatory Environment",
  "id": "observatory-environment",
  "type": "hybrid",
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
    "fog": { "enabled": true, "density": 0.002, "color": "#87CEEB" },
    "preset": "ghibli",
    "enabled": true
  }
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🚀 Unified Terrain Pipeline - Complete Level Generation System

Usage: node unified-terrain-pipeline.js <config.json>

Example config.json:
${JSON.stringify(exampleConfig, null, 2)}

This tool combines heightmap generation, chunk processing, and level generation
into a single synchronized workflow to ensure all outputs use the same GLB source.
`);
    process.exit(1);
  }

  const configPath = args[0];

  // Parse optional CLI overrides like --enableOcean=true or --ocean.enableRising=true
  const overrides = {};
  for (const raw of args.slice(1)) {
    const m = /^--([^=]+)=(.+)$/.exec(raw);
    if (!m) continue;
    const key = m[1];
    let value = m[2];
    // Coerce booleans and numbers
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (!isNaN(Number(value))) value = Number(value);
    // Set nested keys using dot-notation
    setNested(overrides, key.split('.'), value);
  }

  if (!fs.existsSync(configPath)) {
    console.error(`❌ Configuration file not found: ${configPath}`);
    process.exit(1);
  }

  const pipeline = new UnifiedTerrainPipeline();
  // Monkey-patch loadConfig to apply CLI overrides after JSON load
  const originalLoadConfig = pipeline.loadConfig.bind(pipeline);
  pipeline.loadConfig = async (p) => {
    await originalLoadConfig(p);
    mergeDeep(pipeline.config, overrides);
    if (Object.keys(overrides).length) {
      console.log('✨ Applied CLI overrides:', JSON.stringify(overrides, null, 2));
    }
  };

  pipeline.run(configPath)
    .then(() => {
      console.log('\n🎉 Pipeline completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Pipeline failed:', error.message);
      process.exit(1);
    });
}

module.exports = { UnifiedTerrainPipeline };

// Helpers for CLI overrides
function setNested(obj, parts, value) {
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

function mergeDeep(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      mergeDeep(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
