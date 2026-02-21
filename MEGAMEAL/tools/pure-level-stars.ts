#!/usr/bin/env node

/**
 * Pure Level Stars System - TypeScript Implementation
 * 
 * This system manages level stars that directly load game levels without blog posts.
 * Unlike timeline event stars, these are pure navigation elements for gameplay.
 * 
 * Architecture:
 * - Dynamic level detection from /src/threlte/levels/
 * - Automatic star configuration generation
 * - Type-safe interfaces for scalability
 * - Separate from timeline/blog system
 */

import * as fs from 'fs';
import * as path from 'path';

// =====================================
// TYPE DEFINITIONS
// =====================================

export interface LevelMetadata {
  id: string;
  name: string;
  filePath: string;
  componentName: string;
  type: 'interior' | 'terrain' | 'hybrid';
  glbPath?: string;
  heightmapPath?: string;
  suggestedEra: string;
  suggestedYear: number;
  description: string;
  features: string[];
  spawnPoint: [number, number, number];
}

export interface LevelStar {
  id: string;
  title: string;
  description: string;
  levelId: string;
  position: [number, number, number];
  constellation: string;
  era: string;
  year: number;
  isLevel: true;
  type: 'level-star';
  metadata: {
    glbPath?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    estimatedPlayTime?: number;
    features: string[];
  };
}

export interface ConstellationConfig {
  name: string;
  basePosition: [number, number, number];
  radius: number;
  maxStars: number;
  theme: string;
}

export interface PureLevelStarsConfig {
  constellations: Record<string, ConstellationConfig>;
  stars: LevelStar[];
  metadata: {
    version: string;
    lastUpdated: string;
    totalLevels: number;
  };
}

// =====================================
// CORE CLASS
// =====================================

export class PureLevelStarsManager {
  private levelsDirectory: string;
  private configPath: string;
  private config: PureLevelStarsConfig;

  constructor(
    levelsDirectory: string = '/home/greggles/Merkin/MEGAMEAL/src/threlte/levels',
    configPath: string = '/home/greggles/Merkin/MEGAMEAL/tools/pure-level-stars-config.json'
  ) {
    this.levelsDirectory = levelsDirectory;
    this.configPath = configPath;
    this.config = this.loadOrCreateConfig();
  }

  // =====================================
  // LEVEL DETECTION
  // =====================================

  /**
   * Scan levels directory and detect all Svelte level files
   */
  public scanLevels(): LevelMetadata[] {
    if (!fs.existsSync(this.levelsDirectory)) {
      console.warn(`⚠️ Levels directory not found: ${this.levelsDirectory}`);
      return [];
    }

    const files = fs.readdirSync(this.levelsDirectory)
      .filter(file => file.endsWith('.svelte'))
      .filter(file => !file.startsWith('.'));

    return files.map(file => this.extractLevelMetadata(file));
  }

  /**
   * Extract metadata from a level file
   */
  private extractLevelMetadata(fileName: string): LevelMetadata {
    const filePath = path.join(this.levelsDirectory, fileName);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract component name (PascalCase)
    const componentName = fileName.replace('.svelte', '');
    
    // Convert to kebab-case for ID
    const id = componentName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    
    // Extract human-readable name
    const name = componentName.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    // Determine level type based on content analysis
    const type = this.determineLevelType(content);
    
    // Extract GLB path if present
    const glbPath = this.extractGLBPath(content);
    
    // Extract heightmap path if present
    const heightmapPath = this.extractHeightmapPath(content);
    
    // Suggest era and year based on content/name
    const { era, year } = this.suggestEraAndYear(componentName, content);
    
    // Extract features
    const features = this.extractFeatures(content);
    
    // Determine spawn point
    const spawnPoint = this.extractSpawnPoint(content, type);
    
    return {
      id,
      name,
      filePath,
      componentName,
      type,
      glbPath,
      heightmapPath,
      suggestedEra: era,
      suggestedYear: year,
      description: `${name} - A ${type} level featuring ${features.join(', ')}`,
      features,
      spawnPoint
    };
  }

  private determineLevelType(content: string): 'interior' | 'terrain' | 'hybrid' {
    if (content.includes('TerrainCollider') || content.includes('heightmap')) {
      return content.includes('Interior') ? 'hybrid' : 'terrain';
    }
    return 'interior';
  }

  private extractGLBPath(content: string): string | undefined {
    const glbMatch = content.match(/url=["']([^"']*\.glb)["']/);
    return glbMatch ? glbMatch[1] : undefined;
  }

  private extractHeightmapPath(content: string): string | undefined {
    const heightmapMatch = content.match(/heightmapUrl:\s*["']([^"']*)["']/);
    return heightmapMatch ? heightmapMatch[1] : undefined;
  }

