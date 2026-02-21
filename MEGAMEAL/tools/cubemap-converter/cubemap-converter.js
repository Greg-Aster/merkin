#!/usr/bin/env node

/**
 * Cubemap Converter for MEGAMEAL
 * Converts equirectangular images to 6 cube face images
 * 
 * Following the established patterns from heightmap-generator and level-processor
 */

const fs = require('fs');
const path = require('path');

class CubemapConverter {
  constructor() {
    // Cube face names in Three.js order: +X, -X, +Y, -Y, +Z, -Z
    this.faceNames = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
    
    // Face direction vectors for cube mapping
    this.faces = [
      { right: [0, 0, -1], up: [0, -1, 0], forward: [1, 0, 0] },  // +X (right)
      { right: [0, 0, 1],  up: [0, -1, 0], forward: [-1, 0, 0] }, // -X (left)
      { right: [1, 0, 0],  up: [0, 0, 1],  forward: [0, 1, 0] },  // +Y (top)
      { right: [1, 0, 0],  up: [0, 0, -1], forward: [0, -1, 0] }, // -Y (bottom)
      { right: [1, 0, 0],  up: [0, -1, 0], forward: [0, 0, 1] },  // +Z (front)
      { right: [-1, 0, 0], up: [0, -1, 0], forward: [0, 0, -1] }  // -Z (back)
    ];
  }

