/**
 * Type definitions for Pure Level Stars System
 */

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

export declare class PureLevelStarsManager {
  constructor(levelsDirectory?: string, configPath?: string);
  
  scanLevels(): LevelMetadata[];
  generateConstellationPositions(levels: LevelMetadata[]): LevelStar[];
  saveConfig(): void;
  updateConfig(levels: LevelMetadata[]): void;
  
  getLevelStars(): LevelStar[];
  getLevelStar(id: string): LevelStar | undefined;
  refresh(): { levels: LevelMetadata[]; stars: LevelStar[] };
  getStatus(): {
    totalLevels: number;
    totalStars: number;
    constellations: string[];
    lastUpdated: string;
  };
}

export declare function runCLI(): void;