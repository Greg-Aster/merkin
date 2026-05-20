const fs = require('fs')
const path = require('path')
const { createHash } = require('crypto')
const { spawn } = require('child_process')

function readRequestBody(req, callback) {
  let body = ''
  req.on('data', chunk => {
    body += chunk.toString()
  })
  req.on('end', () => callback(body))
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload))
}

function parseLastJsonLine(stdout) {
  try {
    const jsonLine = stdout
      .trim()
      .split(/\r?\n/)
      .reverse()
      .find(line => line.trim().startsWith('{'))
    return jsonLine ? JSON.parse(jsonLine) : null
  } catch {
    return null
  }
}

function runPnpmScript(repoRoot, scriptName, args, callback) {
  const child = spawn('pnpm', ['--dir', 'apps/game', scriptName, ...args], {
    cwd: repoRoot,
    stdio: 'pipe',
    shell: process.platform === 'win32',
  })
  let stdout = ''
  let stderr = ''

  child.stdout.on('data', chunk => {
    stdout += chunk.toString()
  })
  child.stderr.on('data', chunk => {
    stderr += chunk.toString()
  })
  child.on('close', code => {
    callback(null, { code, stdout, stderr })
  })
  child.on('error', error => {
    callback(error, { code: 1, stdout, stderr })
  })
}

