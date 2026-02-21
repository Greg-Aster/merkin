// --- Port Display Logic ---
document.addEventListener('DOMContentLoaded', () => {
  // Update port display with current port from URL
  const portElement = document.getElementById('port-display');
  if (portElement) {
    portElement.textContent = window.location.port || '80';
  }
  
  // --- Tabbed Interface Logic ---
  const nav = document.querySelector('.nav-rail');
  const panes = document.querySelectorAll('.tool-pane');
  const links = document.querySelectorAll('.nav-link');

  if (links.length > 0) {
    links[0].classList.add('active');
    const firstPaneId = links[0].getAttribute('href').substring(1);
    document.getElementById(firstPaneId).style.display = 'block';
  }

  nav.addEventListener('click', (e) => {
    if (e.target.tagName !== 'A') return;
    e.preventDefault();
    const targetId = e.target.getAttribute('href').substring(1);

    links.forEach(link => link.classList.remove('active'));
    e.target.classList.add('active');

    panes.forEach(pane => {
      pane.style.display = pane.id === targetId ? 'block' : 'none';
    });
  });

  // TriMesh mode toggle handler
  const trimeshModeSelect = document.getElementById('unified-trimesh-mode');
  if (trimeshModeSelect) {
    trimeshModeSelect.addEventListener('change', function() {
      const chunkedOptions = document.getElementById('chunked-options');
      if (chunkedOptions) {
        chunkedOptions.style.display = this.value === 'chunked' ? 'block' : 'none';
      }
    });
  }

  // Ocean feature toggle
  const oceanCheckbox = document.getElementById('unified-feature-ocean');
  if (oceanCheckbox) {
    oceanCheckbox.addEventListener('change', function() {
      const oceanSettings = document.getElementById('unified-ocean-settings');
      if (oceanSettings) {
        oceanSettings.style.display = this.checked ? 'block' : 'none';
      }
    });
  }
});

// --- Tool Logic ---

// Heightmap Generator
document.getElementById('generate-heightmap').addEventListener('click', async () => {
  const button = document.getElementById('generate-heightmap');
  const status = document.getElementById('heightmap-status');
  const inputFile = document.getElementById('heightmap-input').value;
  const resolution = parseInt(document.getElementById('heightmap-resolution').value);
  const outputDir = document.getElementById('heightmap-output').value;
  const worldSize = document.getElementById('heightmap-world-size').value;
  if (!inputFile.trim()) { addHeightmapLog('❌ Error: Input file is required', 'error'); return; }
  button.disabled = true; button.textContent = 'Generating...'; status.className = 'status processing'; status.textContent = 'Processing';
  addHeightmapLog('> Processing: ' + inputFile, 'info'); addHeightmapLog('> Resolution: ' + resolution + 'x' + resolution, 'info');
  try {
    const response = await fetch('/api/generate-heightmap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inputFile, resolution, outputDir, worldSize: worldSize ? parseInt(worldSize) : null }) });
    const result = await response.json();
    if (response.ok && result.success) {
      addHeightmapLog('✅ Success: ' + result.message, 'success');
      if (result.outputPath) addHeightmapLog('📁 Files saved to: ' + result.outputPath, 'success');
      status.className = 'status ready'; status.textContent = 'Complete';
    } else { addHeightmapLog('❌ Error: ' + (result.message || 'Unknown error'), 'error'); status.className = 'status error'; status.textContent = 'Error'; }
  } catch (error) { addHeightmapLog('❌ Network Error: ' + error.message, 'error'); status.className = 'status error'; status.textContent = 'Error';
  } finally { button.disabled = false; button.textContent = 'Generate Heightmap'; }
});

// Level Processor
document.getElementById('process-level').addEventListener('click', async () => {
  const button = document.getElementById('process-level');
  const status = document.getElementById('processor-status');
  const inputFile = document.getElementById('processor-input').value;
  const outputDir = document.getElementById('processor-output').value;
  const gridX = parseInt(document.getElementById('processor-gridx').value);
  const gridY = parseInt(document.getElementById('processor-gridy').value);
  const lodLevels = parseInt(document.getElementById('processor-lod').value);
  const enhanceQuality = document.getElementById('processor-enhance').checked;
  if (!inputFile.trim()) { addProcessorLog('❌ Error: Input file is required', 'error'); return; }
  button.disabled = true; button.textContent = 'Processing...'; status.className = 'status processing'; status.textContent = 'Processing';
  addProcessorLog('> Processing: ' + inputFile, 'info'); addProcessorLog('> Grid: ' + gridX + 'x' + gridY + ', LODs: ' + lodLevels, 'info');
  try {
    const response = await fetch('/api/process-level', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inputFile, outputDir, gridX, gridY, lodLevels, enhanceQuality }) });
    const result = await response.json();
    if (response.ok && result.success) {
      addProcessorLog('✅ Success: ' + result.message, 'success');
      if (result.outputPath) addProcessorLog('📁 Files saved to: ' + result.outputPath, 'success');
      status.className = 'status ready'; status.textContent = 'Complete';
    } else { addProcessorLog('❌ Error: ' + (result.message || 'Unknown error'), 'error'); status.className = 'status error'; status.textContent = 'Error'; }
  } catch (error) { addProcessorLog('❌ Network Error: ' + error.message, 'error'); status.className = 'status error'; status.textContent = 'Error';
  } finally { button.disabled = false; button.textContent = 'Process Level'; }
});

// Level Generator
document.getElementById('generate-level').addEventListener('click', async () => {
  const button = document.getElementById('generate-level');
  const status = document.getElementById('generator-status');
  const name = document.getElementById('generator-name').value;
  const id = document.getElementById('generator-id').value;
  const type = document.getElementById('generator-type').value;
  const glbPath = document.getElementById('generator-glb').value;
  const heightmapPath = document.getElementById('generator-heightmap').value;
  const chunksPath = document.getElementById('generator-chunks').value;
  const outputDir = document.getElementById('generator-output').value;
  const enableOcean = document.getElementById('feature-ocean').checked;
  const enableVegetation = document.getElementById('feature-vegetation').checked;
  const enableFireflies = document.getElementById('feature-fireflies').checked;
  const enableStarMap = document.getElementById('feature-starmap').checked;
  if (!name.trim() || !id.trim() || !glbPath.trim()) { addGeneratorLog('❌ Error: Level name, ID, and GLB path are required', 'error'); return; }
  button.disabled = true; button.textContent = 'Generating...'; status.className = 'status processing'; status.textContent = 'Processing';
  addGeneratorLog('> Generating level: ' + name + ' (' + id + ')', 'info'); addGeneratorLog('> Type: ' + type + ', GLB: ' + glbPath, 'info');
  const features = [];
  if (enableOcean) features.push('Ocean'); if (enableVegetation) features.push('Vegetation'); if (enableFireflies) features.push('Fireflies'); if (enableStarMap) features.push('Star Map');
  if (features.length > 0) { addGeneratorLog('> Features: ' + features.join(', '), 'info'); }
  try {
    const response = await fetch('/api/generate-level', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, id, type, glbPath, outputDir, heightmapPath, chunksPath, enableOcean, enableVegetation, enableFireflies, enableStarMap }) });
    const result = await response.json();
    if (response.ok && result.success) {
      addGeneratorLog('✅ Success: ' + result.message, 'success');
      if (result.manifestPath) addGeneratorLog('📋 Manifest: ' + result.manifestPath, 'success');
      if (result.componentPath) addGeneratorLog('🎮 Component: ' + result.componentPath, 'success');
      addGeneratorLog('🎉 Level "' + result.levelId + '" ready for use!', 'success');
      status.className = 'status ready'; status.textContent = 'Complete';
    } else { addGeneratorLog('❌ Error: ' + (result.message || 'Unknown error'), 'error'); status.className = 'status error'; status.textContent = 'Error'; }
  } catch (error) { addGeneratorLog('❌ Network Error: ' + error.message, 'error'); status.className = 'status error'; status.textContent = 'Error';
  } finally { button.disabled = false; button.textContent = 'Generate Level'; }
});

// Unified Pipeline Handler
document.getElementById('generate-unified').addEventListener('click', async () => {
  const button = document.getElementById('generate-unified');
  const status = document.getElementById('unified-status');
  const name = document.getElementById('unified-name').value;
  const id = document.getElementById('unified-id').value;
  const type = document.getElementById('unified-type').value;
  const glbPath = document.getElementById('unified-glb').value;
  const resolution = document.getElementById('unified-resolution').value;
  const gridX = document.getElementById('unified-gridx').value;
  const gridY = document.getElementById('unified-gridy').value;
  const lodLevels = document.getElementById('unified-lod').value;
  const enableOcean = document.getElementById('unified-feature-ocean').checked;
  const enableVegetation = document.getElementById('unified-feature-vegetation').checked;
  const enableFireflies = document.getElementById('unified-feature-fireflies').checked;
  const enableStarMap = document.getElementById('unified-feature-starmap').checked;
  const worldSize = parseFloat(document.getElementById('unified-worldsize').value) || null;
  const minHeight = parseFloat(document.getElementById('unified-minheight').value) || null;
  const maxHeight = parseFloat(document.getElementById('unified-maxheight').value) || null;
  
  if (!name.trim() || !id.trim() || !glbPath.trim()) { 
    addUnifiedLog('❌ Error: Level name, ID, and GLB path are required', 'error'); 
    return; 
  }
  
  button.disabled = true; 
  button.textContent = 'Processing Pipeline...'; 
  status.className = 'status processing'; 
  status.textContent = 'Running Pipeline';
  
  addUnifiedLog('🚀 Starting unified terrain pipeline...', 'info');
  addUnifiedLog('> Level: ' + name + ' (' + id + ')', 'info');
  addUnifiedLog('> Type: ' + type + ', GLB: ' + glbPath, 'info');
  addUnifiedLog('> Resolution: ' + resolution + 'x' + resolution, 'info');
  addUnifiedLog('> Grid: ' + gridX + 'x' + gridY + ', LODs: ' + lodLevels, 'info');
  
  const features = [];
  if (enableOcean) features.push('Ocean');
  if (enableVegetation) features.push('Vegetation');
  if (enableFireflies) features.push('Fireflies');
  if (enableStarMap) features.push('Star Map');
  if (features.length > 0) addUnifiedLog('> Features: ' + features.join(', '), 'info');
  
  try {
    // Build optional ocean/style configs
    let ocean = undefined;
    if (enableOcean) {
      const oceanWidth = parseInt(document.getElementById('unified-ocean-width').value) || 1000;
      const oceanHeight = parseInt(document.getElementById('unified-ocean-height').value) || 1000;
      const enableRising = document.getElementById('unified-ocean-enableRising').checked;
      const initialLevel = parseFloat(document.getElementById('unified-ocean-initial').value) || 0;
      const targetLevel = parseFloat(document.getElementById('unified-ocean-target').value) || 0;
      const riseRate = parseFloat(document.getElementById('unified-ocean-riseRate').value) || 0.01;
      const underwaterFogDensity = parseFloat(document.getElementById('unified-ocean-underDensity').value) || 0.1;
      let underwaterFogColorRaw = document.getElementById('unified-ocean-underColor').value.trim();
      let underwaterFogColor = 0x006994;
      if (underwaterFogColorRaw) {
        if (underwaterFogColorRaw.startsWith('#')) {
          underwaterFogColor = parseInt(underwaterFogColorRaw.replace('#', ''), 16);
        } else if (underwaterFogColorRaw.startsWith('0x')) {
          underwaterFogColor = parseInt(underwaterFogColorRaw, 16);
        } else {
          const n = Number(underwaterFogColorRaw);
          underwaterFogColor = isNaN(n) ? underwaterFogColor : n;
        }
      }
      const surfaceFogDensity = parseFloat(document.getElementById('unified-ocean-surfaceDensity').value) || 0.001;
      ocean = {
        size: { width: oceanWidth, height: oceanHeight },
        enableRising,
        initialLevel,
        targetLevel,
        riseRate,
        enableAnimation: true,
        underwaterFogDensity,
        underwaterFogColor,
        surfaceFogDensity
      };
    }

    const style = {
      fog: {
        enabled: true,
        color: document.getElementById('unified-style-fog-color').value || '#87CEEB',
        density: parseFloat(document.getElementById('unified-style-fog-density').value) || 0.002
      }
    };

    // TriMesh physics configuration
    const trimeshMode = document.getElementById('unified-trimesh-mode').value;
    const trimeshDownsample = parseInt(document.getElementById('unified-trimesh-downsample').value);
    const trimeshChunkVerts = parseInt(document.getElementById('unified-trimesh-chunkVerts').value);
    const trimeshActiveRadius = parseInt(document.getElementById('unified-trimesh-activeRadius').value);

    const config = {
      name, id, type, glbPath,
      resolution: parseInt(resolution),
      gridX: parseInt(gridX),
      gridY: parseInt(gridY),
      lodLevels: parseInt(lodLevels),
      worldSize, minHeight, maxHeight,
      outputDir: 'public', // Fixed path
      enableOcean, enableVegetation, enableFireflies, enableStarMap,
      ocean, style,
      // Modern TriMesh physics configuration
      collisionMode: 'trimesh',
      trimesh: {
        mode: trimeshMode,
        downsample: trimeshDownsample,
        chunkVerts: trimeshChunkVerts,
        activeRadius: trimeshActiveRadius
      }
    };
    
    const response = await fetch('/api/unified-pipeline', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(config) 
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      addUnifiedLog('✅ Unified pipeline completed successfully!', 'success');
      console.log('--- UNIFIED PIPELINE SERVER RESPONSE ---');
      console.log(result.output);
      console.log('------------------------------------');
      addUnifiedLog('🎉 All components are now synchronized', 'success');
      if (result.results) {
        if (result.results.heightmap) {
          addUnifiedLog('🗺️ Heightmap: ' + result.results.heightmap.imagePath, 'success');
        }
        if (result.results.chunks) {
          addUnifiedLog('🧩 Chunks: ' + result.results.chunks.directory, 'success');
        }
        if (result.results.level) {
          addUnifiedLog('📋 Manifest: ' + result.results.level.manifestPath, 'success');
          addUnifiedLog('🎮 Component: ' + result.results.level.componentPath, 'success');
        }
      }
      addUnifiedLog('🚀 Level "' + result.levelId + '" ready for use!', 'success');
      
      // Show preview if heightmap data is available
      if (result.heightmapBase64 && result.heightmapInfo) {
        showUnifiedPreview(result.heightmapBase64, result.heightmapInfo);
      }
      
      status.className = 'status ready'; 
      status.textContent = 'Complete';
    } else { 
      addUnifiedLog('❌ Pipeline Error: ' + (result.message || 'Unknown error'), 'error'); 
      status.className = 'status error'; 
      status.textContent = 'Error'; 
    }
  } catch (error) { 
    addUnifiedLog('❌ Network Error: ' + error.message, 'error'); 
    status.className = 'status error'; 
    status.textContent = 'Error';
  } finally { 
    button.disabled = false; 
    button.textContent = '🚀 Generate Complete Level'; 
  }
});

