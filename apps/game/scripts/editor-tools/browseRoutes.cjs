const fs = require('fs');
const path = require('path');

function handleBrowseRoutes(req, res, route, context) {
  const { pathname, parsedUrl } = route;
  const { REPO_ROOT, resolveWorkspacePath, toRepoRelative } = context;

  if (pathname !== '/api/browse' || req.method !== 'GET') {
    return false;
  }

  const dirPath = parsedUrl.query.path || '';

  try {
    const fullPath = resolveWorkspacePath(dirPath);

    if (!fullPath.startsWith(REPO_ROOT)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Access denied' }));
      return true;
    }

    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Directory not found' }));
      return true;
    }

    const items = fs.readdirSync(fullPath).map((name) => {
      const itemPath = path.join(fullPath, name);
      const stats = fs.statSync(itemPath);
      return {
        name,
        path: toRepoRelative(itemPath),
        isDirectory: stats.isDirectory(),
        size: stats.isDirectory() ? null : stats.size,
        modified: stats.mtime,
      };
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, items, currentPath: dirPath }));
    return true;
  } catch (error) {
    console.error('Browse error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Server error' }));
    return true;
  }
}

module.exports = {
  handleBrowseRoutes,
};
