#!/usr/bin/env node

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const PORT = 3001;

// Function to find an available port
async function findAvailablePort(startPort = PORT) {
  return new Promise((resolve) => {
    const testServer = http.createServer();
    testServer.listen(startPort, () => {
      const port = testServer.address().port;
      testServer.close(() => resolve(port));
    });
    testServer.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

// Simple static file serving for tools/app directory only
function serveToolsFile(res, requestPath) {
  const filePath = path.join(__dirname, 'app', requestPath);
  
  // Security: ensure path is within tools/app
  if (!filePath.startsWith(path.join(__dirname, 'app'))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access denied');
    return;
  }
  
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json'
      };
      
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
      res.end(content);
      return;
    }
  } catch (error) {
    console.error('Error serving file:', error);
  }
  
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('File not found');
}

// Simple HTTP server - focused responsibilities only
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle favicon
  if (pathname === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve main application
  if (pathname === '/' || pathname === '/index.html') {
    serveToolsFile(res, 'index.html');
    return;
  }

  // Serve tools/app static assets
  if (pathname === '/styles.css' || pathname === '/client.js') {
    serveToolsFile(res, pathname.substring(1));
    return;
  }

  // Serve project assets from /public
  if (pathname.startsWith('/assets/') || pathname.startsWith('/terrain/') || pathname.startsWith('/models/')) {
    try {
      const projectRoot = path.resolve('..');
      const filePath = path.join(projectRoot, 'public', pathname.substring(1));

      // Security: Ensure path is within project public directory
      if (!filePath.startsWith(path.join(projectRoot, 'public'))) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Access denied');
        return;
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.glb': 'application/octet-stream',
          '.json': 'application/json'
        };
        const contentType = contentTypes[ext] || 'text/plain';

        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
        return;
      }
    } catch (error) {
      console.error('Error serving project asset:', error);
      // Fall through to 404
    }
  }

  // API: Get project files through API instead of direct serving
  if (pathname === '/api/project-file' && req.method === 'GET') {
    const filePath = parsedUrl.query.path;
    
    if (!filePath) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'File path required' }));
      return;
    }
    
    try {
      const projectRoot = path.resolve('..');
      const fullPath = path.join(projectRoot, filePath);
      
      // Security: ensure path is within project
      if (!fullPath.startsWith(projectRoot)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Access denied' }));
        return;
      }
      
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const content = fs.readFileSync(fullPath);
        const ext = path.extname(fullPath).toLowerCase();
        
        if (ext === '.json') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(content);
        } else {
          res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
          res.end(content);
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'File not found' }));
      }
    } catch (error) {
      console.error('Error serving project file:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Server error' }));
    }
    return;
  }

  // API: Browse project directory
  if (pathname === '/api/browse' && req.method === 'GET') {
    const dirPath = parsedUrl.query.path || '';
    
    try {
      const projectRoot = path.resolve('..');
      const fullPath = path.join(projectRoot, dirPath);
      
      // Security: ensure path is within project
      if (!fullPath.startsWith(projectRoot)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Access denied' }));
        return;
      }
      
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        const items = fs.readdirSync(fullPath).map(name => {
          const itemPath = path.join(fullPath, name);
          const stats = fs.statSync(itemPath);
          return {
            name,
            path: path.relative(projectRoot, itemPath).replace(/\\\\/g, '/'),
            isDirectory: stats.isDirectory(),
            size: stats.isDirectory() ? null : stats.size,
            modified: stats.mtime
          };
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, items, currentPath: dirPath }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Directory not found' }));
      }
    } catch (error) {
      console.error('Browse error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Server error' }));
    }
    return;
  }

  // ================================================================
  // API ENDPOINTS - Extracted from original app.js
  // ================================================================

  // Heightmap generation API
  if (pathname === '/api/generate-heightmap' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { inputFile, resolution, outputDir, worldSize } = JSON.parse(body);
        
        console.log('🔥 Heightmap generation request:', { inputFile, resolution, outputDir, worldSize });
        
        if (!inputFile) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Input file is required' }));
          return;
        }
        
        // Build command
        const projectRoot = path.resolve('..');
        const inputFilePath = path.join(projectRoot, inputFile);
        const bakerPath = path.join(projectRoot, 'tools/heightmap-generator/heightmap_baker_node.mjs');
        
        // Check if files exist
        if (!fs.existsSync(inputFilePath)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: `Input file not found: ${inputFilePath}` }));
          return;
        }
        
        if (!fs.existsSync(bakerPath)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: `Heightmap baker not found: ${bakerPath}` }));
          return;
        }
        
        const args = [bakerPath, inputFilePath];
        
        if (resolution && resolution !== 512) args.push(`--resolution=${resolution}`);
        if (outputDir) args.push(`--output=${outputDir}`);
        if (worldSize) args.push(`--worldSize=${worldSize}`);
        
        console.log('🚀 Executing:', 'node', args.join(' '));
        
        // Execute process
        const child = spawn('node', args, { cwd: projectRoot, stdio: 'pipe' });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        
        child.on('close', (code) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          if (code === 0) {
            res.end(JSON.stringify({
              success: true, 
              message: 'Heightmap generated successfully!',
              outputPath: outputDir || path.dirname(inputFilePath)
            }));
          } else {
            res.end(JSON.stringify({
              success: false, 
              message: `Generation failed (exit code ${code}): ${stderr || stdout}`
            }));
          }
        });
        
        child.on('error', (error) => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: `Process error: ${error.message}` }));
        });
        
      } catch (error) {
        console.error('API error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Server error: ' + error.message }));
      }
    });
    
    return;
  }

  // GLB Analysis API
  if (pathname === '/api/analyze-glb' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { glbPath, filePath } = JSON.parse(body);
        const targetPath = glbPath || filePath;
        
        if (!targetPath) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'GLB file path is required' }));
          return;
        }
        
        const projectRoot = path.resolve('..');
        const fullPath = path.join(projectRoot, targetPath);
        
        if (!fs.existsSync(fullPath)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: `File not found: ${fullPath}` }));
          return;
        }
        
        console.log('Analyzing GLB file:', fullPath);
        
        const stats = fs.statSync(fullPath);
        console.log('File stats:', { size: stats.size, mtime: stats.mtime });
        
        const sizeBytes = stats.size || 0;
        const sizeKB = Math.round(sizeBytes / 1024);
        const sizeFormatted = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)}MB` : `${sizeKB}KB`;
        
        // Use heightmap baker to analyze GLB geometry
        const rootDir = path.resolve('..');
        const bakerPath = path.join(rootDir, 'tools/heightmap-generator/heightmap_baker_node.mjs');
        
        try {
          // Call heightmap baker in analyze-only mode
          const child = spawn('node', [bakerPath, fullPath, '--analyze-only'], { 
            cwd: rootDir, 
            stdio: 'pipe' 
          });
          
          let stdout = '';
          let stderr = '';
          
          child.stdout.on('data', (data) => { stdout += data.toString(); });
          child.stderr.on('data', (data) => { stderr += data.toString(); });
          
          child.on('close', (code) => {
            if (code === 0) {
              // Parse dimensional data from output
              const worldSizeMatch = stdout.match(/worldSize:\s+([\d.]+)/);
              const minHeightMatch = stdout.match(/minHeight:\s+([\d.-]+)/);
              const maxHeightMatch = stdout.match(/maxHeight:\s+([\d.-]+)/);
              
              const response = {
                success: true,
                message: `GLB analyzed successfully!`,
                analysis: {
                  size: sizeBytes,
                  sizeKB: sizeKB,
                  sizeFormatted: sizeFormatted,
                  modified: stats.mtime ? stats.mtime.toISOString() : 'Unknown',
                  path: fullPath
                }
              };
              
              // Add dimensional data if available
              if (worldSizeMatch && minHeightMatch && maxHeightMatch) {
                response.worldSize = parseFloat(worldSizeMatch[1]);
                response.minHeight = parseFloat(minHeightMatch[1]);
                response.maxHeight = parseFloat(maxHeightMatch[1]);
              }
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(response));
            } else {
              // Fall back to basic file analysis if geometry analysis fails
              console.warn('GLB geometry analysis failed, falling back to basic analysis');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                message: `GLB file found but geometry analysis failed`,
                analysis: {
                  size: sizeBytes,
                  sizeKB: sizeKB,
                  sizeFormatted: sizeFormatted,
                  modified: stats.mtime ? stats.mtime.toISOString() : 'Unknown',
                  path: fullPath
                }
              }));
            }
          });
          
          child.on('error', (error) => {
            console.error('GLB analysis process error:', error);
            // Fall back to basic analysis
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: `GLB file found but geometry analysis unavailable`,
              analysis: {
                size: sizeBytes,
                sizeKB: sizeKB,
                sizeFormatted: sizeFormatted,
                modified: stats.mtime ? stats.mtime.toISOString() : 'Unknown',
                path: fullPath
              }
            }));
          });
          
        } catch (error) {
          console.error('Failed to run GLB analysis:', error);
          // Fall back to basic file analysis
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: `File analyzed successfully (basic analysis only)!`,
            analysis: {
              size: sizeBytes,
              sizeKB: sizeKB,
              sizeFormatted: sizeFormatted,
              modified: stats.mtime ? stats.mtime.toISOString() : 'Unknown',
              path: fullPath
            }
          }));
        }
        
      } catch (error) {
        console.error('GLB Analysis error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Analysis error: ' + error.message }));
      }
    });
    
    return;
  }

  // Level processing API
  if (pathname === '/api/process-level' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { inputFile, chunkSize, outputDir, worldSize } = JSON.parse(body);
        
        console.log('🗺️ Level processing request:', { inputFile, chunkSize, outputDir, worldSize });
        
        if (!inputFile) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Input file is required' }));
          return;
        }
        
        const projectRoot = path.resolve('..');
        const processorPath = path.join(projectRoot, 'tools/levelprocessor/simplified-processor.js');
        const inputFilePath = path.join(projectRoot, inputFile);
        
        if (!fs.existsSync(inputFilePath)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: `Input file not found: ${inputFilePath}` }));
          return;
        }
        
        const args = [processorPath, inputFilePath];
        
        if (chunkSize) args.push(`--chunkSize=${chunkSize}`);
        if (outputDir) args.push(`--outputDir=${outputDir}`);
        if (worldSize) args.push(`--worldSize=${worldSize}`);
        
        console.log('🚀 Executing:', 'node', args.join(' '));
        
        const child = spawn('node', args, { cwd: projectRoot, stdio: 'pipe' });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        
        child.on('close', (code) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          if (code === 0) {
            res.end(JSON.stringify({
              success: true,
              message: 'Level processed successfully!',
              output: stdout,
              outputDir: outputDir || path.dirname(inputFilePath)
            }));
          } else {
            res.end(JSON.stringify({
              success: false,
              message: `Processing failed (exit code ${code}): ${stderr || stdout}`
            }));
          }
        });
        
        child.on('error', (error) => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: `Process error: ${error.message}` }));
        });
        
      } catch (error) {
        console.error('Level processing error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Processing error: ' + error.message }));
      }
    });
    
    return;
  }

  // Level generation API
  if (pathname === '/api/generate-level' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { levelName, levelId, templateFile, outputDir } = JSON.parse(body);
        
        console.log('🎮 Level generation request:', { levelName, levelId, templateFile, outputDir });
        
        if (!levelName || !levelId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Level name and ID are required' }));
          return;
        }
        
        const projectRoot = path.resolve('..');
        const generatorPath = path.join(projectRoot, 'tools/levelprocessor/level-generator.js');
        
        const args = [generatorPath, `--name=${levelName}`, `--id=${levelId}`];
        
        if (templateFile) args.push(`--template=${templateFile}`);
        if (outputDir) args.push(`--output=${outputDir}`);
        
        console.log('🚀 Executing:', 'node', args.join(' '));
        
        const child = spawn('node', args, { cwd: projectRoot, stdio: 'pipe' });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        
        child.on('close', (code) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          if (code === 0) {
            res.end(JSON.stringify({
              success: true,
              message: 'Level generated successfully!',
              output: stdout,
              outputDir: outputDir || path.join(projectRoot, 'src/threlte/levels')
            }));
          } else {
            res.end(JSON.stringify({
              success: false,
              message: `Generation failed (exit code ${code}): ${stderr || stdout}`
            }));
          }
        });
        
        child.on('error', (error) => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: `Process error: ${error.message}` }));
        });
        
      } catch (error) {
        console.error('Level generation error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Generation error: ' + error.message }));
      }
    });
    
    return;
  }

  // Unified pipeline API
  if (pathname === '/api/unified-pipeline' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const params = JSON.parse(body);
        
        console.log('🚀 Unified pipeline request:', params);
        
        const projectRoot = path.resolve('..');
        const pipelinePath = path.join(projectRoot, 'tools/unified-terrain-pipeline.js');
        
        if (!fs.existsSync(pipelinePath)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            message: `Unified pipeline script not found: ${pipelinePath}` 
          }));
          return;
        }
        
        // Create a temporary config file for the pipeline
        const configPath = path.join(projectRoot, 'tools', 'temp-pipeline-config.json');
        
        // Write the config file
        fs.writeFileSync(configPath, JSON.stringify(params, null, 2));
        
        const args = [pipelinePath, configPath];
        
        console.log('🚀 Executing unified pipeline with config:', configPath);
        
        const child = spawn('node', args, { cwd: projectRoot, stdio: 'pipe' });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
          process.stdout.write(data);
          stdout += data.toString();
        });
        child.stderr.on('data', (data) => {
          process.stderr.write(data);
          stderr += data.toString();
        });
        
        child.on('close', (code) => {
          // Clean up temporary config file
          try {
            if (fs.existsSync(configPath)) {
              fs.unlinkSync(configPath);
            }
          } catch (cleanupError) {
            console.warn('Failed to clean up temp config:', cleanupError.message);
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          if (code === 0) {
            res.end(JSON.stringify({
              success: true,
              message: 'Unified pipeline completed successfully!',
              output: stdout,
              levelId: params.id || 'Generated Level'
            }));
          } else {
            res.end(JSON.stringify({
              success: false,
              message: `Pipeline failed (exit code ${code}): ${stderr || stdout}`
            }));
          }
        });
        
        child.on('error', (error) => {
          // Clean up temporary config file on error
          try {
            if (fs.existsSync(configPath)) {
              fs.unlinkSync(configPath);
            }
          } catch (cleanupError) {
            console.warn('Failed to clean up temp config on error:', cleanupError.message);
          }
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: `Process error: ${error.message}` }));
        });
        
      } catch (error) {
        console.error('Unified pipeline error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Pipeline error: ' + error.message }));
      }
    });
    
    return;
  }

  // Level scanning API
  if (pathname === '/api/levels/scan' && req.method === 'GET') {
    try {
      const projectRoot = path.resolve('..');
      const levelsDir = path.join(projectRoot, 'src/threlte/levels');
      
      if (!fs.existsSync(levelsDir)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, levels: [] }));
        return;
      }
      
      const levels = [];
      const files = fs.readdirSync(levelsDir);
      
      for (const file of files) {
        if (file.endsWith('.svelte')) {
          const filePath = path.join(levelsDir, file);
          const stats = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Extract level name from file content or filename
          const nameMatch = content.match(/export\s+let\s+name\s*=\s*['"`]([^'"`]+)['"`]/);
          const displayName = nameMatch ? nameMatch[1] : file.replace('.svelte', '');
          
          levels.push({
            filename: file,
            displayName: displayName,
            path: `src/threlte/levels/${file}`,
            size: stats.size,
            modified: stats.mtime.toISOString()
          });
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, levels }));
      
    } catch (error) {
      console.error('Level scanning error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Scan error: ' + error.message }));
    }
    
    return;
  }

  // Pure level stars API
  if (pathname === '/api/pure-level-stars' && req.method === 'GET') {
    // Implementation would go here
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Pure level stars functionality not yet implemented' }));
    return;
  }

  // Starmap data API
  if (pathname === '/api/starmap/data' && req.method === 'GET') {
    try {
      const projectRoot = path.resolve('..');
      const configPath = path.join(projectRoot, 'tools/pure-level-stars-config.json');
      
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, config }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, config: {} }));
      }
    } catch (error) {
      console.error('Starmap data error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Starmap data error: ' + error.message }));
    }
    return;
  }

  // Starmap save API
  if (pathname === '/api/starmap/save' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const config = JSON.parse(body);
        const projectRoot = path.resolve('..');
        const configPath = path.join(projectRoot, 'tools/pure-level-stars-config.json');
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Starmap configuration saved successfully!' }));
        
      } catch (error) {
        console.error('Starmap save error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Save error: ' + error.message }));
      }
    });
    
    return;
  }

  // Save level config API
  if (pathname === '/api/save-level-config' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { filename, config } = JSON.parse(body);
        
        if (!filename) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Filename is required' }));
          return;
        }
        
        const projectRoot = path.resolve('..');
        const configPath = path.join(projectRoot, 'tools/generated_configs', filename);
        
        // Ensure directory exists
        const configDir = path.dirname(configPath);
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: `Configuration saved to ${filename}`,
          path: configPath
        }));
        
      } catch (error) {
        console.error('Config save error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Save error: ' + error.message }));
      }
    });
    
    return;
  }

  // Update manifest API
  if (pathname === '/api/update-manifest' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { filePath, content } = JSON.parse(body);
        
        if (!filePath || !content) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'filePath and content are required' }));
          return;
        }
        
        const projectRoot = path.resolve('..');
        const fullPath = path.join(projectRoot, 'public', filePath);
        
        // Security check: ensure path is within /public/terrain/ directory
        if (!fullPath.startsWith(path.join(projectRoot, 'public', 'terrain'))) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Access denied: path must be within /terrain/ directory' }));
          return;
        }
        
        // Validate JSON content
        try {
          JSON.parse(content);
        } catch (jsonError) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Invalid JSON content: ' + jsonError.message }));
          return;
        }
        
        // Write the manifest file
        fs.writeFileSync(fullPath, content, 'utf8');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: `Manifest updated successfully`,
          path: fullPath.replace(projectRoot, '.')
        }));
        
      } catch (error) {
        console.error('Manifest update error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Update error: ' + error.message }));
      }
    });
    
    return;
  }

  // Convert cubemap API
  if (pathname === '/api/convert-cubemap' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { inputFile, outputDir, format } = JSON.parse(body);
        
        console.log('🎆 Cubemap conversion request:', { inputFile, outputDir, format });
        
        if (!inputFile) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Input file is required' }));
          return;
        }
        
        const projectRoot = path.resolve('..');
        const converterPath = path.join(projectRoot, 'tools/cubemap-converter/cubemap-converter.js');
        const inputFilePath = path.join(projectRoot, inputFile);
        
        if (!fs.existsSync(inputFilePath)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: `Input file not found: ${inputFilePath}` }));
          return;
        }
        
        const args = [converterPath, inputFilePath];
        
        if (outputDir) args.push(`--output=${outputDir}`);
        if (format) args.push(`--format=${format}`);
        
        console.log('🚀 Executing:', 'node', args.join(' '));
        
        const child = spawn('node', args, { cwd: projectRoot, stdio: 'pipe' });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        
        child.on('close', (code) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          if (code === 0) {
            res.end(JSON.stringify({
              success: true,
              message: 'Cubemap converted successfully!',
              output: stdout,
              outputDir: outputDir || path.dirname(inputFilePath)
            }));
          } else {
            res.end(JSON.stringify({
              success: false,
              message: `Conversion failed (exit code ${code}): ${stderr || stdout}`
            }));
          }
        });
        
        child.on('error', (error) => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: `Process error: ${error.message}` }));
        });
        
      } catch (error) {
        console.error('Cubemap conversion error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Conversion error: ' + error.message }));
      }
    });
    
    return;
  }

  // Get level manifests API
  if (pathname === '/api/get-level-manifests' && req.method === 'GET') {
    try {
      const projectRoot = path.resolve('..');
      const terrainDir = path.join(projectRoot, 'public/terrain');
      
      if (!fs.existsSync(terrainDir)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, levels: [] }));
        return;
      }
      
      const manifests = [];
      const files = fs.readdirSync(terrainDir);
      
      for (const file of files) {
        if (file.endsWith('.manifest.json')) {
          const manifestPath = path.join(terrainDir, file);
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const levelId = file.replace('.manifest.json', '');
            manifests.push({
              levelId: levelId,
              path: `public/terrain/${file}`,
              name: manifest.name || levelId,
              ...manifest
            });
          } catch (error) {
            console.error(`Error reading manifest ${file}:`, error);
          }
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, levels: manifests }));
      
    } catch (error) {
      console.error('Get manifests error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Manifests error: ' + error.message }));
    }
    
    return;
  }

  // Default 404 response
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// ================================================================
// SERVER STARTUP CODE
// ================================================================