// Toggle ocean settings visibility
document.getElementById('unified-feature-ocean').addEventListener('change', (e) => {
  const panel = document.getElementById('unified-ocean-settings');
  panel.style.display = e.target.checked ? 'block' : 'none';
});

// Unified Pipeline - GLB Auto-detect functionality
document.getElementById('unified-autodetect').addEventListener('click', async () => {
  const button = event.target;
  const glbPath = document.getElementById('unified-glb').value.trim();
  
  if (!glbPath) {
    addUnifiedLog('⚠️ Please enter a GLB file path first', 'warning');
    return;
  }
  
  // Update button state
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = '🔍 Analyzing...';
  
  addUnifiedLog('🔍 Analyzing GLB dimensions...', 'info');
  
  try {
    const response = await fetch('/api/analyze-glb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ glbPath })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Check if dimensional data is available
      if (data.worldSize && data.minHeight !== undefined && data.maxHeight !== undefined) {
        // Auto-populate the dimension fields
        document.getElementById('unified-worldsize').value = data.worldSize.toFixed(1);
        document.getElementById('unified-minheight').value = data.minHeight.toFixed(2);
        document.getElementById('unified-maxheight').value = data.maxHeight.toFixed(2);
        
        addUnifiedLog('✅ Auto-detected dimensions: ' + data.worldSize.toFixed(1) + ' units world size, height range ' + data.minHeight.toFixed(2) + ' to ' + data.maxHeight.toFixed(2), 'info');
      } else {
        // File exists but no dimensional analysis available
        const analysis = data.analysis || {};
        addUnifiedLog('✅ GLB file found (' + (analysis.sizeFormatted || 'unknown size') + '), but dimensional analysis not available. Please enter dimensions manually.', 'warning');
      }
    } else {
      addUnifiedLog('❌ Analysis failed: ' + data.message, 'error');
    }
  } catch (error) {
    addUnifiedLog('❌ Analysis error: ' + error.message, 'error');
  } finally {
    // Restore button state
    button.disabled = false;
    button.textContent = originalText;
  }
});

function addHeightmapLog(message, type) { addLog('heightmap-logs', message, type); }
function addProcessorLog(message, type) { addLog('processor-logs', message, type); }
function addGeneratorLog(message, type) { addLog('generator-logs', message, type); }
function addUnifiedLog(message, type) { addLog('unified-logs', message, type); }
function addLog(containerId, message, type) {
  const logs = document.getElementById(containerId);
  const line = document.createElement('div');
  line.className = 'log-line ' + (type || 'info');
  line.textContent = '> ' + message;
  logs.appendChild(line);
  logs.scrollTop = logs.scrollHeight;
}

function showUnifiedPreview(heightmapBase64, heightmapInfo) {
  const previewContainer = document.getElementById('unified-preview');
  const canvasContainer = document.getElementById('unified-preview-canvas');
  const infoContainer = document.getElementById('unified-preview-info');
  
  // Show the preview container
  previewContainer.style.display = 'block';
  
  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 600;
  canvas.height = 600;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.border = '1px solid #333';
  
  // Clear container and add canvas
  canvasContainer.innerHTML = '';
  canvasContainer.appendChild(canvas);
  
  // Load and draw heightmap
  const img = new Image();
  img.onload = function() {
    // Draw heightmap scaled to canvas
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Draw grid overlay
    const gridX = heightmapInfo.gridX || 4;
    const gridY = heightmapInfo.gridY || 4;
    
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    
    // Draw vertical lines
    for (let i = 0; i <= gridX; i++) {
      const x = (i / gridX) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let i = 0; i <= gridY; i++) {
      const y = (i / gridY) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Add grid labels
    ctx.fillStyle = '#ff4444';
    ctx.font = '14px Arial';
    ctx.fillText(gridX + 'x' + gridY + ' Grid', 10, 25);
  };
  
  img.src = heightmapBase64;
  
  // Update info panel
  const pr = (id) => document.getElementById(id);
  if (pr('preview-resolution')) pr('preview-resolution').textContent = 'Resolution: ' + (heightmapInfo.resolution || 'Unknown');
  if (pr('preview-worldsize')) pr('preview-worldsize').textContent = 'World Size: ' + (heightmapInfo.worldSize || 'Unknown');
  if (pr('preview-heightrange')) pr('preview-heightrange').textContent = 'Height Range: ' + (heightmapInfo.minHeight || 0).toFixed(2) + ' to ' + (heightmapInfo.maxHeight || 0).toFixed(2);
  if (pr('preview-chunks')) pr('preview-chunks').textContent = 'Chunks: ' + gridX + 'x' + gridY + ' (' + (gridX * gridY) + ' total)';
  if (pr('preview-chunksize')) pr('preview-chunksize').textContent = 'Chunk Size: ' + (((heightmapInfo.worldSize || 0) / gridX).toFixed(1)) + ' units';
  if (pr('preview-lodlevels')) pr('preview-lodlevels').textContent = 'LOD Levels: ' + (heightmapInfo.lodLevels || 'Unknown');
  
  addUnifiedLog('📋 Preview generated with grid overlay', 'info');
}

// --- Level Editor & 3D Preview Logic ---
let editorScene, editorCamera, editorRenderer, editorControls, editorAnimationId;
let loadedLevel = null;
let levelConfig = null; // Client-side configuration object for real-time updates
let heightmapMesh = null;
let chunkMeshes = [];
let chunkBounds = []; // Bounding box helpers for visual debugging
let gridHelper = null;
let worldAxes = null; // World coordinate system helper

function addEditorLog(message, type) { addLog('editor-logs', message, type); }

// Dynamically load GLTFLoader if not present (CDN fallback)
async function ensureGLTFLoader() {
  if (typeof THREE === 'undefined') {
    addEditorLog('❌ THREE not available; cannot load GLTFs', 'error');
    return;
  }
  if (typeof THREE.GLTFLoader !== 'undefined') {
    return;
  }
  addEditorLog('ℹ️ GLTFLoader not found; attempting to load from CDN…', 'info');
  await loadScriptSequential([
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
    'https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js'
  ]);
  if (typeof THREE.GLTFLoader === 'undefined') {
    addEditorLog('⚠️ Failed to load GLTFLoader from CDNs; will show placeholders', 'warning');
  } else {
    addEditorLog('✅ GLTFLoader loaded from CDN', 'success');
  }
}

function loadScriptSequential(urls) {
  return new Promise((resolve) => {
    const tryNext = (i) => {
      if (i >= urls.length) return resolve();
      const s = document.createElement('script');
      s.src = urls[i];
      s.onload = () => resolve();
      s.onerror = () => tryNext(i + 1);
      document.head.appendChild(s);
    };
    tryNext(0);
  });
}

function initFallback3D(canvas) {
  // Create a simple HTML5 Canvas-based preview when Three.js is unavailable
  addEditorLog('🎨 Initializing fallback 2D preview...', 'info');
  
  canvas.innerHTML = '<canvas id="fallback-canvas" width="800" height="600" style="width: 100%; height: 100%; border: 1px solid #333; background: #111;"></canvas>' +
    '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #666; text-align: center; pointer-events: none;">' +
      '<div style="font-size: 2rem; margin-bottom: 1rem;">📐</div>' +
      '<div>2D Fallback Mode</div>' +
      '<div style="font-size: 0.8rem; margin-top: 0.5rem;">Three.js unavailable - showing parameter values</div>' +
    '</div>';
  
  const fallbackCanvas = document.getElementById('fallback-canvas');
  if (fallbackCanvas) {
    const ctx = fallbackCanvas.getContext('2d');
    renderFallback2D(ctx, fallbackCanvas.width, fallbackCanvas.height);
    addEditorLog('✅ Fallback preview ready', 'success');
  }
}

function renderFallback2D(ctx, width, height) {
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, width, height);
  
  // Display current level parameters if available
  if (levelConfig) {
    ctx.fillStyle = '#00ff00';
    ctx.font = '16px Courier New';
    
    const lines = [
      'Level Configuration:',
      'World Size: ' + levelConfig.worldSize,
      'Chunk Size: ' + levelConfig.chunkSize,
      'Grid: ' + levelConfig.gridX + ' x ' + levelConfig.gridY,
      'Height Range: ' + levelConfig.minHeight + ' to ' + levelConfig.maxHeight
    ];
    
    lines.forEach((line, index) => {
      ctx.fillText(line, 20, 40 + (index * 25));
    });
    
    // Draw simple grid representation
    ctx.strokeStyle = '#00ff44';
    ctx.lineWidth = 1;
    
    const gridSize = Math.min(width - 40, height - 200) / Math.max(levelConfig.gridX, levelConfig.gridY);
    const startX = 20;
    const startY = 180;
    
    for (let x = 0; x <= levelConfig.gridX; x++) {
      ctx.beginPath();
      ctx.moveTo(startX + x * gridSize, startY);
      ctx.lineTo(startX + x * gridSize, startY + levelConfig.gridY * gridSize);
      ctx.stroke();
    }
    
    for (let y = 0; y <= levelConfig.gridY; y++) {
      ctx.beginPath();
      ctx.moveTo(startX, startY + y * gridSize);
      ctx.lineTo(startX + levelConfig.gridX * gridSize, startY + y * gridSize);
      ctx.stroke();
    }
    
    // Label chunks
    ctx.fillStyle = '#88ff88';
    ctx.font = '12px Courier New';
    for (let x = 0; x < levelConfig.gridX; x++) {
      for (let y = 0; y < levelConfig.gridY; y++) {
        const chunkX = startX + x * gridSize + gridSize / 2 - 20;
        const chunkY = startY + y * gridSize + gridSize / 2;
        ctx.fillText(x + ',' + y, chunkX, chunkY);
      }
    }
  } else {
    // No level loaded
    ctx.fillStyle = '#666666';
    ctx.font = '18px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('Load a level manifest to see preview', width / 2, height / 2);
  }
}

