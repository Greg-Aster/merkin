#!/usr/bin/env node

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');

const DEFAULT_TOOLS_PORT = 3001;
const REQUESTED_PORT = Number(process.env.MEGAMEAL_TOOLS_PORT || process.env.EDITOR_API_PORT || process.env.PORT || DEFAULT_TOOLS_PORT);
let activePort = REQUESTED_PORT;
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const GAME_APP_ROOT = path.join(REPO_ROOT, 'apps', 'game');
const GAME_PUBLIC_ROOT = path.join(REPO_ROOT, 'apps', 'megameal', 'public');
const DEV_RUNTIME_ROOT = path.join(REPO_ROOT, '.dev-runtime');
const TOOLS_RUNTIME_PATH = path.join(DEV_RUNTIME_ROOT, 'tools.json');
const GAME_LEVELS_ROOT = path.join(GAME_APP_ROOT, 'src', 'threlte', 'levels');
const LEVEL_REGISTRY_PATH = path.join(GAME_LEVELS_ROOT, 'level-registry.json');
const EDITOR_SCENES_ROOT = path.join(GAME_APP_ROOT, 'src', 'threlte', 'editor', 'scenes');
const LEGACY_TOOLS_ROOT = __dirname;
const GENERATED_HUNYUAN_ROOT = path.join(GAME_PUBLIC_ROOT, 'generated', 'hunyuan3d');
const GENERATED_STYLE_LAB_ROOT = path.join(GAME_PUBLIC_ROOT, 'generated', 'style-lab');
const GENERATED_BLENDER_REIMPORT_ROOT = path.join(GAME_PUBLIC_ROOT, 'generated', 'blender-reimports');
const BLENDER_EXPORT_ROOT = path.join(GAME_APP_ROOT, '.editor-exports', 'blender');
const HUNYUAN_EXAMPLE_WORKFLOW_PATH = path.join(REPO_ROOT, 'apps', 'game', 'public', 'ref-image', 'Hunyaun example.json');
const COMFY_IMAGE_EXAMPLE_WORKFLOW_PATH = path.join(REPO_ROOT, 'apps', 'game', 'public', 'ref-image', 'comfy_image_example.json');
const DEFAULT_HUNYUAN_PORT = 8080;
const DEFAULT_COMFYUI_PORT = 8188;

let hunyuanServerProcess = null;
let hunyuanServerLaunch = null;
let comfyUiServerProcess = null;
let comfyUiServerLaunch = null;
const hunyuanJobs = new Map();
const hunyuanJobQueue = [];
let activeHunyuanJobId = null;