  private suggestEraAndYear(componentName: string, content: string): { era: string; year: number } {
    const name = componentName.toLowerCase();
    
    // Era detection based on naming patterns
    if (name.includes('scifi') || name.includes('sci-fi') || name.includes('space')) {
      return { era: 'far-future', year: 2500 };
    }
    if (name.includes('medieval') || name.includes('castle')) {
      return { era: 'medieval', year: 1200 };
    }
    if (name.includes('modern') || name.includes('city')) {
      return { era: 'modern', year: 2024 };
    }
    if (name.includes('ancient') || name.includes('temple')) {
      return { era: 'ancient', year: -500 };
    }
    if (name.includes('observatory') || name.includes('hybrid')) {
      return { era: 'near-future', year: 2150 };
    }
    
    // Default to near-future
    return { era: 'near-future', year: 2100 };
  }

  private extractFeatures(content: string): string[] {
    const features: string[] = [];
    
    if (content.includes('OceanComponent')) features.push('ocean');
    if (content.includes('NaturePackVegetation')) features.push('vegetation');
    if (content.includes('FireflyComponent')) features.push('fireflies');
    if (content.includes('StarMap')) features.push('starmap');
    if (content.includes('TerrainCollider')) features.push('physics');
    if (content.includes('LightingComponent')) features.push('lighting');
    if (content.includes('ConversationDialog')) features.push('conversations');
    
    return features;
  }

  private extractSpawnPoint(content: string, type: 'interior' | 'terrain' | 'hybrid'): [number, number, number] {
    // Try to extract spawn point from content
    const spawnMatch = content.match(/playerSpawnPoint=\{?\[([^\]]+)\]\}?/);
    if (spawnMatch) {
      const coords = spawnMatch[1].split(',').map(s => parseFloat(s.trim()));
      if (coords.length === 3) {
        return [coords[0], coords[1], coords[2]];
      }
    }
    
