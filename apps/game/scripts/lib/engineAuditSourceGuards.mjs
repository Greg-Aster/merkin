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
const forbiddenRuntimeFireflyPopulationFiles = [
  'src/threlte/levels/SceneFireflyField.svelte',
]

const retiredToolsEndpoints = [
  '/api/project-file',
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
const editorPanelTabsFile = 'src/threlte/editor/editorPanelTabs.ts'
const editorPanelFile = 'src/threlte/editor/EditorPanel.svelte'
const editorEnvironmentPanelFile =
  'src/threlte/editor/EditorEnvironmentPanel.svelte'
const editorFireflyFieldControlsFile =
  'src/threlte/editor/EditorFireflyFieldControls.svelte'
const editorNpcTabHostFile = 'src/threlte/editor/EditorNpcTabHost.svelte'
const runtimeLightingSystemFile =
  'src/threlte/features/lighting/RuntimeLightingSystem.svelte'
const runtimeSceneBudgetFile =
  'src/threlte/features/performance/utils/runtimeSceneBudget.ts'
const runtimeFireflyNpcFile =
  'src/threlte/features/npc/presentation/RuntimeFireflyNpc.svelte'
const directLightMountPattern =
  /<T\.(AmbientLight|HemisphereLight|DirectionalLight|PointLight|SpotLight)\b/
const directLightConstructorPattern =
  /new\s+(AmbientLight|HemisphereLight|DirectionalLight|PointLight|SpotLight)\b/
const requiredAmbientFireflyFields = [
  'enabled',
  'allowWithAuthored',
  'count',
  'activeLightPercent',
  'radius',
  'minHeight',
  'maxHeight',
  'center',
  'color',
  'secondaryColor',
  'palette',
  'size',
  'twinkleSpeed',
  'driftSpeed',
  'sway',
  'lighting',
]
const requiredAmbientFireflyLightingFields = [
  'spriteIntensity',
  'lightIntensity',
  'lightDistance',
  'lightDecay',
  'minimumLightIntensityScale',
  'lightBudgeted',
  'selectionHoldSeconds',
  'selectionFadeSeconds',
  'pulseThreshold',
  'pulseSoftness',
  'blinkPeriodSecondsMin',
  'blinkPeriodSecondsMax',
  'blinkFadeSeconds',
]
const legacyFireflyNpcLightingFields = [
  'spriteIntensity',
  'lightIntensity',
  'lightDistance',
  'lightDecay',
  'lightBudgeted',
]

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function getSourceBlock(source, marker) {
  const start = source.indexOf(marker)
  if (start < 0) return ''
  const nextExport = source.indexOf('\nexport ', start + marker.length)
  return source.slice(start, nextExport < 0 ? undefined : nextExport)
}

function getSelfClosingComponentBlocks(source, componentName) {
  return Array.from(
    source.matchAll(new RegExp(`<${componentName}\\b[\\s\\S]*?\\/>`, 'g')),
    match => match[0],
  )
}

function getRuntimeFireflyNpcRenderContractFailures(file, source) {
  const failures = []
  const spriteBlocks = getSelfClosingComponentBlocks(source, 'StarSprite')
  const lightBlocks = getSelfClosingComponentBlocks(source, 'ManagedLight')

  if (
    spriteBlocks.length === 0 ||
    spriteBlocks.some(block => !block.includes('starType="sparkle"'))
  ) {
    failures.push(
      `${file}: firefly NPC sprites must render StarSprite with explicit starType="sparkle" so they do not fall back to random square/cropped sprite defaults`,
    )
  }

  if (
    spriteBlocks.length === 0 ||
    lightBlocks.length === 0 ||
    spriteBlocks.some(block => !block.includes('color={spriteColor}')) ||
    lightBlocks.some(block => !block.includes('color={spriteColor}'))
  ) {
    failures.push(
      `${file}: firefly NPC StarSprite and ManagedLight color props must both use spriteColor so visual tint and emitted light stay coupled`,
    )
  }

  if (
    !/\bgetFireflyPulse\b/.test(source) ||
    !/\bminimumLightIntensityScale\b/.test(source) ||
    !/\bpulseThreshold\b/.test(source) ||
    !/\bpulseSoftness\b/.test(source) ||
    !/\bgetLightIntensity\(\s*presentation\s*,\s*lightPulse\s*,\s*blinkScale\s*,?\s*\)/.test(
      source,
    )
  ) {
    failures.push(
      `${file}: firefly NPC lights must pulse through shared firefly lighting settings so ambient and authored fireflies blink slowly through the same contract`,
    )
  }

  if (
    !/\bshouldRenderLight\b/.test(source) ||
    !/\blightIntensity\s*>\s*0\.001\b/.test(source) ||
    !/\blightDistance\s*>\s*0\.001\b/.test(source)
  ) {
    failures.push(
      `${file}: firefly NPC lights must not mount ManagedLight while the blink duty cycle has driven light intensity or distance to zero`,
    )
  }

  return failures
}

function getImplicitFireflyFailures(file, scene) {
  const features = scene?.settings?.level?.features
  if (features?.fireflies !== true) return []

  const fireflies = scene?.settings?.level?.fireflies
  if (!isRecord(fireflies)) {
    return [
      `${file}: settings.level.features.fireflies is true but settings.level.fireflies is missing; author an explicit fireflies block or disable the feature`,
    ]
  }

  const failures = []
  if (fireflies.enabled !== true) {
    failures.push(
      `${file}: settings.level.features.fireflies is true but settings.level.fireflies.enabled is not true`,
    )
  }

  const missingFireflyFields = requiredAmbientFireflyFields.filter(
    key => !hasOwn(fireflies, key),
  )
  if (missingFireflyFields.length > 0) {
    failures.push(
      `${file}: settings.level.fireflies must explicitly define ${missingFireflyFields.join(', ')} so the ambient field does not rely on hidden defaults`,
    )
  }

  const lighting = fireflies.lighting
  if (!isRecord(lighting)) {
    failures.push(
      `${file}: settings.level.fireflies.lighting must be explicit when the ambient field is enabled`,
    )
  } else {
    const missingLightingFields = requiredAmbientFireflyLightingFields.filter(
      key => !hasOwn(lighting, key),
    )
    if (missingLightingFields.length > 0) {
      failures.push(
        `${file}: settings.level.fireflies.lighting must explicitly define ${missingLightingFields.join(', ')} so firefly lights do not rely on hidden defaults`,
      )
    }
  }

  return failures
}

function getLegacyFireflyNpcLightingFailures(file, nodes) {
  if (!Array.isArray(nodes)) return []

  const failures = []
  for (const node of nodes) {
    const presentation = node?.npc?.presentation
    if (
      node?.npc?.archetype !== 'firefly' &&
      presentation?.type !== 'firefly'
    ) {
      continue
    }

    const legacyFields = legacyFireflyNpcLightingFields.filter(key =>
      hasOwn(presentation ?? {}, key),
    )
    if (legacyFields.length > 0) {
      failures.push(
        `${file}: firefly NPC actor "${node.id ?? '<unknown>'}" uses retired per-NPC light fields ${legacyFields.join(', ')}; migrate shared light metadata to settings.level.fireflies.lighting`,
      )
    }
  }

  return failures
}

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

  for (const file of forbiddenRuntimeFireflyPopulationFiles) {
    if (existsSync(join(appRoot, file))) {
      failures.push(
        `${file}: generated firefly populations must be manifest-backed NPC actors; do not reintroduce component-local firefly field spawning`,
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

    if (file === runtimeFireflyNpcFile) {
      failures.push(...getRuntimeFireflyNpcRenderContractFailures(file, source))
    }

    if (
      file === runtimeLightingSystemFile &&
      /\bresolveMutedPointEmitter\b/.test(source)
    ) {
      failures.push(
        `${file}: runtime lighting must not mount inactive point lights; omit unselected budgeted emitters instead of returning muted emitters`,
      )
    }

    if (file === runtimeSceneBudgetFile) {
      const pointLightBudgetBlock = getSourceBlock(
        source,
        'export interface RuntimePointLightBudget',
      )
      const pointLightVisibilityBlock = getSourceBlock(
        source,
        'export function resolveRuntimePointLightVisibility',
      )
      if (/\bcullDistance\b/.test(pointLightBudgetBlock)) {
        failures.push(
          `${file}: RuntimePointLightBudget must not expose hidden point-light player-distance caps; budget by count and authored range`,
        )
      }
      if (
        /\bdistanceTo(Camera|Player)\b|\bcullDistance\b/.test(
          pointLightVisibilityBlock,
        )
      ) {
        failures.push(
          `${file}: resolveRuntimePointLightVisibility must not reintroduce point-light player-distance culling`,
        )
      }
    }

    if (file === editorPanelTabsFile && !/\|\s*'npc'/.test(source)) {
      failures.push(
        `${file}: dedicated NPC editor tab must stay in the editor tab contract`,
      )
    }

    if (
      file === editorPanelFile &&
      (!source.includes('EditorNpcTabHost') ||
        !source.includes("activeEditorTab === 'npc'") ||
        !existsSync(join(appRoot, editorNpcTabHostFile)))
    ) {
      failures.push(
        `${file}: dedicated NPC editor workspace must render EditorNpcTabHost behind the npc tab`,
      )
    }

    if (
      file === editorEnvironmentPanelFile &&
      source.includes("['fireflies'")
    ) {
      failures.push(
        `${file}: firefly field controls belong in the NPC editor workspace, not the World/Environment panel`,
      )
    }

    if (
      file === editorFireflyFieldControlsFile &&
      (source.includes("['fireflies', 'lightCount']") ||
        source.includes("'lightCount'") ||
        /\bLight Count\b/.test(source))
    ) {
      failures.push(
        `${file}: firefly editor must expose activeLightPercent controls instead of lightCount controls`,
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

      const lighting = scene?.settings?.level?.lighting
      if (
        lighting &&
        !Object.prototype.hasOwnProperty.call(lighting, 'hemisphereIntensity')
      ) {
        failures.push(
          `${file}: settings.level.lighting.hemisphereIntensity must be explicit so scene sky light does not rely on hidden SceneLightingProfile defaults`,
        )
      }

      failures.push(...getImplicitFireflyFailures(file, scene))
      failures.push(...getLegacyFireflyNpcLightingFailures(file, scene?.nodes))
    }
  }

  return failures
}
