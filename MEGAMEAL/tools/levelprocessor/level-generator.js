#!/usr/bin/env node

/**
 * Professional Level Generator - Creates complete, production-ready levels
 * Generates manifest, components, heightmaps, and collision optimized for performance
 */

const fs = require('fs');
const path = require('path');

class LevelGenerator {
  constructor() {
    this.templatesDir = path.join(__dirname, 'templates');
    this.templates = {
      interior: this.getInteriorTemplate(),
      terrain: this.getTerrainTemplate(),
      hybrid: this.getHybridTemplate()
    };
  }

  /**
   * Generate a complete level package
   */
  async generateLevel(options) {
    const {
      name,
      id,
      type,
      glbPath,
      outputDir,
      manifestDir, // separate directory for manifests
      heightmapPath, // new
      chunksPath,    // new
      enableOcean = false,
      enableVegetation = false,
      enableFireflies = false,
      enableStarMap = false
    } = options;

    console.log(`🏗️ Generating ${type} level: ${name} (${id})`);
    
    const manifest = this.generateManifest(options);
    const component = this.generateComponent(options);
    
    // Determine where to put the manifest
    const manifestPath = manifestDir 
      ? path.join(manifestDir, `${id}.manifest.json`)
      : path.join(outputDir, id, 'manifest.json');
    
    // Create manifest directory if specified
    if (manifestDir && !fs.existsSync(manifestDir)) {
      fs.mkdirSync(manifestDir, { recursive: true });
    }
    
    // Write manifest file
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    // Write Svelte component
    fs.writeFileSync(
      path.join(outputDir, `${this.pascalCase(id)}.svelte`),
      component
    );
    
    console.log(`✅ Level generated successfully:`);
    console.log(`📁 Manifest: ${manifestPath}`);
    console.log(`🎮 Component: ${outputDir}/${this.pascalCase(id)}.svelte`);
    
    return {
      success: true,
      manifestPath: manifestPath,
      componentPath: path.join(outputDir, `${this.pascalCase(id)}.svelte`),
      levelId: id
    };
  }

  /**
   * Generate level manifest based on type and options
   */
  generateManifest(options) {
    const { name, id, type, glbPath, heightmapPath, chunksPath, enableOcean, minHeight, maxHeight, worldSize, bounds, collisionMode, trimesh } = options;
    
    const baseManifest = {
      name,
      id,
      type,
      version: "1.0.0",
      assets: {
        environment: glbPath,
        heightmap: type === 'interior' 
          ? null 
          : heightmapPath,
        chunksPath: chunksPath || null
      },
      spawn: this.getSpawnConfig(type),
      physics: {
        ...this.getPhysicsConfig(type, collisionMode),
        worldSize: worldSize || this.getPhysicsConfig(type).worldSize, // Use provided worldSize or fallback
        gridX: options.gridX || 4,
        gridY: options.gridY || 4,
        chunkSize: (worldSize || this.getPhysicsConfig(type).worldSize) / (options.gridX || 4),
        minHeight: minHeight !== undefined ? minHeight : -10,
        maxHeight: maxHeight !== undefined ? maxHeight : 100,
        // Include bounds data for dimensional consistency (when available from heightmap config)
        bounds: bounds || null,
        // Modern TriMesh physics configuration
        type: collisionMode || 'trimesh',
        trimesh: trimesh || {
          downsample: 16,
          mode: 'single',
          chunkVerts: 65,
          activeRadius: 2
        }
      },
      lighting: this.getLightingConfig(type),
      optimization: this.getOptimizationConfig(type),
      style: this.getStyleConfig(options.style),
      features: {
        ocean: enableOcean,
        vegetation: options.enableVegetation || false,
        fireflies: options.enableFireflies || false,
        starMap: options.enableStarMap || false,
        conversations: options.enableFireflies || false,
        styles: true
      }
    };

    // Add ocean-specific config if enabled
    if (enableOcean) {
      baseManifest.ocean = this.getOceanConfig(options.ocean);
    }

    return baseManifest;
  }