    // Default spawn points based on level type
    switch (type) {
      case 'interior': return [0, 1, 0];
      case 'terrain': return [0, 20, 0];
      case 'hybrid': return [0, 6, -50];
      default: return [0, 1, 0];
    }
  }

  // =====================================
  // CONSTELLATION SYSTEM
  // =====================================

  /**
   * Generate constellation positions for level stars
   */
  public generateConstellationPositions(levels: LevelMetadata[]): LevelStar[] {
    const constellations = this.getConstellationConfigs();
    const stars: LevelStar[] = [];
    
    // Group levels by era
    const levelsByEra = this.groupLevelsByEra(levels);
    
    Object.entries(levelsByEra).forEach(([era, eraLevels]) => {
      const constellation = constellations[era] || constellations['default'];
      
      eraLevels.forEach((level, index) => {
        const position = this.calculateStarPosition(constellation, index, eraLevels.length);
        
        const star: LevelStar = {
          id: `level-star-${level.id}`,
          title: level.name,
          description: level.description,
          levelId: level.id,
          position,
          constellation: era,
          era: level.suggestedEra,
          year: level.suggestedYear,
          isLevel: true,
          type: 'level-star',
          metadata: {
            glbPath: level.glbPath,
            difficulty: this.assessDifficulty(level),
            estimatedPlayTime: this.estimatePlayTime(level),
            features: level.features
          }
        };
        
        stars.push(star);
      });
    });
    
    return stars;
  }

  private getConstellationConfigs(): Record<string, ConstellationConfig> {
    return {
      'ancient': {
        name: 'Ancient Realms',
        basePosition: [-50, 30, -50],
        radius: 25,
        maxStars: 8,
        theme: 'mystical'
      },
      'medieval': {
        name: 'Medieval Worlds',
        basePosition: [-25, 25, -25],
        radius: 20,
        maxStars: 6,
        theme: 'castle'
      },
      'modern': {
        name: 'Modern Era',
        basePosition: [0, 20, 0],
        radius: 15,
        maxStars: 5,
        theme: 'urban'
      },
      'near-future': {
        name: 'Near Future',
        basePosition: [25, 25, 25],
        radius: 20,
        maxStars: 8,
        theme: 'tech'
      },
      'far-future': {
        name: 'Far Future',
        basePosition: [50, 30, 50],
        radius: 30,
        maxStars: 12,
        theme: 'space'
      },
      'default': {
        name: 'Unknown Realms',
        basePosition: [0, 40, 0],
        radius: 10,
        maxStars: 4,
        theme: 'mystery'
      }
    };
  }

  private groupLevelsByEra(levels: LevelMetadata[]): Record<string, LevelMetadata[]> {
    return levels.reduce((groups, level) => {
      const era = level.suggestedEra;
      if (!groups[era]) groups[era] = [];
      groups[era].push(level);
      return groups;
    }, {} as Record<string, LevelMetadata[]>);
  }

  private calculateStarPosition(
    constellation: ConstellationConfig,
    index: number,
    totalStars: number
  ): [number, number, number] {
    const angle = (index / totalStars) * 2 * Math.PI;
    const radiusVariation = 0.7 + (Math.random() * 0.6); // 0.7 to 1.3
    const heightVariation = -5 + (Math.random() * 10); // -5 to +5
    
    const x = constellation.basePosition[0] + Math.cos(angle) * constellation.radius * radiusVariation;
    const y = constellation.basePosition[1] + heightVariation;
    const z = constellation.basePosition[2] + Math.sin(angle) * constellation.radius * radiusVariation;
    
    return [Math.round(x), Math.round(y), Math.round(z)];
  }

  private assessDifficulty(level: LevelMetadata): 'easy' | 'medium' | 'hard' {
    const complexityScore = level.features.length;
    if (complexityScore <= 2) return 'easy';
    if (complexityScore <= 4) return 'medium';
    return 'hard';
  }

  private estimatePlayTime(level: LevelMetadata): number {
    // Estimate in minutes based on level complexity
    const baseTime = level.type === 'interior' ? 10 : 20;
    const featureTime = level.features.length * 5;
    return baseTime + featureTime;
  }

  // =====================================
  // CONFIG MANAGEMENT
  // =====================================

  /**
   * Load existing config or create a new one
   */
  private loadOrCreateConfig(): PureLevelStarsConfig {
    if (fs.existsSync(this.configPath)) {
      try {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        console.warn(`⚠️ Failed to load config, creating new: ${error}`);
      }
    }
    
    return this.createDefaultConfig();
  }

  private createDefaultConfig(): PureLevelStarsConfig {
    return {
      constellations: this.getConstellationConfigs(),
      stars: [],
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        totalLevels: 0
      }
    };
  }

  /**
   * Save current configuration to file
   */
  public saveConfig(): void {
    try {
      const content = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(this.configPath, content, 'utf-8');
      console.log(`✅ Pure level stars config saved to: ${this.configPath}`);
    } catch (error) {
      console.error(`❌ Failed to save config: ${error}`);
    }
  }

  /**
   * Update configuration with new level stars
   */
  public updateConfig(levels: LevelMetadata[]): void {
    const stars = this.generateConstellationPositions(levels);
    
    this.config.stars = stars;
    this.config.metadata.lastUpdated = new Date().toISOString();
    this.config.metadata.totalLevels = levels.length;
    
    this.saveConfig();
  }

  // =====================================
  // PUBLIC API
  // =====================================

  /**
   * Get all level stars (for game consumption)
   */
  public getLevelStars(): LevelStar[] {
    return this.config.stars;
  }

  /**
   * Get level star by ID
   */
  public getLevelStar(id: string): LevelStar | undefined {
    return this.config.stars.find(star => star.id === id || star.levelId === id);
  }

  /**
   * Refresh the entire system - scan levels and update config
   */
  public refresh(): { levels: LevelMetadata[]; stars: LevelStar[] } {
    console.log('🔄 Refreshing pure level stars system...');
    
    const levels = this.scanLevels();
    this.updateConfig(levels);
    
    console.log(`✅ Found ${levels.length} levels, generated ${this.config.stars.length} level stars`);
    
    return {
      levels,
      stars: this.config.stars
    };
  }

  /**
   * Get system status
   */
  public getStatus(): {
    totalLevels: number;
    totalStars: number;
    constellations: string[];
    lastUpdated: string;
  } {
    return {
      totalLevels: this.config.metadata.totalLevels,
      totalStars: this.config.stars.length,
      constellations: Object.keys(this.config.constellations),
      lastUpdated: this.config.metadata.lastUpdated
    };
  }
}

// =====================================
// CLI INTERFACE
// =====================================

export function runCLI(): void {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const manager = new PureLevelStarsManager();
  
  switch (command) {
    case 'scan':
      console.log('🔍 Scanning for levels...');
      const levels = manager.scanLevels();
      console.table(levels.map(l => ({
        id: l.id,
        name: l.name,
        type: l.type,
        era: l.suggestedEra,
        features: l.features.length
      })));
      break;
      
    case 'refresh':
      const result = manager.refresh();
      console.log('\n📊 System Status:');
      console.log(manager.getStatus());
      break;
      
    case 'status':
      console.log('📊 Pure Level Stars System Status:');
      console.log(manager.getStatus());
      break;
      
    case 'stars':
      const stars = manager.getLevelStars();
      console.table(stars.map(s => ({
        id: s.id,
        title: s.title,
        levelId: s.levelId,
        constellation: s.constellation,
        era: s.era
      })));
      break;
      
    default:
      console.log(`
🌟 Pure Level Stars System - TypeScript

Commands:
  scan     - Scan for level files
  refresh  - Refresh entire system (scan + update config)
  status   - Show system status
  stars    - List all level stars

Examples:
  npx tsx pure-level-stars.ts refresh
  npx tsx pure-level-stars.ts status
      `);
  }
}

// Run CLI if called directly
if (require.main === module) {
  runCLI();
}