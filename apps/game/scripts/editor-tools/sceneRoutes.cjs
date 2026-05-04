const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

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

function parseLastJsonLine(stdout) {
  try {
    const jsonLine = stdout
      .trim()
      .split(/\r?\n/)
      .reverse()
      .find(line => line.trim().startsWith('{'));
    return jsonLine ? JSON.parse(jsonLine) : null;
  } catch {
    return null;
  }
}

function handleSceneRoutes(req, res, route, context) {
  const { pathname, parsedUrl } = route;
  const {
    EDITOR_SCENES_ROOT,
    EDITOR_SCENE_BACKUPS_ROOT,
    LEVEL_REGISTRY_PATH,
    REPO_ROOT,
    getEditorScenePath,
    getLatestEditorSceneBackupPath,
    getOriginalEditorSceneSnapshotPath,
    hasMeaningfulSceneContent,
    readLevelRegistry,
    toRepoRelative,
    writeLevelRegistry,
  } = context;

  if (pathname === '/api/editor-scene/load' && req.method === 'GET') {
    try {
      const levelId = parsedUrl.query.levelId;
      const snapshotMode = parsedUrl.query.snapshot;
      if (!levelId) {
        sendJson(res, 400, { success: false, message: 'levelId is required' });
        return true;
      }

      const scenePath =
        snapshotMode === 'latest-backup'
          ? getLatestEditorSceneBackupPath(levelId)
          : snapshotMode === 'original-packaged'
            ? getOriginalEditorSceneSnapshotPath(levelId)
            : getEditorScenePath(levelId);

      if (
        (snapshotMode === 'latest-backup' ||
          snapshotMode === 'original-packaged') &&
        !scenePath
      ) {
        sendJson(res, 200, { success: true, scene: null, snapshotFile: null });
        return true;
      }

      const resolvedScenePath = path.resolve(scenePath);
      const resolvedSceneRoot = path.resolve(EDITOR_SCENES_ROOT);
      const resolvedSnapshotRoot = path.resolve(EDITOR_SCENE_BACKUPS_ROOT);
      const sceneRootAllowed =
        resolvedScenePath === resolvedSceneRoot ||
        resolvedScenePath.startsWith(`${resolvedSceneRoot}${path.sep}`);
      const snapshotRootAllowed =
        resolvedScenePath === resolvedSnapshotRoot ||
        resolvedScenePath.startsWith(`${resolvedSnapshotRoot}${path.sep}`);

      if (!sceneRootAllowed && !snapshotRootAllowed) {
        sendJson(res, 403, { success: false, message: 'Access denied' });
        return true;
      }

      if (!fs.existsSync(scenePath)) {
        sendJson(res, 200, { success: true, scene: null });
        return true;
      }

      const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
      sendJson(res, 200, {
        success: true,
        scene,
        snapshotFile:
          snapshotMode === 'latest-backup' ||
          snapshotMode === 'original-packaged'
            ? path.basename(scenePath)
            : null,
      });
    } catch (error) {
      console.error('Editor scene load error:', error);
      sendJson(res, 500, {
        success: false,
        message: `Editor scene load failed: ${error.message}`,
      });
    }
    return true;
  }

  if (pathname === '/api/level-registry' && req.method === 'GET') {
    try {
      sendJson(res, 200, { success: true, entries: readLevelRegistry() });
    } catch (error) {
      console.error('Level registry load error:', error);
      sendJson(res, 500, {
        success: false,
        message: `Level registry load failed: ${error.message}`,
      });
    }
    return true;
  }

  if (pathname === '/api/level-registry' && req.method === 'POST') {
    readRequestBody(req, body => {
      try {
        const { entries } = JSON.parse(body);
        if (!Array.isArray(entries)) {
          sendJson(res, 400, {
            success: false,
            message: 'entries array is required',
          });
          return;
        }

        writeLevelRegistry(entries);
        sendJson(res, 200, {
          success: true,
          path: toRepoRelative(LEVEL_REGISTRY_PATH),
        });
      } catch (error) {
        console.error('Level registry save error:', error);
        sendJson(res, 500, {
          success: false,
          message: `Level registry save failed: ${error.message}`,
        });
      }
    });
    return true;
  }

  if (pathname === '/api/editor/log' && req.method === 'POST') {
    readRequestBody(req, body => {
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

        sendJson(res, 200, { success: true });
      } catch (error) {
        sendJson(res, 400, {
          success: false,
          message: `Editor log parse failed: ${error.message}`,
        });
      }
    });
    return true;
  }

  if (pathname === '/api/editor-scene/cook-world-partition' && req.method === 'POST') {
    readRequestBody(req, body => {
      try {
        const { levelId, cellSize = 120, activeRadius = 1 } = JSON.parse(body || '{}');
        if (!levelId) {
          sendJson(res, 400, { success: false, message: 'levelId is required' });
          return;
        }

        const child = spawn('pnpm', [
          '--dir',
          'apps/game',
          'cook:world-partition',
          '--',
          `--level=${levelId}`,
          `--cell-size=${cellSize}`,
          `--active-radius=${activeRadius}`,
        ], {
          cwd: REPO_ROOT,
          stdio: 'pipe',
          shell: process.platform === 'win32',
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', chunk => {
          stdout += chunk.toString();
        });
        child.stderr.on('data', chunk => {
          stderr += chunk.toString();
        });

        child.on('close', code => {
          if (code !== 0) {
            sendJson(res, 500, {
              success: false,
              message: stderr || stdout || `World partition cook failed with exit code ${code}`,
            });
            return;
          }

          sendJson(res, 200, {
            success: true,
            ...(parseLastJsonLine(stdout) || {}),
            stdout,
          });
        });

        child.on('error', error => {
          sendJson(res, 500, {
            success: false,
            message: `World partition cook process error: ${error.message}`,
          });
        });
      } catch (error) {
        console.error('Editor world partition cook error:', error);
        sendJson(res, 500, {
          success: false,
          message: `World partition cook failed: ${error.message}`,
        });
      }
    });
    return true;
  }

  if (pathname === '/api/editor-scene/save' && req.method === 'POST') {
    readRequestBody(req, body => {
      try {
        const { levelId, scene } = JSON.parse(body);
        if (!levelId || !scene) {
          sendJson(res, 400, {
            success: false,
            message: 'levelId and scene are required',
          });
          return;
        }

        fs.mkdirSync(EDITOR_SCENES_ROOT, { recursive: true });
        const scenePath = path.join(EDITOR_SCENES_ROOT, `${levelId}.scene.json`);
        if (!scenePath.startsWith(EDITOR_SCENES_ROOT)) {
          sendJson(res, 403, { success: false, message: 'Access denied' });
          return;
        }

        if (fs.existsSync(scenePath)) {
          try {
            const existingScene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
            if (!hasMeaningfulSceneContent(scene) && hasMeaningfulSceneContent(existingScene)) {
              sendJson(res, 409, {
                success: false,
                message: `Refusing to overwrite populated scene "${levelId}" with empty content.`,
              });
              return;
            }
          } catch (readError) {
            console.warn('Unable to validate existing scene before save:', readError);
          }
        }

        fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2), 'utf8');
        sendJson(res, 200, {
          success: true,
          path: toRepoRelative(scenePath),
        });
      } catch (error) {
        console.error('Editor scene save error:', error);
        sendJson(res, 500, {
          success: false,
          message: `Editor scene save failed: ${error.message}`,
        });
      }
    });
    return true;
  }

  return false;
}

module.exports = {
  handleSceneRoutes,
};