  /**
   * Generate Svelte component based on type and features
   */
  generateComponent(options) {
    const template = this.templates[options.type] || this.templates.interior;
    
    return template
      .replace(/\{levelName\}/g, options.name)
      .replace(/\{levelId\}/g, options.id)
      .replace(/\{componentName\}/g, this.pascalCase(options.id))
      .replace(/\{glbPath\}/g, options.glbPath)
      .replace(/\{spawnPoint\}/g, JSON.stringify(this.getSpawnConfig(options.type).position))
      .replace(/\{oceanComponent\}/g, options.enableOcean ? this.getOceanComponentCode() : '')
      .replace(/\{vegetationComponent\}/g, options.enableVegetation ? this.getVegetationComponentCode() : '')
      .replace(/\{fireflyComponent\}/g, options.enableFireflies ? this.getFireflyComponentCode() : '')
      .replace(/\{starMapComponent\}/g, options.enableStarMap ? this.getStarMapComponentCode() : '');
  }

  /**
   * Configuration generators based on level type
   */
  getSpawnConfig(type) {
    const configs = {
      interior: { position: [0, 1, 0], rotation: [0, 0, 0] },
      terrain: { position: [0, 20, 0], rotation: [0, 0, 0] },
      hybrid: { position: [0, 18, -50], rotation: [0, 0, 0] }
    };
    return configs[type] || configs.interior;
  }

  getPhysicsConfig(type, collisionMode = 'trimesh') {
    const configs = {
      interior: { type: "mesh", worldSize: 50 },
      terrain: { type: collisionMode, worldSize: 500 },
      hybrid: { type: collisionMode, worldSize: 500 }
    };
    return configs[type] || configs.interior;
  }

  getLightingConfig(type) {
    const configs = {
      interior: {
        ambientIntensity: 0.8,
        directionalLights: [
          { position: [0, 10, 0], color: 0xffffff, intensity: 2.0 },
          { position: [5, 5, 5], color: 0x87ceeb, intensity: 1.5 }
        ]
      },
      terrain: {
        ambientIntensity: 0.3,
        directionalLights: [
          { position: [100, 200, 100], color: 0xffffff, intensity: 1.0 }
        ]
      },
      hybrid: {
        ambientIntensity: 0.2,
        directionalLights: [
          { position: [0, 200, 0], color: 0xffffff, intensity: 0.8 }
        ]
      }
    };
    return configs[type] || configs.interior;
  }

  getOptimizationConfig(type) {
    return {
      oceanSegments: {
        ultra_low: { width: 8, height: 8 },
        low: { width: 12, height: 12 },
        medium: { width: 24, height: 24 },
        high: { width: 32, height: 32 },
        ultra: { width: 64, height: 64 }
      },
      terrainSegments: {
        ultra_low: { width: 16, height: 16 },
        low: { width: 24, height: 24 },
        medium: { width: 32, height: 32 },
        high: { width: 48, height: 48 },
        ultra: { width: 96, height: 96 }
      }
    };
  }

  getOceanConfig(override = {}) {
    const defaults = {
      size: { width: 10000, height: 10000 },
      enableRising: false,
      initialLevel: 0,
      targetLevel: 0,
      riseRate: 0,
      enableAnimation: true,
      underwaterFogDensity: 0.1,
      underwaterFogColor: 0x006994,
      surfaceFogDensity: 0.001
    };
    // Deep-merge shallowly for our simple shape
    return {
      ...defaults,
      ...override,
      size: { ...(defaults.size), ...(override.size || {}) }
    };
  }

  getStyleConfig(override = {}) {
    const defaults = {
      preset: 'ghibli',
      enabled: true,
      colorGrading: {
        saturation: 1.2,
        contrast: 1.1,
        brightness: 1.0,
        warmth: 1.05
      },
      fog: {
        enabled: true,
        density: 0.002,
        color: '#87CEEB'
      },
      bloom: {
        enabled: true,
        intensity: 0.3,
        threshold: 0.9
      }
    };
    return {
      ...defaults,
      ...override,
      colorGrading: { ...(defaults.colorGrading), ...(override.colorGrading || {}) },
      fog: { ...(defaults.fog), ...(override.fog || {}) },
      bloom: { ...(defaults.bloom), ...(override.bloom || {}) }
    };
  }

