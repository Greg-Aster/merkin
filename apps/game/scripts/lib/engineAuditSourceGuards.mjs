import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const forbiddenLegacyStyleFiles = [
  'src/threlte/core/StyleManager.ts',
  'src/threlte/ui/StyleControls.svelte',
  'src/threlte/styles/GhibliStyleSystem.svelte',
  'src/threlte/styles/GhibliStyleSystem (legacy).svelte',
  'src/threlte/styles/RenderStyleSystem.svelte',
]

const forbiddenDuplicateInteractionFiles = [
  'src/threlte/systems/Interaction.svelte',
]

const retiredToolsEndpoints = [
  '/api/project-file',
  '/api/generate-heightmap',
  '/api/analyze-glb',
  '/api/process-level',
  '/api/generate-level',
  '/api/unified-pipeline',
  '/api/levels/scan',
  '/api/pure-level-stars',
  '/api/starmap/data',
  '/api/starmap/save',
  '/api/save-level-config',
  '/api/update-manifest',
  '/api/convert-cubemap',
  '/api/get-level-manifests',
]

const allowedDefaultCameraFiles = new Set([
  'src/threlte/features/player/Player.svelte',
  'src/threlte/editor/EditorViewportControls.svelte',
])
const allowedStyleBakeEndpointCallFiles = new Set([
  'src/threlte/editor/editorStyleApi.ts',
])
const allowedDirectLightMountFiles = new Set([
  'src/threlte/features/lighting/RuntimeLightingSystem.svelte',
  'src/threlte/features/lighting/RuntimeManagedPointLight.svelte',
  'src/threlte/editor/EditorWorkbenchLighting.svelte',
])
const runtimeNpcInteractionTargetFile =
  'src/threlte/features/npc/RuntimeNpcInteractionTarget.svelte'
const directLightMountPattern =
  /<T\.(AmbientLight|HemisphereLight|DirectionalLight|PointLight|SpotLight)\b/
const directLightConstructorPattern =
  /new\s+(AmbientLight|HemisphereLight|DirectionalLight|PointLight|SpotLight)\b/

function getSourceFiles(dir, prefix = '') {
  const files = []
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const relativePath = prefix ? `${prefix}/${entry}` : entry
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      files.push(...getSourceFiles(fullPath, relativePath))
    } else if (/\.(svelte|ts|js|mjs)$/.test(entry)) {
      files.push(relativePath)
    }
  }
  return files
}

export function auditSourceGuards({ appRoot, editorApiRoutePaths = [] }) {
  const failures = []
  const sourceSceneDir = join(appRoot, 'src/threlte/editor/scenes')

  for (const file of forbiddenLegacyStyleFiles) {
    if (existsSync(join(appRoot, file))) {
      failures.push(
        `${file}: legacy scene-traversal style system must stay removed; use runtimeVisualStyleStore and level style profiles`,
      )
    }
  }

  for (const file of forbiddenDuplicateInteractionFiles) {
    if (existsSync(join(appRoot, file))) {
      failures.push(
        `${file}: duplicate interaction system must stay removed; use systems/InteractionSystem.svelte`,
      )
    }
  }

  for (const file of getSourceFiles(
    join(appRoot, 'src/threlte'),
    'src/threlte',
  )) {
    const source = readFileSync(join(appRoot, file), 'utf8')
    if (
      source.includes('makeDefault') &&
      !allowedDefaultCameraFiles.has(file)
    ) {
      failures.push(
        `${file}: default scene cameras are only allowed in Player.svelte for gameplay and EditorViewportControls.svelte for editor orbit mode`,
      )
    }

    for (const endpoint of retiredToolsEndpoints) {
      if (source.includes(endpoint)) {
        failures.push(
          `${file}: retired tools endpoint ${endpoint} must not be called by the current editor/runtime`,
        )
      }
    }

    if (
      source.includes('/api/style/bake-procedural') &&
      !allowedStyleBakeEndpointCallFiles.has(file)
    ) {
      failures.push(
        `${file}: direct /api/style/bake-procedural calls must go through editorStyleBakeManager, not component-local or ad hoc fetch code`,
      )
    }

    if (
      (directLightMountPattern.test(source) ||
        directLightConstructorPattern.test(source)) &&
      !allowedDirectLightMountFiles.has(file)
    ) {
      failures.push(
        `${file}: runtime lights must be registered through ManagedLight/SceneLightingProfile and mounted only by the runtime lighting system`,
      )
    }

    if (
      file === runtimeNpcInteractionTargetFile &&
      source.includes('fireflyNpcPresentation')
    ) {
      failures.push(
        `${file}: generic NPC interaction targets must consume owner-provided transforms and must not import firefly presentation motion helpers`,
      )
    }
  }

  for (const routeSourcePath of editorApiRoutePaths) {
    if (existsSync(routeSourcePath)) {
      const editorApiSource = readFileSync(routeSourcePath, 'utf8')
      for (const endpoint of retiredToolsEndpoints) {
        if (editorApiSource.includes(`pathname === '${endpoint}'`)) {
          failures.push(
            `${routeSourcePath}: retired route handler ${endpoint} must stay deleted`,
          )
        }
      }
    }
  }

  if (existsSync(sourceSceneDir)) {
    for (const file of readdirSync(sourceSceneDir).sort()) {
      if (!file.endsWith('.scene.json')) continue
      const scenePath = join(sourceSceneDir, file)
      const scene = JSON.parse(readFileSync(scenePath, 'utf8'))
      if (scene && Object.prototype.hasOwnProperty.call(scene, 'engine')) {
        failures.push(
          `${file}: source scene documents must not persist generated engine.levelDefinition data; generate runtime engine data in memory or cooked manifests only`,
        )
      }
    }
  }

  return failures
}