function timestampKey() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function slugify(value = 'asset') {
  return (
    String(value || 'asset')
      .trim()
      .toLowerCase()
      .replace(/\.(glb|gltf)$/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'asset'
  )
}

function isGltfTerrainAsset(value) {
  return /\.(glb|gltf)$/i.test(String(value || '').split('?')[0] ?? '')
}

function fingerprintFile(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

function isPathInside(childPath, rootPath) {
  const resolvedChild = path.resolve(childPath)
  const resolvedRoot = path.resolve(rootPath)
  return (
    resolvedChild === resolvedRoot ||
    resolvedChild.startsWith(`${resolvedRoot}${path.sep}`)
  )
}

function resolveLocalTerrainSourcePath(sourcePath, repoRoot) {
  const trimmed = String(sourcePath || '').trim()
  if (!trimmed) return ''
  const candidate = path.isAbsolute(trimmed)
    ? trimmed
    : path.resolve(repoRoot, trimmed)
  return fs.existsSync(candidate) ? candidate : ''
}

function materializeImportedTerrainSource({
  levelId,
  sourcePath,
  sourceAssetUrl,
  fileName,
  fileBase64,
  GAME_PUBLIC_ROOT,
  REPO_ROOT,
  resolvePublicAssetPath,
  toPublicAssetUrl,
}) {
  if (sourceAssetUrl) {
    if (!sourceAssetUrl.startsWith('/')) {
      throw new Error('Terrain source URL must start with "/".')
    }
    if (!isGltfTerrainAsset(sourceAssetUrl)) {
      throw new Error('Terrain source must be a .glb or .gltf asset.')
    }
    const publicPath = resolvePublicAssetPath(sourceAssetUrl)
    if (!fs.existsSync(publicPath)) {
      throw new Error(`Terrain source not found: ${sourceAssetUrl}`)
    }
    return {
      sourceAssetUrl,
      sourcePath: publicPath,
      copied: false,
    }
  }

  if (sourcePath && String(sourcePath).trim().startsWith('/')) {
    const localSourcePath = resolveLocalTerrainSourcePath(sourcePath, REPO_ROOT)
    if (!localSourcePath) {
      try {
        const publicPath = resolvePublicAssetPath(sourcePath)
        if (fs.existsSync(publicPath)) {
          if (!isGltfTerrainAsset(sourcePath)) {
            throw new Error('Terrain source must be a .glb or .gltf asset.')
          }
          return {
            sourceAssetUrl: sourcePath,
            sourcePath: publicPath,
            copied: false,
          }
        }
      } catch {
        // Fall through to the regular missing-file error below.
      }
    }
  }

  const extension = path.extname(fileName || sourcePath || '').toLowerCase()
  if (!['.glb', '.gltf'].includes(extension)) {
    throw new Error('Terrain source must be a .glb or .gltf file.')
  }

  const outputDirectory = path.join(
    GAME_PUBLIC_ROOT,
    'models',
    'levels',
    slugify(levelId),
  )
  fs.mkdirSync(outputDirectory, { recursive: true })
  if (!isPathInside(outputDirectory, GAME_PUBLIC_ROOT)) {
    throw new Error('Terrain source output resolves outside the public root.')
  }

  const outputPath = path.join(
    outputDirectory,
    `${slugify(fileName || path.basename(sourcePath) || `${levelId}-terrain`)}-${timestampKey()}${extension}`,
  )
  if (!isPathInside(outputPath, outputDirectory)) {
    throw new Error('Terrain source output resolves outside the level folder.')
  }

  if (fileBase64) {
    fs.writeFileSync(outputPath, Buffer.from(String(fileBase64), 'base64'))
  } else {
    const localSourcePath = resolveLocalTerrainSourcePath(sourcePath, REPO_ROOT)
    if (!localSourcePath) {
      throw new Error(`Terrain source file not found: ${sourcePath}`)
    }
    if (!isGltfTerrainAsset(localSourcePath)) {
      throw new Error('Terrain source must be a .glb or .gltf file.')
    }
    if (fs.statSync(localSourcePath).isDirectory()) {
      throw new Error('Terrain source must be a file, not a directory.')
    }
    if (isPathInside(localSourcePath, GAME_PUBLIC_ROOT)) {
      return {
        sourceAssetUrl: toPublicAssetUrl(localSourcePath),
        sourcePath: localSourcePath,
        copied: false,
      }
    }
    fs.copyFileSync(localSourcePath, outputPath)
  }

  return {
    sourceAssetUrl: toPublicAssetUrl(outputPath),
    sourcePath: outputPath,
    copied: true,
  }
}

function isIsoDateBefore(left, right) {
  if (!left || !right) return false
  const leftTime = Date.parse(left)
  const rightTime = Date.parse(right)
  return Number.isFinite(leftTime) && Number.isFinite(rightTime)
    ? leftTime < rightTime
    : false
}

function getSceneTerrainPublishState(scene) {
  const terrain = scene?.settings?.level?.collision?.terrain ?? null
  const ground = scene?.settings?.level?.ground ?? null
  const terrainRuntimeMode = terrain?.runtimeMode ?? ground?.terrainRuntimeMode
  const terrainVisualSource = terrain?.visualSource ?? ground?.terrainVisualSource
  const renderChunks = terrain?.renderChunks ?? ground?.renderChunks
  const glbChunkTerrain =
    terrainRuntimeMode === 'glb-chunk-terrain' ||
    terrainVisualSource === 'source-glb-chunks' ||
    renderChunks?.type === 'glb-chunk-terrain'
  const sceneAuthoredTerrain =
    terrainRuntimeMode === 'scene-authored' ||
    ground?.terrainRuntimeMode === 'scene-authored' ||
    ground?.collisionSource === 'scene-colliders'
  const bakedTerrainEnabled = glbChunkTerrain && !sceneAuthoredTerrain
  const chunksStale =
    Boolean(terrain?.lastGeneratedAt) &&
    (!terrain?.lastChunksGeneratedAt ||
      isIsoDateBefore(terrain.lastChunksGeneratedAt, terrain.lastGeneratedAt))
  const staleReasons = [
    terrain?.dirty ? 'terrain collision is marked dirty' : '',
    bakedTerrainEnabled && !terrain?.colliderUrl
      ? 'baked terrain collision artifact is missing'
      : '',
    bakedTerrainEnabled && !terrain?.metadataUrl
      ? 'baked terrain collision metadata is missing'
      : '',
    bakedTerrainEnabled && chunksStale
      ? 'terrain visual chunks are older than the current source terrain state'
      : '',
  ].filter(Boolean)

  return {
    bakedTerrainEnabled,
    staleReasons,
    products: {
      colliderUrl: terrain?.colliderUrl ?? '',
      metadataUrl: terrain?.metadataUrl ?? '',
      chunksPath: terrain?.chunksPath ?? '',
      lastGeneratedAt: terrain?.lastGeneratedAt ?? '',
      lastChunksGeneratedAt: terrain?.lastChunksGeneratedAt ?? '',
      dirty: Boolean(terrain?.dirty),
      chunksStale,
    },
  }
}

function sceneUsesSourceGlbTerrain(scene) {
  const terrain = scene?.settings?.level?.collision?.terrain ?? null
  const ground = scene?.settings?.level?.ground ?? null
  const renderChunks = terrain?.renderChunks ?? ground?.renderChunks ?? null

  return (
    terrain?.runtimeMode === 'glb-chunk-terrain' ||
    ground?.terrainRuntimeMode === 'glb-chunk-terrain' ||
    terrain?.visualSource === 'source-glb-chunks' ||
    ground?.terrainVisualSource === 'source-glb-chunks' ||
    renderChunks?.type === 'glb-chunk-terrain'
  )
}

function getTerrainSourceDescriptorsFromScene(scene) {
  const terrain = scene?.settings?.level?.collision?.terrain ?? null
  const nodes = Array.isArray(scene?.nodes) ? scene.nodes : []
  const sourceNodeIds = Array.isArray(terrain?.sourceNodeIds)
    ? terrain.sourceNodeIds
    : terrain?.sourceNodeId
      ? [terrain.sourceNodeId]
      : []
  const sourceAssetUrls = Array.isArray(terrain?.sourceAssetUrls)
    ? terrain.sourceAssetUrls
    : terrain?.sourceAssetUrl
      ? [terrain.sourceAssetUrl]
      : []

  if (sourceNodeIds.length > 0) {
    return sourceNodeIds
      .map((nodeId, index) => {
        const node = nodes.find(candidate => candidate.id === nodeId)
        if (!node) return null
        const sourceAssetUrl =
          node.asset?.url || sourceAssetUrls[index] || sourceAssetUrls[0] || ''
        if (!sourceAssetUrl && !node.primitive) return null
        return {
          nodeId: node.id,
          sourceName: node.name || node.id,
          ...(sourceAssetUrl ? { sourceAssetUrl } : {}),
          ...(node.primitive ? { primitive: node.primitive } : {}),
          position: node.position || [0, 0, 0],
          rotation: node.rotation || [0, 0, 0],
          scale: node.scale || [1, 1, 1],
        }
      })
      .filter(Boolean)
  }

  if (sourceAssetUrls.length > 0) {
    return sourceAssetUrls.map((sourceAssetUrl, index) => ({
      sourceAssetUrl,
      sourceName:
        index === 0 && terrain?.sourceName
          ? terrain.sourceName
          : path.basename(sourceAssetUrl),
    }))
  }

  return []
}

function getTerrainSourceAssetStatus(scene, resolvePublicAssetPath) {
  const descriptors = getTerrainSourceDescriptorsFromScene(scene)
  const seen = new Set()

  return descriptors
    .map(source => {
      const sourceAssetUrl = source?.sourceAssetUrl || ''
      if (!sourceAssetUrl) {
        return {
          nodeId: source?.nodeId || '',
          sourceName: source?.sourceName || source?.nodeId || 'primitive',
          sourceType: source?.primitive ? 'primitive' : 'scene-node',
          exists: true,
          detail: source?.primitive
            ? 'primitive terrain source is authored in the scene'
            : 'scene terrain source has no external asset URL',
        }
      }
      if (seen.has(sourceAssetUrl)) return null
      seen.add(sourceAssetUrl)
      try {
        const sourcePath = resolvePublicAssetPath(sourceAssetUrl)
        return {
          nodeId: source?.nodeId || '',
          sourceName: source?.sourceName || path.basename(sourceAssetUrl),
          sourceType: 'asset',
          url: sourceAssetUrl,
          exists: fs.existsSync(sourcePath),
          path: sourcePath,
          detail: fs.existsSync(sourcePath)
            ? 'source asset exists'
            : 'source asset file is missing',
        }
      } catch (error) {
        return {
          nodeId: source?.nodeId || '',
          sourceName: source?.sourceName || path.basename(sourceAssetUrl),
          sourceType: 'asset',
          url: sourceAssetUrl,
          exists: false,
          detail: error.message,
        }
      }
    })
    .filter(Boolean)
}

function handleTerrainRoutes(req, res, route, context) {
  const { pathname } = route
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
  } = context

  if (pathname === '/api/editor-terrain/status' && req.method === 'POST') {
    readRequestBody(req, body => {
      try {
        const { levelId, scene: payloadScene } = JSON.parse(body || '{}')
        if (!levelId && !payloadScene?.levelId) {
          sendJson(res, 400, { success: false, message: 'levelId is required' })
          return
        }

        const scene =
          payloadScene ||
          (fs.existsSync(getEditorScenePath(levelId))
            ? readJsonFile(getEditorScenePath(levelId))
            : null)
        const sourceAssets = getTerrainSourceAssetStatus(
          scene,
          resolvePublicAssetPath,
        )

        sendJson(res, 200, {
          success: true,
          levelId: levelId || scene?.levelId || '',
          sourceAssets,
          missingSourceAssets: sourceAssets.filter(source => !source.exists),
        })
      } catch (error) {
        console.error('Editor terrain status error:', error)
        sendJson(res, 500, {
          success: false,
          message: `Terrain status failed: ${error.message}`,
        })
      }
    })
    return true
  }

  if (pathname === '/api/editor-terrain/import-source' && req.method === 'POST') {
    readRequestBody(req, body => {
      try {
        const {
          levelId,
          sourcePath = '',
          sourceAssetUrl = '',
          fileName = '',
          fileBase64 = '',
          sourceName = '',
        } = JSON.parse(body || '{}')
        if (!levelId) {
          sendJson(res, 400, { success: false, message: 'levelId is required' })
          return
        }

        const scenePath = getEditorScenePath(levelId)
        const scene = fs.existsSync(scenePath) ? readJsonFile(scenePath) : null
        const manifestPath = ensureTerrainManifestForLevel(levelId, scene)
        const imported = materializeImportedTerrainSource({
          levelId,
          sourcePath,
          sourceAssetUrl,
          fileName,
          fileBase64,
          GAME_PUBLIC_ROOT,
          REPO_ROOT,
          resolvePublicAssetPath,
          toPublicAssetUrl,
        })
        const sourceHash = fingerprintFile(imported.sourcePath)
        const stats = fs.statSync(imported.sourcePath)

        sendJson(res, 200, {
          success: true,
          levelId,
          sourceName:
            sourceName ||
            path.basename(fileName || sourcePath || imported.sourceAssetUrl),
          sourceAssetUrl: imported.sourceAssetUrl,
          sourceAssetHash: sourceHash,
          sourceAssetFingerprint: {
            algorithm: 'sha256',
            value: sourceHash,
          },
          sourceSizeBytes: stats.size,
          copied: imported.copied,
          manifestUrl: toPublicAssetUrl(manifestPath),
          manifestPath: toRepoRelative(manifestPath),
          sourcePath: toRepoRelative(imported.sourcePath),
        })
      } catch (error) {
        console.error('Editor terrain source import error:', error)
        sendJson(res, 500, {
          success: false,
          message: `Terrain source import failed: ${error.message}`,
        })
      }
    })
    return true
  }

  if (
    pathname === '/api/editor-terrain/bake-collision' &&
    req.method === 'POST'
  ) {
    readRequestBody(req, body => {
      try {
        const { levelId } = JSON.parse(body || '{}')
        if (!levelId) {
          sendJson(res, 400, { success: false, message: 'levelId is required' })
          return
        }

        const manifestPath = getTerrainManifestPathForLevel(levelId)
        if (!manifestPath) {
          sendJson(res, 400, {
            success: false,
            message: `Level "${levelId}" does not use the baked terrain workflow.`,
          })
          return
        }

        const child = spawn(
          'pnpm',
          [
            '--dir',
            'apps/game',
            'bake:terrain-collision',
            '--',
            `--level=${levelId}`,
          ],
          {
            cwd: REPO_ROOT,
            stdio: 'pipe',
            shell: process.platform === 'win32',
          },
        )

        let stdout = ''
        let stderr = ''

        child.stdout.on('data', chunk => {
          stdout += chunk.toString()
        })
        child.stderr.on('data', chunk => {
          stderr += chunk.toString()
        })

        child.on('close', code => {
          if (code !== 0) {
            sendJson(res, 500, {
              success: false,
              message:
                stderr ||
                stdout ||
                `Terrain collision bake failed with exit code ${code}`,
            })
            return
          }

          try {
            const manifest = JSON.parse(
              fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''),
            )
            const metadataUrl = manifest?.collision?.terrain?.metadataUrl
            const metadataPath = metadataUrl
              ? path.join(GAME_PUBLIC_ROOT, metadataUrl.replace(/^\/+/, ''))
              : ''
            const metadata =
              metadataPath && fs.existsSync(metadataPath)
                ? JSON.parse(
                    fs
                      .readFileSync(metadataPath, 'utf8')
                      .replace(/^\uFEFF/, ''),
                  )
                : null

            sendJson(res, 200, {
              success: true,
              manifestPath: toRepoRelative(manifestPath),
              manifestUrl: toPublicAssetUrl(manifestPath),
              collision: manifest.collision?.terrain ?? null,
              metadata,
              stdout,
            })
          } catch (readError) {
            sendJson(res, 500, {
              success: false,
              message: `Bake completed, but reading manifest metadata failed: ${readError.message}`,
            })
          }
        })

        child.on('error', error => {
          sendJson(res, 500, {
            success: false,
            message: `Bake process error: ${error.message}`,
          })
        })
      } catch (error) {
        console.error('Editor terrain collision bake error:', error)
        sendJson(res, 500, {
          success: false,
          message: `Terrain collision bake failed: ${error.message}`,
        })
      }
    })
    return true
  }

  if (pathname === '/api/editor-terrain/cook-chunks' && req.method === 'POST') {
    readRequestBody(req, body => {
      try {
        const {
          levelId,
          grid = 4,
        } = JSON.parse(body || '{}')
        if (!levelId) {
          sendJson(res, 400, { success: false, message: 'levelId is required' })
          return
        }

        const manifestPath = getTerrainManifestPathForLevel(levelId)
        if (!manifestPath) {
          sendJson(res, 400, {
            success: false,
            message: `Level "${levelId}" does not have a terrain manifest to chunk.`,
          })
          return
        }
        const cookArgs = [
          '--dir',
          'apps/game',
          'cook:terrain-glb-chunks',
          '--',
          `--level=${levelId}`,
          `--grid=${grid}`,
        ]

        const child = spawn(
          'pnpm',
          cookArgs,
          {
            cwd: REPO_ROOT,
            stdio: 'pipe',
            shell: process.platform === 'win32',
          },
        )

        let stdout = ''
        let stderr = ''

        child.stdout.on('data', chunk => {
          stdout += chunk.toString()
        })
        child.stderr.on('data', chunk => {
          stderr += chunk.toString()
        })

        child.on('close', code => {
          if (code !== 0) {
            sendJson(res, 500, {
              success: false,
              message:
                stderr ||
                stdout ||
                `Terrain chunk cook failed with exit code ${code}`,
            })
            return
          }

          sendJson(res, 200, {
            success: true,
            manifestPath: toRepoRelative(manifestPath),
            ...(parseLastJsonLine(stdout) || {}),
            stdout,
          })
        })

        child.on('error', error => {
          sendJson(res, 500, {
            success: false,
            message: `Terrain chunk cook process error: ${error.message}`,
          })
        })
      } catch (error) {
        console.error('Editor terrain chunk cook error:', error)
        sendJson(res, 500, {
          success: false,
          message: `Terrain chunk cook failed: ${error.message}`,
        })
      }
    })
    return true
  }

  if (
    pathname === '/api/editor-terrain/publish-contracts' &&
    req.method === 'POST'
  ) {
    readRequestBody(req, body => {
      try {
        const { levelId } = JSON.parse(body || '{}')
        if (!levelId) {
          sendJson(res, 400, { success: false, message: 'levelId is required' })
          return
        }
        const scenePath = getEditorScenePath(levelId)
        const scene = fs.existsSync(scenePath) ? readJsonFile(scenePath) : null
        const terrainPublishState = getSceneTerrainPublishState(scene)

        if (terrainPublishState.staleReasons.length > 0) {
          sendJson(res, 409, {
            success: false,
            levelId,
            stage: 'terrain-products',
            message: `Terrain products are stale: ${terrainPublishState.staleReasons.join('; ')}.`,
            terrainProducts: terrainPublishState.products,
          })
          return
        }

        runPnpmScript(
          REPO_ROOT,
          'cook:runtime-assets',
          [],
          (cookError, cookResult) => {
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
              })
              return
            }

            runPnpmScript(
              REPO_ROOT,
              'audit:engine',
              [],
              (auditError, auditResult) => {
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
                  })
                  return
                }

                sendJson(res, 200, {
                  success: true,
                  levelId,
                  cookedRuntimeAssets: true,
                  engineAudit: true,
                  terrainProducts: terrainPublishState.products,
                  message: terrainPublishState.bakedTerrainEnabled
                    ? 'Published with current terrain projection, baked collision, and cooked visual chunk products.'
                    : 'Published without baked terrain products; scene-authored ground is active.',
                  cookStdout: cookResult.stdout,
                  auditStdout: auditResult.stdout,
                })
              },
            )
          },
        )
      } catch (error) {
        console.error('Editor terrain contract publish error:', error)
        sendJson(res, 500, {
          success: false,
          message: `Ground/terrain contract publish failed: ${error.message}`,
        })
      }
    })
    return true
  }

  return false
}

module.exports = {
  handleTerrainRoutes,
}