function initEditor3D() {
  const canvas = document.getElementById('editor-canvas');
  if (!canvas || editorRenderer) return; // Already initialized or canvas not available
  
  addEditorLog('🔧 Initializing 3D preview...', 'info');
  
  // Clear placeholder content
  canvas.innerHTML = '';
  
  // Wait for Three.js to load if not immediately available
  if (typeof THREE === 'undefined') {
    addEditorLog('⏳ Waiting for Three.js to load...', 'info');
    setTimeout(() => {
      if (typeof THREE === 'undefined') {
        addEditorLog('❌ Three.js failed to load - using fallback preview', 'error');
        initFallback3D(canvas);
        return;
      }
      initEditor3D(); // Retry initialization
    }, 2000);
    return;
  }
  
  try {
    
    // Test Three.js functionality
    addEditorLog('🧪 Testing Three.js functionality...', 'info');
    const testScene = new THREE.Scene();
    const testGeometry = new THREE.BoxGeometry(1, 1, 1);
    const testMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const testMesh = new THREE.Mesh(testGeometry, testMaterial);
    testScene.add(testMesh);
    addEditorLog('✅ Three.js is working properly', 'success');
    
    // Create scene
    editorScene = new THREE.Scene();
    editorScene.background = new THREE.Color(0x111111);
    
    // Create camera
    const aspect = canvas.clientWidth / canvas.clientHeight || 1;
    editorCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
    editorCamera.position.set(200, 150, 200);
    
    // Create renderer
    editorRenderer = new THREE.WebGLRenderer({ antialias: true });
    editorRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    editorRenderer.shadowMap.enabled = true;
    editorRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvas.appendChild(editorRenderer.domElement);
    
    // Try to add orbit controls (may not be available)
    if (typeof THREE.OrbitControls !== 'undefined') {
      editorControls = new THREE.OrbitControls(editorCamera, editorRenderer.domElement);
      editorControls.enableDamping = true;
      editorControls.dampingFactor = 0.05;
      editorControls.screenSpacePanning = false;
      editorControls.minDistance = 10;
      editorControls.maxDistance = 2000;
      addEditorLog('✅ Orbit controls enabled', 'info');
    } else {
      addEditorLog('⚠️ Orbit controls not available - limited camera control', 'warning');
    }
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    editorScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(200, 300, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 1000;
    editorScene.add(directionalLight);
    
    // Create world axes helper (initially hidden)
    worldAxes = new THREE.AxesHelper(100);
    worldAxes.visible = false;
    editorScene.add(worldAxes);
    
    // Handle window resize
    window.addEventListener('resize', onEditorWindowResize);
    
    // Start render loop
    renderEditor3D();
    
    addEditorLog('✅ 3D preview initialized', 'success');
    
  } catch (error) {
    addEditorLog('❌ Failed to initialize 3D preview: ' + error.message, 'error');
    canvas.innerHTML = '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ff4444; text-align: center;"><div>❌ 3D Preview Error</div><div style="font-size: 0.8rem;">' + error.message + '</div></div>';
  }
}

function onEditorWindowResize() {
  if (!editorCamera || !editorRenderer) return;
  
  const canvas = document.getElementById('editor-canvas');
  const aspect = canvas.clientWidth / canvas.clientHeight;
  
  editorCamera.aspect = aspect;
  editorCamera.updateProjectionMatrix();
  editorRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
}

function renderEditor3D() {
  if (!editorScene || !editorCamera || !editorRenderer) return;
  
  if (editorControls) {
    editorControls.update();
  }
  
  editorRenderer.render(editorScene, editorCamera);
  editorAnimationId = requestAnimationFrame(renderEditor3D);
}

function cleanupEditor3D() {
  if (editorAnimationId) {
    cancelAnimationFrame(editorAnimationId);
    editorAnimationId = null;
  }
  
  if (editorRenderer) {
    const canvas = document.getElementById('editor-canvas');
    if (canvas && editorRenderer.domElement.parentNode) {
      canvas.removeChild(editorRenderer.domElement);
    }
    editorRenderer.dispose();
    editorRenderer = null;
  }
  
  window.removeEventListener('resize', onEditorWindowResize);
  
  editorScene = null;
  editorCamera = null;
  editorControls = null;
  loadedLevel = null;
  heightmapMesh = null;
  chunkMeshes = [];
  gridHelper = null;
}

// Level Editor Event Handlers
document.addEventListener('DOMContentLoaded', () => {
  // Initialize editor when the tab becomes active
  document.addEventListener('click', (e) => {
    if (e.target.matches('a[href="#tool-editor"]')) {
      setTimeout(() => {
        if (document.querySelector('#tool-editor').style.display !== 'none') {
          initEditor3D();
        }
      }, 100);
    }
  });
  
  // Update Preview button
  const updateBtn = document.getElementById('update-preview');
  if (updateBtn) {
    updateBtn.addEventListener('click', () => {
      if (!loadedLevel) {
        addEditorLog('⚠️ No level loaded', 'warning');
        return;
      }
      updateLevelPreview();
    });
  }
  
  // Display option checkboxes (including new visual debugging options)
  const displayOptions = ['show-heightmap', 'show-chunks', 'show-wireframe', 'show-grid', 'show-chunk-bounds', 'show-world-axes'];
  displayOptions.forEach(optionId => {
    const checkbox = document.getElementById(optionId);
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        if (levelConfig) updateVisualDebugging();
      });
    }
  });
  
  // Real-time input event listeners for property adjustment
  const propertyInputs = ['prop-chunksize', 'prop-gridx', 'prop-gridy'];
  propertyInputs.forEach(inputId => {
    const input = document.getElementById(inputId);
    if (input) {
      input.addEventListener('input', () => {
        if (levelConfig) updateLevelPreview();
      });
    }
  });
  
  // Save Config button
  const saveConfigBtn = document.getElementById('save-config');
  if (saveConfigBtn) {
    saveConfigBtn.addEventListener('click', async () => {
      if (!levelConfig) {
        addEditorLog('⚠️ No level loaded', 'warning');
        return;
      }
      await saveAdjustedConfiguration();
    });
  }
});

async function loadLevelFromManifest(manifestPath) {
  const status = document.getElementById('editor-status');
  const loadBtn = document.getElementById('load-level');
  
  try {
    status.className = 'status processing';
    status.textContent = 'Loading...';
    loadBtn.disabled = true;
    loadBtn.textContent = '🔄 Loading...';
    
    addEditorLog('📋 Loading manifest: ' + manifestPath, 'info');
    
    // Fetch the actual manifest file
    const response = await fetch('/api/project-file?path=' + encodeURIComponent(manifestPath));
    if (!response.ok) {
      throw new Error('Manifest file not found: ' + manifestPath);
    }
    
    // Parse the real manifest.json file
    const fileContent = await response.text();
    let actualManifest;
    
    try {
      actualManifest = JSON.parse(fileContent);
      addEditorLog('📋 Parsed manifest file successfully', 'success');
    } catch (parseError) {
      throw new Error('Invalid manifest JSON: ' + parseError.message);
    }
    
    // Validate required manifest fields
    const requiredFields = ['id', 'name', 'physics'];
    for (const field of requiredFields) {
      if (!actualManifest[field]) {
        throw new Error('Missing required manifest field: ' + field);
      }
    }
    
    // Extract level configuration from real manifest
    loadedLevel = {
      levelId: actualManifest.id,
      name: actualManifest.name,
      worldSize: actualManifest.physics.worldSize || 500,
      minHeight: actualManifest.physics.minHeight || -50,
      maxHeight: actualManifest.physics.maxHeight || 50,
      gridX: actualManifest.physics.gridX || 4,
      gridY: actualManifest.physics.gridY || 4,
      chunkSize: actualManifest.physics.chunkSize || (actualManifest.physics.worldSize / (actualManifest.physics.gridX || 4)),
      heightmapPath: actualManifest.assets ? actualManifest.assets.heightmap : null,
      chunksPath: actualManifest.assets ? actualManifest.assets.chunksPath : null,
      environmentPath: actualManifest.assets ? actualManifest.assets.environment : null,
      chunkTemplate: 'chunk_{x}_{y}_LOD0.glb'
    };
    
    addEditorLog('📊 Level: ' + loadedLevel.name + ' (' + loadedLevel.levelId + ')', 'info');
    
    // Create client-side configuration object for real-time updates
    levelConfig = {
      worldSize: loadedLevel.worldSize,
      chunkSize: loadedLevel.chunkSize,
      gridX: loadedLevel.gridX,
      gridY: loadedLevel.gridY,
      minHeight: loadedLevel.minHeight,
      maxHeight: loadedLevel.maxHeight
    };
    
    // Populate properties panel
    document.getElementById('prop-worldsize').value = levelConfig.worldSize;
    document.getElementById('prop-chunksize').value = levelConfig.chunkSize;
    document.getElementById('prop-gridx').value = levelConfig.gridX;
    document.getElementById('prop-gridy').value = levelConfig.gridY;
    document.getElementById('prop-minheight').value = levelConfig.minHeight;
    document.getElementById('prop-maxheight').value = levelConfig.maxHeight;
    
    // Show properties panel
    document.getElementById('level-properties').style.display = 'block';
    
    addEditorLog('✅ Manifest loaded: ' + loadedLevel.name, 'success');
    addEditorLog('📊 World: ' + loadedLevel.worldSize + ' units, Grid: ' + loadedLevel.gridX + 'x' + loadedLevel.gridY, 'info');
    
    // Initialize 3D preview if not already done
    if (!editorRenderer) {
      initEditor3D();
    }
    
    // Load the level into 3D preview
    if (editorRenderer) {
      await loadLevel3D();
    }
    
    status.className = 'status ready';
    status.textContent = 'Loaded';
    
  } catch (error) {
    addEditorLog('❌ Failed to load manifest: ' + error.message, 'error');
    status.className = 'status error';
    status.textContent = 'Error';
  } finally {
    loadBtn.disabled = false;
    loadBtn.textContent = '🔍 Load Level';
  }
}

