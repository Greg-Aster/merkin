const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

let hunyuanServerProcess = null;
let hunyuanServerLaunch = null;
let comfyUiServerProcess = null;
let comfyUiServerLaunch = null;
const hunyuanJobs = new Map();
const hunyuanJobQueue = [];
let activeHunyuanJobId = null;

function createAiRouteContext(deps) {
  const {
    COMFY_IMAGE_EXAMPLE_WORKFLOW_PATH,
    DEFAULT_COMFYUI_PORT,
    DEFAULT_HUNYUAN_PORT,
    GAME_PUBLIC_ROOT,
    GENERATED_HUNYUAN_ROOT,
    HUNYUAN_EXAMPLE_WORKFLOW_PATH,
    REPO_ROOT,
    buildSafeAssetSlug,
    dispatchEditorToolsJsonRequest,
    ensureDirectory,
    fileToBase64,
    normalizePath,
    resolvePublicAssetPath,
    toPublicAssetUrl,
  } = deps;

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
    const response = await dispatchEditorToolsJsonRequest('/api/hunyuan3d/run', job.payload);
    const payload = response.json();

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

  return {
    DEFAULT_COMFYUI_PORT,
    DEFAULT_HUNYUAN_PORT,
    GENERATED_HUNYUAN_ROOT,
    buildComfyUiGenerateWorkflow,
    buildComfyUiGenerateWorkflowFromTemplate,
    buildComfyUiTextureWorkflow,
    buildComfyUiTextureWorkflowFromTemplate,
    buildEditableComfyUiWorkflowTemplate,
    cancelHunyuanJobs,
    copyFileToComfyUiInput,
    createHunyuanJob,
    detectReferenceImageForAsset,
    ensureComfyUiReferenceImage,
    ensureComfyUiServer,
    findComfyUiGeneratedMesh,
    getComfyUiHealth,
    getComfyUiInstallRoot,
    getHunyuanBackendStatus,
    getHunyuanJob,
    listRecentHunyuanJobs,
    processHunyuanJobQueue,
    queueComfyUiPrompt,
    serializeHunyuanJob,
    waitForComfyUiPrompt,
  };
}

module.exports = {
  createAiRouteContext,
};
