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

function stripGeneratedSceneRuntimeData(scene) {
  if (!scene || typeof scene !== 'object') return scene
  const { engine: _engine, ...authoringScene } = scene
  return authoringScene
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

const publishBuildStepCommands = {
  'bake-terrain-collision': levelId => [
    'bake:terrain-collision',
    '--',
    `--level=${levelId}`,
  ],
  'bake-scene-mesh-colliders': levelId => [
    'bake:scene-mesh-colliders',
    '--',
    `--level=${levelId}`,
  ],
  'cook-terrain-glb-chunks': levelId => [
    'cook:terrain-glb-chunks',
    '--',
    `--level=${levelId}`,
  ],
  'cook-world-partition': (levelId, step) => [
    'cook:world-partition',
    '--',
    `--level=${levelId}`,
    `--cell-size=${step.cellSize ?? 120}`,
    `--active-radius=${step.activeRadius ?? 1}`,
  ],
  'cook-runtime-assets': levelId => [
    'cook:runtime-assets',
    '--',
    `--level=${levelId}`,
  ],
  'audit-engine': () => ['audit:engine'],
}

function collectAuditBulletSection(output, heading) {
  const lines = String(output || '').split(/\r?\n/)
  const headingIndex = lines.findIndex(line => line.trim() === heading)
  if (headingIndex < 0) return []

  const issues = []
  let started = false
  for (const line of lines.slice(headingIndex + 1)) {
    const trimmed = line.trim()
    if (!trimmed || /^=+$/.test(trimmed)) continue
    if (trimmed.startsWith('- ')) {
      started = true
      issues.push(trimmed.slice(2))
      continue
    }
    if (started) break
  }
  return issues
}

function auditIssueMatchesLevel(issue, levelId) {
  const normalizedIssue = String(issue || '').toLowerCase()
  const normalizedLevel = String(levelId || '').toLowerCase()
  if (!normalizedLevel) return false

  return (
    normalizedIssue.startsWith(`${normalizedLevel}:`) ||
    normalizedIssue.startsWith(`${normalizedLevel}.`) ||
    normalizedIssue.startsWith(`${normalizedLevel}-`) ||
    normalizedIssue.includes(`/${normalizedLevel}/`) ||
    normalizedIssue.includes(`/${normalizedLevel}-`)
  )
}

function resolveScopedAuditResult({ levelId, stdout, stderr, exitCode }) {
  if (exitCode === 0) return null

  const output = `${stdout || ''}\n${stderr || ''}`
  const failures = collectAuditBulletSection(
    output,
    'Engine architecture audit failed',
  )
  const levelFailures = failures.filter(issue =>
    auditIssueMatchesLevel(issue, levelId),
  )

  if (levelFailures.length > 0) {
    return {
      success: false,
      levelFailures,
      message: levelFailures.join('\n'),
    }
  }

  return {
    success: true,
    levelFailures,
    message:
      failures.length > 0
        ? `audit-engine passed for ${levelId}; ${failures.length} unrelated repo-wide audit failure(s) remain.`
        : `audit-engine passed for ${levelId}.`,
  }
}

function assertSafeLevelId(levelId) {
  if (typeof levelId !== 'string' || !/^[a-z0-9][a-z0-9-]*$/i.test(levelId)) {
    throw new Error('levelId must be a safe level id')
  }
}

function normalizePublishBuildStep(step) {
  if (typeof step === 'string') return { id: step, required: true }
  if (step && typeof step === 'object' && typeof step.id === 'string') {
    return {
      ...step,
      required: step.required !== false,
    }
  }
  throw new Error('Publish build steps must be strings or step objects.')
}

function normalizePublishBuildPlan(plan) {
  const steps = Array.isArray(plan?.steps)
    ? plan.steps.map(normalizePublishBuildStep)
    : []
  if (steps.length === 0) {
    throw new Error('Publish build plan requires at least one step.')
  }

  const ids = new Set(steps.map(step => step.id))
  for (const step of steps) {
    if (step.id === 'save-scene' || step.id === 'deploy-registry') continue
    if (!publishBuildStepCommands[step.id]) {
      throw new Error(`Unsupported publish build step: ${step.id}`)
    }
  }
  if (!ids.has('cook-runtime-assets')) {
    throw new Error('Publish build plan must include cook-runtime-assets.')
  }
  if (!ids.has('audit-engine')) {
    throw new Error('Publish build plan must include audit-engine.')
  }

  return steps
}

function runPublishBuildStep({ levelId, repoRoot, spawnImpl = spawn, step }) {
  return new Promise(resolve => {
    assertSafeLevelId(levelId)

    if (step.id === 'save-scene') {
      resolve({
        id: step.id,
        success: true,
        skipped: true,
        stdout: '',
        stderr: '',
        message: 'Scene save is owned by the editor before publish build.',
      })
      return
    }

    if (step.id === 'deploy-registry') {
      resolve({
        id: step.id,
        success: true,
        skipped: true,
        stdout: '',
        stderr: '',
        message:
          'Registry deployment is owned by the editor after publish build success.',
      })
      return
    }

    const commandFactory = publishBuildStepCommands[step.id]
    const [scriptName, ...scriptArgs] = commandFactory(levelId, step)
    const child = spawnImpl(
      'pnpm',
      ['--dir', 'apps/game', scriptName, ...scriptArgs],
      {
        cwd: repoRoot,
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
      const parsed = parseLastJsonLine(stdout) || {}
      const sceneMeshColliderArtifacts = Array.isArray(parsed.reports)
        ? parsed.reports.flatMap(report =>
            Array.isArray(report.baked)
              ? report.baked.map(baked => baked.colliderUrl).filter(Boolean)
              : [],
          )
        : []
      const artifacts = [
        parsed.manifestPath,
        parsed.manifestUrl,
        parsed.chunksPath,
        parsed.collision?.url,
        parsed.collision?.metadataUrl,
        ...sceneMeshColliderArtifacts,
      ].filter(Boolean)
      const scopedAudit =
        step.id === 'audit-engine'
          ? resolveScopedAuditResult({
              levelId,
              stdout,
              stderr,
              exitCode: code,
            })
          : null
      const success = scopedAudit ? scopedAudit.success : code === 0
      resolve({
        id: step.id,
        success,
        exitCode: code,
        stdout,
        stderr,
        artifacts,
        scopedAudit,
        message:
          scopedAudit?.message ??
          (code === 0
            ? artifacts.length
              ? `${step.id} passed: ${artifacts.join(', ')}.`
              : `${step.id} passed.`
            : stderr || stdout || `${step.id} failed with exit code ${code}`),
      })
    })
    child.on('error', error => {
      resolve({
        id: step.id,
        success: false,
        exitCode: 1,
        stdout,
        stderr,
        message: `${step.id} process error: ${error.message}`,
      })
    })
  })
}

async function runPublishBuildPlan({
  levelId,
  plan,
  repoRoot,
  spawnImpl = spawn,
}) {
  assertSafeLevelId(levelId)
  const steps = normalizePublishBuildPlan(plan)
  const results = []

  for (const step of steps) {
    const result = await runPublishBuildStep({
      levelId,
      repoRoot,
      spawnImpl,
      step,
    })
    results.push(result)
    if (step.required !== false && !result.success) {
      return {
        success: false,
        levelId,
        failedStep: step.id,
        message: result.message,
        steps: results,
      }
    }
  }

  return {
    success: true,
    levelId,
    steps: results,
  }
}

function handleSceneRoutes(req, res, route, context) {
  const { pathname, parsedUrl } = route
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
  } = context

  if (pathname === '/api/editor-scene/load' && req.method === 'GET') {
    try {
      const levelId = parsedUrl.query.levelId
      const snapshotMode = parsedUrl.query.snapshot
      if (!levelId) {
        sendJson(res, 400, { success: false, message: 'levelId is required' })
        return true
      }

      const scenePath =
        snapshotMode === 'latest-backup'
          ? getLatestEditorSceneBackupPath(levelId)
          : snapshotMode === 'original-packaged'
            ? getOriginalEditorSceneSnapshotPath(levelId)
            : getEditorScenePath(levelId)

      if (
        (snapshotMode === 'latest-backup' ||
          snapshotMode === 'original-packaged') &&
        !scenePath
      ) {
        sendJson(res, 200, { success: true, scene: null, snapshotFile: null })
        return true
      }

      const resolvedScenePath = path.resolve(scenePath)
      const resolvedSceneRoot = path.resolve(EDITOR_SCENES_ROOT)
      const resolvedSnapshotRoot = path.resolve(EDITOR_SCENE_BACKUPS_ROOT)
      const sceneRootAllowed =
        resolvedScenePath === resolvedSceneRoot ||
        resolvedScenePath.startsWith(`${resolvedSceneRoot}${path.sep}`)
      const snapshotRootAllowed =
        resolvedScenePath === resolvedSnapshotRoot ||
        resolvedScenePath.startsWith(`${resolvedSnapshotRoot}${path.sep}`)

      if (!sceneRootAllowed && !snapshotRootAllowed) {
        sendJson(res, 403, { success: false, message: 'Access denied' })
        return true
      }

      if (!fs.existsSync(scenePath)) {
        sendJson(res, 200, { success: true, scene: null })
        return true
      }

      const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'))
      sendJson(res, 200, {
        success: true,
        scene,
        snapshotFile:
          snapshotMode === 'latest-backup' ||
          snapshotMode === 'original-packaged'
            ? path.basename(scenePath)
            : null,
      })
    } catch (error) {
      console.error('Editor scene load error:', error)
      sendJson(res, 500, {
        success: false,
        message: `Editor scene load failed: ${error.message}`,
      })
    }
    return true
  }

  if (pathname === '/api/level-registry' && req.method === 'GET') {
    try {
      sendJson(res, 200, { success: true, entries: readLevelRegistry() })
    } catch (error) {
      console.error('Level registry load error:', error)
      sendJson(res, 500, {
        success: false,
        message: `Level registry load failed: ${error.message}`,
      })
    }
    return true
  }

  if (pathname === '/api/level-registry' && req.method === 'POST') {
    readRequestBody(req, body => {
      try {
        const { entries } = JSON.parse(body)
        if (!Array.isArray(entries)) {
          sendJson(res, 400, {
            success: false,
            message: 'entries array is required',
          })
          return
        }

        writeLevelRegistry(entries)
        sendJson(res, 200, {
          success: true,
          path: toRepoRelative(LEVEL_REGISTRY_PATH),
        })
      } catch (error) {
        console.error('Level registry save error:', error)
        sendJson(res, 500, {
          success: false,
          message: `Level registry save failed: ${error.message}`,
        })
      }
    })
    return true
  }

  if (
    pathname === '/api/editor-scene/cook-runtime-assets' &&
    req.method === 'POST'
  ) {
    readRequestBody(req, body => {
      let levelId = ''
      try {
        const payload = body ? JSON.parse(body) : {}
        levelId = String(payload.levelId || '')
        if (!levelId) {
          throw new Error('levelId is required')
        }

        assertSafeLevelId(levelId)
        const child = (context.spawnImpl || spawn)(
          'pnpm',
          [
            '--dir',
            'apps/game',
            'cook:runtime-assets',
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

        child.on('error', error => {
          sendJson(res, 500, {
            success: false,
            levelId,
            message: `Runtime asset cook failed: ${error.message}`,
            stdout,
            stderr,
          })
        })

        child.on('close', code => {
          if (code !== 0) {
            sendJson(res, 500, {
              success: false,
              levelId,
              message:
                stderr ||
                stdout ||
                `Runtime asset cook failed with exit code ${code}`,
              stdout,
              stderr,
            })
            return
          }

          sendJson(res, 200, {
            success: true,
            levelId,
            message: `Cooked runtime scene manifests for ${levelId}.`,
            stdout,
            stderr,
          })
        })
      } catch (error) {
        console.error('Runtime asset cook request failed:', error)
        sendJson(res, 500, {
          success: false,
          levelId,
          message: `Runtime asset cook request failed: ${error.message}`,
        })
      }
    })
    return true
  }

  if (pathname === '/api/editor-scene/publish-build' && req.method === 'POST') {
    readRequestBody(req, body => {
      try {
        const payload = body ? JSON.parse(body) : {}
        const levelId = String(payload.levelId || '')
        void runPublishBuildPlan({
          levelId,
          plan: payload.plan,
          repoRoot: REPO_ROOT,
          spawnImpl: context.spawnImpl || spawn,
        })
          .then(result => {
            sendJson(res, result.success ? 200 : 500, result)
          })
          .catch(error => {
            sendJson(res, 400, {
              success: false,
              levelId,
              message: `Publish build request failed: ${error.message}`,
            })
          })
      } catch (error) {
        console.error('Publish build request failed:', error)
        sendJson(res, 400, {
          success: false,
          message: `Publish build request failed: ${error.message}`,
        })
      }
    })
    return true
  }

  if (pathname === '/api/editor-scene/audit-engine' && req.method === 'POST') {
    readRequestBody(req, body => {
      let levelId = 'current level'
      try {
        const payload = body ? JSON.parse(body) : {}
        if (payload.levelId) levelId = String(payload.levelId)

        void runPublishBuildStep({
          levelId,
          repoRoot: REPO_ROOT,
          spawnImpl: context.spawnImpl || spawn,
          step: { id: 'audit-engine', required: true },
        })
          .then(result => {
            sendJson(res, result.success ? 200 : 500, {
              success: result.success,
              levelId,
              message: result.message,
              stdout: result.stdout,
              stderr: result.stderr,
              auditStdout: result.stdout,
              auditStderr: result.stderr,
            })
          })
          .catch(error => {
            sendJson(res, 400, {
              success: false,
              levelId,
              message: `Engine audit request failed: ${error.message}`,
            })
          })
      } catch (error) {
        console.error('Engine audit request failed:', error)
        sendJson(res, 400, {
          success: false,
          levelId,
          message: `Engine audit request failed: ${error.message}`,
        })
      }
    })
    return true
  }

  if (pathname === '/api/editor/log' && req.method === 'POST') {
    readRequestBody(req, body => {
      try {
        const payload = body ? JSON.parse(body) : {}
        const source = String(payload?.source || 'editor')
        const message = String(payload?.message || '').trim()
        const detail = payload?.detail
        const suffix =
          detail === undefined
            ? ''
            : ` :: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`

        if (message) {
          console.log(`[${source}] ${message}${suffix}`)
        }

        sendJson(res, 200, { success: true })
      } catch (error) {
        sendJson(res, 400, {
          success: false,
          message: `Editor log parse failed: ${error.message}`,
        })
      }
    })
    return true
  }

  if (
    pathname === '/api/editor-scene/cook-world-partition' &&
    req.method === 'POST'
  ) {
    readRequestBody(req, body => {
      try {
        const {
          levelId,
          cellSize = 120,
          activeRadius = 1,
        } = JSON.parse(body || '{}')
        if (!levelId) {
          sendJson(res, 400, { success: false, message: 'levelId is required' })
          return
        }

        const child = spawn(
          'pnpm',
          [
            '--dir',
            'apps/game',
            'cook:world-partition',
            '--',
            `--level=${levelId}`,
            `--cell-size=${cellSize}`,
            `--active-radius=${activeRadius}`,
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
                `World partition cook failed with exit code ${code}`,
            })
            return
          }

          sendJson(res, 200, {
            success: true,
            ...(parseLastJsonLine(stdout) || {}),
            stdout,
          })
        })

        child.on('error', error => {
          sendJson(res, 500, {
            success: false,
            message: `World partition cook process error: ${error.message}`,
          })
        })
      } catch (error) {
        console.error('Editor world partition cook error:', error)
        sendJson(res, 500, {
          success: false,
          message: `World partition cook failed: ${error.message}`,
        })
      }
    })
    return true
  }

  if (pathname === '/api/editor-scene/save' && req.method === 'POST') {
    readRequestBody(req, body => {
      try {
        const { levelId, scene } = JSON.parse(body)
        if (!levelId || !scene) {
          sendJson(res, 400, {
            success: false,
            message: 'levelId and scene are required',
          })
          return
        }

        fs.mkdirSync(EDITOR_SCENES_ROOT, { recursive: true })
        const scenePath = path.join(EDITOR_SCENES_ROOT, `${levelId}.scene.json`)
        if (!scenePath.startsWith(EDITOR_SCENES_ROOT)) {
          sendJson(res, 403, { success: false, message: 'Access denied' })
          return
        }

        if (fs.existsSync(scenePath)) {
          try {
            const existingScene = JSON.parse(fs.readFileSync(scenePath, 'utf8'))
            if (
              !hasMeaningfulSceneContent(scene) &&
              hasMeaningfulSceneContent(existingScene)
            ) {
              sendJson(res, 409, {
                success: false,
                message: `Refusing to overwrite populated scene "${levelId}" with empty content.`,
              })
              return
            }
          } catch (readError) {
            console.warn(
              'Unable to validate existing scene before save:',
              readError,
            )
          }
        }

        fs.writeFileSync(
          scenePath,
          JSON.stringify(stripGeneratedSceneRuntimeData(scene), null, 2),
          'utf8',
        )
        sendJson(res, 200, {
          success: true,
          path: toRepoRelative(scenePath),
        })
      } catch (error) {
        console.error('Editor scene save error:', error)
        sendJson(res, 500, {
          success: false,
          message: `Editor scene save failed: ${error.message}`,
        })
      }
    })
    return true
  }

  return false
}

module.exports = {
  handleSceneRoutes,
  normalizePublishBuildPlan,
  runPublishBuildPlan,
  runPublishBuildStep,
}
