#!/usr/bin/env node

/**
 * Timeline Data Loader for Starmap Editor
 * 
 * This script loads actual timeline data from the MEGAMEAL content system
 * and provides it in a format the starmap editor can use.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// Content directories to scan
const CONTENT_DIRS = [
  path.join(PROJECT_ROOT, 'src/content/posts'),
  path.join(PROJECT_ROOT, 'src/content/posts/timelines'),
  path.join(PROJECT_ROOT, 'src/content/banners')
];

/**
 * Extract frontmatter from an MDX/MD file
 */
function extractFrontmatter(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    
    if (!frontmatterMatch) {
      return null;
    }
    
    const frontmatterText = frontmatterMatch[1];
    const frontmatter = {};
    
    // Simple YAML-like parser for basic frontmatter
    frontmatterText.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();
        
        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // Parse arrays (simple format)
        if (value.startsWith('[') && value.endsWith(']')) {
          try {
            value = JSON.parse(value.replace(/'/g, '"'));
          } catch (e) {
            // Keep as string if parsing fails
          }
        }
        
        // Parse numbers
        if (/^\d+$/.test(value)) {
          value = parseInt(value);
        }
        
        // Parse booleans
        if (value === 'true') value = true;
        if (value === 'false') value = false;
        
        frontmatter[key] = value;
      }
    });
    
    return frontmatter;
  } catch (error) {
    console.warn(`Failed to parse frontmatter from ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Get era from year using the same logic as the game
 */
function getEraFromYear(year) {
  if (!year) return 'unknown';
  
  // Based on timelineconfig.ts era definitions
  if (year < 2000) return 'ancient-epoch';
  if (year < 2050) return 'awakening-era';
  if (year < 2100) return 'golden-age';
  if (year < 2200) return 'conflict-epoch';
  return 'singularity-conflict';
}

/**
 * Scan content directories for timeline posts
 */
function scanTimelinePosts() {
  const timelineEvents = [];
  
  CONTENT_DIRS.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.warn(`Content directory not found: ${dir}`);
      return;
    }
    
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      if (file.endsWith('.md') || file.endsWith('.mdx')) {
        const filePath = path.join(dir, file);
        const frontmatter = extractFrontmatter(filePath);
        
        if (frontmatter) {
          // Check if this is a timeline post
          const isTimelinePost = frontmatter.timelineYear || 
                                frontmatter.bannerType === 'timeline';
          
          if (isTimelinePost) {
            const slug = path.basename(file, path.extname(file));
            const era = frontmatter.era || getEraFromYear(frontmatter.timelineYear);
            
            const timelineEvent = {
              uniqueId: frontmatter.id || slug,
              title: frontmatter.title || slug.replace(/-/g, ' '),
              description: frontmatter.description || frontmatter.excerpt || '',
              year: frontmatter.timelineYear || frontmatter.year,
              era: era,
              isKeyEvent: frontmatter.isKeyEvent || false,
              isLevel: frontmatter.isLevel || false,
              levelId: frontmatter.levelId || null,
              tags: (() => {
                try {
                  if (Array.isArray(frontmatter.tags)) return frontmatter.tags;
                  if (typeof frontmatter.tags === 'string') {
                    if (frontmatter.tags.startsWith('[')) {
                      return JSON.parse(frontmatter.tags.replace(/'/g, '"'));
                    } else {
                      return [frontmatter.tags];
                    }
                  }
                  return [];
                } catch (e) {
                  return frontmatter.tags ? [frontmatter.tags.toString()] : [];
                }
              })(),
              category: frontmatter.category || 'general',
              slug: slug,
              // Additional fields that might be useful
              bannerType: frontmatter.bannerType,
              location: frontmatter.location,
              filePath: filePath,
              lastModified: fs.statSync(filePath).mtime
            };
            
            timelineEvents.push(timelineEvent);
          }
        }
      }
    });
  });
  
  // Sort by year
  timelineEvents.sort((a, b) => (a.year || 0) - (b.year || 0));
  
  return timelineEvents;
}

/**
 * Load era configuration from timelineconfig.ts
 */
function loadEraConfig() {
  try {
    const configPath = path.join(PROJECT_ROOT, 'src/config/timelineconfig.ts');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    
    // Extract eraColorMap
    const erasMatch = configContent.match(/export const eraColorMap: Record<string, string> = \{([^}]+)\}/);
    if (erasMatch) {
      const eraLines = erasMatch[1].split('\n')
        .map(line => line.trim())
        .filter(line => line.includes(':'))
        .map(line => {
          const match = line.match(/'([^']+)':\s*'([^']+)'/);
          return match ? [match[1], match[2]] : null;
        })
        .filter(Boolean);
      
      return Object.fromEntries(eraLines);
    }
    
    return {};
  } catch (error) {
    console.warn('Failed to load era configuration:', error.message);
    return {};
  }
}

/**
 * Main function to load all timeline data
 */
function loadTimelineData() {
  console.log('🔍 Scanning for timeline posts...');
  
  const timelineEvents = scanTimelinePosts();
  const eraConfig = loadEraConfig();
  
  console.log(`✅ Found ${timelineEvents.length} timeline events`);
  console.log(`📊 Eras: ${Object.keys(eraConfig).join(', ')}`);
  
  // Log some sample events for verification
  if (timelineEvents.length > 0) {
    console.log('\n📋 Sample timeline events:');
    timelineEvents.slice(0, 3).forEach((event, i) => {
      console.log(`  ${i + 1}. ${event.title} (${event.year}) - ${event.era}`);
    });
  }
  
  return {
    success: true,
    stars: timelineEvents,
    eras: Object.keys(eraConfig),
    eraConfig: eraConfig,
    stats: {
      total: timelineEvents.length,
      keyEvents: timelineEvents.filter(e => e.isKeyEvent).length,
      levels: timelineEvents.filter(e => e.isLevel).length,
      byEra: timelineEvents.reduce((acc, event) => {
        acc[event.era] = (acc[event.era] || 0) + 1;
        return acc;
      }, {})
    }
  };
}

/**
 * Update frontmatter in an MDX file
 */
function updateFrontmatter(filePath, updates) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatterMatch = content.match(/^(---\s*\n)([\s\S]*?)(\n---\s*\n)([\s\S]*)$/);
    
    if (!frontmatterMatch) {
      throw new Error('No frontmatter found in file');
    }
    
    const [, openTag, frontmatterText, closeTag, bodyContent] = frontmatterMatch;
    
    // Parse existing frontmatter
    const frontmatterLines = frontmatterText.split('\n');
    const updatedLines = [];
    const processedKeys = new Set();
    
    // Update existing lines
    frontmatterLines.forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        if (updates.hasOwnProperty(key)) {
          let value = updates[key];
          
          // Format value appropriately
          if (Array.isArray(value)) {
            value = JSON.stringify(value);
          } else if (typeof value === 'string' && value.includes(' ')) {
            value = `"${value}"`;
          }
          
          updatedLines.push(`${key}: ${value}`);
          processedKeys.add(key);
        } else {
          updatedLines.push(line);
        }
      } else {
        updatedLines.push(line);
      }
    });
    
    // Add new keys
    Object.keys(updates).forEach(key => {
      if (!processedKeys.has(key)) {
        let value = updates[key];
        
        // Format value appropriately
        if (Array.isArray(value)) {
          value = JSON.stringify(value);
        } else if (typeof value === 'string' && value.includes(' ')) {
          value = `"${value}"`;
        }
        
        updatedLines.push(`${key}: ${value}`);
      }
    });
    
    // Reconstruct file
    const newFrontmatter = updatedLines.join('\n');
    const newContent = openTag + newFrontmatter + closeTag + bodyContent;
    
    // Create backup
    const backupPath = filePath + '.backup.' + Date.now();
    fs.copyFileSync(filePath, backupPath);
    
    // Write updated file
    fs.writeFileSync(filePath, newContent);
    
    return { success: true, backupPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Save star data back to its original file
 */
function saveStarData(starData) {
  try {
    const filePath = starData.filePath;
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('Original file path not found or file does not exist');
    }
    
    // Prepare updates for frontmatter
    const updates = {
      title: starData.title,
      description: starData.description,
      timelineYear: starData.year,
      timelineEra: starData.era,  // Use timelineEra not era
      isKeyEvent: starData.isKeyEvent,
      isLevel: starData.isLevel,
      tags: starData.tags,
      category: starData.category
    };
    
    // Add optional fields if they exist
    if (starData.levelId) {
      updates.levelId = starData.levelId;
    }
    
    const result = updateFrontmatter(filePath, updates);
    
    if (result.success) {
      console.log(`✅ Updated star data in: ${filePath}`);
      console.log(`💾 Backup created: ${result.backupPath}`);
    }
    
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Create a new timeline MDX file
 */
function createNewTimelineFile(starData) {
  try {
    if (starData.isLevel) {
      console.log(`⚠️ Skipping MDX file creation for level star: ${starData.title}`);
      return { success: true, message: 'Skipped MDX creation for level star.' };
    }
    const timelineDir = path.join(PROJECT_ROOT, 'src/content/posts/timelines');
    const fileName = starData.slug + '.mdx';
    const filePath = path.join(timelineDir, fileName);
    
    // Check if file already exists
    if (fs.existsSync(filePath)) {
      throw new Error('File already exists: ' + fileName);
    }
    
    // Create MDX content with all required fields for Astro content collection
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const frontmatter = [
      '---',
      `title: "${starData.title}"`,
      `published: ${now}`,  // Required by Astro content schema
      `description: "${starData.description || ''}"`,
      `timelineYear: ${starData.year || new Date().getFullYear()}`,
      `timelineEra: "${starData.era || 'unknown'}"`,  // Use timelineEra not era
      `isKeyEvent: ${starData.isKeyEvent || false}`,
      `isLevel: ${starData.isLevel || false}`,
      starData.levelId ? `levelId: "${starData.levelId}"` : null,
      `tags: ${JSON.stringify(starData.tags || [])}`,
      `category: "${starData.category || 'general'}"`,
      `draft: false`,  // Ensure it's published
      '---',
      ''
    ].filter(Boolean).join('\n');
    
    const content = frontmatter + '\n' + (starData.content || '# ' + starData.title + '\n\nContent for this timeline event goes here.\n');
    
    fs.writeFileSync(filePath, content);
    
    console.log(`✅ Created new timeline file: ${filePath}`);
    
    return { success: true, filePath, fileName };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Export for use in other scripts
module.exports = { 
  loadTimelineData, 
  scanTimelinePosts, 
  loadEraConfig, 
  saveStarData, 
  createNewTimelineFile,
  updateFrontmatter 
};

// CLI usage
if (require.main === module) {
  const data = loadTimelineData();
  
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(data, null, 2));
  } else if (process.argv.includes('--save')) {
    const outputPath = path.join(__dirname, 'timeline-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`💾 Timeline data saved to: ${outputPath}`);
  }
}