async function loadLevel3D() {
  if (!editorScene || !loadedLevel) return;
  
  addEditorLog('🔧 Loading 3D assets...', 'info');
  
  // Clear existing level objects
  clearLevel3D();
  
  try {
    // Ensure GLTFLoader is available before attempting to load GLB assets
    await ensureGLTFLoader();

    // Snapshot UI options safely (avoid null .checked access)
    const ui = {
      showHeightmap: !!(document.getElementById('show-heightmap') && document.getElementById('show-heightmap').checked),
      showChunks: !!(document.getElementById('show-chunks') && document.getElementById('show-chunks').checked),
      wireframe: !!(document.getElementById('show-wireframe') && document.getElementById('show-wireframe').checked),
      showGrid: !!(document.getElementById('show-grid') && document.getElementById('show-grid').checked),
      showChunkBounds: !!(document.getElementById('show-chunk-bounds') && document.getElementById('show-chunk-bounds').checked),
      showWorldAxes: !!(document.getElementById('show-world-axes') && document.getElementById('show-world-axes').checked)
    };
    // For now, create placeholder objects since we can't assume GLTFLoader is available
    // In a real implementation with Three.js CDN, we would load actual heightmap and GLB files
    
    // Load heightmap using three.js displacementMap feature
    if (ui.showHeightmap && loadedLevel.heightmapPath) {
      // Try to load heightmap config to match resolution and vertical scale exactly
      let segs = 255;
      let heightOffset = levelConfig.minHeight;
      let heightScale = (levelConfig.maxHeight - levelConfig.minHeight);
      try {
        const configRelPath = 'public' + loadedLevel.heightmapPath.replace('.png', '_config.json');
        const cfgResp = await fetch('/api/project-file?path=' + encodeURIComponent(configRelPath));
        if (cfgResp.ok) {
          const cfg = await cfgResp.json();
          if (cfg && cfg.resolution) {
            const m = /^(\d+)x(\d+)$/.exec(cfg.resolution);
            if (m) {
              const rx = parseInt(m[1]);
              const rz = parseInt(m[2]);
              // Use resolution-1 segments to match pixel grid
              segs = Math.max(1, Math.min(rx, rz) - 1);
            }
          }
          if (typeof cfg.heightOffset === 'number') heightOffset = cfg.heightOffset;
          if (typeof cfg.heightScale === 'number') heightScale = cfg.heightScale;
          addEditorLog(`🧭 Heightmap config: res=${cfg.resolution}, offset=${heightOffset}, scale=${heightScale}`, 'info');
        }
      } catch (e) {
        // Ignore and fallback
      }

      // Create plane geometry matching heightmap sampling grid
      const heightmapGeometry = new THREE.PlaneGeometry(
        loadedLevel.worldSize,
        loadedLevel.worldSize,
        segs,
        segs
      );

      // Create texture loader
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        loadedLevel.heightmapPath,
        // Success callback
        (texture) => {
          // Create material with displacement mapping
          const heightmapMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            displacementMap: texture,
            displacementScale: heightScale,
            wireframe: ui.wireframe
          });

          // Create and add mesh
          heightmapMesh = new THREE.Mesh(heightmapGeometry, heightmapMaterial);
          heightmapMesh.rotateX(-Math.PI / 2); // Make horizontal
          heightmapMesh.position.y = heightOffset;
          heightmapMesh.receiveShadow = true;
          editorScene.add(heightmapMesh);

          addEditorLog('✅ Heightmap rendered (resolution-matched)', 'success');
        },
        // Progress callback
        (progress) => {},
        // Error callback
        (error) => {
          console.warn('Failed to load heightmap:', loadedLevel.heightmapPath, error);
          addEditorLog('⚠️ Failed to load heightmap', 'warning');
        }
      );

      addEditorLog('📦 Loading heightmap with displacementMap: ' + loadedLevel.heightmapPath, 'info');
    }
    
    // Load main environment GLB if available (full model for context)
    if (loadedLevel.environmentPath && typeof THREE.GLTFLoader !== 'undefined') {
      addEditorLog('📦 Loading main environment: ' + loadedLevel.environmentPath, 'info');
      
      const envLoader = new THREE.GLTFLoader();
      envLoader.load(
        loadedLevel.environmentPath,
        // Success callback
        (gltf) => {
          const envMesh = gltf.scene;
          envMesh.scale.setScalar(1);
          envMesh.position.set(0, 0, 0);
          
          // Make environment semi-transparent so chunks are visible
          envMesh.traverse((child) => {
            if (child.isMesh) {
              child.material = child.material.clone();
              child.material.transparent = true;
              child.material.opacity = 0.3;
              child.material.wireframe = ui.wireframe;
            }
          });
          
          envMesh.receiveShadow = true;
          editorScene.add(envMesh);
          
          addEditorLog('✅ Main environment loaded (transparent overlay)', 'success');
        },
        // Progress callback
        (progress) => {
          // Optional: show loading progress
        },
        // Error callback  
        (error) => {
          console.warn('Failed to load environment:', loadedLevel.environmentPath, error);
          addEditorLog('⚠️ Main environment failed to load', 'warning');
        }
      );
    }
    
    // Load actual GLB chunks (using levelConfig for real-time updates)
    if (ui.showChunks && loadedLevel.chunksPath) {
      const chunkSize = levelConfig.chunkSize;
      const gridX = levelConfig.gridX;
      const gridY = levelConfig.gridY;
      const halfWorld = levelConfig.worldSize / 2;
      
      addEditorLog('📦 Loading GLB chunks from: ' + loadedLevel.chunksPath, 'info');
      
      let chunksLoaded = 0;
      let chunkLoadErrors = 0;
      const totalChunks = gridX * gridY;
      
      for (let x = 0; x < gridX; x++) {
        for (let y = 0; y < gridY; y++) {
          // Try to load actual GLB file
          const chunkFileName = loadedLevel.chunkTemplate.replace('{x}', x).replace('{y}', y).replace('{z}', y);
          const chunkPath = loadedLevel.chunksPath + chunkFileName;
          
          if (typeof THREE.GLTFLoader !== 'undefined') {
            // Load real GLB file
            const loader = new THREE.GLTFLoader();
            const chunkSizeX = levelConfig.worldSize / levelConfig.gridX;
            const chunkSizeZ = levelConfig.worldSize / levelConfig.gridY;
            const halfWorld = levelConfig.worldSize / 2;
            const chunkPosition = {
              x: (x * chunkSizeX) - halfWorld + (chunkSizeX / 2),
              y: 0,
              z: (y * chunkSizeZ) - halfWorld + (chunkSizeZ / 2)
            };
            
            loader.load(
              chunkPath,
              // Success callback
              (gltf) => {
                const chunkMesh = gltf.scene;

                // Align chunk so its bounding-box min corner matches the tile's min corner.
                // This removes visible gaps when exported GLBs keep absolute vertex positions.
                chunkMesh.updateMatrixWorld(true);
                const boundingBox = new THREE.Box3().setFromObject(chunkMesh);
                const tileMinX = -halfWorld + (x * chunkSizeX);
                const tileMinZ = -halfWorld + (y * chunkSizeZ);
                const offsetX = tileMinX - boundingBox.min.x;
                const offsetZ = tileMinZ - boundingBox.min.z;
                chunkMesh.position.set(offsetX, 0, offsetZ);

                // Apply wireframe mode if enabled
                if (ui.wireframe) {
                  chunkMesh.traverse((child) => {
                    if (child.isMesh) {
                      child.material = child.material.clone();
                      child.material.wireframe = true;
                    }
                  });
                }

                chunkMesh.castShadow = true;
                chunkMesh.receiveShadow = true;
                editorScene.add(chunkMesh);
                chunkMeshes.push(chunkMesh);

                // Create bounding box helper for visual debugging (recompute after positioning)
                const positionedBox = new THREE.Box3().setFromObject(chunkMesh);
                const boxHelper = new THREE.Box3Helper(positionedBox, 0xffffff);
                boxHelper.visible = ui.showChunkBounds;
                editorScene.add(boxHelper);
                chunkBounds.push(boxHelper);

                chunksLoaded++;
                if (chunksLoaded + chunkLoadErrors === totalChunks) {
                  addEditorLog('✅ Loaded ' + chunksLoaded + ' GLB chunks (' + chunkLoadErrors + ' errors)', chunksLoaded > 0 ? 'success' : 'warning');
                }
              },
              // Progress callback
              (progress) => {
                // Optional: could show loading progress
              },
              // Error callback
              (error) => {
                console.warn('Failed to load chunk:', chunkPath, error);
                chunkLoadErrors++;
                
                // Create placeholder box for missing chunk
                const chunkGeometry = new THREE.BoxGeometry(chunkSize * 0.9, 10, chunkSize * 0.9);
            const chunkMaterial = new THREE.MeshLambertMaterial({ 
              color: 0xff4444, // Red to indicate missing
              wireframe: ui.wireframe,
              opacity: 0.5,
              transparent: true
            });
                
                const chunkMesh = new THREE.Mesh(chunkGeometry, chunkMaterial);
                chunkMesh.position.set(chunkPosition.x, chunkPosition.y + 5, chunkPosition.z);
                chunkMesh.castShadow = true;
                editorScene.add(chunkMesh);
                chunkMeshes.push(chunkMesh);
                
                // Create bounding box for placeholder
                const boundingBox = new THREE.Box3().setFromObject(chunkMesh);
            const boxHelper = new THREE.Box3Helper(boundingBox, 0xff4444);
            boxHelper.visible = ui.showChunkBounds;
            editorScene.add(boxHelper);
            chunkBounds.push(boxHelper);
                
                if (chunksLoaded + chunkLoadErrors === totalChunks) {
                  addEditorLog('✅ Loaded ' + chunksLoaded + ' GLB chunks (' + chunkLoadErrors + ' missing)', chunksLoaded > 0 ? 'success' : 'warning');
                }
              }
            );
          } else {
            // Fallback: create placeholder if GLTFLoader unavailable
            const chunkGeometry = new THREE.BoxGeometry(chunkSize * 0.9, 10, chunkSize * 0.9);
            const chunkMaterial = new THREE.MeshLambertMaterial({ 
              color: 0x00ff00,
              wireframe: ui.wireframe,
              opacity: 0.7,
              transparent: true
            });
            
            const chunkMesh = new THREE.Mesh(chunkGeometry, chunkMaterial);
            chunkMesh.position.x = (x * chunkSize) - halfWorld + (chunkSize / 2);
            chunkMesh.position.z = (y * chunkSize) - halfWorld + (chunkSize / 2);
            chunkMesh.position.y = 5;
            
            chunkMesh.castShadow = true;
            editorScene.add(chunkMesh);
            chunkMeshes.push(chunkMesh);
            
            // Create bounding box helper
            const boundingBox = new THREE.Box3().setFromObject(chunkMesh);
            const boxHelper = new THREE.Box3Helper(boundingBox, 0xffffff);
            boxHelper.visible = ui.showChunkBounds;
            editorScene.add(boxHelper);
            chunkBounds.push(boxHelper);
          }
        }
      }
      
      if (typeof THREE.GLTFLoader === 'undefined') {
        addEditorLog('⚠️ GLTFLoader unavailable - showing placeholders', 'warning');
      }
    } else if (ui.showChunks && !loadedLevel.chunksPath) {
      addEditorLog('⚠️ No chunks path in manifest - chunks unavailable', 'warning');
    }
    
    // Create grid helper (using levelConfig for real-time updates)
    if (ui.showGrid) {
      gridHelper = new THREE.GridHelper(levelConfig.worldSize, levelConfig.gridX);
      gridHelper.material.color.setHex(0xff4444);
      editorScene.add(gridHelper);
      
      addEditorLog('✅ Grid helper created', 'info');
    }
    
    // Update world axes visibility
    if (worldAxes) {
      worldAxes.visible = ui.showWorldAxes;
    }
    
    // Update camera position
    const worldSize = loadedLevel.worldSize;
    editorCamera.position.set(worldSize * 0.6, worldSize * 0.3, worldSize * 0.6);
    if (editorControls) {
      editorControls.target.set(0, 0, 0);
      editorControls.update();
    }
    
    // Update stats
    updateEditorStats();
    
    addEditorLog('🎉 Level loaded in 3D preview', 'success');
    
  } catch (error) {
    addEditorLog('❌ Failed to load 3D assets: ' + error.message, 'error');
  }
}