  /**
   * Component code generators
   */
  getOceanComponentCode() {
    return `
    <!-- Modular Ocean Component -->
    <OceanComponent 
      size={levelConfig.water.oceanSize}
      color={0x006994}
      opacity={0.9}
      segments={levelOptimizationSettings.oceanSegments || { width: 24, height: 24 }}
      enableAnimation={levelConfig.water.enableAnimation}
      animationSpeed={0.1}
      enableRising={levelConfig.water.enableRising}
      initialLevel={levelConfig.water.initialLevel}
      targetLevel={levelConfig.water.targetLevel}
      riseRate={levelConfig.water.riseRate}
      enableUnderwaterEffects={true}
      waterCollisionSize={[levelConfig.water.oceanSize.width, 20, levelConfig.water.oceanSize.height]}
      underwaterFogDensity={levelConfig.water.underwaterFogDensity}
      underwaterFogColor={levelConfig.water.underwaterFogColor}
      surfaceFogDensity={levelConfig.water.surfaceFogDensity}
      on:waterEnter={(e) => console.log('🌊 Player entered water at depth:', e.detail.depth)}
      on:waterExit={() => console.log('🏖️ Player exited water')}
      metalness={0.1}
      roughness={0.03}
      envMapIntensity={2.0}
    />
    
    <!-- Screen overlay for underwater effects -->
    <UnderwaterOverlay />`;
  }

  getVegetationComponentCode() {
    return `
    <!-- Nature Pack Vegetation System -->
    {#if $qualitySettingsStore.enableVegetation && terrainReady}
      <NaturePackVegetation 
        bind:this={naturePackVegetation}
        {getHeightAt}
        count={$qualitySettingsStore.maxVegetationInstances * 10}
        radius={160}
        density={0.9}
        enableLOD={true}
        on:vegetationReady={(e) => console.log('🌱 Vegetation ready:', e.detail)}
      />
    {/if}`;
  }

  getFireflyComponentCode() {
    return `
    <!-- Hybrid Firefly Component (Enhanced with AI Conversations) -->
    <HybridFireflyComponent 
      bind:this={hybridFireflyComponent}
      {getHeightAt}
      {interactionSystem}
      count={100}
      lightIntensity={50.0}
      lightRange={500}
      cycleDuration={24.0}
      fadeSpeed={4.0}
      heightRange={{ min: 2.0, max: 5.0 }}
      radius={180}
      pointSize={25.0}
      movement={{
        speed: 0.01,
        wanderSpeed: 0.002,
        wanderRadius: 4,
        floatAmplitude: { x: .5, y: 0.5, z: 1.5 },
        lerpFactor: 1.0
      }}
      colors={[0x87ceeb, 0x98fb98, 0xffffe0, 0xdda0dd, 0xf0e68c, 0xffa07a, 0x20b2aa, 0x9370db]}
      enableAIConversations={true}
      conversationChance={.15}
    />`;
  }