function normalizePath(inputPath = '') {
  return inputPath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function resolveWorkspacePath(inputPath = '') {
  const normalized = normalizePath(inputPath);

  if (!normalized) return REPO_ROOT;
  if (normalized === 'public') return GAME_PUBLIC_ROOT;
  if (normalized.startsWith('public/')) return path.join(GAME_PUBLIC_ROOT, normalized.slice('public/'.length));
  if (normalized === 'src') return path.join(GAME_APP_ROOT, 'src');
  if (normalized.startsWith('src/')) return path.join(GAME_APP_ROOT, 'src', normalized.slice('src/'.length));
  if (normalized === 'tools') return LEGACY_TOOLS_ROOT;
  if (normalized.startsWith('tools/')) return path.join(LEGACY_TOOLS_ROOT, normalized.slice('tools/'.length));

  return path.join(REPO_ROOT, normalized);
}

function toRepoRelative(inputPath) {
  return path.relative(REPO_ROOT, inputPath).replace(/\\/g, '/');
}

function ensureDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

function formatBytes(size = 0) {
  if (!Number.isFinite(size) || size <= 0) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function timestampKey() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function hasMeaningfulSceneContent(scene) {
  if (!scene || typeof scene !== 'object') return false;
  if (Array.isArray(scene.nodes) && scene.nodes.length > 0) return true;
  if (scene.settings && typeof scene.settings === 'object' && Object.keys(scene.settings).length > 0) return true;
  return false;
}

function createGeneratedStyleDirectory(nameHint = 'asset', category = 'workspace') {
  const directory = path.join(
    GENERATED_STYLE_LAB_ROOT,
    category,
    `${buildSafeAssetSlug(nameHint)}-${timestampKey()}`,
  );
  ensureDirectory(directory);
  return directory;
}

function findLatestStyleWorkspaceForAsset(assetUrl = '') {
  const workspaceRoot = path.join(GENERATED_STYLE_LAB_ROOT, 'workspace');
  if (!fs.existsSync(workspaceRoot) || !fs.statSync(workspaceRoot).isDirectory()) {
    return null;
  }

  const candidates = fs.readdirSync(workspaceRoot)
    .map((name) => path.join(workspaceRoot, name))
    .filter((directory) => fs.existsSync(directory) && fs.statSync(directory).isDirectory())
    .map((directory) => {
      const manifestPath = path.join(directory, 'style-request.json');
      if (!fs.existsSync(manifestPath) || !fs.statSync(manifestPath).isFile()) {
        return null;
      }

      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (manifest?.sourceAssetUrl !== assetUrl) {
          return null;
        }

        return {
          directory,
          manifestPath,
          manifest,
          createdAt: new Date(manifest?.createdAt || fs.statSync(manifestPath).mtime.toISOString()).getTime(),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.createdAt - a.createdAt);

  return candidates[0] || null;
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      stdio: 'pipe',
      ...options,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function runGltfTransform(args = []) {
  return runProcess('pnpm', ['exec', 'gltf-transform', ...args], {
    cwd: REPO_ROOT,
  });
}

async function inspectGltfAsset(filePath) {
  const result = await runGltfTransform(['inspect', filePath, '--format', 'md']);
  if (result.code !== 0) {
    throw new Error(result.stderr || result.stdout || `glTF inspection failed with exit code ${result.code}`);
  }
  return result.stdout.trim();
}

function extractBoundingBoxFromInspectReport(inspectReport = '') {
  const parseVector = (raw = '') => raw
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value));

  const sceneRows = inspectReport
    .split('\n')
    .filter((line) => /^\|\s*\d+\s*\|/.test(line));

  for (const row of sceneRows) {
    const vectors = row.match(/-?\d+(?:\.\d+)?(?:,\s*-?\d+(?:\.\d+)?){2}/g) || [];
    if (vectors.length < 2) continue;

    const bboxMin = parseVector(vectors[0]);
    const bboxMax = parseVector(vectors[1]);
    if (bboxMin.length !== 3 || bboxMax.length !== 3) continue;

    const size = bboxMax.map((value, index) => value - bboxMin[index]);
    const maxDimension = Math.max(...size.map((value) => Math.abs(value)));
    if (!Number.isFinite(maxDimension)) continue;

    return {
      bboxMin,
      bboxMax,
      size,
      maxDimension,
    };
  }

  const bboxMinMatch = inspectReport.match(/bboxMin[^-\d]*([-\d., ]+)/i);
  const bboxMaxMatch = inspectReport.match(/bboxMax[^-\d]*([-\d., ]+)/i);
  if (!bboxMinMatch || !bboxMaxMatch) return null;

  const bboxMin = parseVector(bboxMinMatch[1]);
  const bboxMax = parseVector(bboxMaxMatch[1]);
  if (bboxMin.length !== 3 || bboxMax.length !== 3) return null;

  const size = bboxMax.map((value, index) => value - bboxMin[index]);
  const maxDimension = Math.max(...size.map((value) => Math.abs(value)));
  if (!Number.isFinite(maxDimension)) return null;

  return {
    bboxMin,
    bboxMax,
    size,
    maxDimension,
  };
}

async function copyModelToGlb(sourcePath, outputPath) {
  const result = await runGltfTransform(['copy', sourcePath, outputPath]);
  if (result.code !== 0) {
    throw new Error(result.stderr || result.stdout || `glTF export failed with exit code ${result.code}`);
  }
  return result;
}

async function centerModelForSceneReplacement(modelPath, pivot = 'center') {
  const tempOutputPath = modelPath.replace(/\.(glb|gltf)$/i, '.centered.$1');
  const result = await runGltfTransform(['center', modelPath, tempOutputPath, '--pivot', pivot]);
  if (result.code !== 0) {
    throw new Error(result.stderr || result.stdout || `glTF center failed with exit code ${result.code}`);
  }

  fs.copyFileSync(tempOutputPath, modelPath);
  fs.unlinkSync(tempOutputPath);
}

function resolveInspectableModelAsset(assetUrl = '') {
  const assetPath = resolvePublicAssetPath(assetUrl);
  if (!fs.existsSync(assetPath) || !fs.statSync(assetPath).isFile()) {
    throw new Error(`Asset file not found: ${assetUrl}`);
  }

  const extension = path.extname(assetPath).toLowerCase();
  if (!['.glb', '.gltf'].includes(extension)) {
    throw new Error('Only .glb and .gltf assets are supported for this operation.');
  }

  return {
    assetPath,
    extension,
    assetName: path.basename(assetPath, extension),
  };
}

function detectBlenderExecutable() {
  const envPath = process.env.BLENDER_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  const whichResult = spawnSync('bash', ['-lc', 'command -v blender'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  const resolved = whichResult.stdout?.trim();
  if (whichResult.status === 0 && resolved) {
    return resolved;
  }

  return '';
}

function launchBlenderFile(filePath) {
  const blenderExecutable = detectBlenderExecutable();
  const openCommand = blenderExecutable ? `${blenderExecutable} "${filePath}"` : '';

  if (!blenderExecutable) {
    return {
      blenderExecutable,
      openCommand,
      openedInBlender: false,
    };
  }

  const child = spawn(blenderExecutable, [filePath], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  return {
    blenderExecutable,
    openCommand,
    openedInBlender: true,
  };
}

function resolveBlenderExportDirectory(exportPath = '') {
  if (!exportPath) return '';

  const resolved = path.resolve(exportPath);
  if (!resolved.startsWith(BLENDER_EXPORT_ROOT)) {
    throw new Error('Blender export path resolves outside the editor export directory.');
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`Blender export path not found: ${exportPath}`);
  }

  const stats = fs.statSync(resolved);
  return stats.isDirectory() ? resolved : path.dirname(resolved);
}

function findLatestBlenderExportForSource(sourceAssetUrl = '') {
  if (!fs.existsSync(BLENDER_EXPORT_ROOT) || !fs.statSync(BLENDER_EXPORT_ROOT).isDirectory()) {
    return null;
  }

  const candidates = fs.readdirSync(BLENDER_EXPORT_ROOT)
    .map((name) => path.join(BLENDER_EXPORT_ROOT, name))
    .filter((directory) => fs.existsSync(directory) && fs.statSync(directory).isDirectory())
    .map((directory) => {
      const manifestPath = path.join(directory, 'merkin-blender-export.json');
      if (!fs.existsSync(manifestPath) || !fs.statSync(manifestPath).isFile()) {
        return null;
      }

      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (sourceAssetUrl && manifest?.sourceAssetUrl !== sourceAssetUrl) {
          return null;
        }

        const stats = fs.statSync(manifestPath);
        return {
          directory,
          manifestPath,
          manifest,
          updatedAt: manifest?.createdAt || stats.mtime.toISOString(),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((left, right) => Date.parse(right.updatedAt || 0) - Date.parse(left.updatedAt || 0));

  return candidates[0] || null;
}

function findLatestModelInDirectory(directory) {
  if (!directory || !fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return null;
  }

  const candidates = fs.readdirSync(directory)
    .map((name) => path.join(directory, name))
    .filter((fullPath) => fs.existsSync(fullPath) && fs.statSync(fullPath).isFile())
    .filter((fullPath) => ['.glb', '.gltf'].includes(path.extname(fullPath).toLowerCase()))
    .map((fullPath) => ({
      fullPath,
      stats: fs.statSync(fullPath),
    }))
    .sort((left, right) => right.stats.mtimeMs - left.stats.mtimeMs);

  return candidates[0]?.fullPath || null;
}

function writeToolsRuntime(port) {
  ensureDirectory(DEV_RUNTIME_ROOT);
  fs.writeFileSync(
    TOOLS_RUNTIME_PATH,
    JSON.stringify({
      name: 'tools',
      pid: process.pid,
      host: '127.0.0.1',
      port,
      origin: `http://127.0.0.1:${port}`,
      updatedAt: new Date().toISOString(),
    }, null, 2),
    'utf8',
  );
}

function clearToolsRuntime() {
  try {
    const existing = JSON.parse(fs.readFileSync(TOOLS_RUNTIME_PATH, 'utf8'));
    if (existing?.pid && existing.pid !== process.pid) {
      return;
    }
  } catch {}

  try {
    fs.unlinkSync(TOOLS_RUNTIME_PATH);
  } catch {}
}

function applyCorsHeaders(req, res, pathname) {
  if (!pathname.startsWith('/api/')) return;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readLevelRegistry() {
  if (!fs.existsSync(LEVEL_REGISTRY_PATH)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(LEVEL_REGISTRY_PATH, 'utf8'));
}

function writeLevelRegistry(entries) {
  ensureDirectory(path.dirname(LEVEL_REGISTRY_PATH));
  fs.writeFileSync(LEVEL_REGISTRY_PATH, JSON.stringify(entries, null, 2));
}

function slugify(value = 'asset') {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'asset';
}

function normalizeGeneratedAssetName(value = 'asset') {
  let normalized = String(value || 'asset')
    .replace(/\.(glb|gltf|png|jpe?g|webp)$/i, '')
    .replace(/(?:-reference-\d{4}-\d{2}-\d{2}t?\d{2}[-:.]\d{2}[-:.]\d{2}[-:.]\d{3}z?)+/ig, '')
    .replace(/(?:-(?:generated|texture-wrap)-\d{4}-\d{2}-\d{2}t?\d{2}[-:.]\d{2}[-:.]\d{2}[-:.]\d{3}z?)+/ig, '')
    .replace(/(?:_\d+_)+$/g, '')
    .replace(/-+$/g, '')
    .trim();

  return normalized || 'asset';
}

function buildSafeAssetSlug(value = 'asset', maxLength = 80) {
  const normalized = slugify(normalizeGeneratedAssetName(value || 'asset'));
  if (normalized.length <= maxLength) {
    return normalized || 'asset';
  }

  return normalized.slice(0, maxLength).replace(/-+$/g, '') || 'asset';
}

function resolvePublicAssetPath(publicUrl = '') {
  if (typeof publicUrl !== 'string' || !publicUrl.startsWith('/')) {
    throw new Error('Asset URL must start with "/"');
  }

  const normalized = decodeURIComponent(publicUrl.split('?')[0]).replace(/^\/+/, '');
  const fullPath = path.join(GAME_PUBLIC_ROOT, normalized);

  if (!fullPath.startsWith(GAME_PUBLIC_ROOT)) {
    throw new Error('Asset path resolves outside the public directory');
  }

  return fullPath;
}

function toPublicAssetUrl(fullPath) {
  return `/${path.relative(GAME_PUBLIC_ROOT, fullPath).replace(/\\/g, '/')}`;
}

function fileToBase64(fullPath) {
  return fs.readFileSync(fullPath).toString('base64');
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createHunyuanJob(payload) {
  const id = `hunyuan-job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const job = {
    id,
    status: 'queued',
    payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    result: null,
    error: null,
  };
  hunyuanJobs.set(id, job);
  hunyuanJobQueue.push(id);
  return job;
}

function getHunyuanJob(jobId) {
  return hunyuanJobs.get(jobId) ?? null;
}

function getHunyuanJobQueuePosition(jobId) {
  const activeOffset = activeHunyuanJobId ? 1 : 0;
  const queuedIndex = hunyuanJobQueue.indexOf(jobId);

  if (queuedIndex >= 0) {
    return queuedIndex + activeOffset + 1;
  }

  if (activeHunyuanJobId === jobId) {
    return 1;
  }

  return null;
}

function serializeHunyuanJob(job) {
  if (!job) return null;

  const sourceName = typeof job.payload?.sourceName === 'string' ? job.payload.sourceName : '';
  const mode = typeof job.payload?.mode === 'string' ? job.payload.mode : '';
  const assetUrl = typeof job.payload?.assetUrl === 'string' ? job.payload.assetUrl : '';
  const prompt = typeof job.payload?.prompt === 'string' ? job.payload.prompt : '';

  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    queuePosition: getHunyuanJobQueuePosition(job.id),
    sourceName,
    mode,
    assetUrl,
    prompt,
    result: job.result,
    error: job.error,
  };
}

function listRecentHunyuanJobs(limit = 10) {
  const normalizedLimit = Number.isFinite(Number(limit))
    ? Math.max(1, Math.min(50, Number(limit)))
    : 10;

  return Array.from(hunyuanJobs.values())
    .sort((a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0))
    .slice(0, normalizedLimit)
    .map((job) => serializeHunyuanJob(job));
}

async function interruptComfyUi(apiUrl) {
  const baseUrl = String(apiUrl || `http://127.0.0.1:${DEFAULT_COMFYUI_PORT}`).replace(/\/+$/, '');
  try {
    await fetch(`${baseUrl}/interrupt`, { method: 'POST' });
  } catch {}
}

async function cancelHunyuanJobs({ jobId = '', all = false } = {}) {
  const cancelledJobIds = [];

  if (all) {
    for (const queuedId of [...hunyuanJobQueue]) {
      const job = getHunyuanJob(queuedId);
      if (!job) continue;
      job.status = 'cancelled';
      job.error = 'Cancelled from editor.';
      job.updatedAt = new Date().toISOString();
      job.finishedAt = job.updatedAt;
      cancelledJobIds.push(queuedId);
    }
    hunyuanJobQueue.length = 0;

    if (activeHunyuanJobId) {
      const activeJob = getHunyuanJob(activeHunyuanJobId);
      if (activeJob) {
        activeJob.cancelRequested = true;
        activeJob.updatedAt = new Date().toISOString();
        cancelledJobIds.push(activeJob.id);
        await interruptComfyUi(activeJob.payload?.comfyUiApiUrl);
      }
    }

    return cancelledJobIds;
  }

  if (!jobId) return cancelledJobIds;

  const queuedIndex = hunyuanJobQueue.indexOf(jobId);
  if (queuedIndex !== -1) {
    hunyuanJobQueue.splice(queuedIndex, 1);
    const job = getHunyuanJob(jobId);
    if (job) {
      job.status = 'cancelled';
      job.error = 'Cancelled from editor.';
      job.updatedAt = new Date().toISOString();
      job.finishedAt = job.updatedAt;
      cancelledJobIds.push(jobId);
    }
    return cancelledJobIds;
  }

  if (activeHunyuanJobId === jobId) {
    const activeJob = getHunyuanJob(jobId);
    if (activeJob) {
      activeJob.cancelRequested = true;
      activeJob.updatedAt = new Date().toISOString();
      cancelledJobIds.push(jobId);
      await interruptComfyUi(activeJob.payload?.comfyUiApiUrl);
    }
  }

  return cancelledJobIds;
}

async function processHunyuanJobQueue() {
  if (activeHunyuanJobId || hunyuanJobQueue.length === 0) {
    return;
  }

  const nextJobId = hunyuanJobQueue.shift();
  const job = getHunyuanJob(nextJobId);
  if (!job) {
    setImmediate(() => {
      void processHunyuanJobQueue();
    });
    return;
  }

  if (job.status === 'cancelled') {
    setImmediate(() => {
      void processHunyuanJobQueue();
    });
    return;
  }

  activeHunyuanJobId = nextJobId;
  job.status = 'running';
  job.startedAt = new Date().toISOString();
  job.updatedAt = job.startedAt;

  try {
    const response = await fetch(`http://127.0.0.1:${activePort}/api/hunyuan3d/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job.payload),
    });
    const payload = await response.json().catch(() => null);

    if (job.cancelRequested) {
      job.status = 'cancelled';
      job.error = 'Cancelled from editor.';
      job.result = payload;
      return;
    }

    if (!response.ok || !payload?.success) {
      job.status = 'failed';
      job.error = payload?.message || `Hunyuan job failed with status ${response.status}`;
      job.result = payload;
    } else {
      job.status = 'succeeded';
      job.result = payload;
      job.error = null;
    }
  } catch (error) {
    job.status = 'failed';
    job.error = error?.message || 'Unknown Hunyuan job failure.';
    job.result = null;
  } finally {
    job.finishedAt = new Date().toISOString();
    job.updatedAt = job.finishedAt;
    activeHunyuanJobId = null;
    setImmediate(() => {
      void processHunyuanJobQueue();
    });
  }
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function getHunyuanHealth(apiUrl) {
  const baseUrl = String(apiUrl || `http://127.0.0.1:${DEFAULT_HUNYUAN_PORT}`).replace(/\/+$/, '');

  try {
    const response = await fetch(`${baseUrl}/health`, { method: 'GET' });
    if (response.ok) {
      return { available: true, apiUrl: baseUrl, message: 'Hunyuan API is ready.' };
    }
  } catch {}

  try {
    const response = await fetch(`${baseUrl}/docs`, { method: 'GET' });
    if (response.ok) {
      return { available: true, apiUrl: baseUrl, message: 'Hunyuan API is responding.' };
    }
  } catch {}

  return { available: false, apiUrl: baseUrl, message: 'Hunyuan API is not responding.' };
}

async function getComfyUiHealth(apiUrl) {
  const baseUrl = String(apiUrl || `http://127.0.0.1:${DEFAULT_COMFYUI_PORT}`).replace(/\/+$/, '');

  try {
    const response = await fetch(`${baseUrl}/system_stats`, { method: 'GET' });
    if (response.ok) {
      return { available: true, apiUrl: baseUrl, message: 'ComfyUI is ready.' };
    }
  } catch {}

  try {
    const response = await fetch(`${baseUrl}/prompt`, { method: 'GET' });
    if (response.ok) {
      return { available: true, apiUrl: baseUrl, message: 'ComfyUI is responding.' };
    }
  } catch {}

  return { available: false, apiUrl: baseUrl, message: 'ComfyUI is not responding.' };
}

function detectHunyuanLaunchSpec(apiUrl) {
  const parsedUrl = new URL(apiUrl || `http://127.0.0.1:${DEFAULT_HUNYUAN_PORT}`);
  const port = parsedUrl.port || String(DEFAULT_HUNYUAN_PORT);
  const host = parsedUrl.hostname || '127.0.0.1';
  const explicitCommand = process.env.HUNYUAN3D_START_COMMAND;
  const explicitRoot = process.env.HUNYUAN3D_ROOT;

  if (explicitCommand) {
    return {
      type: 'command',
      command: explicitCommand,
      cwd: explicitRoot || REPO_ROOT,
      description: `Custom command from HUNYUAN3D_START_COMMAND`,
    };
  }

  const candidateRoots = [
    explicitRoot,
    path.join(process.env.HOME || '', 'Hunyuan3D-2'),
    path.join(process.env.HOME || '', 'Tencent-Hunyuan', 'Hunyuan3D-2'),
    path.join(REPO_ROOT, 'Hunyuan3D-2'),
  ].filter(Boolean);

  for (const root of candidateRoots) {
    const apiServerPath = path.join(root, 'api_server.py');
    if (fs.existsSync(apiServerPath)) {
      return {
        type: 'python-script',
        command: 'python',
        args: [apiServerPath, '--host', host, '--port', port],
        cwd: root,
        description: `Official Hunyuan3D API server at ${root}`,
      };
    }
  }

  return null;
}

function detectComfyUiHunyuanInstall() {
  const candidateRoots = [
    process.env.COMFYUI_ROOT,
    path.join(process.env.HOME || '', 'ComfyUI'),
    path.join(REPO_ROOT, 'ComfyUI'),
  ].filter(Boolean);

  for (const root of candidateRoots) {
    const comfyMain = path.join(root, 'main.py');
    const hunyuanNodes = path.join(root, 'comfy_extras', 'nodes_hunyuan3d.py');
    const hunyuanApiNodes = path.join(root, 'comfy_api_nodes', 'nodes_hunyuan3d.py');
    if (fs.existsSync(comfyMain) && (fs.existsSync(hunyuanNodes) || fs.existsSync(hunyuanApiNodes))) {
      return {
        root,
        hasApiNodes: fs.existsSync(hunyuanApiNodes),
        hasCoreNodes: fs.existsSync(hunyuanNodes),
      };
    }
  }

  return null;
}

function detectComfyUiLaunchSpec(apiUrl) {
  const parsedUrl = new URL(apiUrl || `http://127.0.0.1:${DEFAULT_COMFYUI_PORT}`);
  const port = parsedUrl.port || String(DEFAULT_COMFYUI_PORT);
  const explicitCommand = process.env.COMFYUI_START_COMMAND;
  const explicitRoot = process.env.COMFYUI_ROOT;

  if (explicitCommand) {
    return {
      type: 'command',
      command: explicitCommand,
      cwd: explicitRoot || REPO_ROOT,
      description: 'Custom command from COMFYUI_START_COMMAND',
    };
  }

  const candidateRoots = [
    explicitRoot,
    path.join(process.env.HOME || '', 'ComfyUI'),
    path.join(REPO_ROOT, 'ComfyUI'),
  ].filter(Boolean);

  const preferredScripts = [
    process.env.COMFYUI_START_SCRIPT,
    'startup311.sh',
    'startup311-lowvram.sh',
    'startup_cu126.sh',
    'startup_cu130.sh',
    'startup_flux_stable.sh',
  ].filter(Boolean);

  for (const root of candidateRoots) {
    for (const scriptName of preferredScripts) {
      const scriptPath = path.join(root, scriptName);
      if (fs.existsSync(scriptPath)) {
        return {
          type: 'shell-script',
          command: scriptPath,
          args: [],
          cwd: root,
          env: { COMFYUI_PORT: port },
          description: `ComfyUI startup script ${scriptName} at ${root}`,
        };
      }
    }

    const mainPath = path.join(root, 'main.py');
    if (fs.existsSync(mainPath)) {
      return {
        type: 'python-script',
        command: 'python3',
        args: [mainPath, '--listen', '--port', port],
        cwd: root,
        env: {},
        description: `ComfyUI main.py at ${root}`,
      };
    }
  }

  return null;
}

async function ensureComfyUiServer(apiUrl) {
  const health = await getComfyUiHealth(apiUrl);
  if (health.available) {
    return { available: true, apiUrl: health.apiUrl, autoStarted: false, message: health.message };
  }

  const launchSpec = detectComfyUiLaunchSpec(health.apiUrl);
  if (!launchSpec) {
    return {
      available: false,
      apiUrl: health.apiUrl,
      autoStarted: false,
      message: 'ComfyUI is not running and no local install was auto-detected. Set COMFYUI_ROOT or COMFYUI_START_COMMAND for automatic launch.',
    };
  }

  if (
    comfyUiServerProcess &&
    !comfyUiServerProcess.killed &&
    comfyUiServerLaunch?.apiUrl === health.apiUrl
  ) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await delay(1000);
      const retryHealth = await getComfyUiHealth(health.apiUrl);
      if (retryHealth.available) {
        return {
          available: true,
          apiUrl: retryHealth.apiUrl,
          autoStarted: true,
          message: `ComfyUI auto-started via ${launchSpec.description}.`,
        };
      }
    }
  } else {
    const spawnOptions = {
      cwd: launchSpec.cwd,
      detached: false,
      stdio: 'ignore',
      env: { ...process.env, ...(launchSpec.env || {}) },
    };

    if (launchSpec.type === 'command') {
      comfyUiServerProcess = spawn(launchSpec.command, {
        ...spawnOptions,
        shell: true,
      });
    } else {
      comfyUiServerProcess = spawn(launchSpec.command, launchSpec.args || [], spawnOptions);
    }

    comfyUiServerLaunch = {
      apiUrl: health.apiUrl,
      description: launchSpec.description,
    };

    comfyUiServerProcess.on('exit', () => {
      comfyUiServerProcess = null;
      comfyUiServerLaunch = null;
    });

    for (let attempt = 0; attempt < 25; attempt += 1) {
      await delay(1000);
      const retryHealth = await getComfyUiHealth(health.apiUrl);
      if (retryHealth.available) {
        return {
          available: true,
          apiUrl: retryHealth.apiUrl,
          autoStarted: true,
          message: `ComfyUI auto-started via ${launchSpec.description}.`,
        };
      }
    }
  }

  return {
    available: false,
    apiUrl: health.apiUrl,
    autoStarted: true,
    message: `Tried to auto-start ComfyUI via ${launchSpec.description}, but the server never came online.`,
  };
}

async function ensureHunyuanServer(apiUrl) {
  const health = await getHunyuanHealth(apiUrl);
  if (health.available) {
    return { available: true, apiUrl: health.apiUrl, autoStarted: false, message: health.message };
  }

  const launchSpec = detectHunyuanLaunchSpec(health.apiUrl);
  if (!launchSpec) {
    const comfyUiInstall = detectComfyUiHunyuanInstall();
    return {
      available: false,
      apiUrl: health.apiUrl,
      autoStarted: false,
      message: comfyUiInstall
        ? `Found ComfyUI with Hunyuan nodes at ${comfyUiInstall.root}, but this bridge only auto-launches the official Hunyuan3D-2 api_server.py right now. Set HUNYUAN3D_ROOT or HUNYUAN3D_START_COMMAND, or switch the bridge to a direct ComfyUI workflow.`
        : 'Hunyuan is not running and no local install was auto-detected. Set HUNYUAN3D_ROOT or HUNYUAN3D_START_COMMAND for automatic launch.',
    };
  }

  if (
    hunyuanServerProcess &&
    !hunyuanServerProcess.killed &&
    hunyuanServerLaunch?.apiUrl === health.apiUrl
  ) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await delay(1000);
      const retryHealth = await getHunyuanHealth(health.apiUrl);
      if (retryHealth.available) {
        return {
          available: true,
          apiUrl: retryHealth.apiUrl,
          autoStarted: true,
          message: `Hunyuan auto-started via ${launchSpec.description}.`,
        };
      }
    }
  } else {
    if (launchSpec.type === 'command') {
      hunyuanServerProcess = spawn(launchSpec.command, {
        cwd: launchSpec.cwd,
        shell: true,
        detached: false,
        stdio: 'ignore',
      });
    } else {
      hunyuanServerProcess = spawn(launchSpec.command, launchSpec.args, {
        cwd: launchSpec.cwd,
        detached: false,
        stdio: 'ignore',
      });
    }

    hunyuanServerLaunch = {
      apiUrl: health.apiUrl,
      description: launchSpec.description,
    };

    hunyuanServerProcess.on('exit', () => {
      hunyuanServerProcess = null;
      hunyuanServerLaunch = null;
    });

    for (let attempt = 0; attempt < 25; attempt += 1) {
      await delay(1000);
      const retryHealth = await getHunyuanHealth(health.apiUrl);
      if (retryHealth.available) {
        return {
          available: true,
          apiUrl: retryHealth.apiUrl,
          autoStarted: true,
          message: `Hunyuan auto-started via ${launchSpec.description}.`,
        };
      }
    }
  }

  return {
    available: false,
    apiUrl: health.apiUrl,
    autoStarted: true,
    message: `Tried to auto-start Hunyuan via ${launchSpec.description}, but the API never came online.`,
  };
}

function detectComfyUiHunyuanCapabilities(comfyUiRoot) {
  const diffusionModelsRoot = path.join(comfyUiRoot, 'models', 'diffusion_models');
  const checkpointsRoot = path.join(comfyUiRoot, 'models', 'checkpoints');
  const diffusersRoot = path.join(comfyUiRoot, 'models', 'diffusers');

  const safeReadDir = (directoryPath) => {
    try {
      return fs.existsSync(directoryPath) ? fs.readdirSync(directoryPath) : [];
    } catch {
      return [];
    }
  };

  const diffusionModelEntries = safeReadDir(diffusionModelsRoot);
  const checkpointEntries = safeReadDir(checkpointsRoot);
  const diffusersEntries = safeReadDir(diffusersRoot);

  const shapeModelCandidates = [...diffusionModelEntries, ...checkpointEntries].filter((entry) => (
    /(?:hy3d|hunyuan(?:[-_. ]?3d)?)/i.test(entry)
  ));
  const paintModelCandidates = diffusersEntries.filter((entry) => (
    /hunyuan3d-paint/i.test(entry)
  ));
  const delightModelCandidates = diffusersEntries.filter((entry) => (
    /hunyuan3d-delight/i.test(entry)
  ));

  const shapeModelAvailable = shapeModelCandidates.length > 0;
  const paintModelAvailable = paintModelCandidates.length > 0;
  const delightModelAvailable = delightModelCandidates.length > 0;

  return {
    shapeModelAvailable,
    paintModelAvailable,
    delightModelAvailable,
    shapeModelCandidates,
    paintModelCandidates,
    delightModelCandidates,
  };
}

async function getHunyuanBackendStatus(apiUrl, comfyUiApiUrl, ensure = false) {
  const directStatus = ensure
    ? await ensureHunyuanServer(apiUrl)
    : await getHunyuanHealth(apiUrl);

  if (directStatus.available) {
    return {
      ...directStatus,
      backend: 'hunyuan-api',
      supportsReplacementGeneration: true,
      supportsTextureWrap: true,
    };
  }

  const comfyStatus = ensure
    ? await ensureComfyUiServer(comfyUiApiUrl)
    : await getComfyUiHealth(comfyUiApiUrl);

  if (!comfyStatus.available) {
    return {
      available: false,
      apiUrl: directStatus.apiUrl,
      backend: 'none',
      supportsReplacementGeneration: false,
      supportsTextureWrap: false,
      message: directStatus.message,
      directStatus,
      comfyStatus,
    };
  }

  const comfyInstall = detectComfyUiHunyuanInstall();
  if (!comfyInstall) {
    return {
      available: true,
      apiUrl: comfyStatus.apiUrl,
      backend: 'comfyui',
      supportsReplacementGeneration: false,
      supportsTextureWrap: false,
      message: 'ComfyUI is running, but no Hunyuan 3D wrapper install was detected.',
      directStatus,
      comfyStatus,
    };
  }

  const capabilities = detectComfyUiHunyuanCapabilities(comfyInstall.root);
  const limitations = [];

  if (!capabilities.shapeModelAvailable) {
    limitations.push('no Hunyuan shape model is installed for mesh generation');
  }
  if (!capabilities.paintModelAvailable) {
    limitations.push('no paint model is installed for texture wrapping');
  }

  return {
    available: true,
    apiUrl: comfyStatus.apiUrl,
    backend: 'comfyui',
    supportsReplacementGeneration: capabilities.shapeModelAvailable,
    supportsTextureWrap: capabilities.paintModelAvailable,
    message: limitations.length > 0
      ? `ComfyUI Hunyuan backend is online at ${comfyInstall.root}, but ${limitations.join(' and ')}.`
      : `ComfyUI Hunyuan backend is online at ${comfyInstall.root}.`,
    directStatus,
    comfyStatus,
    comfyInstall,
    capabilities,
  };
}

function getComfyUiInstallRoot(status) {
  return status?.comfyInstall?.root || detectComfyUiHunyuanInstall()?.root || null;
}

function copyFileToComfyUiInput(sourcePath, comfyUiRoot, nameHint = 'reference') {
  const inputDirectory = path.join(comfyUiRoot, 'input');
  ensureDirectory(inputDirectory);
  const extension = path.extname(sourcePath) || '.png';
  const fileName = `${buildSafeAssetSlug(nameHint)}-${Date.now()}${extension}`;
  const destinationPath = path.join(inputDirectory, fileName);
  fs.copyFileSync(sourcePath, destinationPath);
  return { fileName, fullPath: destinationPath };
}

async function queueComfyUiPrompt(apiUrl, prompt) {
  const promptId = `merkin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { response, payload } = await fetchJson(`${String(apiUrl).replace(/\/+$/, '')}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      prompt_id: promptId,
      client_id: 'merkin-tools',
    }),
  });

  if (!response.ok) {
    const rawError = payload?.error ?? payload?.message ?? payload;
    const message = typeof rawError === 'string'
      ? rawError
      : rawError
        ? JSON.stringify(rawError)
        : `ComfyUI prompt failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload?.prompt_id || promptId;
}

async function getComfyUiHistory(apiUrl, promptId) {
  const { response, payload } = await fetchJson(`${String(apiUrl).replace(/\/+$/, '')}/history/${encodeURIComponent(promptId)}`, {
    method: 'GET',
  });

  if (!response.ok) {
    return null;
  }

  return payload?.[promptId] || null;
}

async function waitForComfyUiPrompt(apiUrl, promptId, timeoutMs = 30 * 60 * 1000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const history = await getComfyUiHistory(apiUrl, promptId);
    if (history) {
      return history;
    }
    await delay(2000);
  }

  throw new Error('Timed out waiting for ComfyUI prompt execution to finish.');
}

function findComfyUiGeneratedMesh(comfyUiRoot, outputPrefix, extension = '.glb') {
  const outputDirectory = path.join(comfyUiRoot, 'output');
  const normalizedPrefix = normalizePath(outputPrefix);
  const subfolder = path.dirname(normalizedPrefix);
  const baseName = path.basename(normalizedPrefix);
  const searchDirectory = path.join(outputDirectory, subfolder);

  if (!fs.existsSync(searchDirectory) || !fs.statSync(searchDirectory).isDirectory()) {
    const fallbackDirectories = [
      path.join(outputDirectory, 'mesh'),
      path.join(outputDirectory, '3D'),
      outputDirectory,
    ].filter((directory, index, all) => all.indexOf(directory) === index && fs.existsSync(directory));

    const fallbackCandidates = fallbackDirectories.flatMap((directory) => (
      fs.readdirSync(directory)
        .filter((name) => name.toLowerCase().endsWith(extension))
        .map((name) => path.join(directory, name))
    )).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

    return fallbackCandidates[0] || null;
  }

  const candidates = fs.readdirSync(searchDirectory)
    .filter((name) => name.startsWith(`${baseName}_`) && name.toLowerCase().endsWith(extension))
    .map((name) => path.join(searchDirectory, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  if (candidates[0]) {
    return candidates[0];
  }

  const fallbackDirectories = [
    searchDirectory,
    path.join(outputDirectory, 'mesh'),
    path.join(outputDirectory, '3D'),
    outputDirectory,
  ].filter((directory, index, all) => all.indexOf(directory) === index && fs.existsSync(directory));

  const fallbackCandidates = fallbackDirectories.flatMap((directory) => (
    fs.readdirSync(directory)
      .filter((name) => name.toLowerCase().endsWith(extension))
      .map((name) => path.join(directory, name))
  )).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  return fallbackCandidates[0] || null;
}

function findComfyUiGeneratedFile(comfyUiRoot, outputPrefix, extensions = []) {
  const outputDirectory = path.join(comfyUiRoot, 'output');
  const normalizedPrefix = normalizePath(outputPrefix);
  const subfolder = path.dirname(normalizedPrefix);
  const baseName = path.basename(normalizedPrefix);
  const searchDirectory = path.join(outputDirectory, subfolder);
  const normalizedExtensions = extensions.map((entry) => String(entry).toLowerCase());

  const matchesExtension = (name) => normalizedExtensions.length === 0 || normalizedExtensions.some((extension) => (
    name.toLowerCase().endsWith(extension)
  ));

  const collectCandidates = (directory) => {
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
      return [];
    }

    return fs.readdirSync(directory)
      .filter((name) => name.startsWith(`${baseName}_`) && matchesExtension(name))
      .map((name) => path.join(directory, name))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  };

  const directMatches = collectCandidates(searchDirectory);
  if (directMatches[0]) {
    return directMatches[0];
  }

  const fallbackDirectories = [
    searchDirectory,
    outputDirectory,
    path.join(outputDirectory, 'merkin'),
    path.join(outputDirectory, 'merkin', 'references'),
  ].filter((directory, index, all) => all.indexOf(directory) === index && fs.existsSync(directory));

  for (const directory of fallbackDirectories) {
    const fallbackMatch = collectCandidates(directory)[0];
    if (fallbackMatch) {
      return fallbackMatch;
    }
  }

  return null;
}

function buildComfyUiTextureWorkflow({
  meshPath,
  referenceImageFileName,
  paintModel,
  outputPrefix,
  seed,
}) {
  return {
    '1': {
      class_type: 'DownloadAndLoadHy3DPaintModel',
      inputs: {
        model: paintModel,
      },
    },
    '2': {
      class_type: 'LoadImage',
      inputs: {
        image: referenceImageFileName,
      },
    },
    '3': {
      class_type: 'Hy3DLoadMesh',
      inputs: {
        glb_path: meshPath,
      },
    },
    '4': {
      class_type: 'Hy3DMeshUVWrap',
      inputs: {
        trimesh: ['3', 0],
      },
    },
    '5': {
      class_type: 'Hy3DRenderMultiView',
      inputs: {
        trimesh: ['4', 0],
        render_size: 1024,
        texture_size: 1024,
      },
    },
    '6': {
      class_type: 'Hy3DSampleMultiView',
      inputs: {
        pipeline: ['1', 0],
        ref_image: ['2', 0],
        normal_maps: ['5', 0],
        position_maps: ['5', 1],
        view_size: 512,
        steps: 20,
        seed,
      },
    },
    '7': {
      class_type: 'Hy3DBakeFromMultiview',
      inputs: {
        images: ['6', 0],
        renderer: ['5', 2],
      },
    },
    '8': {
      class_type: 'Hy3DMeshVerticeInpaintTexture',
      inputs: {
        texture: ['7', 0],
        mask: ['7', 1],
        renderer: ['7', 2],
      },
    },
    '9': {
      class_type: 'Hy3DApplyTexture',
      inputs: {
        texture: ['8', 0],
        renderer: ['8', 2],
      },
    },
    '10': {
      class_type: 'Hy3DExportMesh',
      inputs: {
        trimesh: ['9', 0],
        filename_prefix: outputPrefix,
        file_format: 'glb',
        save_file: true,
      },
    },
  };
}

function buildComfyUiTextureWorkflowFromTemplate({
  meshPath,
  referenceImageFileName,
  outputPrefix,
  paintModelCandidates,
  seed,
  workflowPath = '',
}) {
  const settings = getHunyuanExampleWorkflowSettings({ paintModelCandidates, workflowPath });
  if (!settings?.paintModel) {
    return null;
  }

  return {
    '1': {
      class_type: 'LoadImage',
      inputs: {
        image: referenceImageFileName,
      },
    },
    '2': {
      class_type: 'ImageResize+',
      inputs: {
        image: ['1', 0],
        width: settings.preprocessResize.width,
        height: settings.preprocessResize.height,
        interpolation: settings.preprocessResize.interpolation,
        method: settings.preprocessResize.method,
        condition: settings.preprocessResize.condition,
        multiple_of: settings.preprocessResize.multipleOf,
      },
    },
    '3': {
      class_type: 'TransparentBGSession+',
      inputs: {
        mode: settings.transparentBg.mode,
        use_jit: settings.transparentBg.useJit,
      },
    },
    '4': {
      class_type: 'ImageRemoveBackground+',
      inputs: {
        rembg_session: ['3', 0],
        image: ['2', 0],
      },
    },
    '5': {
      class_type: 'SolidMask',
      inputs: {
        value: settings.compositeMask.value,
        width: settings.compositeMask.width,
        height: settings.compositeMask.height,
      },
    },
    '6': {
      class_type: 'MaskToImage',
      inputs: {
        mask: ['5', 0],
      },
    },
    '7': {
      class_type: 'ImageCompositeMasked',
      inputs: {
        destination: ['6', 0],
        source: ['2', 0],
        x: 0,
        y: 0,
        resize_source: false,
        mask: ['4', 1],
      },
    },
    '8': {
      class_type: 'DownloadAndLoadHy3DDelightModel',
      inputs: {
        model: settings.delightModel,
      },
    },
    '9': {
      class_type: 'Hy3DDiffusersSchedulerConfig',
      inputs: {
        pipeline: ['8', 0],
        scheduler: settings.delightScheduler.scheduler,
        sigmas: settings.delightScheduler.sigmas,
      },
    },
    '10': {
      class_type: 'Hy3DDelightImage',
      inputs: {
        delight_pipe: ['8', 0],
        image: ['7', 0],
        steps: settings.delight.steps,
        width: settings.delight.width,
        height: settings.delight.height,
        cfg_image: settings.delight.cfgImage,
        seed,
        scheduler: ['9', 0],
      },
    },
    '11': {
      class_type: 'Hy3DLoadMesh',
      inputs: {
        glb_path: meshPath,
      },
    },
    '12': {
      class_type: 'Hy3DMeshUVWrap',
      inputs: {
        trimesh: ['11', 0],
      },
    },
    '13': {
      class_type: 'Hy3DCameraConfig',
      inputs: {
        camera_azimuths: settings.camera.azimuths,
        camera_elevations: settings.camera.elevations,
        view_weights: settings.camera.viewWeights,
        camera_distance: settings.camera.distance,
        ortho_scale: settings.camera.orthoScale,
      },
    },
    '14': {
      class_type: 'Hy3DRenderMultiView',
      inputs: {
        trimesh: ['12', 0],
        render_size: settings.render.renderSize,
        texture_size: settings.render.textureSize,
        camera_config: ['13', 0],
        normal_space: settings.render.normalSpace,
      },
    },
    '15': {
      class_type: 'DownloadAndLoadHy3DPaintModel',
      inputs: {
        model: settings.paintModel,
      },
    },
    '16': {
      class_type: 'Hy3DDiffusersSchedulerConfig',
      inputs: {
        pipeline: ['15', 0],
        scheduler: settings.paintScheduler.scheduler,
        sigmas: settings.paintScheduler.sigmas,
      },
    },
    '17': {
      class_type: 'Hy3DSampleMultiView',
      inputs: {
        pipeline: ['15', 0],
        ref_image: ['10', 0],
        normal_maps: ['14', 0],
        position_maps: ['14', 1],
        camera_config: ['13', 0],
        scheduler: ['16', 0],
        view_size: settings.sample.viewSize,
        steps: settings.sample.steps,
        seed,
        denoise_strength: settings.sample.denoiseStrength,
      },
    },
    '18': {
      class_type: 'ImageResize+',
      inputs: {
        image: ['17', 0],
        width: settings.bakedResize.width,
        height: settings.bakedResize.height,
        interpolation: settings.bakedResize.interpolation,
        method: settings.bakedResize.method,
        condition: settings.bakedResize.condition,
        multiple_of: settings.bakedResize.multipleOf,
      },
    },
    '19': {
      class_type: 'Hy3DBakeFromMultiview',
      inputs: {
        images: ['18', 0],
        renderer: ['14', 2],
        camera_config: ['13', 0],
      },
    },
    '20': {
      class_type: 'Hy3DMeshVerticeInpaintTexture',
      inputs: {
        texture: ['19', 0],
        mask: ['19', 1],
        renderer: ['19', 2],
      },
    },
    '21': {
      class_type: 'CV2InpaintTexture',
      inputs: {
        texture: ['20', 0],
        mask: ['20', 1],
        inpaint_radius: settings.cv2Inpaint.radius,
        inpaint_method: settings.cv2Inpaint.method,
      },
    },
    '22': {
      class_type: 'Hy3DApplyTexture',
      inputs: {
        texture: ['21', 0],
        renderer: ['20', 2],
      },
    },
    '23': {
      class_type: 'Hy3DExportMesh',
      inputs: {
        trimesh: ['22', 0],
        filename_prefix: outputPrefix,
        file_format: 'glb',
        save_file: true,
      },
    },
  };
}

function readWorkflowJson(workflowPath) {
  const resolvedPath = workflowPath ? resolveWorkspacePath(String(workflowPath)) : HUNYUAN_EXAMPLE_WORKFLOW_PATH;
  if (!fs.existsSync(resolvedPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  } catch (error) {
    console.warn('Failed to read workflow JSON:', error);
    return null;
  }
}

function readHunyuanExampleWorkflow(workflowPath = '') {
  return readWorkflowJson(workflowPath || HUNYUAN_EXAMPLE_WORKFLOW_PATH);
}

function readComfyImageExampleWorkflow() {
  if (!fs.existsSync(COMFY_IMAGE_EXAMPLE_WORKFLOW_PATH)) return null;

  try {
    return JSON.parse(fs.readFileSync(COMFY_IMAGE_EXAMPLE_WORKFLOW_PATH, 'utf8'));
  } catch (error) {
    console.warn('Failed to read Comfy image example workflow:', error);
    return null;
  }
}

function getWorkflowNode(workflow, id) {
  return workflow?.nodes?.find((node) => node.id === id) ?? null;
}

function getWorkflowWidgets(workflow, id, fallback = []) {
  const node = getWorkflowNode(workflow, id);
  return Array.isArray(node?.widgets_values) ? node.widgets_values : fallback;
}

function getPreferredInstalledModel(preferredName, candidates = []) {
  if (!preferredName) return candidates[0] ?? null;

  const exact = candidates.find((entry) => entry === preferredName);
  if (exact) return exact;

  const basename = path.basename(String(preferredName));
  const sameBasename = candidates.find((entry) => path.basename(String(entry)) === basename);
  if (sameBasename) return sameBasename;

  const fuzzy = candidates.find((entry) => String(entry).toLowerCase().includes(String(preferredName).toLowerCase()));
  return fuzzy ?? candidates[0] ?? null;
}

function getHunyuanExampleWorkflowSettings({
  shapeModelCandidates = [],
  paintModelCandidates = [],
  workflowPath = '',
}) {
  const workflow = readHunyuanExampleWorkflow(workflowPath);
  if (!workflow) return null;

  const modelLoader = getWorkflowWidgets(workflow, 10, ['hunyuan3d-dit-v2-0-fp16.safetensors', 'sdpa', false]);
  const delightLoader = getWorkflowWidgets(workflow, 28, ['hunyuan3d-delight-v2-0']);
  const paintLoader = getWorkflowWidgets(workflow, 85, ['hunyuan3d-paint-v2-0']);
  const imageResize = getWorkflowWidgets(workflow, 52, [518, 518, 'lanczos', 'pad', 'always', 2]);
  const delight = getWorkflowWidgets(workflow, 35, [50, 512, 512, 1, 0, 'fixed']);
  const solidMask = getWorkflowWidgets(workflow, 132, [0.8, 512, 512]);
  const vaeDecode = getWorkflowWidgets(workflow, 140, [1.01, 384, 32000, 0, 'mc', true, true]);
  const postprocess = getWorkflowWidgets(workflow, 59, [true, true, true, 50000, false]);
  const camera = getWorkflowWidgets(workflow, 61, ['0, 90, 180, 270, 0, 180', '0, 0, 0, 0, 90, -90', '1, 0.1, 0.5, 0.1, 0.05, 0.05', 1.45, 1.2]);
  const render = getWorkflowWidgets(workflow, 79, [1024, 2048, 'world']);
  const sample = getWorkflowWidgets(workflow, 88, [512, 25, 1024, 'fixed', 1]);
  const upscaleBaked = getWorkflowWidgets(workflow, 117, [2048, 2048, 'lanczos', 'stretch', 'always', 0]);
  const cv2Inpaint = getWorkflowWidgets(workflow, 104, [3, 'ns']);
  const meshGen = getWorkflowWidgets(workflow, 141, [5.5, 50, 123, 'fixed', 'FlowMatchEulerDiscreteScheduler', true]);
  const delightScheduler = getWorkflowWidgets(workflow, 148, ['Euler A', 'default']);
  const paintScheduler = getWorkflowWidgets(workflow, 149, ['Euler A', 'default']);
  const transparentBg = getWorkflowWidgets(workflow, 55, ['base', true]);

  return {
    shapeModel: getPreferredInstalledModel(modelLoader[0], shapeModelCandidates),
    attentionMode: modelLoader[1] ?? 'sdpa',
    cublasOps: Boolean(modelLoader[2] ?? false),
    delightModel: delightLoader[0] ?? 'hunyuan3d-delight-v2-0',
    paintModel: getPreferredInstalledModel(paintLoader[0], paintModelCandidates),
    preprocessResize: {
      width: Number(imageResize[0] ?? 518),
      height: Number(imageResize[1] ?? 518),
      interpolation: imageResize[2] ?? 'lanczos',
      method: imageResize[3] ?? 'pad',
      condition: imageResize[4] ?? 'always',
      multipleOf: Number(imageResize[5] ?? 2),
    },
    transparentBg: {
      mode: transparentBg[0] ?? 'base',
      useJit: Boolean(transparentBg[1] ?? true),
    },
    compositeMask: {
      value: Number(solidMask[0] ?? 0.8),
      width: Number(solidMask[1] ?? 512),
      height: Number(solidMask[2] ?? 512),
    },
    delight: {
      steps: Number(delight[0] ?? 50),
      width: Number(delight[1] ?? 512),
      height: Number(delight[2] ?? 512),
      cfgImage: Number(delight[3] ?? 1),
      seedMode: delight[5] ?? 'fixed',
    },
    delightScheduler: {
      scheduler: delightScheduler[0] ?? 'Euler A',
      sigmas: delightScheduler[1] ?? 'default',
    },
    meshGeneration: {
      guidanceScale: Number(meshGen[0] ?? 5.5),
      steps: Number(meshGen[1] ?? 50),
      seedMode: meshGen[3] ?? 'fixed',
      scheduler: meshGen[4] ?? 'FlowMatchEulerDiscreteScheduler',
      forceOffload: Boolean(meshGen[5] ?? true),
    },
    vaeDecode: {
      boxV: Number(vaeDecode[0] ?? 1.01),
      octreeResolution: Number(vaeDecode[1] ?? 384),
      numChunks: Number(vaeDecode[2] ?? 32000),
      mcLevel: Number(vaeDecode[3] ?? 0),
      mcAlgo: vaeDecode[4] ?? 'mc',
      enableFlashVdm: Boolean(vaeDecode[5] ?? true),
      forceOffload: Boolean(vaeDecode[6] ?? true),
    },
    postprocess: {
      removeFloaters: Boolean(postprocess[0] ?? true),
      removeDegenerateFaces: Boolean(postprocess[1] ?? true),
      reduceFaces: Boolean(postprocess[2] ?? true),
      maxFaceNum: Number(postprocess[3] ?? 50000),
      smoothNormals: Boolean(postprocess[4] ?? false),
    },
    camera: {
      azimuths: camera[0] ?? '0, 90, 180, 270, 0, 180',
      elevations: camera[1] ?? '0, 0, 0, 0, 90, -90',
      viewWeights: camera[2] ?? '1, 0.1, 0.5, 0.1, 0.05, 0.05',
      distance: Number(camera[3] ?? 1.45),
      orthoScale: Number(camera[4] ?? 1.2),
    },
    render: {
      renderSize: Number(render[0] ?? 1024),
      textureSize: Number(render[1] ?? 2048),
      normalSpace: render[2] ?? 'world',
    },
    sample: {
      viewSize: Number(sample[0] ?? 512),
      steps: Number(sample[1] ?? 25),
      seedMode: sample[3] ?? 'fixed',
      denoiseStrength: Number(sample[4] ?? 1),
    },
    paintScheduler: {
      scheduler: paintScheduler[0] ?? 'Euler A',
      sigmas: paintScheduler[1] ?? 'default',
    },
    bakedResize: {
      width: Number(upscaleBaked[0] ?? 2048),
      height: Number(upscaleBaked[1] ?? 2048),
      interpolation: upscaleBaked[2] ?? 'lanczos',
      method: upscaleBaked[3] ?? 'stretch',
      condition: upscaleBaked[4] ?? 'always',
      multipleOf: Number(upscaleBaked[5] ?? 0),
    },
    cv2Inpaint: {
      radius: Number(cv2Inpaint[0] ?? 3),
      method: cv2Inpaint[1] ?? 'ns',
    },
  };
}

function getComfyImageExampleWorkflowSettings() {
  const workflow = readComfyImageExampleWorkflow();
  if (!workflow) return null;

  const unet = getWorkflowWidgets(workflow, 101, ['FLUX1/flux1-dev-Q8_0.gguf']);
  const clip = getWorkflowWidgets(workflow, 113, [
    'flux/clip_l.safetensors',
    't5/google_t5-v1_1-xxl_encoderonly-fp16.safetensors',
    'flux',
    'default',
  ]);
  const vae = getWorkflowWidgets(workflow, 27, ['ae.safetensors']);
  const positive = getWorkflowWidgets(workflow, 6, ['a potted plant against a white background']);
  const negative = getWorkflowWidgets(workflow, 7, ['']);
  const guidance = getWorkflowWidgets(workflow, 11, [3.5]);
  const latent = getWorkflowWidgets(workflow, 116, [768, 768, 1]);
  const latentWidth = getWorkflowWidgets(workflow, 117, [768, 'fixed']);
  const latentHeight = getWorkflowWidgets(workflow, 118, [768, 'fixed']);
  const sampler = getWorkflowWidgets(workflow, 3, [0, 'randomize', 30, 1, 'euler', 'normal', 1]);

  return {
    unetModel: unet[0] ?? 'FLUX1/flux1-dev-Q8_0.gguf',
    clipL: clip[0] ?? 'flux/clip_l.safetensors',
    clipT5: clip[1] ?? 't5/google_t5-v1_1-xxl_encoderonly-fp16.safetensors',
    clipType: clip[2] ?? 'flux',
    vaeModel: vae[0] ?? 'ae.safetensors',
    defaultPositivePrompt: positive[0] ?? 'a potted plant against a white background',
    defaultNegativePrompt: negative[0] ?? '',
    guidance: Number(guidance[0] ?? 3.5),
    width: Number(latentWidth[0] ?? latent[0] ?? 768),
    height: Number(latentHeight[0] ?? latent[1] ?? 768),
    batchSize: Number(latent[2] ?? 1),
    steps: Number(sampler[2] ?? 30),
    cfg: Number(sampler[3] ?? 1),
    samplerName: sampler[4] ?? 'euler',
    scheduler: sampler[5] ?? 'normal',
    denoise: Number(sampler[6] ?? 1),
  };
}

function buildReferenceImagePrompt(sourceName = '', prompt = '', defaultPrompt = '') {
  const subject = prompt.trim() || sourceName.trim() || defaultPrompt || 'a surreal decorative object';
  return `${subject}, isolated single object, centered composition, white background, clean product render, high detail, no text, no frame`;
}

function buildComfyUiReferenceImageWorkflowFromTemplate({
  outputPrefix,
  prompt,
  sourceName,
  seed,
}) {
  const settings = getComfyImageExampleWorkflowSettings();
  if (!settings?.unetModel || !settings?.clipL || !settings?.clipT5 || !settings?.vaeModel) {
    return null;
  }

  const positivePrompt = buildReferenceImagePrompt(sourceName, prompt, settings.defaultPositivePrompt);
  const negativePrompt = settings.defaultNegativePrompt || 'blurry, low quality, cropped, multiple objects, text, watermark, frame, background scene';

  return {
    '1': {
      class_type: 'UnetLoaderGGUF',
      inputs: {
        unet_name: settings.unetModel,
      },
    },
    '2': {
      class_type: 'DualCLIPLoader',
      inputs: {
        clip_name1: settings.clipL,
        clip_name2: settings.clipT5,
        type: settings.clipType,
        device: 'default',
      },
    },
    '3': {
      class_type: 'CLIPTextEncode',
      inputs: {
        clip: ['2', 0],
        text: positivePrompt,
      },
    },
    '4': {
      class_type: 'CLIPTextEncode',
      inputs: {
        clip: ['2', 0],
        text: negativePrompt,
      },
    },
    '5': {
      class_type: 'FluxGuidance',
      inputs: {
        conditioning: ['3', 0],
        guidance: settings.guidance,
      },
    },
    '6': {
      class_type: 'EmptySD3LatentImage',
      inputs: {
        width: settings.width,
        height: settings.height,
        batch_size: settings.batchSize,
      },
    },
    '7': {
      class_type: 'VAELoader',
      inputs: {
        vae_name: settings.vaeModel,
      },
    },
    '8': {
      class_type: 'KSampler',
      inputs: {
        model: ['1', 0],
        positive: ['5', 0],
        negative: ['4', 0],
        latent_image: ['6', 0],
        seed,
        steps: settings.steps,
        cfg: settings.cfg,
        sampler_name: settings.samplerName,
        scheduler: settings.scheduler,
        denoise: settings.denoise,
      },
    },
    '9': {
      class_type: 'VAEDecode',
      inputs: {
        samples: ['8', 0],
        vae: ['7', 0],
      },
    },
    '10': {
      class_type: 'SaveImage',
      inputs: {
        images: ['9', 0],
        filename_prefix: outputPrefix,
      },
    },
  };
}

async function ensureComfyUiReferenceImage({
  apiUrl,
  comfyUiRoot,
  sourceName,
  prompt,
}) {
  const outputPrefix = `merkin/references/${buildSafeAssetSlug(sourceName || 'reference')}-${Date.now()}`;
  const workflowSeed = Number(BigInt(Date.now()) % BigInt(0xffffffffffffffff));
  const workflow = buildComfyUiReferenceImageWorkflowFromTemplate({
    outputPrefix,
    prompt,
    sourceName,
    seed: workflowSeed,
  });

  if (!workflow) {
    throw new Error('The Comfy image workflow could not be read or resolved.');
  }

  const promptId = await queueComfyUiPrompt(apiUrl, workflow);
  await waitForComfyUiPrompt(apiUrl, promptId);

  const generatedImagePath = findComfyUiGeneratedFile(comfyUiRoot, outputPrefix, ['.png', '.jpg', '.jpeg', '.webp']);
  if (!generatedImagePath || !fs.existsSync(generatedImagePath)) {
    throw new Error('ComfyUI finished, but the generated reference image could not be found.');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const referencesDirectory = path.join(GENERATED_HUNYUAN_ROOT, 'references');
  const outputFileName = `${buildSafeAssetSlug(sourceName || 'reference')}-reference-${timestamp}${path.extname(generatedImagePath).toLowerCase() || '.png'}`;
  const outputFilePath = path.join(referencesDirectory, outputFileName);

  ensureDirectory(referencesDirectory);
  fs.copyFileSync(generatedImagePath, outputFilePath);

  return {
    promptId,
    publicUrl: toPublicAssetUrl(outputFilePath),
    fullPath: outputFilePath,
  };
}

function buildComfyUiGenerateWorkflowFromTemplate({
  referenceImageFileName,
  outputPrefix,
  rawOutputPrefix,
  shapeModelCandidates,
  paintModelCandidates,
  seed,
  workflowPath = '',
}) {
  const settings = getHunyuanExampleWorkflowSettings({ shapeModelCandidates, paintModelCandidates, workflowPath });
  if (!settings?.shapeModel || !settings?.paintModel) {
    return null;
  }

  return {
    '1': {
      class_type: 'LoadImage',
      inputs: {
        image: referenceImageFileName,
      },
    },
    '2': {
      class_type: 'ImageResize+',
      inputs: {
        image: ['1', 0],
        width: settings.preprocessResize.width,
        height: settings.preprocessResize.height,
        interpolation: settings.preprocessResize.interpolation,
        method: settings.preprocessResize.method,
        condition: settings.preprocessResize.condition,
        multiple_of: settings.preprocessResize.multipleOf,
      },
    },
    '3': {
      class_type: 'TransparentBGSession+',
      inputs: {
        mode: settings.transparentBg.mode,
        use_jit: settings.transparentBg.useJit,
      },
    },
    '4': {
      class_type: 'ImageRemoveBackground+',
      inputs: {
        rembg_session: ['3', 0],
        image: ['2', 0],
      },
    },
    '5': {
      class_type: 'SolidMask',
      inputs: {
        value: settings.compositeMask.value,
        width: settings.compositeMask.width,
        height: settings.compositeMask.height,
      },
    },
    '6': {
      class_type: 'MaskToImage',
      inputs: {
        mask: ['5', 0],
      },
    },
    '7': {
      class_type: 'ImageCompositeMasked',
      inputs: {
        destination: ['6', 0],
        source: ['2', 0],
        x: 0,
        y: 0,
        resize_source: false,
        mask: ['4', 1],
      },
    },
    '8': {
      class_type: 'DownloadAndLoadHy3DDelightModel',
      inputs: {
        model: settings.delightModel,
      },
    },
    '9': {
      class_type: 'Hy3DDiffusersSchedulerConfig',
      inputs: {
        pipeline: ['8', 0],
        scheduler: settings.delightScheduler.scheduler,
        sigmas: settings.delightScheduler.sigmas,
      },
    },
    '10': {
      class_type: 'Hy3DDelightImage',
      inputs: {
        delight_pipe: ['8', 0],
        image: ['7', 0],
        steps: settings.delight.steps,
        width: settings.delight.width,
        height: settings.delight.height,
        cfg_image: settings.delight.cfgImage,
        seed,
        scheduler: ['9', 0],
      },
    },
    '11': {
      class_type: 'Hy3DModelLoader',
      inputs: {
        model: settings.shapeModel,
        attention_mode: settings.attentionMode,
        cublas_ops: settings.cublasOps,
      },
    },
    '12': {
      class_type: 'Hy3DGenerateMesh',
      inputs: {
        pipeline: ['11', 0],
        image: ['2', 0],
        guidance_scale: settings.meshGeneration.guidanceScale,
        steps: settings.meshGeneration.steps,
        seed,
        mask: ['4', 1],
        scheduler: settings.meshGeneration.scheduler,
        force_offload: settings.meshGeneration.forceOffload,
      },
    },
    '13': {
      class_type: 'Hy3DVAEDecode',
      inputs: {
        vae: ['11', 1],
        latents: ['12', 0],
        box_v: settings.vaeDecode.boxV,
        octree_resolution: settings.vaeDecode.octreeResolution,
        num_chunks: settings.vaeDecode.numChunks,
        mc_level: settings.vaeDecode.mcLevel,
        mc_algo: settings.vaeDecode.mcAlgo,
        enable_flash_vdm: settings.vaeDecode.enableFlashVdm,
        force_offload: settings.vaeDecode.forceOffload,
      },
    },
    '14': {
      class_type: 'Hy3DPostprocessMesh',
      inputs: {
        trimesh: ['13', 0],
        remove_floaters: settings.postprocess.removeFloaters,
        remove_degenerate_faces: settings.postprocess.removeDegenerateFaces,
        reduce_faces: settings.postprocess.reduceFaces,
        max_facenum: settings.postprocess.maxFaceNum,
        smooth_normals: settings.postprocess.smoothNormals,
      },
    },
    '15': {
      class_type: 'Hy3DExportMesh',
      inputs: {
        trimesh: ['14', 0],
        filename_prefix: rawOutputPrefix,
        file_format: 'glb',
        save_file: true,
      },
    },
    '16': {
      class_type: 'Hy3DMeshUVWrap',
      inputs: {
        trimesh: ['14', 0],
      },
    },
    '17': {
      class_type: 'Hy3DCameraConfig',
      inputs: {
        camera_azimuths: settings.camera.azimuths,
        camera_elevations: settings.camera.elevations,
        view_weights: settings.camera.viewWeights,
        camera_distance: settings.camera.distance,
        ortho_scale: settings.camera.orthoScale,
      },
    },
    '18': {
      class_type: 'Hy3DRenderMultiView',
      inputs: {
        trimesh: ['16', 0],
        render_size: settings.render.renderSize,
        texture_size: settings.render.textureSize,
        camera_config: ['17', 0],
        normal_space: settings.render.normalSpace,
      },
    },
    '19': {
      class_type: 'DownloadAndLoadHy3DPaintModel',
      inputs: {
        model: settings.paintModel,
      },
    },
    '20': {
      class_type: 'Hy3DDiffusersSchedulerConfig',
      inputs: {
        pipeline: ['19', 0],
        scheduler: settings.paintScheduler.scheduler,
        sigmas: settings.paintScheduler.sigmas,
      },
    },
    '21': {
      class_type: 'Hy3DSampleMultiView',
      inputs: {
        pipeline: ['19', 0],
        ref_image: ['10', 0],
        normal_maps: ['18', 0],
        position_maps: ['18', 1],
        camera_config: ['17', 0],
        scheduler: ['20', 0],
        view_size: settings.sample.viewSize,
        steps: settings.sample.steps,
        seed,
        denoise_strength: settings.sample.denoiseStrength,
      },
    },
    '22': {
      class_type: 'ImageResize+',
      inputs: {
        image: ['21', 0],
        width: settings.bakedResize.width,
        height: settings.bakedResize.height,
        interpolation: settings.bakedResize.interpolation,
        method: settings.bakedResize.method,
        condition: settings.bakedResize.condition,
        multiple_of: settings.bakedResize.multipleOf,
      },
    },
    '23': {
      class_type: 'Hy3DBakeFromMultiview',
      inputs: {
        images: ['22', 0],
        renderer: ['18', 2],
        camera_config: ['17', 0],
      },
    },
    '24': {
      class_type: 'Hy3DMeshVerticeInpaintTexture',
      inputs: {
        texture: ['23', 0],
        mask: ['23', 1],
        renderer: ['23', 2],
      },
    },
    '25': {
      class_type: 'CV2InpaintTexture',
      inputs: {
        texture: ['24', 0],
        mask: ['24', 1],
        inpaint_radius: settings.cv2Inpaint.radius,
        inpaint_method: settings.cv2Inpaint.method,
      },
    },
    '26': {
      class_type: 'Hy3DApplyTexture',
      inputs: {
        texture: ['25', 0],
        renderer: ['24', 2],
      },
    },
    '27': {
      class_type: 'Hy3DExportMesh',
      inputs: {
        trimesh: ['26', 0],
        filename_prefix: outputPrefix,
        file_format: 'glb',
        save_file: true,
      },
    },
  };
}

function buildComfyUiGenerateWorkflow({
  referenceImageFileName,
  shapeModel,
  outputPrefix,
}) {
  return {
    '1': {
      class_type: 'LoadImage',
      inputs: {
        image: referenceImageFileName,
      },
    },
    '2': {
      class_type: 'Hy3D_2_1SimpleMeshGen',
      inputs: {
        model: shapeModel,
        image: ['1', 0],
        steps: 30,
        guidance_scale: 5.0,
        octree_resolution: 384,
      },
    },
    '3': {
      class_type: 'Hy3DExportMesh',
      inputs: {
        trimesh: ['2', 0],
        filename_prefix: outputPrefix,
        file_format: 'glb',
        save_file: true,
      },
    },
  };
}

async function buildEditableComfyUiWorkflowTemplate({
  mode = 'generate',
  apiUrl = `http://127.0.0.1:${DEFAULT_HUNYUAN_PORT}`,
  comfyUiApiUrl = `http://127.0.0.1:${DEFAULT_COMFYUI_PORT}`,
  assetUrl = '',
  sourceName = '',
  referenceImageUrl = '',
  workflowPath = '',
}) {
  const inspection = assetUrl
    ? detectReferenceImageForAsset(assetUrl)
    : {
        assetUrl: '',
        assetPath: '',
        assetName: sourceName || 'generated-object',
        assetType: 'prompt',
        detectedReferenceImageUrl: '',
        message: 'Editable workflow template for prompt-driven generation.',
        supportsTextureWrap: false,
        supportsReplacementGeneration: true,
      };

  const referenceUrl = referenceImageUrl || inspection.detectedReferenceImageUrl || '/replace-me-reference.png';
  const referenceImageFileName = path.basename(referenceUrl);
  const workflowName = buildSafeAssetSlug(sourceName || inspection.assetName || 'asset');
  const outputPrefix = `workflow-editor/${workflowName}-${Date.now()}`;
  const rawOutputPrefix = `${outputPrefix}-raw`;
  const workflowSeed = Number(BigInt(Date.now()) % BigInt(0xffffffffffffffff));
  const serverState = await getHunyuanBackendStatus(apiUrl, comfyUiApiUrl, false);
  const shapeModelCandidates = serverState.capabilities?.shapeModelCandidates?.length
    ? serverState.capabilities.shapeModelCandidates
    : ['hunyuan3d-dit-v2-0'];
  const paintModelCandidates = serverState.capabilities?.paintModelCandidates?.length
    ? serverState.capabilities.paintModelCandidates
    : ['hunyuan3d-paint-v2-0'];

  if (mode === 'texture') {
    const meshPath = inspection.assetPath || '/replace-me.glb';
    if (!meshPath) {
      throw new Error('Texture workflow editing requires a mesh-backed asset selection.');
    }

    const workflow = buildComfyUiTextureWorkflowFromTemplate({
      meshPath,
      referenceImageFileName,
      outputPrefix,
      paintModelCandidates,
      seed: workflowSeed,
      workflowPath,
    }) ?? buildComfyUiTextureWorkflow({
      meshPath,
      referenceImageFileName,
      paintModel: paintModelCandidates[0] || 'hunyuan3d-paint-v2-0',
      outputPrefix,
      seed: workflowSeed,
    });

    return {
      workflow,
      editorUrl: String(comfyUiApiUrl).replace(/\/+$/, ''),
      mode,
      sourceName: sourceName || inspection.assetName || 'asset',
      message: 'Texture workflow copied. Open ComfyUI and paste/import the JSON to edit it.',
    };
  }

  const workflow = buildComfyUiGenerateWorkflowFromTemplate({
    referenceImageFileName,
    outputPrefix,
    rawOutputPrefix,
    shapeModelCandidates,
    paintModelCandidates,
    seed: workflowSeed,
    workflowPath,
  }) ?? buildComfyUiGenerateWorkflow({
    referenceImageFileName,
    shapeModel: shapeModelCandidates[0] || 'hunyuan3d-dit-v2-0',
    outputPrefix,
  });

  return {
    workflow,
    editorUrl: String(comfyUiApiUrl).replace(/\/+$/, ''),
    mode,
    sourceName: sourceName || inspection.assetName || 'asset',
    message: 'Generate workflow copied. Open ComfyUI and paste/import the JSON to edit it.',
  };
}

function detectReferenceImageForAsset(assetUrl) {
  const assetPath = resolvePublicAssetPath(assetUrl);
  const extension = path.extname(assetPath).toLowerCase();
  const assetName = path.basename(assetPath, extension);

  const result = {
    assetUrl,
    assetPath,
    assetType: extension.replace('.', '') || 'unknown',
    assetName,
    supportsReplacementGeneration: extension === '.gltf' || extension === '.glb',
    supportsTextureWrap: extension === '.gltf' || extension === '.glb',
    detectedReferenceImageUrl: '',
    detectedReferenceImagePath: '',
    message: '',
  };

  if (!fs.existsSync(assetPath) || !fs.statSync(assetPath).isFile()) {
    throw new Error(`Asset file not found: ${assetUrl}`);
  }

  if (extension === '.gltf') {
    const gltf = JSON.parse(fs.readFileSync(assetPath, 'utf8'));
    const baseColorTextureIndex = gltf.materials
      ?.map((material) => material?.pbrMetallicRoughness?.baseColorTexture?.index)
      .find((index) => Number.isInteger(index));
    const fallbackImage = gltf.images?.find((image) => typeof image?.uri === 'string');

    let imageUri = '';

    if (Number.isInteger(baseColorTextureIndex)) {
      const texture = gltf.textures?.[baseColorTextureIndex];
      const sourceIndex = texture?.source;
      const image = Number.isInteger(sourceIndex) ? gltf.images?.[sourceIndex] : null;
      if (typeof image?.uri === 'string') {
        imageUri = image.uri;
      }
    }

    if (!imageUri && typeof fallbackImage?.uri === 'string') {
      imageUri = fallbackImage.uri;
    }

    if (imageUri) {
      const imagePath = path.resolve(path.dirname(assetPath), imageUri);
      if (imagePath.startsWith(GAME_PUBLIC_ROOT) && fs.existsSync(imagePath)) {
        result.detectedReferenceImagePath = imagePath;
        result.detectedReferenceImageUrl = toPublicAssetUrl(imagePath);
        result.message = 'Detected a base-color texture for reference.';
      } else {
        result.message = 'A base-color texture is referenced in the glTF, but it could not be resolved inside public/.';
      }
    } else {
      result.message = 'No base-color texture was found in this glTF. Add a reference image manually.';
    }

    return result;
  }

  if (extension === '.glb') {
    result.message = 'GLB selected. Mesh replacement and texture wrapping are supported, but a reference image must be provided manually.';
    return result;
  }

  if (['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
    result.supportsReplacementGeneration = true;
    result.supportsTextureWrap = false;
    result.detectedReferenceImagePath = assetPath;
    result.detectedReferenceImageUrl = assetUrl;
    result.message = 'Image selected. It can be used as a direct Hunyuan reference image.';
    return result;
  }

  result.supportsReplacementGeneration = false;
  result.supportsTextureWrap = false;
  result.message = 'This asset type is not supported by the Hunyuan scaffold yet.';
  return result;
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
const server = http.createServer(async (req, res) => {
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
      const filePath = path.join(GAME_PUBLIC_ROOT, pathname.substring(1));

      // Security: Ensure path is within project public directory
      if (!filePath.startsWith(GAME_PUBLIC_ROOT)) {
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
      const fullPath = resolveWorkspacePath(filePath);
      
      // Security: ensure path is within project
      if (!fullPath.startsWith(REPO_ROOT)) {
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
      const fullPath = resolveWorkspacePath(dirPath);
      
      // Security: ensure path is within project
      if (!fullPath.startsWith(REPO_ROOT)) {
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
            path: toRepoRelative(itemPath),
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
        const inputFilePath = resolveWorkspacePath(inputFile);
        const bakerPath = path.join(LEGACY_TOOLS_ROOT, 'heightmap-generator', 'heightmap_baker_node.mjs');
        
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
        const child = spawn('node', args, { cwd: REPO_ROOT, stdio: 'pipe' });
        
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
        
        const fullPath = resolveWorkspacePath(targetPath);
        
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
        const rootDir = REPO_ROOT;
        const bakerPath = path.join(LEGACY_TOOLS_ROOT, 'heightmap-generator', 'heightmap_baker_node.mjs');
        
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
        
        const processorPath = path.join(LEGACY_TOOLS_ROOT, 'levelprocessor', 'simplified-processor.js');
        const inputFilePath = resolveWorkspacePath(inputFile);
        
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
        
        const child = spawn('node', args, { cwd: REPO_ROOT, stdio: 'pipe' });
        
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
        
        const generatorPath = path.join(LEGACY_TOOLS_ROOT, 'levelprocessor', 'level-generator.js');
        
        const args = [generatorPath, `--name=${levelName}`, `--id=${levelId}`];
        
        if (templateFile) args.push(`--template=${templateFile}`);
        if (outputDir) args.push(`--output=${outputDir}`);
        
        console.log('🚀 Executing:', 'node', args.join(' '));
        
        const child = spawn('node', args, { cwd: REPO_ROOT, stdio: 'pipe' });
        
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
              outputDir: outputDir || path.join(GAME_APP_ROOT, 'src', 'threlte', 'levels')
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
        
        const pipelinePath = path.join(LEGACY_TOOLS_ROOT, 'unified-terrain-pipeline.js');
        
        if (!fs.existsSync(pipelinePath)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            message: `Unified pipeline script not found: ${pipelinePath}` 
          }));
          return;
        }
        
        // Create a temporary config file for the pipeline
        const configPath = path.join(LEGACY_TOOLS_ROOT, 'temp-pipeline-config.json');
        
        // Write the config file
        fs.writeFileSync(configPath, JSON.stringify(params, null, 2));
        
        const args = [pipelinePath, configPath];
        
        console.log('🚀 Executing unified pipeline with config:', configPath);
        
        const child = spawn('node', args, { cwd: REPO_ROOT, stdio: 'pipe' });
        
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
      const levelsDir = GAME_LEVELS_ROOT;
      
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
            path: `apps/game/src/threlte/levels/${file}`,
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
      const configPath = path.join(LEGACY_TOOLS_ROOT, 'pure-level-stars-config.json');
      
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
        const configPath = path.join(LEGACY_TOOLS_ROOT, 'pure-level-stars-config.json');
        
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
        
        const configPath = path.join(LEGACY_TOOLS_ROOT, 'generated_configs', filename);
        
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
        
        const fullPath = resolveWorkspacePath(`public/${filePath}`);
        
        // Security check: ensure path is within /public/terrain/ directory
        if (!fullPath.startsWith(path.join(GAME_PUBLIC_ROOT, 'terrain'))) {
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
          path: toRepoRelative(fullPath)
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
        
        const converterPath = path.join(LEGACY_TOOLS_ROOT, 'cubemap-converter', 'cubemap-converter.js');
        const inputFilePath = resolveWorkspacePath(inputFile);
        
        if (!fs.existsSync(inputFilePath)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: `Input file not found: ${inputFilePath}` }));
          return;
        }
        
        const args = [converterPath, inputFilePath];
        
        if (outputDir) args.push(`--output=${outputDir}`);
        if (format) args.push(`--format=${format}`);
        
        console.log('🚀 Executing:', 'node', args.join(' '));
        
        const child = spawn('node', args, { cwd: REPO_ROOT, stdio: 'pipe' });
        
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
      const terrainDir = path.join(GAME_PUBLIC_ROOT, 'terrain');
      
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
              path: `apps/megameal/public/terrain/${file}`,
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

  if (pathname === '/api/editor-scene/load' && req.method === 'GET') {
    try {
      const levelId = parsedUrl.query.levelId;
      if (!levelId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'levelId is required' }));
        return;
      }

      const scenePath = path.join(EDITOR_SCENES_ROOT, `${levelId}.scene.json`);
      if (!scenePath.startsWith(EDITOR_SCENES_ROOT)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Access denied' }));
        return;
      }

      if (!fs.existsSync(scenePath)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, scene: null }));
        return;
      }

      const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, scene }));
    } catch (error) {
      console.error('Editor scene load error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Editor scene load failed: ' + error.message }));
    }
    return;
  }

  if (pathname === '/api/level-registry' && req.method === 'GET') {
    try {
      const entries = readLevelRegistry();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, entries }));
    } catch (error) {
      console.error('Level registry load error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Level registry load failed: ' + error.message }));
    }
    return;
  }

  if (pathname === '/api/level-registry' && req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { entries } = JSON.parse(body);
        if (!Array.isArray(entries)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'entries array is required' }));
          return;
        }

        writeLevelRegistry(entries);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, path: toRepoRelative(LEVEL_REGISTRY_PATH) }));
      } catch (error) {
        console.error('Level registry save error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Level registry save failed: ' + error.message }));
      }
    });
    return;
  }

  if (pathname === '/api/editor/log' && req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const source = String(payload?.source || 'editor');
        const message = String(payload?.message || '').trim();
        const detail = payload?.detail;
        const suffix = detail === undefined
          ? ''
          : ` :: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`;

        if (message) {
          console.log(`[${source}] ${message}${suffix}`);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Editor log parse failed: ${error.message}` }));
      }
    });
    return;
  }

  if (pathname === '/api/hunyuan3d/inspect' && req.method === 'GET') {
    try {
      const assetUrl = parsedUrl.query.assetUrl;

      if (!assetUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'assetUrl is required' }));
        return;
      }

      const inspection = detectReferenceImageForAsset(assetUrl);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, inspection }));
    } catch (error) {
      console.error('Hunyuan inspect error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: `Inspect failed: ${error.message}` }));
    }
    return;
  }

  if (pathname === '/api/style/inspect' && req.method === 'GET') {
    try {
      const assetUrl = parsedUrl.query.assetUrl;

      if (!assetUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'assetUrl is required' }));
        return;
      }

      const inspection = detectReferenceImageForAsset(assetUrl);
      const stats = fs.statSync(inspection.assetPath);
      let inspectReport = '';

      if (inspection.supportsReplacementGeneration) {
        try {
          inspectReport = await inspectGltfAsset(inspection.assetPath);
        } catch (error) {
          inspectReport = `glTF inspection unavailable: ${error.message}`;
        }
      }

      const bounds = extractBoundingBoxFromInspectReport(inspectReport);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        inspection,
        analysis: {
          sizeBytes: stats.size,
          sizeFormatted: formatBytes(stats.size),
          modifiedAt: stats.mtime.toISOString(),
          inspectReport,
          bounds,
        },
      }));
    } catch (error) {
      console.error('Style inspect error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: `Style inspect failed: ${error.message}` }));
    }
    return;
  }

  if (pathname === '/api/style/simplify' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const {
          assetUrl,
          ratio = 0.6,
          error = 0.001,
          lockBorder = true,
          outputName = '',
        } = JSON.parse(body);

        if (!assetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'assetUrl is required' }));
          return;
        }

        const source = resolveInspectableModelAsset(assetUrl);
        const targetRatio = clampNumber(ratio, 0.05, 1, 0.6);
        const targetError = clampNumber(error, 0.00001, 1, 0.001);
        const outputDirectory = createGeneratedStyleDirectory(outputName || source.assetName, 'simplified');
        const outputFileName = `${slugify(outputName || source.assetName)}-simplified.glb`;
        const outputPath = path.join(outputDirectory, outputFileName);

        const simplifyResult = await runGltfTransform([
          'simplify',
          source.assetPath,
          outputPath,
          '--ratio',
          String(targetRatio),
          '--error',
          String(targetError),
          '--lock-border',
          lockBorder ? 'true' : 'false',
        ]);

        if (simplifyResult.code !== 0) {
          throw new Error(simplifyResult.stderr || simplifyResult.stdout || 'Mesh simplification failed.');
        }

        const inspectReport = await inspectGltfAsset(outputPath).catch((inspectError) => (
          `glTF inspection unavailable: ${inspectError.message}`
        ));
        const outputStats = fs.statSync(outputPath);
        const manifestPath = path.join(outputDirectory, 'style-simplify.json');

        fs.writeFileSync(manifestPath, JSON.stringify({
          createdAt: new Date().toISOString(),
          sourceAssetUrl: assetUrl,
          sourceAssetPath: toRepoRelative(source.assetPath),
          outputAssetUrl: toPublicAssetUrl(outputPath),
          ratio: targetRatio,
          error: targetError,
          lockBorder: Boolean(lockBorder),
        }, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: `Created simplified mesh at ${toPublicAssetUrl(outputPath)}`,
          assetUrl: toPublicAssetUrl(outputPath),
          assetPath: toRepoRelative(outputPath),
          manifestPath: toRepoRelative(manifestPath),
          sizeBytes: outputStats.size,
          sizeFormatted: formatBytes(outputStats.size),
          inspectReport,
        }));
      } catch (error) {
        console.error('Style simplify error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Style simplify failed: ${error.message}` }));
      }
    });
    return;
  }

  if (pathname === '/api/style/export-blender' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const {
          assetUrl,
          exportName = '',
          referenceImageUrl = '',
          openInBlender = false,
        } = JSON.parse(body);

        if (!assetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'assetUrl is required' }));
          return;
        }

        const source = resolveInspectableModelAsset(assetUrl);
        const inspection = detectReferenceImageForAsset(assetUrl);
        const exportDirectory = path.join(
          BLENDER_EXPORT_ROOT,
          `${slugify(exportName || source.assetName)}-${timestampKey()}`,
        );
        ensureDirectory(exportDirectory);

        const exportedGlbPath = path.join(exportDirectory, `${slugify(exportName || source.assetName)}.glb`);
        await copyModelToGlb(source.assetPath, exportedGlbPath);

        let resolvedReferenceUrl = referenceImageUrl || inspection.detectedReferenceImageUrl || '';
        let exportedReferencePath = '';
        if (resolvedReferenceUrl) {
          const referenceFullPath = resolvePublicAssetPath(resolvedReferenceUrl);
          const referenceTargetPath = path.join(exportDirectory, path.basename(referenceFullPath));
          fs.copyFileSync(referenceFullPath, referenceTargetPath);
          exportedReferencePath = referenceTargetPath;
        }

        const detectedBlenderExecutable = detectBlenderExecutable();
        const blenderLaunch = openInBlender
          ? launchBlenderFile(exportedGlbPath)
          : {
            blenderExecutable: detectedBlenderExecutable,
            openCommand: detectedBlenderExecutable ? `${detectedBlenderExecutable} "${exportedGlbPath}"` : '',
            openedInBlender: false,
          };
        const manifestPath = path.join(exportDirectory, 'merkin-blender-export.json');
        fs.writeFileSync(manifestPath, JSON.stringify({
          createdAt: new Date().toISOString(),
          sourceAssetUrl: assetUrl,
          sourceAssetPath: toRepoRelative(source.assetPath),
          exportedGlbPath,
          referenceImageUrl: resolvedReferenceUrl,
          referenceImagePath: exportedReferencePath,
          openCommand: blenderLaunch.openCommand,
        }, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: blenderLaunch.openedInBlender
            ? 'Exported a Blender-ready GLB package and opened it in Blender.'
            : blenderLaunch.blenderExecutable
              ? 'Exported a Blender-ready GLB package and detected a Blender executable.'
              : 'Exported a Blender-ready GLB package.',
          exportDirectory,
          exportedGlbPath,
          referenceImagePath: exportedReferencePath,
          manifestPath,
          blenderExecutable: blenderLaunch.blenderExecutable,
          openCommand: blenderLaunch.openCommand,
          openedInBlender: blenderLaunch.openedInBlender,
        }));
      } catch (error) {
        console.error('Style Blender export error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Blender export failed: ${error.message}` }));
      }
    });
    return;
  }

  if (pathname === '/api/style/reimport-blender' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const {
          sourceAssetUrl = '',
          exportPath = '',
          nodeName = '',
        } = JSON.parse(body);

        if (!sourceAssetUrl && !exportPath) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'sourceAssetUrl or exportPath is required' }));
          return;
        }

        let exportDirectory = exportPath ? resolveBlenderExportDirectory(exportPath) : '';
        let matchedExport = null;

        if (!exportDirectory) {
          matchedExport = findLatestBlenderExportForSource(sourceAssetUrl);
          if (!matchedExport) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'No Blender export package was found for this asset.' }));
            return;
          }
          exportDirectory = matchedExport.directory;
        }

        const latestModelPath = findLatestModelInDirectory(exportDirectory);
        if (!latestModelPath) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'No .glb or .gltf file was found in the Blender export directory.' }));
          return;
        }

        const assetBaseName = path.basename(latestModelPath, path.extname(latestModelPath));
        const assetSlug = buildSafeAssetSlug(nodeName || assetBaseName || 'blender-reimport');
        const outputDirectory = path.join(GENERATED_BLENDER_REIMPORT_ROOT, assetSlug);
        ensureDirectory(outputDirectory);

        const outputFilePath = path.join(outputDirectory, `${assetSlug}-blender-reimport-${timestampKey()}.glb`);
        await copyModelToGlb(latestModelPath, outputFilePath);

        const metadataPath = outputFilePath.replace(/\.glb$/i, '.json');
        fs.writeFileSync(metadataPath, JSON.stringify({
          createdAt: new Date().toISOString(),
          sourceAssetUrl,
          exportDirectory,
          importedFrom: latestModelPath,
          manifestPath: matchedExport?.manifestPath || '',
          outputFilePath,
        }, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Copied the latest Blender-edited model into generated assets.',
          assetUrl: toPublicAssetUrl(outputFilePath),
          metadataPath: toRepoRelative(metadataPath),
          exportedGlbPath: latestModelPath,
          exportDirectory,
        }));
      } catch (error) {
        console.error('Style Blender reimport error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Blender reimport failed: ${error.message}` }));
      }
    });
    return;
  }

  if (pathname === '/api/style/workspace' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const {
          assetUrl,
          sourceName = '',
          styleProfileName = '',
          prompt = '',
          negativePrompt = '',
          loraNotes = '',
          controlNetNotes = '',
          referenceImageUrl = '',
          comfyUiApiUrl = `http://127.0.0.1:${DEFAULT_COMFYUI_PORT}`,
          hunyuanApiUrl = `http://127.0.0.1:${DEFAULT_HUNYUAN_PORT}`,
          generateReferenceIfMissing = true,
        } = JSON.parse(body);

        if (!assetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'assetUrl is required' }));
          return;
        }

        const inspection = detectReferenceImageForAsset(assetUrl);
        const workspaceDirectory = createGeneratedStyleDirectory(sourceName || inspection.assetName, 'workspace');
        const sourceDirectory = path.join(workspaceDirectory, 'source');
        const referenceDirectory = path.join(workspaceDirectory, 'reference');
        ensureDirectory(sourceDirectory);
        ensureDirectory(referenceDirectory);

        const sourceAssetPath = path.join(sourceDirectory, `${buildSafeAssetSlug(sourceName || inspection.assetName)}.glb`);
        await copyModelToGlb(inspection.assetPath, sourceAssetPath);

        let selectedReferenceUrl = referenceImageUrl || inspection.detectedReferenceImageUrl || '';
        let selectedReferencePath = selectedReferenceUrl ? resolvePublicAssetPath(selectedReferenceUrl) : '';
        let generatedReference = null;
        let referenceGenerationWarning = '';

        if (!selectedReferencePath && generateReferenceIfMissing && prompt.trim()) {
          const serverState = await getHunyuanBackendStatus(hunyuanApiUrl, comfyUiApiUrl, true).catch(() => null);
          const comfyUiRoot = getComfyUiInstallRoot(serverState);
          if (comfyUiRoot) {
            try {
              generatedReference = await ensureComfyUiReferenceImage({
                apiUrl: comfyUiApiUrl,
                comfyUiRoot,
                sourceName: sourceName || inspection.assetName,
                prompt,
              });
              selectedReferenceUrl = generatedReference.publicUrl;
              selectedReferencePath = generatedReference.fullPath;
            } catch (error) {
              referenceGenerationWarning = error?.message || 'Reference image generation failed.';
            }
          }
        }

        let workspaceReferencePublicUrl = '';
        let workspaceReferencePath = '';
        if (selectedReferencePath) {
          workspaceReferencePath = path.join(
            referenceDirectory,
            path.basename(selectedReferencePath),
          );
          fs.copyFileSync(selectedReferencePath, workspaceReferencePath);
          workspaceReferencePublicUrl = toPublicAssetUrl(workspaceReferencePath);
        }

        const manifestPath = path.join(workspaceDirectory, 'style-request.json');
        fs.writeFileSync(manifestPath, JSON.stringify({
          createdAt: new Date().toISOString(),
          styleProfileName,
          sourceName: sourceName || inspection.assetName,
          sourceAssetUrl: assetUrl,
          sourceAssetPath: toRepoRelative(inspection.assetPath),
          packagedSourceAssetUrl: toPublicAssetUrl(sourceAssetPath),
          prompt,
          negativePrompt,
          loraNotes,
          controlNetNotes,
          referenceGenerationWarning,
          referenceImageUrl: selectedReferenceUrl,
          workspaceReferenceImageUrl: workspaceReferencePublicUrl,
          generatedReferenceImageUrl: generatedReference?.publicUrl || '',
        }, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: workspaceReferencePublicUrl
            ? 'Created a style workspace with a bundled source mesh and reference image.'
            : 'Created a style workspace with a bundled source mesh.',
          workspaceDirectory: toRepoRelative(workspaceDirectory),
          sourceAssetUrl: toPublicAssetUrl(sourceAssetPath),
          sourceAssetPath: toRepoRelative(sourceAssetPath),
          referenceImageUrl: workspaceReferencePublicUrl,
          referenceGenerationWarning,
          manifestUrl: toPublicAssetUrl(manifestPath),
          manifestPath: toRepoRelative(manifestPath),
          generatedReferenceImageUrl: generatedReference?.publicUrl || '',
        }));
      } catch (error) {
        console.error('Style workspace error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Style workspace failed: ${error.message}` }));
      }
    });
    return;
  }

  if (pathname === '/api/style/workspace/latest' && req.method === 'GET') {
    try {
      const assetUrl = parsedUrl.query.assetUrl;
      if (!assetUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'assetUrl is required' }));
        return;
      }

      const latestWorkspace = findLatestStyleWorkspaceForAsset(assetUrl);
      if (!latestWorkspace) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, workspace: null }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        workspace: {
          directory: toRepoRelative(latestWorkspace.directory),
          manifestPath: toRepoRelative(latestWorkspace.manifestPath),
          manifestUrl: toPublicAssetUrl(latestWorkspace.manifestPath),
          sourceAssetUrl: latestWorkspace.manifest?.packagedSourceAssetUrl || '',
          referenceImageUrl: latestWorkspace.manifest?.workspaceReferenceImageUrl || latestWorkspace.manifest?.referenceImageUrl || '',
          generatedReferenceImageUrl: latestWorkspace.manifest?.generatedReferenceImageUrl || '',
          styleProfileName: latestWorkspace.manifest?.styleProfileName || '',
          prompt: latestWorkspace.manifest?.prompt || '',
          negativePrompt: latestWorkspace.manifest?.negativePrompt || '',
          loraNotes: latestWorkspace.manifest?.loraNotes || '',
          controlNetNotes: latestWorkspace.manifest?.controlNetNotes || '',
          createdAt: latestWorkspace.manifest?.createdAt || '',
        },
      }));
    } catch (error) {
      console.error('Latest style workspace lookup error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: `Workspace lookup failed: ${error.message}` }));
    }
    return;
  }

  if (pathname === '/api/style/source-asset' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const {
          fileName = '',
          glbBase64 = '',
          sourceName = '',
          sourceKind = 'primitive',
          descriptor = '',
          levelId = '',
          nodeId = '',
        } = JSON.parse(body);

        if (!glbBase64) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'glbBase64 is required' }));
          return;
        }

        const outputDirectory = createGeneratedStyleDirectory(sourceName || fileName || 'scene-source', 'sources');
        const baseName = buildSafeAssetSlug(path.basename(fileName || sourceName || 'scene-source', path.extname(fileName || '')));
        const outputFilePath = path.join(outputDirectory, `${baseName || 'scene-source'}.glb`);
        const metadataPath = outputFilePath.replace(/\.glb$/i, '.json');
        const outputBuffer = Buffer.from(glbBase64, 'base64');

        if (outputBuffer.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'The staged source mesh was empty.' }));
          return;
        }

        fs.writeFileSync(outputFilePath, outputBuffer);
        fs.writeFileSync(
          metadataPath,
          JSON.stringify({
            createdAt: new Date().toISOString(),
            sourceName,
            sourceKind,
            descriptor,
            levelId,
            nodeId,
          }, null, 2),
          'utf8',
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Staged an exportable scene source mesh for style baking.',
          assetUrl: toPublicAssetUrl(outputFilePath),
          metadataUrl: toPublicAssetUrl(metadataPath),
          assetPath: toRepoRelative(outputFilePath),
          metadataPath: toRepoRelative(metadataPath),
        }));
      } catch (error) {
        console.error('Style source asset staging error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Source asset staging failed: ${error.message}` }));
      }
    });
    return;
  }

  if (pathname === '/api/hunyuan3d/status' && req.method === 'GET') {
    try {
      const apiUrl = parsedUrl.query.apiUrl || `http://127.0.0.1:${DEFAULT_HUNYUAN_PORT}`;
      const comfyUiApiUrl = parsedUrl.query.comfyUiApiUrl || `http://127.0.0.1:${DEFAULT_COMFYUI_PORT}`;
      const ensure = parsedUrl.query.ensure === '1';
      const status = await getHunyuanBackendStatus(apiUrl, comfyUiApiUrl, ensure);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, status }));
    } catch (error) {
      console.error('Hunyuan status error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: `Status failed: ${error.message}` }));
    }
    return;
  }

  if (pathname === '/api/comfyui/status' && req.method === 'GET') {
    try {
      const apiUrl = parsedUrl.query.apiUrl || `http://127.0.0.1:${DEFAULT_COMFYUI_PORT}`;
      const ensure = parsedUrl.query.ensure === '1';
      const status = ensure
        ? await ensureComfyUiServer(apiUrl)
        : await getComfyUiHealth(apiUrl);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, status }));
    } catch (error) {
      console.error('ComfyUI status error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: `Status failed: ${error.message}` }));
    }
    return;
  }

  if (pathname === '/api/comfyui/workflow-template' && req.method === 'GET') {
    try {
      const mode = parsedUrl.query.mode || 'generate';
      const apiUrl = parsedUrl.query.apiUrl || `http://127.0.0.1:${DEFAULT_HUNYUAN_PORT}`;
      const comfyUiApiUrl = parsedUrl.query.comfyUiApiUrl || `http://127.0.0.1:${DEFAULT_COMFYUI_PORT}`;
      const assetUrl = parsedUrl.query.assetUrl || '';
      const sourceName = parsedUrl.query.sourceName || '';
      const referenceImageUrl = parsedUrl.query.referenceImageUrl || '';
      const workflowPath = parsedUrl.query.workflowPath || '';

      const result = await buildEditableComfyUiWorkflowTemplate({
        mode,
        apiUrl,
        comfyUiApiUrl,
        assetUrl,
        sourceName,
        referenceImageUrl,
        workflowPath,
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...result }));
    } catch (error) {
      console.error('ComfyUI workflow template error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: `Workflow template failed: ${error.message}` }));
    }
    return;
  }

  if (pathname === '/api/hunyuan3d/jobs' && req.method === 'GET') {
    try {
      const jobId = parsedUrl.query.jobId;
      if (!jobId) {
        const limit = parsedUrl.query.limit;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, jobs: listRecentHunyuanJobs(limit) }));
        return;
      }

      const job = getHunyuanJob(jobId);
      if (!job) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Hunyuan job not found' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, job: serializeHunyuanJob(job) }));
    } catch (error) {
      console.error('Hunyuan job status error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: `Job status failed: ${error.message}` }));
    }
    return;
  }

  if (pathname === '/api/hunyuan3d/jobs' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const job = createHunyuanJob(payload);
        void processHunyuanJobQueue();

        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          job: serializeHunyuanJob(job),
          message: 'Hunyuan job queued.',
        }));
      } catch (error) {
        console.error('Hunyuan job queue error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Job queue failed: ${error.message}` }));
      }
    });
    return;
  }

  if (pathname === '/api/hunyuan3d/jobs/cancel' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const cancelledJobIds = await cancelHunyuanJobs({
          jobId: payload.jobId || '',
          all: payload.all === true,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          cancelledJobIds,
          message: cancelledJobIds.length > 0
            ? `Cancelled ${cancelledJobIds.length} AI job${cancelledJobIds.length === 1 ? '' : 's'}.`
            : 'No matching AI jobs were active or queued.',
        }));
      } catch (error) {
        console.error('Hunyuan job cancel error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Job cancel failed: ${error.message}` }));
      }
    });
    return;
  }

  if (pathname === '/api/hunyuan3d/run' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const {
          apiUrl = 'http://127.0.0.1:8080',
          comfyUiApiUrl = `http://127.0.0.1:${DEFAULT_COMFYUI_PORT}`,
          assetUrl,
          sourceName = '',
          mode = 'texture',
          prompt = '',
          referenceImageUrl = '',
          workflowPath = '',
          faceCount,
        } = JSON.parse(body);

        if (!assetUrl && mode === 'texture') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'assetUrl is required for texture wrapping' }));
          return;
        }

        const inspection = assetUrl
          ? detectReferenceImageForAsset(assetUrl)
          : {
              assetUrl: '',
              assetPath: null,
              assetName: sourceName || 'generated-object',
              assetType: 'prompt',
              detectedReferenceImageUrl: '',
              message: 'Generating a fresh mesh from prompt or manually supplied reference.',
              supportsTextureWrap: false,
              supportsReplacementGeneration: true,
            };
        let referenceUrl = referenceImageUrl || inspection.detectedReferenceImageUrl;
        let referencePath = referenceUrl ? resolvePublicAssetPath(referenceUrl) : '';
        const serverState = await getHunyuanBackendStatus(apiUrl, comfyUiApiUrl, true);
        if (!serverState.available) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: serverState.message,
            status: serverState,
          }));
          return;
        }

        if (mode === 'texture' && !inspection.supportsTextureWrap) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: 'Texture wrapping currently supports only .gltf and .glb asset nodes.',
          }));
          return;
        }

        if (mode === 'generate' && !inspection.supportsReplacementGeneration) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: 'Replacement mesh generation currently supports .gltf, .glb, image-backed asset nodes, and prompt-driven prefab generation.',
          }));
          return;
        }

        if (serverState.backend === 'comfyui') {
          if (mode === 'generate' && !serverState.supportsReplacementGeneration) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: `${serverState.message} Mesh generation is unavailable until the Hunyuan shape checkpoint is installed.`,
              status: serverState,
            }));
            return;
          }

          if (mode === 'texture' && !serverState.supportsTextureWrap) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: `${serverState.message} Texture wrapping is not available until a Hunyuan paint model is installed for ComfyUI.`,
              status: serverState,
            }));
            return;
          }

          if (!referencePath) {
            try {
              const comfyUiRoot = getComfyUiInstallRoot(serverState);
              if (!comfyUiRoot) {
                throw new Error('ComfyUI install root could not be resolved for reference image generation.');
              }

              const generatedReference = await ensureComfyUiReferenceImage({
                apiUrl: serverState.apiUrl,
                comfyUiRoot,
                sourceName: inspection.assetName || sourceName || 'generated-object',
                prompt: prompt.trim() || inspection.assetName || sourceName || '',
              });

              referenceUrl = generatedReference.publicUrl;
              referencePath = generatedReference.fullPath;
            } catch (referenceError) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                message: `${mode === 'texture' ? 'Texture wrapping' : 'Mesh generation'} needs a reference image, and automatic reference generation failed: ${referenceError.message}`,
                status: serverState,
              }));
              return;
            }
          }

          if (mode === 'texture' && (!inspection.assetPath || path.extname(inspection.assetPath).toLowerCase() !== '.glb')) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: 'The current ComfyUI texture workflow only supports .glb assets. Convert or import the asset as GLB first.',
              status: serverState,
            }));
            return;
          }

          const comfyUiRoot = getComfyUiInstallRoot(serverState);
          if (!comfyUiRoot) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: 'ComfyUI is online, but the local install root could not be resolved.',
              status: serverState,
            }));
            return;
          }

          const chosenPaintModel = mode === 'texture'
            ? (serverState.capabilities?.paintModelCandidates?.find((entry) => /turbo/i.test(entry))
              || serverState.capabilities?.paintModelCandidates?.[0])
            : null;
          const chosenShapeModel = mode === 'generate'
            ? (serverState.capabilities?.shapeModelCandidates?.find((entry) => /\.ckpt$/i.test(entry))
              || serverState.capabilities?.shapeModelCandidates?.find((entry) => /^hunyuan3d-dit/i.test(entry))
              || serverState.capabilities?.shapeModelCandidates?.[0])
            : null;

          if (mode === 'texture' && !chosenPaintModel) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: 'No Hunyuan paint model was found in ComfyUI/models/diffusers.',
              status: serverState,
            }));
            return;
          }
          if (mode === 'generate' && !chosenShapeModel) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: 'No Hunyuan shape model was found in ComfyUI/models/diffusion_models.',
              status: serverState,
            }));
            return;
          }

          const stagedReference = copyFileToComfyUiInput(referencePath, comfyUiRoot, inspection.assetName || sourceName || 'reference');
          const outputPrefix = `mesh/merkin/${buildSafeAssetSlug(inspection.assetName || sourceName || 'asset')}-${Date.now()}`;
          const rawOutputPrefix = `${outputPrefix}-raw`;
          const workflowSeed = Number(BigInt(Date.now()) % BigInt(0xffffffffffffffff));
          const comfyPrompt = mode === 'texture'
            ? (buildComfyUiTextureWorkflowFromTemplate({
                meshPath: inspection.assetPath,
                referenceImageFileName: stagedReference.fileName,
                outputPrefix,
                paintModelCandidates: serverState.capabilities?.paintModelCandidates ?? [],
                seed: workflowSeed,
                workflowPath,
              }) ?? buildComfyUiTextureWorkflow({
                meshPath: inspection.assetPath,
                referenceImageFileName: stagedReference.fileName,
                paintModel: chosenPaintModel,
                outputPrefix,
                seed: workflowSeed,
              }))
            : (buildComfyUiGenerateWorkflowFromTemplate({
                referenceImageFileName: stagedReference.fileName,
                outputPrefix,
                rawOutputPrefix,
                shapeModelCandidates: serverState.capabilities?.shapeModelCandidates ?? [],
                paintModelCandidates: serverState.capabilities?.paintModelCandidates ?? [],
                seed: workflowSeed,
                workflowPath,
              }) ?? buildComfyUiGenerateWorkflow({
                referenceImageFileName: stagedReference.fileName,
                shapeModel: chosenShapeModel,
                outputPrefix,
              }));

          const promptId = await queueComfyUiPrompt(serverState.apiUrl, comfyPrompt);
          await waitForComfyUiPrompt(serverState.apiUrl, promptId);

          const generatedMeshPath = findComfyUiGeneratedMesh(comfyUiRoot, outputPrefix, '.glb');
          if (!generatedMeshPath || !fs.existsSync(generatedMeshPath)) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: 'ComfyUI finished, but the expected textured GLB could not be found in the output directory.',
              status: serverState,
            }));
            return;
          }

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const assetSlug = buildSafeAssetSlug(inspection.assetName || sourceName || 'asset');
          const outputDirectory = path.join(GENERATED_HUNYUAN_ROOT, assetSlug);
          const outputFileName = mode === 'texture'
            ? `${assetSlug}-texture-wrap-${timestamp}.glb`
            : `${assetSlug}-generated-${timestamp}.glb`;
          const outputFilePath = path.join(outputDirectory, outputFileName);
          const outputMetadataPath = outputFilePath.replace(/\.glb$/i, '.json');

          ensureDirectory(outputDirectory);
          fs.copyFileSync(generatedMeshPath, outputFilePath);
          await centerModelForSceneReplacement(outputFilePath, 'center').catch((error) => {
            console.warn('Generated ComfyUI mesh centering failed:', error);
          });
          fs.writeFileSync(
            outputMetadataPath,
            JSON.stringify(
              {
                sourceAssetUrl: assetUrl,
                sourceName: sourceName || inspection.assetName,
                sourceReferenceImageUrl: referenceUrl || null,
                backend: 'comfyui',
                apiUrl: serverState.apiUrl,
                comfyUiRoot,
                promptId,
                prompt: prompt.trim() || null,
                mode,
                shapeModel: chosenShapeModel,
                paintModel: chosenPaintModel,
                generatedAt: new Date().toISOString(),
              },
              null,
              2,
            ),
            'utf8',
          );

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            assetUrl: toPublicAssetUrl(outputFilePath),
            metadataUrl: toPublicAssetUrl(outputMetadataPath),
            mode,
            referenceImageUrl: referenceUrl || null,
            status: serverState,
            message: mode === 'texture'
              ? 'Generated a textured GLB through the local ComfyUI Hunyuan workflow.'
              : 'Generated a new GLB through the local ComfyUI Hunyuan workflow.',
          }));
          return;
        }

        if (serverState.backend !== 'hunyuan-api') {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: serverState.message,
            status: serverState,
          }));
          return;
        }

        const resolvedApiUrl = String(serverState.apiUrl).replace(/\/+$/, '');

        if (!referencePath && !prompt.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: 'A reference image is required. Text-only generation depends on your local Hunyuan server configuration.',
          }));
          return;
        }

        const payload = {
          texture: true,
        };

        if (referencePath) {
          payload.image = fileToBase64(referencePath);
        }

        if (!referencePath && prompt.trim()) {
          payload.text = prompt.trim();
        }

        if (mode === 'texture') {
          payload.mesh = fileToBase64(inspection.assetPath);
        }

        if (Number.isFinite(Number(faceCount)) && Number(faceCount) > 0) {
          payload.face_count = Number(faceCount);
        }

        const hunyuanResponse = await fetch(`${resolvedApiUrl}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!hunyuanResponse.ok) {
          const errorText = await hunyuanResponse.text();
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: `Hunyuan server error (${hunyuanResponse.status}): ${errorText}`,
          }));
          return;
        }

        const outputBuffer = Buffer.from(await hunyuanResponse.arrayBuffer());
        if (outputBuffer.length === 0) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: 'Hunyuan server returned an empty mesh file.',
          }));
          return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const assetSlug = buildSafeAssetSlug(inspection.assetName);
        const modeSlug = mode === 'texture' ? 'texture-wrap' : 'replacement-mesh';
        const outputDirectory = path.join(GENERATED_HUNYUAN_ROOT, assetSlug);
        const outputFileName = `${assetSlug}-${modeSlug}-${timestamp}.glb`;
        const outputFilePath = path.join(outputDirectory, outputFileName);
        const outputMetadataPath = outputFilePath.replace(/\.glb$/i, '.json');

        ensureDirectory(outputDirectory);
        fs.writeFileSync(outputFilePath, outputBuffer);
        await centerModelForSceneReplacement(outputFilePath, 'center').catch((error) => {
          console.warn('Generated Hunyuan API mesh centering failed:', error);
        });
        fs.writeFileSync(
          outputMetadataPath,
          JSON.stringify(
            {
              sourceAssetUrl: assetUrl,
              sourceName: sourceName || inspection.assetName,
              sourceReferenceImageUrl: referenceUrl || null,
              apiUrl: resolvedApiUrl,
              autoStartedServer: serverState.autoStarted,
              prompt: prompt.trim() || null,
              mode,
              generatedAt: new Date().toISOString(),
            },
            null,
            2,
          ),
          'utf8',
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          assetUrl: toPublicAssetUrl(outputFilePath),
          metadataUrl: toPublicAssetUrl(outputMetadataPath),
          mode,
          referenceImageUrl: referenceUrl || null,
          status: serverState,
          message:
            mode === 'texture'
              ? 'Generated a textured replacement mesh from the selected asset.'
              : 'Generated a new textured mesh from the selected asset reference.',
        }));
      } catch (error) {
        console.error('Hunyuan run error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Hunyuan run failed: ${error.message}` }));
      }
    });
    return;
  }

  if (pathname === '/api/editor-scene/save' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { levelId, scene } = JSON.parse(body);
        if (!levelId || !scene) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'levelId and scene are required' }));
          return;
        }

        fs.mkdirSync(EDITOR_SCENES_ROOT, { recursive: true });
        const scenePath = path.join(EDITOR_SCENES_ROOT, `${levelId}.scene.json`);
        if (!scenePath.startsWith(EDITOR_SCENES_ROOT)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Access denied' }));
          return;
        }

        if (fs.existsSync(scenePath)) {
          try {
            const existingScene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
            if (!hasMeaningfulSceneContent(scene) && hasMeaningfulSceneContent(existingScene)) {
              res.writeHead(409, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                message: `Refusing to overwrite populated scene "${levelId}" with empty content.`,
              }));
              return;
            }
          } catch (readError) {
            console.warn('Unable to validate existing scene before save:', readError);
          }
        }

        fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, path: toRepoRelative(scenePath) }));
      } catch (error) {
        console.error('Editor scene save error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Editor scene save failed: ' + error.message }));
      }
    });
    return;
  }

  // Default 404 response
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// ================================================================
// SERVER STARTUP CODE
// ================================================================