function clearLevel3D() {
  if (!editorScene) return;
  
  // Remove heightmap
  if (heightmapMesh) {
    editorScene.remove(heightmapMesh);
    heightmapMesh.geometry.dispose();
    heightmapMesh.material.dispose();
    heightmapMesh = null;
  }
  
  // Remove chunks
  chunkMeshes.forEach(mesh => {
    editorScene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
  chunkMeshes = [];
  
  // Remove chunk bounding boxes
  chunkBounds.forEach(helper => {
    editorScene.remove(helper);
    helper.dispose();
  });
  chunkBounds = [];
  
  // Remove grid
  if (gridHelper) {
    editorScene.remove(gridHelper);
    gridHelper = null;
  }
}

function updateLevelPreview() {
  if (!levelConfig) return;
  
  // Update levelConfig from form inputs
  levelConfig.chunkSize = parseFloat(document.getElementById('prop-chunksize').value) || levelConfig.chunkSize;
  levelConfig.gridX = parseInt(document.getElementById('prop-gridx').value) || levelConfig.gridX;
  levelConfig.gridY = parseInt(document.getElementById('prop-gridy').value) || levelConfig.gridY;
  levelConfig.worldSize = parseFloat(document.getElementById('prop-worldsize').value) || levelConfig.worldSize;
  
  addEditorLog('🔄 Updating preview with new parameters...', 'info');
  
  // Update based on available preview type
  if (editorScene) {
    // Three.js 3D preview
    updateChunkPositions();
    updateVisualDebugging();
  } else {
    // Fallback 2D preview
    const fallbackCanvas = document.getElementById('fallback-canvas');
    if (fallbackCanvas) {
      const ctx = fallbackCanvas.getContext('2d');
      renderFallback2D(ctx, fallbackCanvas.width, fallbackCanvas.height);
    }
  }
  
  addEditorLog('✅ Preview updated', 'success');
}

function updateChunkPositions() {
  if (!levelConfig || chunkMeshes.length === 0) return;
  
  const chunkSize = levelConfig.chunkSize;
  const gridX = levelConfig.gridX;  
  const gridY = levelConfig.gridY;
  const halfWorld = levelConfig.worldSize / 2;
  
  let index = 0;
  for (let x = 0; x < gridX && index < chunkMeshes.length; x++) {
    for (let y = 0; y < gridY && index < chunkMeshes.length; y++) {
      const chunkMesh = chunkMeshes[index];
      const bounds = chunkBounds[index];
      
      // Update chunk position
      chunkMesh.position.x = (x * chunkSize) - halfWorld + (chunkSize / 2);
      chunkMesh.position.z = (y * chunkSize) - halfWorld + (chunkSize / 2);
      
      // Update chunk size
      chunkMesh.scale.set(
        chunkSize / (chunkSize * 0.9) * 0.9,
        1,
        chunkSize / (chunkSize * 0.9) * 0.9
      );
      
      // Update bounding box
      if (bounds) {
        const boundingBox = new THREE.Box3().setFromObject(chunkMesh);
        bounds.box.copy(boundingBox);
      }
      
      index++;
    }
  }
  
  // Update grid helper
  if (gridHelper) {
    editorScene.remove(gridHelper);
    gridHelper = new THREE.GridHelper(levelConfig.worldSize, levelConfig.gridX);
    gridHelper.material.color.setHex(0xff4444);
    editorScene.add(gridHelper);
  }
}

function updateVisualDebugging() {
  // Update chunk bounds visibility
  const showChunkBoundsEl = document.getElementById('show-chunk-bounds');
  if (showChunkBoundsEl) {
    const showChunkBounds = showChunkBoundsEl.checked;
    chunkBounds.forEach(helper => {
      helper.visible = showChunkBounds;
    });
  }
  
  // Update world axes visibility
  const showWorldAxesEl = document.getElementById('show-world-axes');
  if (worldAxes && showWorldAxesEl) {
    worldAxes.visible = showWorldAxesEl.checked;
  }
  
  // Update wireframe mode
  const wireframeEl = document.getElementById('show-wireframe');
  if (wireframeEl) {
    const wireframe = wireframeEl.checked;
    chunkMeshes.forEach(mesh => {
      mesh.material.wireframe = wireframe;
    });
  }
  
  // Update chunk visibility
  const showChunksEl = document.getElementById('show-chunks');
  if (showChunksEl) {
    const showChunks = showChunksEl.checked;
    chunkMeshes.forEach(mesh => {
      mesh.visible = showChunks;
    });
  }
  
  // Update heightmap visibility  
  const showHeightmapEl = document.getElementById('show-heightmap');
  if (heightmapMesh && showHeightmapEl && wireframeEl) {
    heightmapMesh.visible = showHeightmapEl.checked;
    heightmapMesh.material.wireframe = wireframeEl.checked;
  }
  
  // Update grid visibility
  const showGridEl = document.getElementById('show-grid');
  if (gridHelper && showGridEl) {
    gridHelper.visible = showGridEl.checked;
  }
}

async function saveAdjustedConfiguration() {
  if (!levelConfig || !loadedLevel) {
    addEditorLog('⚠️ No configuration to save', 'warning');
    return;
  }
  
  try {
    addEditorLog('💾 Saving adjusted configuration...', 'info');
    
    // Create complete configuration object
    const adjustedConfig = {
      name: loadedLevel.name,
      id: loadedLevel.levelId,
      type: 'terrain', // Could be determined from original config
      glbPath: loadedLevel.heightmapPath.replace('_heightmap.png', '.glb'), // Derive GLB path
      resolution: 1024,
      gridX: levelConfig.gridX,
      gridY: levelConfig.gridY,
      lodLevels: 3,
      outputDir: './output',
      enableOcean: false,
      enableVegetation: true,
      enableFireflies: true,
      enableStarMap: true,
      // Include the adjusted parameters
      worldSize: levelConfig.worldSize,
      chunkSize: levelConfig.chunkSize,
      adjustedAt: new Date().toISOString(),
      adjustedFrom: 'Level Editor'
    };
    
    const response = await fetch('/api/save-level-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(adjustedConfig)
    });
    
    const result = await response.json();
    
    if (result.success) {
      addEditorLog('✅ Configuration saved: ' + result.filename, 'success');
      addEditorLog('📁 Location: ' + result.path, 'info');
    } else {
      throw new Error(result.message || 'Failed to save configuration');
    }
    
  } catch (error) {
    addEditorLog('❌ Failed to save configuration: ' + error.message, 'error');
  }
}

function updateEditorStats() {
  const statsDiv = document.getElementById('editor-stats');
  if (!statsDiv) return;
  
  const chunks = chunkMeshes.length;
  const triangles = chunkMeshes.reduce((total, mesh) => total + (mesh.geometry.attributes.position.count / 3), 0);
  const objects = editorScene.children.length;
  
  const sc = document.getElementById('stats-chunks');
  const st = document.getElementById('stats-triangles');
  const so = document.getElementById('stats-objects');
  if (sc) sc.textContent = chunks;
  if (st) st.textContent = Math.floor(triangles);
  if (so) so.textContent = objects;
  
  statsDiv.style.display = chunks > 0 ? 'block' : 'none';
}

// --- Rich Level Editor Logic ---

// Global state for the Rich Level Editor
let currentLevelConfig = null; // The manifest data currently being edited
let currentManifestPath = null; // Path to the currently loaded manifest file
let isEditorInitialized = false;

// Initialize the Rich Level Editor when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    populateLevelSelector();
    initializeRichLevelEditor();
  }, 500);
});

// Initialize all the Rich Level Editor event handlers
function initializeRichLevelEditor() {
  // Load Level button
  const loadLevelBtn = document.getElementById('load-level');
  if (loadLevelBtn) {
    loadLevelBtn.addEventListener('click', handleLoadLevel);
  }

  // Save Manifest button
  const saveManifestBtn = document.getElementById('save-manifest');
  if (saveManifestBtn) {
    saveManifestBtn.addEventListener('click', handleSaveManifest);
  }

  // Initialize all panel event listeners
  initializeFeaturesPanel();
  initializeLightingPanel();
  initializeStylePanel();
  initializeOceanPanel();
  initializeSpawnPanel();
  initializePhysicsPanel();
  initializePreviewOptions();
  
  isEditorInitialized = true;
  addEditorLog('✅ Rich Level Editor initialized', 'success');
}

// Populate the level selector dropdown
async function populateLevelSelector() {
  const selectEl = document.getElementById('editor-level-select');
  if (!selectEl) return;

  try {
    const response = await fetch('/api/get-level-manifests');
    if (!response.ok) throw new Error('Failed to fetch level list.');

    const data = await response.json();

    if (data.success && data.levels && data.levels.length > 0) {
      selectEl.innerHTML = '<option value="">-- Select a Level --</option>';
      data.levels.forEach(level => {
        const option = document.createElement('option');
        option.value = level.path;
        option.textContent = level.name;
        selectEl.appendChild(option);
      });
      addEditorLog('✅ Found ' + data.levels.length + ' levels.', 'success');
    } else {
      selectEl.innerHTML = '<option value="">-- No levels found --</option>';
      addEditorLog('⚠️ No level manifests found in project.', 'warning');
    }
  } catch (error) {
    selectEl.innerHTML = '<option value="">Error loading levels</option>';
    addEditorLog('❌ ' + error.message, 'error');
    console.error('Failed to populate level selector:', error);
  }
}

// Add the event listener for the "Load Level" button
const loadLevelBtn = document.getElementById('load-level');
if (loadLevelBtn) {
  loadLevelBtn.addEventListener('click', () => {
    const selectEl = document.getElementById('editor-level-select');
    const manifestPath = selectEl.value;
    if (!manifestPath) {
      addEditorLog('⚠️ Please select a level from the dropdown.', 'warning');
      return;
    }
    // The existing loadLevelFromManifest function will handle the rest
    loadLevelFromManifest(manifestPath);
  });
}

// Add the fix for the browse button (it will be replaced by the dropdown, but good to have)
const browseEditorBtn = document.getElementById('browse-editor-manifest');
if (browseEditorBtn) {
  browseEditorBtn.addEventListener('click', () => {
    openFileBrowser('editor-manifest', 'json');
  });
}

// Function to load a level from manifest path
async function loadLevelFromManifest(manifestPath) {
  addEditorLog('📂 Loading level manifest: ' + manifestPath, 'info');
  
  try {
    const response = await fetch('/api/project-file?path=' + encodeURIComponent(manifestPath));
    
    if (!response.ok) {
      throw new Error('Manifest file not found: ' + manifestPath);
    }
    
    const manifest = await response.json();
    
    if (manifest && manifest.name) {
      loadedLevel = {
        name: manifest.name,
        levelId: manifest.id,
        type: manifest.type,
        heightmapPath: manifest.assets?.heightmap || null,
        chunksPath: manifest.assets?.chunksPath || null,
        worldSize: manifest.physics?.worldSize || 500,
        minHeight: manifest.physics?.minHeight || -50,
        maxHeight: manifest.physics?.maxHeight || 50,
        chunkTemplate: 'chunk_{x}_{y}_LOD0.glb',
        gridX: manifest.physics?.gridX || 4,
        gridY: manifest.physics?.gridY || 4,
        chunkSize: manifest.physics?.chunkSize || ((manifest.physics?.worldSize || 500) / (manifest.physics?.gridX || 4))
      };
      
      // Create client-side config for real-time updates
      levelConfig = {
        worldSize: loadedLevel.worldSize,
        chunkSize: loadedLevel.chunkSize,
        gridX: loadedLevel.gridX,
        gridY: loadedLevel.gridY,
        minHeight: loadedLevel.minHeight,
        maxHeight: loadedLevel.maxHeight
      };
      
      // Show level properties panel
      const propertiesPanel = document.getElementById('level-properties');
      if (propertiesPanel) {
        propertiesPanel.style.display = 'block';
        
        // Populate form fields safely
        const worldSizeInput = document.getElementById('prop-worldsize');
        const chunkSizeInput = document.getElementById('prop-chunksize');
        const gridXInput = document.getElementById('prop-gridx');
        const gridYInput = document.getElementById('prop-gridy');
        const minHeightInput = document.getElementById('prop-minheight');
        const maxHeightInput = document.getElementById('prop-maxheight');
        
        if (worldSizeInput) worldSizeInput.value = levelConfig.worldSize.toFixed(1);
        if (chunkSizeInput) chunkSizeInput.value = levelConfig.chunkSize.toFixed(1);
        if (gridXInput) gridXInput.value = levelConfig.gridX;
        if (gridYInput) gridYInput.value = levelConfig.gridY;
        if (minHeightInput) minHeightInput.value = levelConfig.minHeight.toFixed(1);
        if (maxHeightInput) maxHeightInput.value = levelConfig.maxHeight.toFixed(1);
      }
      
      // Initialize 3D editor if not already done
      initEditor3D();
      
      // Load level into 3D view
      setTimeout(() => {
        loadLevel3D();
      }, 500);
      
      // Update status
      const status = document.getElementById('editor-status');
      if (status) {
        status.className = 'status ready';
        status.textContent = 'Level Loaded: ' + manifest.name;
      }
      
      addEditorLog('✅ Level loaded: ' + manifest.name + ' (' + manifest.id + ')', 'success');
    } else {
      addEditorLog('❌ Invalid manifest file', 'error');
    }
  } catch (error) {
    addEditorLog('❌ Failed to load manifest: ' + error.message, 'error');
  }
}

// Call the new function when the document is ready
populateLevelSelector();