// Start server with intelligent port selection
async function startServer() {
  const availablePort = await findAvailablePort();
  server.listen(availablePort, () => {
    console.log('🛠️  MEGAMEAL Development Tools (Simple)');
    console.log('='.repeat(60));
    if (availablePort !== PORT) {
      console.log(`⚠️  Port ${PORT} was in use, using port ${availablePort} instead`);
    }
    console.log(`🌐 Server running at: http://localhost:${availablePort}`);
    console.log('📁 Project root:', path.resolve('..'));
    console.log('🚀 Simplified server - tools/app only + API endpoints!');
    console.log('');
    console.log('Available API endpoints:');
    console.log('  • /api/generate-heightmap');
    console.log('  • /api/analyze-glb');
    console.log('  • /api/process-level');
    console.log('  • /api/generate-level');
    console.log('  • /api/unified-pipeline');
    console.log('  • /api/levels/scan');
    console.log('  • /api/pure-level-stars');
    console.log('  • /api/starmap/data');
    console.log('  • /api/starmap/save');
    console.log('  • /api/save-level-config');
    console.log('  • /api/update-manifest');
    console.log('  • /api/convert-cubemap');
    console.log('  • /api/get-level-manifests');
    console.log('  • /api/project-file (for accessing project files)');
    console.log('  • /api/browse (for directory browsing)');
    console.log('');
    console.log('Press Ctrl+C to stop');
  });
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down MEGAMEAL Development Tools...');
  process.exit(0);
});