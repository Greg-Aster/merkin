const fs = require('fs')
const path = require('path')
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
  const heightfieldTerrain =
    terrainRuntimeMode === 'heightfield-terrain' ||
    ground?.terrainRuntimeMode === 'heightfield-terrain'
  const sceneAuthoredTerrain =
    terrainRuntimeMode === 'scene-authored' ||
    ground?.terrainRuntimeMode === 'scene-authored' ||
    ground?.collisionSource === 'scene-colliders'
  const bakedTerrainEnabled =
    !sceneAuthoredTerrain &&
    !glbChunkTerrain &&
    (heightfieldTerrain ||
      terrain?.source === 'baked-heightmap' ||
      terrain?.runtimeSource === 'generated-heightmap' ||
      terrain?.runtimeSource === 'editor-manifest' ||
      ground?.collisionSource === 'baked-heightfield')
  const chunksStale =
    Boolean(terrain?.lastGeneratedAt) &&
    (!terrain?.lastChunksGeneratedAt ||
      isIsoDateBefore(terrain.lastChunksGeneratedAt, terrain.lastGeneratedAt))
  const staleReasons = [
    terrain?.heightmapDirty
      ? 'terrain source basket changed after the last generated heightmap'
      : '',
    terrain?.dirty ? 'terrain collision is marked dirty' : '',
    bakedTerrainEnabled && !terrain?.colliderUrl
      ? 'baked terrain collision artifact is missing'
      : '',
    bakedTerrainEnabled && !terrain?.metadataUrl
      ? 'baked terrain collision metadata is missing'
      : '',
    bakedTerrainEnabled && chunksStale
      ? 'terrain visual chunks are older than the current heightmap/collision state'
      : '',
  ].filter(Boolean)

  return {
    bakedTerrainEnabled,
    staleReasons,
    products: {
      heightmapUrl: terrain?.heightmapUrl ?? '',
      colliderUrl: terrain?.colliderUrl ?? '',
      metadataUrl: terrain?.metadataUrl ?? '',
      chunksPath: terrain?.chunksPath ?? '',
      lastGeneratedAt: terrain?.lastGeneratedAt ?? '',
      lastChunksGeneratedAt: terrain?.lastChunksGeneratedAt ?? '',
      heightmapDirty: Boolean(terrain?.heightmapDirty),
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

  if (
    pathname === '/api/editor-terrain/generate-heightmap' &&
    req.method === 'POST'
  ) {
    readRequestBody(req, body => {
      try {
        const {
          levelId,
          nodeId,
          sourceAssetUrl,
          sources,
          resolution = 512,
          bakeCollision = true,
        } = JSON.parse(body || '{}')

        if (!levelId) {
          sendJson(res, 400, { success: false, message: 'levelId is required' })
          return
        }

        const scenePath = getEditorScenePath(levelId)
        const scene = fs.existsSync(scenePath) ? readJsonFile(scenePath) : null
        const manifestPath = ensureTerrainManifestForLevel(levelId, scene)
        const sourceNode =
          nodeId && scene?.nodes
            ? scene.nodes.find(node => node.id === nodeId)
            : null
        const resolvedSourceUrl = sourceAssetUrl || sourceNode?.asset?.url || ''
        const sceneSourceList = getTerrainSourceDescriptorsFromScene(scene)
        const sourceList = Array.isArray(sources) && sources.length > 0
          ? sources
          : sceneSourceList

        if (!resolvedSourceUrl && sourceList.length === 0) {
          sendJson(res, 400, {
            success: false,
            message:
              'Select an asset, primitive, or group before generating a terrain heightmap.',
          })
          return
        }

        const assetSources =
          sourceList.length > 0
            ? sourceList.filter(source => source?.sourceAssetUrl)
            : [{ sourceAssetUrl: resolvedSourceUrl }]
        for (const source of assetSources) {
          const sourcePath = resolvePublicAssetPath(source.sourceAssetUrl)
          if (!fs.existsSync(sourcePath)) {
            sendJson(res, 400, {
              success: false,
              message: `Source mesh not found: ${source.sourceAssetUrl}`,
            })
            return
          }
        }

        const sourcePath = resolvedSourceUrl
          ? resolvePublicAssetPath(resolvedSourceUrl)
          : ''
        if (resolvedSourceUrl && !fs.existsSync(sourcePath)) {
          sendJson(res, 400, {
            success: false,
            message: `Source mesh not found: ${resolvedSourceUrl}`,
          })
          return
        }

        const args = [
          '--dir',
          'apps/game',
          'generate:terrain-heightmap',
          '--',
          `--level=${levelId}`,
          `--resolution=${resolution}`,
        ]
        if (sourceList.length > 0) {
          args.push(`--sources=${JSON.stringify(sourceList)}`)
        } else {
          args.push(
            `--source=${resolvedSourceUrl}`,
            `--sourceName=${sourceNode?.name || path.basename(sourcePath)}`,
            `--position=${JSON.stringify(sourceNode?.position || [0, 0, 0])}`,
            `--rotation=${JSON.stringify(sourceNode?.rotation || [0, 0, 0])}`,
            `--scale=${JSON.stringify(sourceNode?.scale || [1, 1, 1])}`,
          )
        }

        const child = spawn('pnpm', args, {
          cwd: REPO_ROOT,
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
          if (code !== 0) {
            sendJson(res, 500, {
              success: false,
              message:
                stderr ||
                stdout ||
                `Terrain heightmap generation failed with exit code ${code}`,
            })
            return
          }

          const generated = parseLastJsonLine(stdout)

          const finish = (collisionPayload = null) => {
            sendJson(res, 200, {
              success: true,
              ...generated,
              collision: collisionPayload?.collision ?? null,
              collisionMetadata: collisionPayload?.metadata ?? null,
              stdout,
            })
          }

          if (!bakeCollision) {
            finish()
            return
          }

          const bakeChild = spawn(
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

          let bakeStdout = ''
          let bakeStderr = ''
          bakeChild.stdout.on('data', chunk => {
            bakeStdout += chunk.toString()
          })
          bakeChild.stderr.on('data', chunk => {
            bakeStderr += chunk.toString()
          })
          bakeChild.on('close', bakeCode => {
            if (bakeCode !== 0) {
              sendJson(res, 500, {
                success: false,
                message:
                  bakeStderr ||
                  bakeStdout ||
                  `Terrain collision bake failed with exit code ${bakeCode}`,
                heightmap: generated,
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
              finish({
                collision: manifest.collision?.terrain ?? null,
                metadata,
              })
            } catch (readError) {
              sendJson(res, 500, {
                success: false,
                message: `Heightmap generated and collision baked, but reading metadata failed: ${readError.message}`,
                heightmap: generated,
              })
            }
          })
          bakeChild.on('error', error => {
            sendJson(res, 500, {
              success: false,
              message: `Collision bake process error: ${error.message}`,
              heightmap: generated,
            })
          })
        })

        child.on('error', error => {
          sendJson(res, 500, {
            success: false,
            message: `Heightmap generation process error: ${error.message}`,
          })
        })
      } catch (error) {
        console.error('Editor terrain heightmap generation error:', error)
        sendJson(res, 500, {
          success: false,
          message: `Terrain heightmap generation failed: ${error.message}`,
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
            message: `Level "${levelId}" does not use the baked heightmap terrain workflow.`,
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
          lodResolutions = '33,17,9',
          mode = '',
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
        const scenePath = getEditorScenePath(levelId)
        const scene = fs.existsSync(scenePath) ? readJsonFile(scenePath) : null
        const useSourceGlbCook =
          mode === 'glb-chunk-terrain' ||
          mode === 'source-glb-chunks' ||
          sceneUsesSourceGlbTerrain(scene)
        const scriptName = useSourceGlbCook
          ? 'cook:terrain-glb-chunks'
          : 'cook:terrain-chunks'
        const cookArgs = [
          '--dir',
          'apps/game',
          scriptName,
          '--',
          `--level=${levelId}`,
          `--grid=${grid}`,
        ]
        if (!useSourceGlbCook) {
          cookArgs.push(`--lod-resolutions=${lodResolutions}`)
        }

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
                    ? 'Published with current terrain heightmap, baked collision, and cooked visual chunk products.'
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