  getStarMapComponentCode() {
    return `
    <!-- Loading state for timeline data -->
    {#if isLoadingTimeline}
      <T.Group position={[0, 5, 0]} name="loading-indicator">
        <T.Mesh>
          <T.SphereGeometry args={[2]} />
          <T.MeshBasicMaterial color="#00ff88" transparent opacity={0.6} />
        </T.Mesh>
      </T.Group>
    {:else if timelineLoadError}
      <T.Group position={[0, 5, 0]} name="error-indicator">
        <T.Mesh>
          <T.SphereGeometry args={[2]} />
          <T.MeshBasicMaterial color="#ff0044" transparent opacity={0.6} />
        </T.Mesh>
      </T.Group>
    {:else}
      <!-- Star Map with enhanced navigation using REAL timeline data -->
      <StarMap 
        bind:this={starMapComponent}
        bind:starMapRef={starMapRef}
        timelineEvents={realTimelineEvents}
        {interactionSystem}
        on:starSelected={handleStarSelected}
      />
    {/if}
    
    <!-- Star Navigation System (ECS component) -->
    {#if starMapComponent && !isLoadingTimeline}
      <StarNavigationSystem 
        bind:this={starNavigationSystem}
        timelineEvents={realTimelineEvents}
        starMapComponent={starMapComponent}
        on:starSelected={handleStarSelected}
        on:starDeselected={handleStarDeselected}
        on:levelTransition={handleLevelTransition}
        on:starInteraction={(e) => console.log('🎯 Star interaction:', e.detail)}
        on:transitionStarted={(e) => console.log('🎮 Transition started:', e.detail)}
        on:transitionCompleted={(e) => console.log('✅ Transition completed:', e.detail)}
        on:transitionFailed={(e) => console.log('❌ Transition failed:', e.detail)}
      />
    {/if}`;
  }

  /**
   * Level templates for different types
   */
  getInteriorTemplate() {
    const templatePath = path.join(this.templatesDir, 'interior.template.svelte');
    try {
      return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
      console.error(`Failed to load interior template: ${error.message}`);
      throw new Error(`Template not found: ${templatePath}`);
    }
  }

  getTerrainTemplate() {
    const templatePath = path.join(this.templatesDir, 'terrain.template.svelte');
    try {
      return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
      console.error(`Failed to load terrain template: ${error.message}`);
      throw new Error(`Template not found: ${templatePath}`);
    }
  }

  getHybridTemplate() {
    return this.getTerrainTemplate(); // Hybrid uses terrain template with all features
  }

  /**
   * Utility functions
   */
  createLevelStructure(levelDir) {
    if (!fs.existsSync(levelDir)) {
      fs.mkdirSync(levelDir, { recursive: true });
    }
  }

  pascalCase(str) {
    return str.replace(/(^\w|-\w)/g, (match) => 
      match.replace('-', '').toUpperCase()
    );
  }
}

module.exports = { LevelGenerator };

// CLI interface
if (require.main === module) {
  const [,, ...args] = process.argv;
  
  if (args.length < 4) {
    console.log(`
Usage: node level-generator.js <name> <id> <type> <glbPath> [options]

Arguments:
  name     Level display name (e.g., "Sci-Fi Room")
  id       Level identifier (e.g., "sci-fi-room")
  type     Level type: interior|terrain|hybrid
  glbPath  Path to GLB model (e.g., "/models/levels/sci-fi-room.glb")

Options:
  --ocean      Enable ocean component
  --vegetation Enable vegetation system
  --fireflies  Enable firefly system with AI
  --starmap    Enable star navigation system
  --output     Output directory (default: current directory)

Example:
  node level-generator.js "Sci-Fi Room" sci-fi-room interior /models/levels/sci-fi-room.glb --output ./src/threlte/levels
`);
    process.exit(1);
  }

  const [name, id, type, glbPath] = args;
  const options = {
    name,
    id,
    type,
    glbPath,
    outputDir: './src/threlte/levels',
    enableOcean: args.includes('--ocean'),
    enableVegetation: args.includes('--vegetation'),
    enableFireflies: args.includes('--fireflies'),
    enableStarMap: args.includes('--starmap')
  };

  // Parse output directory
  const outputIndex = args.indexOf('--output');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    options.outputDir = args[outputIndex + 1];
  }

  const generator = new LevelGenerator();
  generator.generateLevel(options)
    .then(result => {
      console.log('🎉 Level generation complete!');
      console.log('📋 Next steps:');
      console.log('1. Add level to Game.svelte levelRegistry');
      console.log('2. Update LevelTransitionHandler.svelte');
      console.log('3. Test level loading with gameActions.transitionToLevel("' + id + '")');
    })
    .catch(error => {
      console.error('❌ Level generation failed:', error);
      process.exit(1);
    });
}