// --- Starmap Editor Logic ---
document.addEventListener('DOMContentLoaded', () => {
  const starList = document.getElementById('starmap-list');
  const starForm = document.getElementById('starmap-form');
  const newStarBtn = document.getElementById('starmap-new-btn');
  let allStars = [];
  let availableEras = [];

  async function loadStarmapData() {
    try {
      const response = await fetch('/api/starmap/data');
      const data = await response.json();
      if (data.success && data.config) {
        allStars = data.config.stars || [];
        // Extract unique eras from constellations
        availableEras = data.config.constellations ? Object.keys(data.config.constellations) : [];
        renderStarList(allStars);
        clearForm(availableEras);
      } else {
        console.error('Failed to load starmap data:', data.message);
        allStars = [];
        availableEras = [];
      }
    } catch (error) {
      console.error('Error loading starmap data:', error);
      allStars = [];
      availableEras = [];
    }
  }

  function renderStarList(stars) {
    starList.innerHTML = '';
    if (!stars || !Array.isArray(stars)) {
      console.warn('No stars data provided to renderStarList');
      return;
    }
    stars.forEach(star => {
      const div = document.createElement('div');
      div.textContent = star.id + ': ' + star.title;
      div.style.padding = '0.5rem';
      div.style.cursor = 'pointer';
      div.style.borderBottom = '1px solid #222';
      div.addEventListener('click', () => renderEditForm(star, availableEras));
      starList.appendChild(div);
    });
  }

  function renderEditForm(star, eras) {
    const tags = (star.tags && Array.isArray(star.tags)) ? star.tags.join(', ') : '';
    const eraOptions = '<option value="">Select Era...</option>' + 
      eras.map(e => {
        const selected = e === star.era ? 'selected' : '';
        return '<option value="' + e + '" ' + selected + '>' + e + '</option>';
      }).join('') + 
      '<option value="__NEW__">+ Create New Era...</option>';
    const isKeyEventChecked = star.isKeyEvent ? 'checked' : '';
    const isLevelChecked = star.isLevel ? 'checked' : '';

    starForm.innerHTML = 
      '<input type="hidden" name="id" value="' + (star.id || '') + '">' +
      '<div class="form-group"><label>Title</label><input type="text" name="title" value="' + (star.title || '') + '"></div>' +
      '<div class="form-group"><label>Slug</label><input type="text" name="slug" value="' + (star.slug || '') + '"></div>' +
      '<div class="form-group"><label>Description</label><textarea name="description" rows="4" style="width: 100%; background: #222; border: 1px solid #444; color: #fff; padding: 0.8rem;">' + (star.description || '') + '</textarea></div>' +
      '<div class="form-row">' +
        '<div class="form-group"><label>Year</label><input type="number" name="year" value="' + (star.year || '') + '"></div>' +
        '<div class="form-group"><label>Era</label><select name="era" id="era-select">' + eraOptions + '</select><input type="text" name="newEra" id="new-era-input" placeholder="Enter new era name..." style="width: 100%; background: #222; border: 1px solid #444; color: #fff; padding: 0.5rem; border-radius: 4px; margin-top: 0.5rem; display: none;"></div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group"><label><input type="checkbox" name="isKeyEvent" ' + isKeyEventChecked + '> Is Key Event</label></div>' +
        '<div class="form-group"><label><input type="checkbox" name="isLevel" ' + isLevelChecked + '> Is Level</label></div>' +
      '</div>' +
      '<div class="form-group"><label>Level ID</label><input type="text" name="levelId" value="' + (star.levelId || '') + '"></div>' +
      '<div class="form-group"><label>Tags (comma-separated)</label><input type="text" name="tags" value="' + tags + '"></div>' +
      '<div class="form-group"><label>Category</label><input type="text" name="category" value="' + (star.category || '') + '"></div>' +
      '<button type="submit" class="btn">Save Star</button>';
  }

  function clearForm(eras) {
    renderEditForm({}, eras);
  }

  newStarBtn.addEventListener('click', () => clearForm(availableEras));

  starForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(starForm);
    const tags = formData.get('tags').split(',').map(t => t.trim()).filter(t => t);
    // Handle new era creation
    let era = formData.get('era');
    if (era === '__NEW__') {
      const newEra = formData.get('newEra');
      if (newEra && newEra.trim()) {
        era = newEra.trim();
      } else {
        alert('Please enter a name for the new era.');
        return;
      }
    }

    const updatedStar = {
      id: formData.get('id') || ((allStars && allStars.length ? allStars.length : 0) + 1).toString(),
      title: formData.get('title'),
      slug: formData.get('slug'),
      description: formData.get('description'),
      year: parseInt(formData.get('year')),
      era: era,
      isKeyEvent: formData.get('isKeyEvent') === 'on',
      isLevel: formData.get('isLevel') === 'on',
      levelId: formData.get('levelId'),
      tags: tags,
      category: formData.get('category'),
    };

    try {
      const response = await fetch('/api/starmap/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStar)
      });
      const result = await response.json();
      if (result.success) {
        alert('Star saved successfully!');
        loadStarmapData();
      } else {
        alert('Error saving star: ' + result.message);
      }
    } catch (error) {
      alert('Error saving star: ' + error.message);
    }
  });

  // Enhanced search and filtering functionality
  const searchInput = document.getElementById('starmap-search');
  const eraFilter = document.getElementById('starmap-filter-era');
  let filteredStars = [];

  function updateStats() {
    const totalStars = document.getElementById('total-stars');
    const keyEvents = document.getElementById('key-events');
    const levelStars = document.getElementById('level-stars');
    
    totalStars.textContent = filteredStars.length;
    keyEvents.textContent = filteredStars.filter(s => s.isKeyEvent).length;
    levelStars.textContent = filteredStars.filter(s => s.isLevel).length;
  }

  function populateEraFilter() {
    eraFilter.innerHTML = '<option value="">All Eras</option>';
    if (!allStars || !Array.isArray(allStars)) {
      console.warn('No stars data available for era filter');
      return;
    }
    const uniqueEras = [...new Set(allStars.filter(s => s.era).map(s => s.era))];
    uniqueEras.forEach(era => {
      const option = document.createElement('option');
      option.value = era;
      option.textContent = era;
      eraFilter.appendChild(option);
    });
  }

  function filterAndSearchStars() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedEra = eraFilter.value;
    
    filteredStars = (allStars || []).filter(star => {
      const matchesSearch = !searchTerm || 
        star.title.toLowerCase().includes(searchTerm) ||
        (star.description && star.description.toLowerCase().includes(searchTerm)) ||
        (star.tags && Array.isArray(star.tags) && star.tags.join(' ').toLowerCase().includes(searchTerm));
      
      const matchesEra = !selectedEra || star.era === selectedEra;
      
      return matchesSearch && matchesEra;
    });
    
    renderStarList(filteredStars);
    updateStats();
  }

  function enhancedRenderStarList(stars) {
    starList.innerHTML = '';
    stars.forEach(star => {
      const div = document.createElement('div');
      div.style.padding = '0.75rem';
      div.style.cursor = 'pointer';
      div.style.borderBottom = '1px solid #222';
      div.style.borderRadius = '4px';
      div.style.marginBottom = '0.25rem';
      div.style.transition = 'background 0.2s';
      
      const badges = [];
      if (star.isKeyEvent) badges.push('<span style="background: #ff6b35; color: white; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.7rem;">KEY</span>');
      if (star.isLevel) badges.push('<span style="background: #0f0; color: black; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.7rem;">LEVEL</span>');
      
      div.innerHTML = 
        '<div style="font-weight: bold; color: #0f0;">' + star.title + '</div>'
        '<div style="font-size: 0.8rem; color: #888; margin: 0.2rem 0;">'
        + (star.era || 'No Era') + ' • ' + (star.year || 'No Year') + 
        (badges.length ? ' • ' + badges.join(' ') : '') + 
        '</div>'
        '<div style="font-size: 0.75rem; color: #666;">' + (star.description ? star.description.substring(0, 80) + '...' : 'No description') + '</div>';
        
      div.addEventListener('click', () => renderEditForm(star, availableEras));
      div.addEventListener('mouseenter', () => div.style.background = '#222');
      div.addEventListener('mouseleave', () => div.style.background = 'transparent');
      starList.appendChild(div);
    });
  }

  // Handle new era creation
  function handleEraSelection() {
    document.addEventListener('change', (e) => {
      if (e.target.id === 'era-select') {
        const newEraInput = document.getElementById('new-era-input');
        if (e.target.value === '__NEW__') {
          newEraInput.style.display = 'block';
          newEraInput.focus();
        } else {
          newEraInput.style.display = 'none';
        }
      }
    });
  }

  // Override the original renderStarList function
  const originalRenderStarList = window.renderStarList || function() {};
  window.renderStarList = enhancedRenderStarList;

  // Event listeners
  searchInput.addEventListener('input', filterAndSearchStars);
  eraFilter.addEventListener('change', filterAndSearchStars);
  handleEraSelection();

  // Enhance the original loadStarmapData to include filtering setup
  const originalLoadStarmapData = loadStarmapData;
  loadStarmapData = async function() {
    await originalLoadStarmapData();
    filteredStars = allStars;
    populateEraFilter();
    filterAndSearchStars();
  };

  // Level Detection Functionality
  const refreshLevelsBtn = document.getElementById('refresh-levels-btn');
  const levelsStatus = document.getElementById('levels-status');
  const levelsContainer = document.getElementById('levels-container');
  const levelsNeedingStars = document.getElementById('levels-needing-stars');
  const levelsWithStars = document.getElementById('levels-with-stars');

  async function loadLevelData() {
    try {
      levelsStatus.textContent = 'Scanning for levels...';
      levelsContainer.style.display = 'none';
      
      const response = await fetch('/api/levels/scan');
      const data = await response.json();
      
      if (data.success) {
        renderLevelData(data);
        levelsStatus.textContent = 'Found ' + data.stats.totalLevels + ' levels (' + data.stats.levelsNeedingStars + ' need stars)';
        levelsContainer.style.display = 'block';
      } else {
        levelsStatus.textContent = 'Error: ' + data.message;
      }
    } catch (error) {
      levelsStatus.textContent = 'Error loading level data: ' + error.message;
    }
  }

  function renderLevelData(data) {
    // Render levels that need stars
    if (data.needingStars.length > 0) {
      levelsNeedingStars.innerHTML = 
        '<h4 style="color: #ff6b35; margin-bottom: 0.5rem;">🔴 Levels Needing Stars (' + data.needingStars.length + ')</h4>' +
        data.needingStars.map(item => {
          const level = item.level;
          return '<div style="background: #1a1a1a; border: 1px solid #444; border-radius: 4px; padding: 0.75rem; margin-bottom: 0.5rem;">' +
            '<div style="display: flex; justify-content: between; align-items: center;">' +
              '<div style="flex: 1;">' +
                '<strong style="color: #0f0;">' + level.title + '</strong>' +
                '<div style="font-size: 0.8rem; color: #888;">ID: ' + level.levelId + ' • Era: ' + level.suggestedEra + ' • Year: ' + level.estimatedYear + '</div>' +
                '<div style="font-size: 0.8rem; color: #666;">' + level.description + '</div>' +
              '</div>' +
              '<button class="create-star-btn btn" data-level="' + encodeURIComponent(JSON.stringify(item.template)) + '" style="margin-left: 1rem; padding: 0.5rem 1rem; font-size: 0.8rem;">+ Create Star</button>' +
            '</div>' +
          '</div>';
        }).join('');
    } else {
      levelsNeedingStars.innerHTML = '<h4 style="color: #0f0; margin-bottom: 0.5rem;">✅ All Levels Have Stars</h4>';
    }

    // Render levels that already have stars
    const levelsWithStarsData = data.levels.filter(level => level.hasStar);
    if (levelsWithStarsData.length > 0) {
      levelsWithStars.innerHTML = 
        '<h4 style="color: #0f0; margin-bottom: 0.5rem;">✅ Levels With Stars (' + levelsWithStarsData.length + ')</h4>' +
        levelsWithStarsData.map(level => {
          return '<div style="background: #0a1a0a; border: 1px solid #0f4; border-radius: 4px; padding: 0.5rem; margin-bottom: 0.25rem; font-size: 0.8rem;">' +
            '<strong style="color: #0f0;">' + level.title + '</strong> → ' +
            '<span style="color: #888;">' + (level.existingStar ? level.existingStar.title : 'Connected') + '</span>' +
          '</div>';
        }).join('');
    } else {
      levelsWithStars.innerHTML = '';
    }
  }

  function handleCreateStarClick(e) {
    if (e.target.classList.contains('create-star-btn')) {
      const templateData = JSON.parse(decodeURIComponent(e.target.getAttribute('data-level')));
      
      // Populate the star form with the template data
      renderEditForm(templateData, availableEras);
      
      // Scroll to the form
      document.getElementById('starmap-form').scrollIntoView({ behavior: 'smooth' });
      
      console.log('📝 Auto-populated star form with level data:', templateData.title);
    }
  }

  // Event listeners
  refreshLevelsBtn.addEventListener('click', loadLevelData);
  levelsContainer.addEventListener('click', handleCreateStarClick);

  // Initial load
  loadStarmapData();
  
  // Load level data on startup
  setTimeout(loadLevelData, 1000); // Small delay to ensure starmap data is loaded first
});

