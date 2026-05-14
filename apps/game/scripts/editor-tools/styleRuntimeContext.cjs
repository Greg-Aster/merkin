const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

function createStyleRouteContext(deps) {
  const {
    BLENDER_EXPORT_ROOT,
    GAME_PUBLIC_ROOT,
    GENERATED_STYLE_LAB_ROOT,
    REPO_ROOT,
    buildSafeAssetSlug,
    ensureDirectory,
    resolvePublicAssetPath,
    toPublicAssetUrl,
    toRepoRelative,
  } = deps;

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

  return {
    BLENDER_EXPORT_ROOT,
    centerModelForSceneReplacement,
    clampNumber,
    copyModelToGlb,
    createGeneratedStyleDirectory,
    detectBlenderExecutable,
    ensureDirectory,
    extractBoundingBoxFromInspectReport,
    findLatestBlenderExportForSource,
    findLatestModelInDirectory,
    findLatestStyleWorkspaceForAsset,
    formatBytes,
    inspectGltfAsset,
    launchBlenderFile,
    resolveBlenderExportDirectory,
    resolveInspectableModelAsset,
    runGltfTransform,
    timestampKey,
  };
}

module.exports = {
  createStyleRouteContext,
};
