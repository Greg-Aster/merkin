const url = require('url');
const path = require('path');
const fs = require('fs');
const { Readable, Writable } = require('stream');
const { handleSceneRoutes } = require('./sceneRoutes.cjs');
const { handleTerrainRoutes } = require('./terrainRoutes.cjs');
const { handleBrowseRoutes } = require('./browseRoutes.cjs');
const { handleStyleRoutes } = require('./styleRoutes.cjs');
const { createStyleRouteContext } = require('./styleRuntimeContext.cjs');
const { handleAiRoutes } = require('./aiRoutes.cjs');
const { createAiRouteContext } = require('./aiRuntimeContext.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const GAME_APP_ROOT = path.join(REPO_ROOT, 'apps', 'game');
const GAME_PUBLIC_ROOT = path.join(REPO_ROOT, 'apps', 'megameal', 'public');
const GAME_LEVELS_ROOT = path.join(GAME_APP_ROOT, 'src', 'threlte', 'levels');
const LEVEL_REGISTRY_PATH = path.join(GAME_LEVELS_ROOT, 'level-registry.json');
const EDITOR_SCENES_ROOT = path.join(GAME_APP_ROOT, 'src', 'threlte', 'editor', 'scenes');
const EDITOR_SCENE_BACKUPS_ROOT = path.join(GAME_APP_ROOT, 'authoring', 'scene-backups');
const GENERATED_HUNYUAN_ROOT = path.join(GAME_PUBLIC_ROOT, 'generated', 'hunyuan3d');
const GENERATED_STYLE_LAB_ROOT = path.join(GAME_PUBLIC_ROOT, 'generated', 'style-lab');
const GENERATED_BLENDER_REIMPORT_ROOT = path.join(GAME_PUBLIC_ROOT, 'generated', 'blender-reimports');
const BLENDER_EXPORT_ROOT = path.join(GAME_APP_ROOT, '.editor-exports', 'blender');
const AUTHORING_REF_IMAGE_ROOT = path.join(REPO_ROOT, 'apps', 'game', 'authoring', 'workflows', 'ref-image');
const HUNYUAN_EXAMPLE_WORKFLOW_PATH = path.join(AUTHORING_REF_IMAGE_ROOT, 'Hunyaun example.json');
const COMFY_IMAGE_EXAMPLE_WORKFLOW_PATH = path.join(AUTHORING_REF_IMAGE_ROOT, 'comfy_image_example.json');
const DEFAULT_HUNYUAN_PORT = 8080;
const DEFAULT_COMFYUI_PORT = 8188;

const RETIRED_ENDPOINTS = new Map([
  ['/api/project-file', {
    replacementEndpoint: '/api/browse',
    message: 'Direct project-file reads are retired. Use the level editor asset browser or a specific editor API instead.',
  }],
  ['/api/generate-heightmap', {
    replacementEndpoint: '/api/editor-terrain/generate-heightmap',
    message: 'Legacy heightmap generation is retired. Use the editor terrain workflow so heightmaps, collision, and manifests stay in sync.',
  }],
  ['/api/analyze-glb', {
    replacementEndpoint: '/api/style/inspect',
    message: 'Legacy GLB analysis is retired. Use the editor asset/style inspection workflow.',
  }],
  ['/api/process-level', {
    replacementEndpoint: '/api/editor-scene/cook-world-partition',
    message: 'Legacy level processing is retired. Use the level editor cook/bake workflows.',
  }],
  ['/api/generate-level', {
    replacementEndpoint: '/api/editor-scene/save',
    message: 'Legacy level generation is retired. Create levels through the level editor save/create workflow.',
  }],
  ['/api/unified-pipeline', {
    replacementEndpoint: '/api/editor-terrain/generate-heightmap',
    message: 'Legacy unified terrain pipeline is retired. Use editor terrain generation, collision bake, and chunk cook actions.',
  }],
  ['/api/levels/scan', {
    replacementEndpoint: '/api/level-registry',
    message: 'Legacy Svelte level scanning is retired. Use the level registry.',
  }],
  ['/api/pure-level-stars', {
    replacementEndpoint: '/api/level-registry',
    message: 'Legacy pure-level-stars data is retired. Level star-map data now belongs to the level registry.',
  }],
  ['/api/starmap/data', {
    replacementEndpoint: '/api/level-registry',
    message: 'Legacy star-map config files are retired. Star-map level data now belongs to the level registry.',
  }],
  ['/api/starmap/save', {
    replacementEndpoint: '/api/level-registry',
    message: 'Legacy star-map config saves are retired. Persist star-map level metadata through the level registry.',
  }],
  ['/api/save-level-config', {
    replacementEndpoint: '/api/editor-scene/save',
    message: 'Legacy generated level configs are retired. Save scene data through the level editor.',
  }],
  ['/api/update-manifest', {
    replacementEndpoint: '/api/editor-terrain/bake-collision',
    message: 'Legacy direct manifest writes are retired. Use terrain bake/chunk workflows so manifests are validated.',
  }],
  ['/api/convert-cubemap', {
    replacementEndpoint: null,
    message: 'Legacy cubemap conversion is retired. Add a new explicit editor/import workflow before reintroducing this feature.',
  }],
  ['/api/get-level-manifests', {
    replacementEndpoint: '/api/level-registry',
    message: 'Legacy terrain manifest listing is retired. Runtime/editor level ownership starts from the level registry.',
  }],
]);

const ACTIVE_EDITOR_API_ENDPOINTS = new Set([
  '/api/browse',
  '/api/editor-scene/load',
  '/api/editor-scene/save',
  '/api/editor-scene/cook-world-partition',
  '/api/editor-terrain/generate-heightmap',
  '/api/editor-terrain/bake-collision',
  '/api/editor-terrain/cook-chunks',
  '/api/level-registry',
  '/api/editor/log',
]);

const ACTIVE_EDITOR_API_PREFIXES = [
  '/api/hunyuan3d/',
  '/api/comfyui/',
  '/api/style/',
];

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

function getEditorScenePath(levelId) {
  return path.join(EDITOR_SCENES_ROOT, `${levelId}.scene.json`);
}

function isPathWithinRoot(inputPath, rootPath) {
  const resolvedPath = path.resolve(inputPath);
  const resolvedRoot = path.resolve(rootPath);
  return resolvedPath === resolvedRoot || resolvedPath.startsWith(`${resolvedRoot}${path.sep}`);
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function addAlias(aliases, value) {
  if (typeof value !== 'string') return;
  const trimmed = value.trim();
  if (trimmed) aliases.add(trimmed);
}

function getRegistrySceneLevels() {
  if (!fs.existsSync(LEVEL_REGISTRY_PATH)) return [];
  return readJsonFile(LEVEL_REGISTRY_PATH)
    .filter((entry) => entry?.source?.kind === 'scene' && entry?.id);
}

function getLevelAliases(level) {
  const aliases = new Set();
  addAlias(aliases, level.id);
  addAlias(aliases, level.source?.sceneId);
  for (const alias of level.aliases || []) addAlias(aliases, alias);
  return aliases;
}

function getTerrainManifestAliases(manifestId, manifest) {
  const aliases = new Set();
  addAlias(aliases, manifestId);
  addAlias(aliases, manifest?.id);
  addAlias(aliases, manifestId.replace(/-environment$/, ''));
  addAlias(aliases, manifestId.replace(/-terrain$/, ''));
  if (typeof manifest?.id === 'string') {
    addAlias(aliases, manifest.id.replace(/-environment$/, ''));
    addAlias(aliases, manifest.id.replace(/-terrain$/, ''));
  }
  return aliases;
}

function getTerrainManifestRecords() {
  const terrainRoot = path.join(GAME_PUBLIC_ROOT, 'terrain');
  if (!fs.existsSync(terrainRoot)) return [];

  return fs
    .readdirSync(terrainRoot)
    .filter((file) => file.endsWith('.manifest.json'))
    .sort((left, right) => left.localeCompare(right))
    .map((file) => {
      const manifestPath = path.join(terrainRoot, file);
      const manifest = readJsonFile(manifestPath);
      const manifestId = file.replace(/\.manifest\.json$/, '');
      return {
        id: manifestId,
        manifest,
        manifestPath,
        aliases: getTerrainManifestAliases(manifestId, manifest),
      };
    });
}

function getTerrainManifestPathForLevel(levelId) {
  const registryLevel =
    getRegistrySceneLevels().find((level) => getLevelAliases(level).has(levelId)) ||
    { id: levelId, source: { sceneId: levelId }, aliases: [] };
  const levelAliases = getLevelAliases(registryLevel);
  const terrainManifest = getTerrainManifestRecords().find((record) =>
    [...record.aliases].some((alias) => levelAliases.has(alias)),
  );

  return terrainManifest?.manifestPath || null;
}

function getLevelTitle(levelId) {
  return (
    getRegistrySceneLevels().find((level) => getLevelAliases(level).has(levelId))
      ?.title || levelId
  );
}

function getSceneSpawnPosition(scene) {
  const spawn = scene?.settings?.level?.spawn?.position;
  return Array.isArray(spawn) && spawn.length === 3 ? spawn.map(Number) : [0, 1, 0];
}

function assertSafeTerrainLevelId(levelId) {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(levelId)) {
    throw new Error(`Unsafe terrain level id: ${levelId}`);
  }
}

function ensureTerrainManifestForLevel(levelId, scene = null) {
  assertSafeTerrainLevelId(levelId);
  const existingManifestPath = getTerrainManifestPathForLevel(levelId);
  if (existingManifestPath) return existingManifestPath;

  const terrainRoot = path.join(GAME_PUBLIC_ROOT, 'terrain');
  ensureDirectory(terrainRoot);

  const manifestPath = path.join(terrainRoot, `${levelId}.manifest.json`);
  if (!manifestPath.startsWith(terrainRoot)) {
    throw new Error('Terrain manifest path resolves outside the terrain directory');
  }

  const manifest = {
    name: getLevelTitle(levelId),
    id: levelId,
    type: 'terrain',
    version: '1.0.0',
    assets: {},
    spawn: {
      position: getSceneSpawnPosition(scene),
      rotation: [0, 0, 0],
    },
    physics: {
      type: 'baked-terrain-mesh',
    },
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifestPath;
}

function listEditorSceneBackupFilenames(levelId) {
  const backupRoot = path.join(EDITOR_SCENE_BACKUPS_ROOT, levelId);
  if (!isPathWithinRoot(backupRoot, EDITOR_SCENE_BACKUPS_ROOT)) return [];
  if (!fs.existsSync(backupRoot)) return [];

  return fs
    .readdirSync(backupRoot)
    .filter(filename => filename.startsWith(`${levelId}.`) && filename.endsWith('.json'))
    .sort((left, right) => getSceneBackupSortKey(right).localeCompare(getSceneBackupSortKey(left)));
}

function getSceneBackupSortKey(filename) {
  const isoMatch = filename.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/);
  if (isoMatch) {
    return isoMatch.slice(1).join('');
  }

  const compactMatch = filename.match(/(\d{8})-(\d{6})/);
  if (compactMatch) {
    return compactMatch.slice(1).join('');
  }

  return filename;
}

function getLatestEditorSceneBackupPath(levelId) {
  const [latestBackup] = listEditorSceneBackupFilenames(levelId);
  if (!latestBackup) return null;
  return path.join(EDITOR_SCENE_BACKUPS_ROOT, levelId, latestBackup);
}

function getOriginalEditorSceneSnapshotPath(levelId) {
  const originalSnapshot = listEditorSceneBackupFilenames(levelId).find((filename) =>
    filename.includes('.original-packaged.'),
  );
  if (!originalSnapshot) return null;
  return path.join(EDITOR_SCENE_BACKUPS_ROOT, levelId, originalSnapshot);
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function sendRetiredEndpoint(res, pathname) {
  const retired = RETIRED_ENDPOINTS.get(pathname);
  if (!retired) return false;

  sendJson(res, 410, {
    success: false,
    retired: true,
    endpoint: pathname,
    replacementEndpoint: retired.replacementEndpoint,
    message: retired.message,
  });
  return true;
}

function isEditorToolsApiPath(pathname = '') {
  return (
    RETIRED_ENDPOINTS.has(pathname) ||
    ACTIVE_EDITOR_API_ENDPOINTS.has(pathname) ||
    ACTIVE_EDITOR_API_PREFIXES.some(prefix => pathname.startsWith(prefix))
  );
}

class JsonDispatchRequest extends Readable {
  constructor(pathname, payload) {
    super();
    this.url = pathname;
    this.method = 'POST';
    this.payload = Buffer.from(JSON.stringify(payload ?? {}), 'utf8');
    this.sent = false;
  }

  _read() {
    if (this.sent) {
      this.push(null);
      return;
    }

    this.sent = true;
    this.push(this.payload);
  }
}

class JsonDispatchResponse extends Writable {
  constructor(resolve) {
    super();
    this.headers = {};
    this.statusCode = 200;
    this.body = '';
    this.resolve = resolve;
  }

  setHeader(name, value) {
    this.headers[String(name).toLowerCase()] = value;
  }

  writeHead(status, headers = {}) {
    this.statusCode = status;
    for (const [name, value] of Object.entries(headers)) {
      this.setHeader(name, value);
    }
  }

  end(chunk = '') {
    if (chunk) {
      this.body += chunk.toString();
    }
    this.resolve({
      ok: this.statusCode >= 200 && this.statusCode < 300,
      status: this.statusCode,
      body: this.body,
      json: () => {
        try {
          return JSON.parse(this.body || 'null');
        } catch {
          return null;
        }
      },
    });
  }

  _write(chunk, _encoding, callback) {
    this.body += chunk.toString();
    callback();
  }
}

async function dispatchEditorToolsJsonRequest(pathname, payload) {
  return await new Promise((resolve, reject) => {
    const req = new JsonDispatchRequest(pathname, payload);
    const res = new JsonDispatchResponse(resolve);
    req.on('error', reject);
    res.on('error', reject);
    Promise.resolve(handleEditorToolsRequest(req, res)).catch(reject);
  });
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

function hasMeaningfulSceneContent(scene) {
  if (!scene || typeof scene !== 'object') return false;
  if (Array.isArray(scene.nodes) && scene.nodes.length > 0) return true;
  if (scene.settings && typeof scene.settings === 'object' && Object.keys(scene.settings).length > 0) return true;
  return false;
}

function createEditorToolsRouteContext() {
  return {
    EDITOR_SCENES_ROOT,
    EDITOR_SCENE_BACKUPS_ROOT,
    GAME_PUBLIC_ROOT,
    LEVEL_REGISTRY_PATH,
    REPO_ROOT,
    ensureTerrainManifestForLevel,
    getEditorScenePath,
    getLatestEditorSceneBackupPath,
    getOriginalEditorSceneSnapshotPath,
    getTerrainManifestPathForLevel,
    hasMeaningfulSceneContent,
    readJsonFile,
    readLevelRegistry,
    resolveWorkspacePath,
    resolvePublicAssetPath,
    toPublicAssetUrl,
    toRepoRelative,
    writeLevelRegistry,
    DEFAULT_COMFYUI_PORT,
    DEFAULT_HUNYUAN_PORT,
    GENERATED_BLENDER_REIMPORT_ROOT,
    buildSafeAssetSlug,
    fileToBase64,
    slugify,
    ...createStyleRouteContext({
      BLENDER_EXPORT_ROOT,
      GAME_PUBLIC_ROOT,
      GENERATED_STYLE_LAB_ROOT,
      REPO_ROOT,
      buildSafeAssetSlug,
      ensureDirectory,
      resolvePublicAssetPath,
      toPublicAssetUrl,
      toRepoRelative,
    }),
    ...createAiRouteContext({
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
    }),
  };
}

// Simple HTTP handler - focused responsibilities only
async function handleEditorToolsRequest(req, res) {
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

  if (sendRetiredEndpoint(res, pathname)) {
    return;
  }

  const route = { parsedUrl, pathname };
  const context = createEditorToolsRouteContext();
  if (handleSceneRoutes(req, res, route, context)) {
    return;
  }
  if (handleTerrainRoutes(req, res, route, context)) {
    return;
  }
  if (handleBrowseRoutes(req, res, route, context)) {
    return;
  }

  if ((await handleAiRoutes(req, res, route, context)) !== false) {
    return;
  }
  if ((await handleStyleRoutes(req, res, route, context)) !== false) {
    return;
  }
  // Default 404 response
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}

module.exports = {
  handleEditorToolsRequest,
  isEditorToolsApiPath,
};