// Cubemap Converter
document.getElementById('generate-cubemap').addEventListener('click', async () => {
  const button = document.getElementById('generate-cubemap');
  const status = document.getElementById('cubemap-status');
  const inputFile = document.getElementById('cubemap-input').value;
  const resolution = parseInt(document.getElementById('cubemap-resolution').value);
  const format = document.getElementById('cubemap-format').value;
  const outputDir = document.getElementById('cubemap-output').value;
  
  if (!inputFile.trim()) { 
    addCubemapLog('❌ Error: Input file is required', 'error'); 
    return; 
  }
  
  button.disabled = true; 
  button.textContent = 'Converting...'; 
  status.className = 'status processing'; 
  status.textContent = 'Processing';
  
  addCubemapLog('> Processing: ' + inputFile, 'info'); 
  addCubemapLog('> Resolution: ' + resolution + 'x' + resolution + ' per face', 'info');
  addCubemapLog('> Format: ' + format, 'info');
  
  try {
    const response = await fetch('/api/convert-cubemap', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ inputFile, resolution, format, outputDir }) 
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      addCubemapLog('✅ Success: ' + result.message, 'success');
      if (result.outputFiles) {
        result.outputFiles.forEach(function(file) {
          addCubemapLog('💾 Generated: ' + file, 'success');
        });
      }
      if (result.totalSize) {
        const sizeMB = (result.totalSize / (1024 * 1024)).toFixed(1);
        addCubemapLog('📊 Total size: ' + sizeMB + ' MB', 'info');
      }
      status.className = 'status ready'; 
      status.textContent = 'Complete';
    } else { 
      addCubemapLog('❌ Error: ' + (result.message || 'Unknown error'), 'error'); 
      status.className = 'status error'; 
      status.textContent = 'Error'; 
    }
  } catch (error) { 
    addCubemapLog('❌ Network Error: ' + error.message, 'error'); 
    status.className = 'status error'; 
    status.textContent = 'Error';
  } finally { 
    button.disabled = false; 
    button.textContent = 'Convert to Cubemap'; 
  }
});

function addCubemapLog(message, type) { 
  addLog('cubemap-logs', message, type); 
}

function addLog(containerId, message, type) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const logLine = document.createElement('div');
  logLine.className = 'log-line ' + (type || 'info');
  logLine.textContent = message;
  
  container.appendChild(logLine);
  container.scrollTop = container.scrollHeight;
}

// --- File Browser Logic ---

let currentPath = '';
let currentFiles = [];
let selectedFile = null;

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function getFileIcon(item) {
  if (item.isDirectory) {
    return item.isParent ? '↩️' : '📁';
  }
  
  const ext = item.extension || '';
  if (['.hdr', '.exr'].includes(ext)) return '🌅';
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return '🖼️';
  if (['.glb', '.gltf'].includes(ext)) return '🎮';
  if (['.json'].includes(ext)) return '📄';
  return '📄';
}

async function loadDirectory(path = '') {
  try {
    const response = await fetch('/api/browse?path=' + encodeURIComponent(path));
    const data = await response.json();
    
    if (data.success) {
      currentPath = data.currentPath || '';
      currentFiles = data.items || [];
      renderFileList();
      renderBreadcrumbs(data.breadcrumbs || []);
    } else {
      console.error('Failed to load directory:', data.message);
    }
  } catch (error) {
    console.error('Error loading directory:', error);
  }
}

function renderBreadcrumbs(breadcrumbs) {
  const container = document.getElementById('file-breadcrumbs');
  if (!container) return;
  
  let html = '<span style="cursor: pointer;" onclick="loadDirectory(\'\')">🏠 Project Root</span>';
  
  if (breadcrumbs.length > 0) {
    let path = '';
    breadcrumbs.forEach(function(crumb, index) {
      path += (path ? '/' : '') + crumb;
      html += ' / <span style="cursor: pointer;" onclick="loadDirectory(\'' + path + '\')">' + crumb + '</span>';
    });
  }
  
  container.innerHTML = html;
}

function renderFileList() {
  const container = document.getElementById('file-list');
  if (!container) return;
  
  const filter = document.getElementById('file-filter').value.toLowerCase();
  const filteredFiles = currentFiles.filter(function(item) {
    if (item.isDirectory) return true;
    if (!filter) return true;
    
    const extensions = filter.split(',');
    return extensions.some(function(ext) {
      return item.extension && item.extension.toLowerCase() === ext.trim();
    });
  });
  
  if (filteredFiles.length === 0) {
    container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">No files found</div>';
    return;
  }
  
  const html = filteredFiles.map(function(item) {
    const icon = getFileIcon(item);
    const name = item.name;
    const size = item.isDirectory ? '' : '(' + formatFileSize(item.size || 0) + ')';
    const date = item.modified ? formatDate(item.modified) : '';
    
    return '<div class="file-item" data-path="' + item.path + '" data-is-directory="' + item.isDirectory + '" style="padding: 0.75rem 1rem; border-bottom: 1px solid #222; cursor: pointer; display: flex; align-items: center; gap: 0.75rem; transition: background 0.2s ease;" onmouseover="this.style.background=\'#1a1a1a\'" onmouseout="this.style.background=\'\'">' +
      '<span style="font-size: 1.2rem;">' + icon + '</span>' +
      '<div style="flex: 1; min-width: 0;">' +
        '<div style="color: ' + (item.isDirectory ? '#0f0' : '#fff') + '; font-weight: ' + (item.isDirectory ? 'bold' : 'normal') + '; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + name + '</div>' +
        (item.isDirectory ? '' : '<div style="font-size: 0.8rem; color: #666;">' + size + ' • ' + date + '</div>') +
      '</div>' +
    '</div>';
  }).join('');
  
  container.innerHTML = html;
  
  // Add click handlers
  const items = container.querySelectorAll('.file-item');
  items.forEach(function(item) {
    item.addEventListener('click', function() {
      const path = item.getAttribute('data-path');
      const isDirectory = item.getAttribute('data-is-directory') === 'true';
      
      if (isDirectory) {
        loadDirectory(path);
      } else {
        selectFile(path, item.querySelector('div > div').textContent);
      }
    });
  });
}

function selectFile(path, name) {
  selectedFile = path;
  document.getElementById('selected-file').textContent = name;
  document.getElementById('select-file').disabled = false;
  
  // Highlight selected file
  const items = document.querySelectorAll('.file-item');
  items.forEach(function(item) {
    item.style.background = item.getAttribute('data-path') === path ? '#0a4a0a' : '';
  });
}

function selectCurrentDirectory() {
  selectedFile = currentPath;
  const displayPath = currentPath || 'Project Root';
  document.getElementById('selected-file').textContent = 'Directory: ' + displayPath;
  document.getElementById('select-file').disabled = false;
  
  // Clear file highlights
  const items = document.querySelectorAll('.file-item');
  items.forEach(function(item) {
    item.style.background = '';
  });
}

// File browser event handlers
document.addEventListener('DOMContentLoaded', function() {
  const browseBtn = document.getElementById('browse-cubemap-input');
  const modal = document.getElementById('file-browser-modal');
  const closeBtn = document.getElementById('close-browser');
  const selectBtn = document.getElementById('select-file');
  const selectDirBtn = document.getElementById('select-directory');
  const filterSelect = document.getElementById('file-filter');
  
  if (browseBtn) {
    browseBtn.addEventListener('click', function() {
      selectedFile = null;
      document.getElementById('selected-file').textContent = 'No file selected';
      document.getElementById('select-file').disabled = true;
      modal.style.display = 'block';
      loadDirectory();
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      modal.style.display = 'none';
    });
  }
  
  if (selectBtn) {
    selectBtn.addEventListener('click', function() {
      if (selectedFile) {
        document.getElementById('cubemap-input').value = selectedFile;
        modal.style.display = 'none';
      }
    });
  }
  
  if (selectDirBtn) {
    selectDirBtn.addEventListener('click', function() {
      selectCurrentDirectory();
    });
  }
  
  if (filterSelect) {
    filterSelect.addEventListener('change', function() {
      renderFileList();
    });
  }
  
  // Close modal when clicking outside
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }

  // Reusable file browser opener function
  function openFileBrowser(targetInputId, fileType = 'all') {
    selectedFile = null;
    document.getElementById('selected-file').textContent = 'No file selected';
    document.getElementById('select-file').disabled = true;
    
    // Show/hide directory selection button based on file type
    const selectDirBtn = document.getElementById('select-directory');
    const selectFileBtn = document.getElementById('select-file');
    if (fileType === 'directory') {
      selectDirBtn.style.display = 'block';
      selectFileBtn.textContent = 'Select File';
      selectCurrentDirectory(); // Auto-select current directory for directory mode
    } else {
      selectDirBtn.style.display = 'none';
      selectFileBtn.textContent = 'Select File';
    }
    
    // Set appropriate filter based on file type
    const filterSelect = document.getElementById('file-filter');
    if (filterSelect) {
      switch(fileType) {
        case 'glb':
          filterSelect.innerHTML = '<option value="">All Files</option><option value=".glb" selected>GLB files</option><option value=".gltf">GLTF files</option>';
          break;
        case 'image':
          filterSelect.innerHTML = '<option value="">All Files</option><option value=".hdr" selected>HDR files</option><option value=".exr">EXR files</option><option value=".jpg,.jpeg">JPEG files</option><option value=".png">PNG files</option><option value=".webp">WebP files</option>';
          break;
        case 'heightmap':
          filterSelect.innerHTML = '<option value="">All Files</option><option value=".png" selected>PNG files</option><option value=".jpg,.jpeg">JPEG files</option><option value=".exr">EXR files</option>';
          break;
        case 'manifest':
          filterSelect.innerHTML = '<option value="">All Files</option><option value=".json" selected>JSON files</option>';
          break;
        case 'directory':
          filterSelect.innerHTML = '<option value="">All Files</option>';
          break;
        default:
          filterSelect.innerHTML = '<option value="">All Files</option><option value=".hdr">HDR files</option><option value=".exr">EXR files</option><option value=".jpg,.jpeg">JPEG files</option><option value=".png">PNG files</option><option value=".webp">WebP files</option>';
      }
    }
    
    // Override the select button behavior for this browse session
    const selectBtn = document.getElementById('select-file');
    selectBtn.onclick = function() {
      if (selectedFile) {
        document.getElementById(targetInputId).value = selectedFile;
        modal.style.display = 'none';
      }
    };
    
    modal.style.display = 'block';
    loadDirectory();
  }

  // Add event handlers for all browse buttons
  const browseButtons = [
    // Unified Pipeline
    { id: 'browse-unified-glb', target: 'unified-glb', type: 'glb' },
    { id: 'browse-unified-output', target: 'unified-output', type: 'directory' },
    
    // Level Editor
    { id: 'browse-editor-manifest', target: 'editor-manifest', type: 'manifest' },
    
    // Heightmap Generator
    { id: 'browse-heightmap-input', target: 'heightmap-input', type: 'glb' },
    { id: 'browse-heightmap-output', target: 'heightmap-output', type: 'directory' },
    
    // Level Processor  
    { id: 'browse-processor-input', target: 'processor-input', type: 'glb' },
    { id: 'browse-processor-output', target: 'processor-output', type: 'directory' },
    
    // Level Generator
    { id: 'browse-generator-glb', target: 'generator-glb', type: 'glb' },
    { id: 'browse-generator-heightmap', target: 'generator-heightmap', type: 'heightmap' },
    { id: 'browse-generator-chunks', target: 'generator-chunks', type: 'directory' },
    { id: 'browse-generator-output', target: 'generator-output', type: 'directory' },
    
    // Cubemap Converter (existing)
    { id: 'browse-cubemap-input', target: 'cubemap-input', type: 'image' }
  ];

  browseButtons.forEach(function(btn) {
    const button = document.getElementById(btn.id);
    if (button) {
      button.addEventListener('click', function() {
        openFileBrowser(btn.target, btn.type);
      });
    }
  });
});
// This file contains the additional Rich Level Editor functions
// to be appended to client.js

// Handle loading a selected level
async function handleLoadLevel() {
  const selectEl = document.getElementById('editor-level-select');
  const manifestPath = selectEl.value;
  
  if (!manifestPath) {
    addEditorLog('⚠️ Please select a level from the dropdown.', 'warning');
    return;
  }

  addEditorLog('🔍 Loading level manifest: ' + manifestPath, 'info');
  await loadLevelManifest(manifestPath);
}