async function startServer() {
  const hasExplicitPort = Boolean(process.env.MEGAMEAL_TOOLS_PORT || process.env.EDITOR_API_PORT || process.env.PORT);

  const logStartup = (resolvedPort) => {
    writeToolsRuntime(resolvedPort);
    console.log('🛠️  MEGAMEAL Development Tools (Simple)');
    console.log('='.repeat(60));
    console.log(`🌐 Server running at: http://127.0.0.1:${resolvedPort}`);
    console.log('📁 Repo root:', REPO_ROOT);
    console.log('🎮 Game app:', GAME_APP_ROOT);
    console.log('📦 Public assets:', GAME_PUBLIC_ROOT);
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
  };

  const listenOnPort = (port) => {
    activePort = port;
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      const resolvedPort = address && typeof address !== 'string' ? address.port : port;
      activePort = resolvedPort;
      logStartup(resolvedPort);
    });
  };

  if (hasExplicitPort || REQUESTED_PORT === 0) {
    server.on('error', (error) => {
      console.error('❌ Tools bridge failed to start:', error)
      process.exit(1)
    })
    listenOnPort(REQUESTED_PORT);
    return;
  }

  server.once('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
      console.warn(`⚠️  Port ${REQUESTED_PORT} is in use. Falling back to an open local port for the tools bridge.`);
      server.removeAllListeners('error');
      server.on('error', (nextError) => {
        console.error('❌ Tools bridge failed to start:', nextError)
        process.exit(1)
      });
      listenOnPort(0);
      return;
    }

    console.error('❌ Tools bridge failed to start:', error)
    process.exit(1)
  })

  listenOnPort(REQUESTED_PORT);
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down MEGAMEAL Development Tools...');
  clearToolsRuntime();
  process.exit(0);
});

process.on('SIGTERM', () => {
  clearToolsRuntime();
  process.exit(0);
});

process.on('exit', () => {
  clearToolsRuntime();
});
