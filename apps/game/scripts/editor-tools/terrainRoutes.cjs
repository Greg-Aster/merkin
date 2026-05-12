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

function runPnpmScript(repoRoot, scriptName, args, callback) {
  const child = spawn('pnpm', ['--dir', 'apps/game', scriptName, ...args], {
    cwd: repoRoot,
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
    callback(null, { code, stdout, stderr });
  });
  child.on('error', error => {
    callback(error, { code: 1, stdout, stderr });
  });
}

function handleTerrainRoutes(req, res, route, context) {
  const { pathname } = route;
  const {
    GAME_PUBLIC_ROOT,
    REPO_ROOT,
    ensureTerrainManifestForLevel,
    getEditorScenePath,
    getTerrainManifestPathForLevel,
    readJsonFile,
    resolvePublicAssetPath,
    toPublicAssetUrl,
    toRepoRelative,
  } = context;

  if (pathname === '/api/editor-terrain/generate-heightmap' && req.method === 'POST') {
    readRequestBody(req, body => {
      try {
        const {
          levelId,
          nodeId,
          sourceAssetUrl,
          sources,
          resolution = 512,
          bakeCollision = true,
        } = JSON.parse(body || '{}');

        if (!levelId) {
          sendJson(res, 400, { success: false, message: 'levelId is required' });
          return;
        }

        const scenePath = getEditorScenePath(levelId);
        const scene = fs.existsSync(scenePath)
          ? readJsonFile(scenePath)
          : null;
        const manifestPath = ensureTerrainManifestForLevel(levelId, scene);
        const sourceNode = nodeId && scene?.nodes
          ? scene.nodes.find(node => node.id === nodeId)
          : null;
        const resolvedSourceUrl = sourceAssetUrl || sourceNode?.asset?.url || '';
        const sourceList = Array.isArray(sources) ? sources : [];

        if (!resolvedSourceUrl && sourceList.length === 0) {
          sendJson(res, 400, {
            success: false,
            message: 'Select an asset, primitive, or group before generating a terrain heightmap.',
          });
          return;
        }

        const assetSources = sourceList.length > 0
          ? sourceList.filter(source => source?.sourceAssetUrl)
          : [{ sourceAssetUrl: resolvedSourceUrl }];
        for (const source of assetSources) {
          const sourcePath = resolvePublicAssetPath(source.sourceAssetUrl);
          if (!fs.existsSync(sourcePath)) {
            sendJson(res, 400, {
              success: false,
              message: `Source mesh not found: ${source.sourceAssetUrl}`,
            });
            return;
          }
        }

        const sourcePath = resolvedSourceUrl ? resolvePublicAssetPath(resolvedSourceUrl) : '';
        if (resolvedSourceUrl && !fs.existsSync(sourcePath)) {
          sendJson(res, 400, {
            success: false,
            message: `Source mesh not found: ${resolvedSourceUrl}`,
          });
          return;
        }

        const args = [
          '--dir',
          'apps/game',
          'generate:terrain-heightmap',
          '--',
          `--level=${levelId}`,
          `--resolution=${resolution}`,
        ];
        if (sourceList.length > 0) {
          args.push(`--sources=${JSON.stringify(sourceList)}`);
        } else {
          args.push(
            `--source=${resolvedSourceUrl}`,
            `--sourceName=${sourceNode?.name || path.basename(sourcePath)}`,
            `--position=${JSON.stringify(sourceNode?.position || [0, 0, 0])}`,
            `--rotation=${JSON.stringify(sourceNode?.rotation || [0, 0, 0])}`,
            `--scale=${JSON.stringify(sourceNode?.scale || [1, 1, 1])}`,
          );
        }

        const child = spawn('pnpm', args, {
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
              message: stderr || stdout || `Terrain heightmap generation failed with exit code ${code}`,
            });
            return;
          }

          const generated = parseLastJsonLine(stdout);

          const finish = (collisionPayload = null) => {
            sendJson(res, 200, {
              success: true,
              ...generated,
              collision: collisionPayload?.collision ?? null,
              collisionMetadata: collisionPayload?.metadata ?? null,
              stdout,
            });
          };

          if (!bakeCollision) {
            finish();
            return;
          }

          const bakeChild = spawn('pnpm', [
            '--dir',
            'apps/game',
            'bake:terrain-collision',
            '--',
            `--level=${levelId}`,
          ], {
            cwd: REPO_ROOT,
            stdio: 'pipe',
            shell: process.platform === 'win32',
          });

          let bakeStdout = '';
          let bakeStderr = '';
          bakeChild.stdout.on('data', chunk => {
            bakeStdout += chunk.toString();
          });
          bakeChild.stderr.on('data', chunk => {
            bakeStderr += chunk.toString();
          });
          bakeChild.on('close', bakeCode => {
            if (bakeCode !== 0) {
              sendJson(res, 500, {
                success: false,
                message: bakeStderr || bakeStdout || `Terrain collision bake failed with exit code ${bakeCode}`,
                heightmap: generated,
              });
              return;
            }

            try {
              const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
              const metadataUrl = manifest?.collision?.terrain?.metadataUrl;
              const metadataPath = metadataUrl
                ? path.join(GAME_PUBLIC_ROOT, metadataUrl.replace(/^\/+/, ''))
                : '';
              const metadata = metadataPath && fs.existsSync(metadataPath)
                ? JSON.parse(fs.readFileSync(metadataPath, 'utf8').replace(/^\uFEFF/, ''))
                : null;
              finish({
                collision: manifest.collision?.terrain ?? null,
                metadata,
              });
            } catch (readError) {
              sendJson(res, 500, {
                success: false,
                message: `Heightmap generated and collision baked, but reading metadata failed: ${readError.message}`,
                heightmap: generated,
              });
            }
          });
          bakeChild.on('error', error => {
            sendJson(res, 500, {
              success: false,
              message: `Collision bake process error: ${error.message}`,
              heightmap: generated,
            });
          });
        });

        child.on('error', error => {
          sendJson(res, 500, {
            success: false,
            message: `Heightmap generation process error: ${error.message}`,
          });
        });
      } catch (error) {
        console.error('Editor terrain heightmap generation error:', error);
        sendJson(res, 500, {
          success: false,
          message: `Terrain heightmap generation failed: ${error.message}`,
        });
      }
    });
    return true;
  }

  if (pathname === '/api/editor-terrain/bake-collision' && req.method === 'POST') {
    readRequestBody(req, body => {
      try {
        const { levelId } = JSON.parse(body || '{}');
        if (!levelId) {
          sendJson(res, 400, { success: false, message: 'levelId is required' });
          return;
        }

        const manifestPath = getTerrainManifestPathForLevel(levelId);
        if (!manifestPath) {
          sendJson(res, 400, {
            success: false,
            message: `Level "${levelId}" does not use the baked heightmap terrain workflow.`,
          });
          return;
        }

        const child = spawn('pnpm', [
          '--dir',
          'apps/game',
          'bake:terrain-collision',
          '--',
          `--level=${levelId}`,
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
              message: stderr || stdout || `Terrain collision bake failed with exit code ${code}`,
            });
            return;
          }

          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
            const metadataUrl = manifest?.collision?.terrain?.metadataUrl;
            const metadataPath = metadataUrl
              ? path.join(GAME_PUBLIC_ROOT, metadataUrl.replace(/^\/+/, ''))
              : '';
            const metadata = metadataPath && fs.existsSync(metadataPath)
              ? JSON.parse(fs.readFileSync(metadataPath, 'utf8').replace(/^\uFEFF/, ''))
              : null;

            sendJson(res, 200, {
              success: true,
              manifestPath: toRepoRelative(manifestPath),
              manifestUrl: toPublicAssetUrl(manifestPath),
              collision: manifest.collision?.terrain ?? null,
              metadata,
              stdout,
            });
          } catch (readError) {
            sendJson(res, 500, {
              success: false,
              message: `Bake completed, but reading manifest metadata failed: ${readError.message}`,
            });
          }
        });

        child.on('error', error => {
          sendJson(res, 500, {
            success: false,
            message: `Bake process error: ${error.message}`,
          });
        });
      } catch (error) {
        console.error('Editor terrain collision bake error:', error);
        sendJson(res, 500, {
          success: false,
          message: `Terrain collision bake failed: ${error.message}`,
        });
      }
    });
    return true;
  }

  if (pathname === '/api/editor-terrain/cook-chunks' && req.method === 'POST') {
    readRequestBody(req, body => {
      try {
        const { levelId, grid = 4, lodResolutions = '33,17,9' } = JSON.parse(body || '{}');
        if (!levelId) {
          sendJson(res, 400, { success: false, message: 'levelId is required' });
          return;
        }

        const manifestPath = getTerrainManifestPathForLevel(levelId);
        if (!manifestPath) {
          sendJson(res, 400, {
            success: false,
            message: `Level "${levelId}" does not have a terrain manifest to chunk.`,
          });
          return;
        }

        const child = spawn('pnpm', [
          '--dir',
          'apps/game',
          'cook:terrain-chunks',
          '--',
          `--level=${levelId}`,
          `--grid=${grid}`,
          `--lod-resolutions=${lodResolutions}`,
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
              message: stderr || stdout || `Terrain chunk cook failed with exit code ${code}`,
            });
            return;
          }

          sendJson(res, 200, {
            success: true,
            manifestPath: toRepoRelative(manifestPath),
            ...(parseLastJsonLine(stdout) || {}),
            stdout,
          });
        });

        child.on('error', error => {
          sendJson(res, 500, {
            success: false,
            message: `Terrain chunk cook process error: ${error.message}`,
          });
        });
      } catch (error) {
        console.error('Editor terrain chunk cook error:', error);
        sendJson(res, 500, {
          success: false,
          message: `Terrain chunk cook failed: ${error.message}`,
        });
      }
    });
    return true;
  }

  if (pathname === '/api/editor-terrain/publish-contracts' && req.method === 'POST') {
    readRequestBody(req, body => {
      try {
        const { levelId } = JSON.parse(body || '{}');
        if (!levelId) {
          sendJson(res, 400, { success: false, message: 'levelId is required' });
          return;
        }

        runPnpmScript(REPO_ROOT, 'cook:runtime-assets', [], (cookError, cookResult) => {
          if (cookError || cookResult.code !== 0) {
            sendJson(res, 500, {
              success: false,
              levelId,
              stage: 'cook-runtime-assets',
              message:
                cookError?.message ||
                cookResult.stderr ||
                cookResult.stdout ||
                `Runtime asset cook failed with exit code ${cookResult.code}`,
              cookStdout: cookResult.stdout,
              cookStderr: cookResult.stderr,
            });
            return;
          }

          runPnpmScript(REPO_ROOT, 'audit:engine', [], (auditError, auditResult) => {
            if (auditError || auditResult.code !== 0) {
              sendJson(res, 500, {
                success: false,
                levelId,
                stage: 'audit-engine',
                message:
                  auditError?.message ||
                  auditResult.stderr ||
                  auditResult.stdout ||
                  `Engine audit failed with exit code ${auditResult.code}`,
                cookStdout: cookResult.stdout,
                auditStdout: auditResult.stdout,
                auditStderr: auditResult.stderr,
              });
              return;
            }

            sendJson(res, 200, {
              success: true,
              levelId,
              cookedRuntimeAssets: true,
              engineAudit: true,
              cookStdout: cookResult.stdout,
              auditStdout: auditResult.stdout,
            });
          });
        });
      } catch (error) {
        console.error('Editor terrain contract publish error:', error);
        sendJson(res, 500, {
          success: false,
          message: `Ground/terrain contract publish failed: ${error.message}`,
        });
      }
    });
    return true;
  }

  return false;
}

module.exports = {
  handleTerrainRoutes,
};
