#!/usr/bin/env node

/**
 * Level Scanner for Starmap Editor
 * 
 * Scans the threlte/levels directory to find existing level files
 * and extracts metadata for creating corresponding stars.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const LEVELS_DIR = path.join(PROJECT_ROOT, 'src/threlte/levels');

/**
 * Extract metadata from a Svelte level file
 */
function extractLevelMetadata(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.svelte');
    
    // Generate proper kebab-case levelId
    const levelId = fileName
      .replace(/([a-z])([A-Z])/g, '$1-$2')  // Add dash between lowercase and uppercase
      .toLowerCase();
    
    // Initialize level data
    const levelData = {
      fileName: fileName,
      filePath: filePath,
      levelId: levelId,
      title: fileName.replace(/([A-Z])/g, ' $1').trim(),
      description: '',
      tags: ['level'],
      category: 'level',
      hasStarmap: false,
      estimatedYear: null,
      suggestedEra: 'unknown'
    };
    
    // Extract title from HTML comments or script tags
    const titleMatches = [
      // Look for "LevelName Level" pattern in comments
      content.match(/<!--[\s\S]*?(\w+(?:\s+\w+)*)\s+Level[\s\S]*?-->/i),
      // Look for comments with the file name in them
      content.match(new RegExp(`<!--[\\s\\S]*?${fileName}[\\s\\S]*?-->`, 'i')),
      // Look for title: pattern
      content.match(/<!--[\s\S]*?title[:\s]*([^\n\r]+?)[\s\S]*?-->/i),
      content.match(/\/\*[\s\S]*?title[:\s]*([^\n\r]+?)[\s\S]*?\*\//i),
      // Look for HTML title tags
      content.match(/<title[^>]*>([^<]+)<\/title>/i),
      // Look for JavaScript title variables
      content.match(/export\s+let\s+title\s*=\s*['"`]([^'"`]+)['"`]/),
      content.match(/const\s+title\s*=\s*['"`]([^'"`]+)['"`]/),
    ];
    
    let titleFound = false;
    for (const match of titleMatches) {
      if (match && match[1]) {
        let title = match[1].trim();
        // Skip generic or problematic matches
        if (title.length < 3 || title.includes('import') || title.includes('-->')) {
          continue;
        }
        // If we matched the "X Level" pattern, keep just "X Level"
        if (title && !title.toLowerCase().includes('level')) {
          title = title + ' Level';
        }
        levelData.title = title;
        titleFound = true;
        break;
      }
    }
    
    // Fallback to formatted fileName if no good title found
    if (!titleFound) {
      levelData.title = fileName.replace(/([A-Z])/g, ' $1').trim() + ' Level';
    }
    
    // Extract description from comments
    const descMatches = [
      content.match(/<!--[\s\S]*?description[:\s]*([^\n\r]+?)[\s\S]*?-->/i),
      content.match(/\/\*[\s\S]*?description[:\s]*([^\n\r]+?)[\s\S]*?\*\//i),
      content.match(/\/\/\s*description[:\s]*([^\n\r]+)/i),
    ];
    
    for (const match of descMatches) {
      if (match && match[1]) {
        levelData.description = match[1].trim();
        break;
      }
    }
    
    // Auto-generate description if none found
    if (!levelData.description) {
      levelData.description = `Explore the ${levelData.title.toLowerCase()} environment`;
    }
    
    // Check for StarMap components
    levelData.hasStarmap = /StarMap|StarNavigation|starmap/i.test(content);
    
    // Suggest era based on level name/content
    const contentLower = content.toLowerCase();
    const nameLower = fileName.toLowerCase();
    
    if (nameLower.includes('scifi') || nameLower.includes('sci-fi') || 
        contentLower.includes('futuristic') || contentLower.includes('technology')) {
      levelData.suggestedEra = 'golden-age';
      levelData.estimatedYear = 2080;
    } else if (nameLower.includes('observatory') || contentLower.includes('space') || 
               contentLower.includes('astronomical')) {
      levelData.suggestedEra = 'awakening-era';
      levelData.estimatedYear = 2045;
    } else if (contentLower.includes('ancient') || contentLower.includes('historical')) {
      levelData.suggestedEra = 'ancient-epoch';
      levelData.estimatedYear = 1500;
    } else {
      levelData.suggestedEra = 'golden-age';
      levelData.estimatedYear = 2070;
    }
    
    // Add specific tags based on content analysis
    if (contentLower.includes('restaurant') || contentLower.includes('food')) {
      levelData.tags.push('restaurant', 'food');
    }
    if (contentLower.includes('space') || contentLower.includes('observatory')) {
      levelData.tags.push('space', 'astronomy');
    }
    if (nameLower.includes('room')) {
      levelData.tags.push('interior', 'exploration');
    }
    if (levelData.hasStarmap) {
      levelData.tags.push('navigation', 'starmap');
    }
    
    // Extract any existing imports or references that might give hints
    const imports = content.match(/import[\s\S]*?from\s+['"`]([^'"`]+)['"`]/g) || [];
    levelData.dependencies = imports.map(imp => {
      const match = imp.match(/from\s+['"`]([^'"`]+)['"`]/);
      return match ? match[1] : '';
    }).filter(Boolean);
    
    // Check for any existing level IDs in the code
    const levelIdMatches = content.match(/levelId\s*[:=]\s*['"`]([^'"`]+)['"`]/g);
    if (levelIdMatches && levelIdMatches.length > 0) {
      const firstMatch = levelIdMatches[0].match(/['"`]([^'"`]+)['"`]/);
      if (firstMatch) {
        levelData.levelId = firstMatch[1];
      }
    }
    
    return levelData;
  } catch (error) {
    console.error(`Failed to extract metadata from ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Scan all level files in the levels directory
 */
function scanLevels() {
  const levels = [];
  
  try {
    if (!fs.existsSync(LEVELS_DIR)) {
      console.warn(`Levels directory not found: ${LEVELS_DIR}`);
      return levels;
    }
    
    const files = fs.readdirSync(LEVELS_DIR);
    
    files.forEach(file => {
      if (file.endsWith('.svelte') && !file.startsWith('.')) {
        const filePath = path.join(LEVELS_DIR, file);
        const levelData = extractLevelMetadata(filePath);
        
        if (levelData) {
          levels.push(levelData);
        }
      }
    });
    
    // Sort by file name for consistent ordering
    levels.sort((a, b) => a.fileName.localeCompare(b.fileName));
    
    console.log(`📁 Found ${levels.length} level files`);
    levels.forEach(level => {
      console.log(`  📄 ${level.fileName} → "${level.title}" (${level.levelId})`);
    });
    
    return levels;
  } catch (error) {
    console.error('Error scanning levels directory:', error.message);
    return levels;
  }
}

/**
 * Check which levels already have corresponding stars
 */
function checkLevelStarStatus(levels, existingStars) {
  return levels.map(level => {
    const existingStar = existingStars.find(star => 
      star.isLevel && (
        star.levelId === level.levelId ||
        star.slug === level.levelId ||
        star.title.toLowerCase().includes(level.fileName.toLowerCase())
      )
    );
    
    return {
      ...level,
      hasStar: !!existingStar,
      existingStar: existingStar || null,
      needsStarCreation: !existingStar
    };
  });
}

/**
 * Generate star data template from level data
 */
function generateStarTemplate(levelData) {
  return {
    title: levelData.title,
    description: levelData.description,
    year: levelData.estimatedYear,
    era: levelData.suggestedEra,
    isKeyEvent: false,
    isLevel: true,
    levelId: levelData.levelId,
    tags: levelData.tags,
    category: 'level',
    slug: levelData.levelId
  };
}

// Export functions for use in other modules
module.exports = {
  scanLevels,
  extractLevelMetadata,
  checkLevelStarStatus,
  generateStarTemplate
};

// CLI usage
if (require.main === module) {
  const levels = scanLevels();
  
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(levels, null, 2));
  } else if (process.argv.includes('--templates')) {
    console.log('\n🌟 Star templates for levels:');
    levels.forEach(level => {
      const template = generateStarTemplate(level);
      console.log(`\n${level.fileName}:`);
      console.log(JSON.stringify(template, null, 2));
    });
  }
}