  async convertToCubemap(inputPath, options = {}) {
    const config = {
      resolution: options.resolution || 1024,
      format: options.format || 'webp',
      outputDir: options.outputDir || path.dirname(inputPath),
      ...options
    };

    console.log('🎆 MEGAMEAL Cubemap Converter');
    console.log('='.repeat(50));
    console.log(`📁 Input: ${inputPath}`);
    console.log(`🎯 Resolution: ${config.resolution}x${config.resolution} per face`);
    console.log(`📷 Format: ${config.format}`);
    console.log(`📂 Output: ${config.outputDir}`);

    // Dynamic imports following heightmap-generator pattern
    let sharp;
    
    try {
      sharp = await import('sharp');
      console.log('✅ Sharp imported successfully');
    } catch (e) {
      console.error('❌ sharp not found. Install with: npm install sharp');
      throw new Error('Missing dependency: sharp');
    }

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    // Load input image
    const inputImage = sharp.default(inputPath);
    const metadata = await inputImage.metadata();
    
    console.log(`📊 Input image: ${metadata.width}x${metadata.height} (${metadata.format})`);

    // Validate input dimensions (should be 2:1 ratio for equirectangular)
    const aspectRatio = metadata.width / metadata.height;
    if (Math.abs(aspectRatio - 2.0) > 0.1) {
      console.warn(`⚠️  Warning: Aspect ratio ${aspectRatio.toFixed(2)}:1 - expected 2:1 for equirectangular`);
    }

    // Ensure output directory exists
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${config.outputDir}`);
    }

    // Get raw pixel data from input image
    console.log('🔄 Loading image data...');
    const { data: inputData, info } = await inputImage
      .raw()
      .toBuffer({ resolveWithObject: true });

    console.log(`📊 Loaded ${inputData.length} bytes (${info.channels} channels)`);

    const outputFiles = [];
    const baseName = path.basename(inputPath, path.extname(inputPath));

    // Convert each face
    for (let faceIndex = 0; faceIndex < this.faceNames.length; faceIndex++) {
      const faceName = this.faceNames[faceIndex];
      const faceLabel = ['Right', 'Left', 'Top', 'Bottom', 'Front', 'Back'][faceIndex];
      
      console.log(`🔧 Converting face: ${faceName} (${faceLabel}) [${faceIndex + 1}/6]`);

      try {
        const faceBuffer = await this.generateCubeFace(
          inputData,
          metadata,
          faceIndex,
          config.resolution
        );

        // Save face
        const filename = `${faceName}.${config.format}`;
        const outputPath = path.join(config.outputDir, filename);

        let outputSharp = sharp.default(faceBuffer, {
          raw: {
            width: config.resolution,
            height: config.resolution,
            channels: 3
          }
        });
        
        // Format-specific options
        if (config.format === 'webp') {
          outputSharp = outputSharp.webp({ quality: 95, lossless: false });
        } else if (config.format === 'jpg' || config.format === 'jpeg') {
          outputSharp = outputSharp.jpeg({ quality: 95 });
        } else if (config.format === 'png') {
          outputSharp = outputSharp.png({ compressionLevel: 6 });
        }

        await outputSharp.toFile(outputPath);
        
        const stats = fs.statSync(outputPath);
        const sizeKB = Math.round(stats.size / 1024);
        
        console.log(`💾 Saved: ${filename} (${sizeKB} KB)`);
        outputFiles.push(filename);

      } catch (faceError) {
        console.error(`❌ Failed to convert face ${faceName}:`, faceError.message);
        throw faceError;
      }
    }

    // Calculate total output size
    const totalSize = outputFiles.reduce((sum, file) => {
      const filePath = path.join(config.outputDir, file);
      return sum + fs.statSync(filePath).size;
    }, 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);

    // Generate usage instructions
    console.log('='.repeat(50));
    console.log('✅ Cubemap conversion complete!');
    console.log(`📁 Output: ${config.outputDir}`);
    console.log(`📊 Total size: ${totalSizeMB} MB`);
    console.log('');
    console.log('🚀 Usage in MEGAMEAL Skybox component:');
    console.log(`<Skybox`);
    console.log(`  path="${path.relative(process.cwd(), config.outputDir)}/"`);
    console.log(`  files={['${outputFiles.join("', '")}']}`);
    console.log(`/>`);

    return { outputFiles, config, totalSize };
  }

  async generateCubeFace(inputData, metadata, faceIndex, resolution) {
    const face = this.faces[faceIndex];
    const outputBuffer = Buffer.alloc(resolution * resolution * 3); // RGB output
    
    let bufferIndex = 0;

    // Convert each pixel of the cube face
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        // Convert face coordinates to direction vector
        const u = (2 * x / resolution) - 1; // [-1, 1]
        const v = (2 * y / resolution) - 1; // [-1, 1]

        // Calculate 3D direction vector
        const direction = [
          face.forward[0] + u * face.right[0] + v * face.up[0],
          face.forward[1] + u * face.right[1] + v * face.up[1],
          face.forward[2] + u * face.right[2] + v * face.up[2]
        ];

        // Normalize direction vector
        const length = Math.sqrt(
          direction[0] * direction[0] + 
          direction[1] * direction[1] + 
          direction[2] * direction[2]
        );
        direction[0] /= length;
        direction[1] /= length;
        direction[2] /= length;

        // Convert to equirectangular coordinates
        const theta = Math.atan2(direction[2], direction[0]); // longitude [-π, π]
        const phi = Math.acos(Math.max(-1, Math.min(1, direction[1]))); // latitude [0, π]

        // Map to texture coordinates [0, 1]
        const texU = (theta + Math.PI) / (2 * Math.PI);
        const texV = phi / Math.PI;

        // Sample from input image with bilinear interpolation
        const color = this.samplePixelBilinear(inputData, metadata, texU, texV);

        // Write RGB to output buffer
        outputBuffer[bufferIndex++] = color[0];
        outputBuffer[bufferIndex++] = color[1];
        outputBuffer[bufferIndex++] = color[2];
      }
    }

    return outputBuffer;
  }

  samplePixelBilinear(inputData, metadata, u, v) {
    const width = metadata.width;
    const height = metadata.height;
    const channels = metadata.channels;

    // Convert to pixel coordinates
    const x = u * width - 0.5;
    const y = v * height - 0.5;

    // Get integer coordinates
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    // Get fractional parts
    const fx = x - x0;
    const fy = y - y0;

    // Clamp coordinates to image bounds
    const cx0 = Math.max(0, Math.min(width - 1, x0));
    const cy0 = Math.max(0, Math.min(height - 1, y0));
    const cx1 = Math.max(0, Math.min(width - 1, x1));
    const cy1 = Math.max(0, Math.min(height - 1, y1));

    // Sample four neighboring pixels
    const p00 = this.getPixel(inputData, cx0, cy0, width, channels);
    const p10 = this.getPixel(inputData, cx1, cy0, width, channels);
    const p01 = this.getPixel(inputData, cx0, cy1, width, channels);
    const p11 = this.getPixel(inputData, cx1, cy1, width, channels);

    // Bilinear interpolation
    const color = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      const top = p00[c] * (1 - fx) + p10[c] * fx;
      const bottom = p01[c] * (1 - fx) + p11[c] * fx;
      color[c] = Math.round(top * (1 - fy) + bottom * fy);
    }

    return color;
  }

  getPixel(data, x, y, width, channels) {
    const index = (y * width + x) * channels;
    return [
      data[index] || 0,     // R
      data[index + 1] || 0, // G
      data[index + 2] || 0  // B
    ];
  }
}

// CLI interface following heightmap generator pattern
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('🎆 MEGAMEAL Cubemap Converter');
    console.log('Usage: node cubemap-converter.js <input-image> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --resolution=1024   Face resolution: 512|1024|2048|4096 (default: 1024)');
    console.log('  --format=webp       Output format: webp|jpg|png (default: webp)');
    console.log('  --output=./         Output directory (default: same as input)');
    console.log('');
    console.log('Examples:');
    console.log('  node cubemap-converter.js skybox.hdr');
    console.log('  node cubemap-converter.js night_sky.jpg --resolution=2048 --format=webp');
    console.log('  node cubemap-converter.js hdri.exr --output=../public/assets/skyboxes/');
    console.log('');
    console.log('Supported input formats: HDR, EXR, JPG, PNG, WebP');
    process.exit(1);
  }

  const inputPath = args[0];
  const options = {};

  // Parse command line options
  args.slice(1).forEach(arg => {
    if (arg.startsWith('--resolution=')) {
      const res = parseInt(arg.split('=')[1]);
      if ([512, 1024, 2048, 4096].includes(res)) {
        options.resolution = res;
      } else {
        console.error('❌ Invalid resolution. Use: 512, 1024, 2048, or 4096');
        process.exit(1);
      }
    } else if (arg.startsWith('--format=')) {
      const fmt = arg.split('=')[1].toLowerCase();
      if (['webp', 'jpg', 'jpeg', 'png'].includes(fmt)) {
        options.format = fmt === 'jpeg' ? 'jpg' : fmt;
      } else {
        console.error('❌ Invalid format. Use: webp, jpg, or png');
        process.exit(1);
      }
    } else if (arg.startsWith('--output=')) {
      options.outputDir = arg.split('=')[1];
    }
  });

  const converter = new CubemapConverter();
  
  try {
    const startTime = Date.now();
    await converter.convertToCubemap(inputPath, options);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏱️  Conversion completed in ${duration}s`);
    console.log('🎉 Ready for use with MEGAMEAL Skybox component!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Export for use as module and run CLI if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { CubemapConverter };