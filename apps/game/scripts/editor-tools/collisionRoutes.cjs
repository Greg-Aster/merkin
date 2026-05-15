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

function appendArg(args, name, value) {
  if (value === undefined || value === null || value === '') return;
  args.push(`--${name}=${value}`);
}

function handleCollisionRoutes(req, res, route, context) {
  const { pathname } = route;
  const { REPO_ROOT } = context;

  if (
    pathname !== '/api/editor-collision/bake-mesh-collider' ||
    req.method !== 'POST'
  ) {
    return false;
  }

  readRequestBody(req, body => {
    try {
      const payload = body ? JSON.parse(body) : {};
      const { levelId, nodeId, intent, channel, triangleBudget, lodSourceTier } = payload;

      if (!levelId || !nodeId) {
        sendJson(res, 400, {
          success: false,
          message: 'levelId and nodeId are required',
        });
        return;
      }

      const args = [
        '--dir',
        'apps/game',
        'bake:mesh-collider',
        '--',
        `--level=${levelId}`,
        `--node=${nodeId}`,
      ];
      appendArg(args, 'intent', intent);
      appendArg(args, 'channel', channel);
      appendArg(args, 'triangle-budget', triangleBudget);
      appendArg(args, 'lod-source-tier', lodSourceTier);
      appendArg(args, 'asset-url', payload.assetUrl);
      if (payload.simplify === false) args.push('--no-simplify');

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
        const result = parseLastJsonLine(stdout);
        if (code !== 0 || !result?.success) {
          sendJson(res, 500, {
            success: false,
            levelId,
            nodeId,
            message:
              stderr ||
              stdout ||
              `Mesh collider bake failed with exit code ${code}`,
            stdout,
            stderr,
          });
          return;
        }

        sendJson(res, 200, {
          ...result,
          stdout,
          stderr,
        });
      });

      child.on('error', error => {
        sendJson(res, 500, {
          success: false,
          levelId,
          nodeId,
          message: `Mesh collider bake process error: ${error.message}`,
          stdout,
          stderr,
        });
      });
    } catch (error) {
      console.error('Editor mesh collider bake error:', error);
      sendJson(res, 500, {
        success: false,
        message: `Mesh collider bake failed: ${error.message}`,
      });
    }
  });
  return true;
}

module.exports = {
  handleCollisionRoutes,
};
