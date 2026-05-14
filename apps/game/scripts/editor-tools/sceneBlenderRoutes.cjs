const fs = require('fs');
const path = require('path');

const PACKAGE_SCHEMA = 'merkin.scenePackage.v1';
const DELTA_SCHEMA = 'merkin.sceneDelta.v1';

function readRequestBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => callback(body));
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function timestampKey() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function slugify(value = 'scene') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'scene';
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function resolvePublicAssetPath(publicRoot, assetUrl = '') {
  if (!assetUrl || /^https?:\/\//i.test(assetUrl)) return '';
  const normalized = decodeURIComponent(assetUrl.split('?')[0]).replace(/^\/+/, '');
  const candidate = path.join(publicRoot, normalized);
  const resolvedPublicRoot = path.resolve(publicRoot);
  const resolvedCandidate = path.resolve(candidate);
  if (
    resolvedCandidate !== resolvedPublicRoot &&
    !resolvedCandidate.startsWith(`${resolvedPublicRoot}${path.sep}`)
  ) {
    return '';
  }
  return fs.existsSync(resolvedCandidate) ? resolvedCandidate : '';
}

function copyAssetToPackage({ node, packageRoot, publicRoot, repoRelative, copiedAssetByUrl }) {
  const assetUrl = node.asset?.url || '';
  if (!assetUrl) return null;

  const sourcePath = resolvePublicAssetPath(publicRoot, assetUrl);
  if (!sourcePath) {
    return {
      url: assetUrl,
      missing: true,
      reason: 'Asset URL could not be resolved under apps/megameal/public.',
    };
  }

  if (copiedAssetByUrl.has(assetUrl)) return copiedAssetByUrl.get(assetUrl);

  const extension = path.extname(sourcePath) || '.glb';
  const assetDirectory = path.join(packageRoot, 'assets');
  ensureDirectory(assetDirectory);

  const outputName = `${slugify(node.name || node.id)}-${slugify(node.id)}${extension}`;
  const outputPath = path.join(assetDirectory, outputName);
  fs.copyFileSync(sourcePath, outputPath);

  const asset = {
    url: assetUrl,
    sourcePath: repoRelative(sourcePath),
    packagePath: path.relative(packageRoot, outputPath).replace(/\\/g, '/'),
    sizeBytes: fs.statSync(outputPath).size,
  };
  copiedAssetByUrl.set(assetUrl, asset);
  return asset;
}

function buildPackageNode({ node, packageRoot, publicRoot, repoRelative, copiedAssetByUrl }) {
  const asset = node.kind === 'asset'
    ? copyAssetToPackage({
        node,
        packageRoot,
        publicRoot,
        repoRelative,
        copiedAssetByUrl,
      })
    : null;

  return {
    id: node.id,
    name: node.name,
    kind: node.kind,
    parentId: node.parentId ?? null,
    position: node.position ?? [0, 0, 0],
    rotation: node.rotation ?? [0, 0, 0],
    scale: node.scale ?? [1, 1, 1],
    visible: node.visible !== false,
    locked: Boolean(node.locked),
    assetUrl: node.asset?.url || '',
    assetPackagePath: asset?.packagePath || '',
    primitive: node.primitive || null,
    light: node.light || null,
    prefab: node.prefab || null,
    material: node.material || null,
    collision: node.collision || null,
    gameplay: node.gameplay || null,
    generation: node.generation || null,
    warnings: asset?.missing ? [asset.reason] : [],
  };
}

function buildScenePackage({ scene, packageRoot, scenePath, publicRoot, repoRelative }) {
  const copiedAssetByUrl = new Map();
  const nodes = Array.isArray(scene.nodes)
    ? scene.nodes.map(node =>
        buildPackageNode({
          node,
          packageRoot,
          publicRoot,
          repoRelative,
          copiedAssetByUrl,
        }),
      )
    : [];

  return {
    schema: PACKAGE_SCHEMA,
    createdAt: new Date().toISOString(),
    levelId: scene.levelId,
    sceneVersion: scene.version ?? null,
    sourceScenePath: scenePath ? repoRelative(scenePath) : '',
    sourceSceneUpdatedAt: scene.updatedAt || '',
    packageRoot: repoRelative(packageRoot),
    axisConversion: 'game-y-up-to-blender-z-up',
    roundTripMode: 'transform-delta-v1',
    nodes,
    assets: [...copiedAssetByUrl.values()],
    warnings: nodes.flatMap(node =>
      node.warnings.map(message => ({ nodeId: node.id, message })),
    ),
  };
}

function sanitizeVector(value, fallback) {
  if (!Array.isArray(value) || value.length !== 3) return fallback;
  const next = value.map(Number);
  return next.every(Number.isFinite) ? next : fallback;
}

function applyDeltaToScene(scene, delta) {
  if (delta?.schema !== DELTA_SCHEMA) {
    throw new Error(`Unsupported delta schema: ${delta?.schema || 'missing'}`);
  }

  const changesByNodeId = new Map(
    (Array.isArray(delta.changes) ? delta.changes : [])
      .filter(change => change?.nodeId)
      .map(change => [change.nodeId, change]),
  );

  let updatedCount = 0;
  const nodes = Array.isArray(scene.nodes)
    ? scene.nodes.map(node => {
        const change = changesByNodeId.get(node.id);
        if (!change) return node;

        updatedCount += 1;
        return {
          ...node,
          position: sanitizeVector(change.position, node.position ?? [0, 0, 0]),
          rotation: sanitizeVector(change.rotation, node.rotation ?? [0, 0, 0]),
          scale: sanitizeVector(change.scale, node.scale ?? [1, 1, 1]),
        };
      })
    : [];

  return {
    scene: {
      ...scene,
      nodes,
      updatedAt: new Date().toISOString(),
    },
    updatedCount,
    unknownNodeIds: [...changesByNodeId.keys()].filter(
      nodeId => !nodes.some(node => node.id === nodeId),
    ),
  };
}

function handleSceneBlenderRoutes(req, res, route, context) {
  const { pathname } = route;
  const {
    EDITOR_SCENES_ROOT,
    GAME_PUBLIC_ROOT,
    REPO_ROOT,
    getEditorScenePath,
    toRepoRelative,
  } = context;

  if (pathname === '/api/editor-scene/blender-export' && req.method === 'POST') {
    readRequestBody(req, body => {
      try {
        const { levelId, scene } = JSON.parse(body || '{}');
        if (!scene || typeof scene !== 'object') {
          sendJson(res, 400, {
            success: false,
            message: 'scene is required',
          });
          return;
        }

        const resolvedLevelId = scene.levelId || levelId;
        if (!resolvedLevelId || !/^[a-z0-9][a-z0-9-]*$/i.test(resolvedLevelId)) {
          sendJson(res, 400, {
            success: false,
            message: 'levelId must be a safe level id',
          });
          return;
        }

        const packageRoot = path.join(
          REPO_ROOT,
          'apps',
          'blender',
          'scene-packages',
          `${slugify(resolvedLevelId)}-${timestampKey()}`,
        );
        ensureDirectory(packageRoot);

        const scenePath = getEditorScenePath(resolvedLevelId);
        const sourceScenePath = path.join(packageRoot, 'source.scene.json');
        writeJson(sourceScenePath, scene);

        const packageData = buildScenePackage({
          scene: {
            ...scene,
            levelId: resolvedLevelId,
          },
          packageRoot,
          scenePath: fs.existsSync(scenePath) ? scenePath : sourceScenePath,
          publicRoot: GAME_PUBLIC_ROOT,
          repoRelative: toRepoRelative,
        });
        const packagePath = path.join(packageRoot, 'merkin-scene-package.json');
        writeJson(packagePath, packageData);

        sendJson(res, 200, {
          success: true,
          message: `Exported ${resolvedLevelId} Blender scene package.`,
          levelId: resolvedLevelId,
          packageDirectory: toRepoRelative(packageRoot),
          packagePath: toRepoRelative(packagePath),
          sourceScenePath: toRepoRelative(sourceScenePath),
          nodeCount: packageData.nodes.length,
          assetCount: packageData.assets.length,
          warnings: packageData.warnings,
        });
      } catch (error) {
        sendJson(res, 500, {
          success: false,
          message: `Blender scene export failed: ${error.message}`,
        });
      }
    });
    return true;
  }

  if (pathname === '/api/editor-scene/blender-import-delta' && req.method === 'POST') {
    readRequestBody(req, body => {
      try {
        const { scene, delta } = JSON.parse(body || '{}');
        if (!scene || typeof scene !== 'object') {
          sendJson(res, 400, {
            success: false,
            message: 'scene is required',
          });
          return;
        }
        const result = applyDeltaToScene(scene, delta);
        sendJson(res, 200, {
          success: true,
          message: `Imported Blender delta for ${result.updatedCount} node(s).`,
          ...result,
        });
      } catch (error) {
        sendJson(res, 500, {
          success: false,
          message: `Blender scene import failed: ${error.message}`,
        });
      }
    });
    return true;
  }

  return false;
}

module.exports = {
  handleSceneBlenderRoutes,
};