// Load and parse a level manifest file
async function loadLevelManifest(manifestPath) {
  try {
    const statusEl = document.getElementById('editor-status');
    statusEl.className = 'status processing';
    statusEl.textContent = 'Loading...';

    // Fetch the manifest file
    const response = await fetch(`/api/project-file?path=${encodeURIComponent(manifestPath)}`);
    if (!response.ok) {
      throw new Error(`Failed to load manifest: ${response.status} ${response.statusText}`);
    }

    const manifestText = await response.text();
    let manifest;
    try {
      manifest = JSON.parse(manifestText);
    } catch (parseError) {
      throw new Error('Invalid JSON in manifest file: ' + parseError.message);
    }

    // Store the loaded manifest
    currentLevelConfig = manifest;
    currentManifestPath = manifestPath;

    addEditorLog('✅ Level loaded: ' + manifest.name, 'success');
    
    // Populate all UI panels with the loaded data
    populateAllPanels(manifest);

    // Show all panels
    showAllPanels();

    // Update status
    statusEl.className = 'status success';
    statusEl.textContent = 'Loaded';

    // Update the 3D preview
    updatePreview();

  } catch (error) {
    addEditorLog('❌ Error loading level: ' + error.message, 'error');
    console.error('Level loading error:', error);

    const statusEl = document.getElementById('editor-status');
    statusEl.className = 'status error';
    statusEl.textContent = 'Error';
  }
}

// Populate all UI panels with data from the loaded manifest
function populateAllPanels(manifest) {
  populateFeaturesPanel(manifest);
  populateLightingPanel(manifest);
  populateStylePanel(manifest);
  populateOceanPanel(manifest);
  populateSpawnPanel(manifest);
  populatePhysicsPanel(manifest);
}

// Show all editor panels
function showAllPanels() {
  const panels = [
    'save-section', 'features-panel', 'lighting-panel', 
    'style-panel', 'ocean-panel', 'spawn-panel', 'physics-panel', 'preview-options'
  ];
  
  panels.forEach(panelId => {
    const panel = document.getElementById(panelId);
    if (panel) panel.style.display = 'block';
  });
}

// --- Features Panel Implementation ---
function initializeFeaturesPanel() {
  const features = ['ocean', 'vegetation', 'fireflies', 'fog', 'bloom'];
  
  features.forEach(feature => {
    const checkbox = document.getElementById('feature-' + feature);
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        if (currentLevelConfig) {
          if (!currentLevelConfig.features) currentLevelConfig.features = {};
          currentLevelConfig.features[feature] = e.target.checked;
          updatePanelVisibility();
          updatePreview();
        }
      });
    }
  });
}

function populateFeaturesPanel(manifest) {
  const features = manifest.features || {};
  
  Object.keys(features).forEach(feature => {
    const checkbox = document.getElementById('feature-' + feature);
    if (checkbox) {
      checkbox.checked = features[feature] || false;
    }
  });
  
  updatePanelVisibility();
}

function updatePanelVisibility() {
  if (!currentLevelConfig || !currentLevelConfig.features) return;
  
  // Show/hide ocean panel based on ocean feature
  const oceanPanel = document.getElementById('ocean-panel');
  if (oceanPanel) {
    oceanPanel.style.display = currentLevelConfig.features.ocean ? 'block' : 'none';
  }
}

// --- Save Manifest Implementation ---
async function handleSaveManifest() {
  if (!currentLevelConfig || !currentManifestPath) {
    addEditorLog('⚠️ No level loaded to save.', 'warning');
    return;
  }

  try {
    addEditorLog('💾 Saving manifest changes...', 'info');

    const response = await fetch('/api/update-manifest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath: currentManifestPath,
        content: JSON.stringify(currentLevelConfig, null, 2)
      })
    });

    const result = await response.json();

    if (result.success) {
      addEditorLog('✅ Manifest saved successfully!', 'success');
      addEditorLog('📁 Path: ' + result.path, 'info');
    } else {
      addEditorLog('❌ Save failed: ' + result.message, 'error');
    }
  } catch (error) {
    addEditorLog('❌ Save error: ' + error.message, 'error');
    console.error('Manifest save error:', error);
  }
}

// --- 3D Preview Update ---
function updatePreview() {
  if (!currentLevelConfig) return;
  
  // Update the 3D preview based on current settings
  if (typeof updateEditor3D === 'function') {
    updateEditor3D();
  } else {
    // Initialize 3D editor if not already done
    if (!editorRenderer) {
      initEditor3D();
    }
    // For now, just log that preview would update
    addEditorLog('🔄 Preview settings updated (3D rendering pending)', 'info');
  }
  
  // Update stats
  updatePreviewStats();
}

function updatePreviewStats() {
  const statsFeatures = document.getElementById('stats-features');
  const statsLights = document.getElementById('stats-lights');
  const statsObjects = document.getElementById('stats-objects');
  
  if (currentLevelConfig && statsFeatures && statsLights && statsObjects) {
    const features = currentLevelConfig.features || {};
    const activeFeatures = Object.keys(features).filter(key => features[key]).length;
    const lights = (currentLevelConfig.lighting && currentLevelConfig.lighting.directionalLights) ? 
                  currentLevelConfig.lighting.directionalLights.length : 0;
    
    statsFeatures.textContent = activeFeatures;
    statsLights.textContent = lights;
    statsObjects.textContent = '-'; // Will be updated by 3D preview system
    
    // Show the stats overlay
    const statsDiv = document.getElementById('editor-stats');
    if (statsDiv) statsDiv.style.display = 'block';
  }
}

// Simplified implementations for the remaining panels (to be completed)
function initializeLightingPanel() {
  addEditorLog('💡 Lighting panel initialized', 'info');
}

function initializeStylePanel() {
  addEditorLog('🎨 Style panel initialized', 'info');
}

function initializeOceanPanel() {
  addEditorLog('🌊 Ocean panel initialized', 'info');
}

function initializePhysicsPanel() {
  addEditorLog('⚖️ Physics panel initialized', 'info');
}

function initializePreviewOptions() {
  const previewOptions = [
    'show-spawn-point', 'show-ocean', 'show-vegetation', 'show-physics-colliders',
    'show-heightmap', 'show-wireframe', 'show-grid'
  ];

  previewOptions.forEach(optionId => {
    const element = document.getElementById(optionId);
    if (element) {
      element.addEventListener('change', updatePreview);
    }
  });

  addEditorLog('👁️ Preview options initialized', 'info');
}

function populateFeaturesPanel(manifest) {
  addEditorLog('🎮 Features panel populated', 'info');
}

function populateLightingPanel(manifest) {
  addEditorLog('💡 Lighting panel populated', 'info');
}

function populateStylePanel(manifest) {
  addEditorLog('🎨 Style panel populated', 'info');
}

function populateOceanPanel(manifest) {
  addEditorLog('🌊 Ocean panel populated', 'info');
}

function populatePhysicsPanel(manifest) {
  addEditorLog('⚖️ Physics panel populated', 'info');
}

// --- Spawn Panel Implementation ---
function initializeSpawnPanel() {
  // Position controls
  const positionControls = [
    { id: 'spawn-position-x', prop: 'x' },
    { id: 'spawn-position-y', prop: 'y' },
    { id: 'spawn-position-z', prop: 'z' }
  ];

  positionControls.forEach(({ id, prop }) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', (e) => {
        if (currentLevelConfig) {
          if (!currentLevelConfig.spawn) currentLevelConfig.spawn = {};
          if (!currentLevelConfig.spawn.position) currentLevelConfig.spawn.position = [0, 10, 0];
          
          const index = prop === 'x' ? 0 : prop === 'y' ? 1 : 2;
          currentLevelConfig.spawn.position[index] = parseFloat(e.target.value);
          updatePreview();
        }
      });
    }
  });

  // Rotation controls
  const rotationControls = [
    { id: 'spawn-rotation-x', prop: 'x' },
    { id: 'spawn-rotation-y', prop: 'y' },
    { id: 'spawn-rotation-z', prop: 'z' }
  ];

  rotationControls.forEach(({ id, prop }) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', (e) => {
        if (currentLevelConfig) {
          if (!currentLevelConfig.spawn) currentLevelConfig.spawn = {};
          if (!currentLevelConfig.spawn.rotation) currentLevelConfig.spawn.rotation = [0, 0, 0];
          
          const index = prop === 'x' ? 0 : prop === 'y' ? 1 : 2;
          currentLevelConfig.spawn.rotation[index] = parseFloat(e.target.value);
          
          // Update the rotation value display for Y rotation
          if (prop === 'y') {
            const valueSpan = document.getElementById('spawn-rotation-value');
            if (valueSpan) {
              valueSpan.textContent = e.target.value + '°';
            }
          }
          
          updatePreview();
        }
      });
    }
  });

  addEditorLog('🚀 Spawn panel initialized', 'info');
}

function populateSpawnPanel(manifest) {
  const spawn = manifest.spawn || {};
  
  // Populate position values
  const position = spawn.position || [0, 10, 0];
  const posX = document.getElementById('spawn-position-x');
  const posY = document.getElementById('spawn-position-y');
  const posZ = document.getElementById('spawn-position-z');
  
  if (posX) posX.value = position[0] || 0;
  if (posY) posY.value = position[1] || 10;
  if (posZ) posZ.value = position[2] || 0;
  
  // Populate rotation values
  const rotation = spawn.rotation || [0, 0, 0];
  const rotX = document.getElementById('spawn-rotation-x');
  const rotY = document.getElementById('spawn-rotation-y');
  const rotZ = document.getElementById('spawn-rotation-z');
  const rotValue = document.getElementById('spawn-rotation-value');
  
  if (rotX) rotX.value = rotation[0] || 0;
  if (rotY) {
    rotY.value = rotation[1] || 0;
    if (rotValue) rotValue.textContent = (rotation[1] || 0) + '°';
  }
  if (rotZ) rotZ.value = rotation[2] || 0;
  
  addEditorLog('🚀 Spawn panel populated', 'info');
}

// --- 3D Editor Update Function ---
function updateEditor3D() {
  if (!editorRenderer || !editorScene || !editorCamera) {
    // 3D editor not initialized yet
    return;
  }
  
  if (!currentLevelConfig) {
    // No level loaded
    return;
  }
  
  addEditorLog('🎨 Updating 3D preview...', 'info');
  
  // Clear existing objects (except basic scene elements)
  const objectsToRemove = [];
  editorScene.traverse((child) => {
    if (child.userData && child.userData.isLevelObject) {
      objectsToRemove.push(child);
    }
  });
  objectsToRemove.forEach(obj => editorScene.remove(obj));
  
  // Add spawn point visualization if enabled
  const showSpawnPoint = document.getElementById('show-spawn-point');
  if (showSpawnPoint && showSpawnPoint.checked && currentLevelConfig.spawn) {
    addSpawnPointVisualization();
  }
  
  // Add basic grid if enabled
  const showGrid = document.getElementById('show-grid');
  if (showGrid && showGrid.checked) {
    addGridVisualization();
  }
  
  // Render the scene
  if (editorRenderer && editorScene && editorCamera) {
    editorRenderer.render(editorScene, editorCamera);
  }
  
  addEditorLog('✅ 3D preview updated', 'success');
}

function addSpawnPointVisualization() {
  if (!currentLevelConfig.spawn || !currentLevelConfig.spawn.position) return;
  
  const position = currentLevelConfig.spawn.position;
  const rotation = currentLevelConfig.spawn.rotation || [0, 0, 0];
  
  // Create spawn point marker (a simple arrow or player-like shape)
  const spawnGroup = new THREE.Group();
  spawnGroup.userData.isLevelObject = true;
  spawnGroup.userData.type = 'spawnPoint';
  
  // Player body (cylinder)
  const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2);
  const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.7 });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 1;
  spawnGroup.add(body);
  
  // Direction arrow
  const arrowGeometry = new THREE.ConeGeometry(0.3, 1);
  const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
  arrow.position.set(0, 2.5, -1);
  arrow.rotation.x = Math.PI / 2;
  spawnGroup.add(arrow);
  
  // Position the spawn point
  spawnGroup.position.set(position[0], position[1], position[2]);
  
  // Apply rotation (convert degrees to radians)
  spawnGroup.rotation.set(
    (rotation[0] || 0) * Math.PI / 180,
    (rotation[1] || 0) * Math.PI / 180,
    (rotation[2] || 0) * Math.PI / 180
  );
  
  editorScene.add(spawnGroup);
}

function addGridVisualization() {
  // Add a simple grid to help with positioning
  const size = 100;
  const divisions = 20;
  
  const gridHelper = new THREE.GridHelper(size, divisions, 0x444444, 0x222222);
  gridHelper.userData.isLevelObject = true;
  gridHelper.userData.type = 'grid';
  
  editorScene.add(gridHelper);
}
