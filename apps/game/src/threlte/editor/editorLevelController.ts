import { EDITOR_API_BASE } from '@config/editorApi'
import { get } from 'svelte/store'
import { withEditorSceneEngineData } from '../engine/sceneDocumentRuntime'
import type {
  LevelLifecycleStatus,
  LevelRegistryEntry,
} from '../levels/levelRegistry'
import { createDefaultSceneForLevel } from './defaultScenes'
import { stripEditorSceneRuntimeData } from './editorPersistence'
import {
  EDITOR_PUBLISH_BAKE_STEP_LABELS,
  computeEditorPublishBakePlan,
  createEditorPublishBakePlanMetadataFromReadiness,
} from './editorPublishBakePlan'
import {
  type EditorPublishBakePlan,
  type EditorPublishBakeStep,
  type EditorPublishBakeStepResult,
  type EditorPublishPipelineState,
  createInitialEditorPublishPipelineState,
} from './editorPublishReadinessContracts'
import { loadEditorPublishReadiness } from './editorPublishReadinessDataSource'
import {
  assertPublishableEditorSceneDocument,
  assertValidEditorSceneDocument,
} from './editorSceneDocumentValidation'
import type { EditorSceneDocument } from './editorTypes'

interface EditorLevelControllerDeps {
  getEditorSceneStore: () => any
  getLevelId: () => string
  getActiveSceneLevelId: () => string
  getLevelRegistryEntries: () => LevelRegistryEntry[]
  getMetadataState: () => {
    metadataTitle: string
    metadataStatus: LevelLifecycleStatus
    metadataDeployed: boolean
    metadataStarMapEnabled: boolean
    metadataStarMapYear: number
    metadataStarMapDescription: string
    metadataSourceKind: 'scene'
    saveAsTitle: string
    saveAsLevelId: string
    newLevelTitle: string
    newLevelIdInput: string
    newLevelTemplateId: string
    importBuffer: string
  }
  setMetadataState: (
    next: Partial<ReturnType<EditorLevelControllerDeps['getMetadataState']>>,
  ) => void
  setSaveMessage: (message: string) => void
  setLevelRegistry: (entries: LevelRegistryEntry[]) => void
  sanitizeLevelId: (value: string) => string
  saveEditorSceneToLocalStorage: (levelId: string, scene: any) => any
  saveSceneToLocalStorage: (levelId: string) => any
  exportSceneJson: () => string
  importSceneJson: (value: string) => void
  clearSelection: () => void
  transitionToLevel: (levelId: string) => void
  createEmptyScene: (levelId: string) => any
  setEditorScene: (scene: any) => void
  setPublishPipelineState?: (state: EditorPublishPipelineState) => void
}

export function createEditorLevelController(deps: EditorLevelControllerDeps) {
  let publishPipelineState = createInitialEditorPublishPipelineState()

  function clonePublishPipelineState() {
    return {
      ...publishPipelineState,
      stepResults: { ...publishPipelineState.stepResults },
      summary: publishPipelineState.summary
        ? {
            ...publishPipelineState.summary,
            stepsRun: [...publishPipelineState.summary.stepsRun],
            artifacts: [...publishPipelineState.summary.artifacts],
          }
        : null,
    }
  }

  function setPublishPipelineState(next: EditorPublishPipelineState) {
    publishPipelineState = next
    deps.setPublishPipelineState?.(clonePublishPipelineState())
  }

  function startPublishPipeline(plan: EditorPublishBakePlan) {
    setPublishPipelineState({
      running: true,
      plan,
      stepResults: Object.fromEntries(
        plan.steps.map(step => [
          step,
          {
            id: step,
            state: 'pending',
            message: `${EDITOR_PUBLISH_BAKE_STEP_LABELS[step]} queued.`,
          } satisfies EditorPublishBakeStepResult,
        ]),
      ) as EditorPublishPipelineState['stepResults'],
      summary: null,
      error: '',
      startedAt: new Date().toISOString(),
      finishedAt: '',
    })
  }

  function updatePublishStep(
    step: EditorPublishBakeStep,
    result: Omit<EditorPublishBakeStepResult, 'id'>,
  ) {
    setPublishPipelineState({
      ...publishPipelineState,
      stepResults: {
        ...publishPipelineState.stepResults,
        [step]: {
          id: step,
          ...result,
        },
      },
    })
  }

  function finishPublishPipeline(error = '') {
    setPublishPipelineState({
      ...publishPipelineState,
      running: false,
      error,
      finishedAt: new Date().toISOString(),
    })
  }

  async function refreshLevelRegistryFromDisk() {
    try {
      const response = await fetch(`${EDITOR_API_BASE}/api/level-registry`)
      const payload = await response.json()
      if (payload?.success && Array.isArray(payload.entries)) {
        deps.setLevelRegistry(payload.entries)
      }
    } catch (error) {
      console.warn(
        'Level registry disk load unavailable, using in-memory registry.',
        error,
      )
    }
  }

  async function persistLevelRegistryEntries(entries: LevelRegistryEntry[]) {
    deps.setLevelRegistry(entries)

    try {
      const response = await fetch(`${EDITOR_API_BASE}/api/level-registry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      })
      const payload = await response.json()
      if (!payload?.success) {
        throw new Error(payload?.message ?? 'Registry save failed')
      }
    } catch (error) {
      console.error('Level registry save failed:', error)
      deps.setSaveMessage('Registry save failed locally')
      throw error
    }
  }

  function createScenePayload(
    targetLevelId: string,
    sourceScene = get(deps.getEditorSceneStore()) ??
      createDefaultSceneForLevel(targetLevelId) ??
      deps.createEmptyScene(targetLevelId),
  ) {
    const clonedScene = structuredClone(sourceScene) as EditorSceneDocument

    return stripEditorSceneRuntimeData(
      assertValidEditorSceneDocument(
        withEditorSceneEngineData({
          ...clonedScene,
          levelId: targetLevelId,
          updatedAt: new Date().toISOString(),
        }),
        'Scene disk save',
      ),
    )
  }

  function hasMeaningfulSceneContent(scene: any) {
    if (!scene) return false
    if (Array.isArray(scene.nodes) && scene.nodes.length > 0) return true
    return false
  }

  function replaceRegistryEntry(nextEntry: LevelRegistryEntry) {
    const remainingEntries = deps
      .getLevelRegistryEntries()
      .filter(entry => entry.id !== nextEntry.id)
    return [...remainingEntries, nextEntry].sort((left, right) =>
      left.title.localeCompare(right.title),
    )
  }

  function buildMetadataEntry(targetLevelId: string): LevelRegistryEntry {
    const state = deps.getMetadataState()
    const existingEntry = deps
      .getLevelRegistryEntries()
      .find(entry => entry.id === targetLevelId)
    const nextTitle =
      state.metadataTitle.trim() || existingEntry?.title || targetLevelId
    const published =
      state.metadataStatus === 'active' && state.metadataDeployed

    return {
      id: targetLevelId,
      title: nextTitle,
      status: state.metadataStatus,
      deployed: published,
      aliases: existingEntry?.aliases ?? [],
      source: { kind: 'scene', sceneId: targetLevelId },
      starMap: {
        enabled: published && state.metadataStarMapEnabled,
        year: Number.isFinite(Number(state.metadataStarMapYear))
          ? Number(state.metadataStarMapYear)
          : 2100,
        era: existingEntry?.starMap?.era ?? 'unknown',
        description:
          state.metadataStarMapDescription.trim() || `Enter ${nextTitle}`,
      },
    }
  }

  async function saveSceneDocumentToDisk(
    targetLevelId: string,
    sourceScene = get(deps.getEditorSceneStore()),
  ) {
    if (!sourceScene) {
      throw new Error(
        'Cannot save scene to disk because no scene document is loaded.',
      )
    }

    const payloadScene = createScenePayload(targetLevelId, sourceScene)

    if (!hasMeaningfulSceneContent(payloadScene)) {
      throw new Error('Refusing to save an empty scene document to disk.')
    }

    deps.saveEditorSceneToLocalStorage(targetLevelId, payloadScene)

    const response = await fetch(`${EDITOR_API_BASE}/api/editor-scene/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ levelId: targetLevelId, scene: payloadScene }),
    })
    const payload = await response.json()
    if (!payload?.success) {
      throw new Error(payload?.message ?? 'Disk save failed')
    }
    return payload
  }

  async function cookRuntimeSceneManifests(targetLevelId: string) {
    const response = await fetch(
      `${EDITOR_API_BASE}/api/editor-scene/cook-runtime-assets`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelId: targetLevelId }),
      },
    )
    const payload = await response.json()
    if (!payload?.success) {
      throw new Error(payload?.message ?? 'Runtime manifest cook failed')
    }
    return payload
  }

  function getPayloadArtifacts(payload: any) {
    return [
      payload?.path,
      payload?.manifestPath,
      payload?.manifestUrl,
      payload?.partitionUrl,
      payload?.chunksPath,
      payload?.collision?.url,
      payload?.collision?.metadataUrl,
      payload?.runtimeAssetManifestUrl,
      ...(Array.isArray(payload?.artifacts) ? payload.artifacts : []),
    ].filter((artifact): artifact is string => Boolean(artifact))
  }

  async function postPublishStep(
    step: EditorPublishBakeStep,
    url: string,
    body: Record<string, unknown>,
  ) {
    updatePublishStep(step, {
      state: 'running',
      message: `${EDITOR_PUBLISH_BAKE_STEP_LABELS[step]} running.`,
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = await response.json()
    const stdout = String(
      payload?.stdout ?? payload?.auditStdout ?? payload?.cookStdout ?? '',
    )
    const stderr = String(
      payload?.stderr ?? payload?.auditStderr ?? payload?.cookStderr ?? '',
    )

    if (!response.ok || !payload?.success) {
      const message =
        payload?.message ??
        `${EDITOR_PUBLISH_BAKE_STEP_LABELS[step]} failed with ${response.status}`
      updatePublishStep(step, {
        state: 'failed',
        message,
        stdout,
        stderr,
        artifacts: getPayloadArtifacts(payload),
      })
      throw new Error(message)
    }

    updatePublishStep(step, {
      state: 'passed',
      message:
        payload?.message ?? `${EDITOR_PUBLISH_BAKE_STEP_LABELS[step]} passed.`,
      stdout,
      stderr,
      artifacts: getPayloadArtifacts(payload),
    })
    return payload
  }

  function getBackendPublishSteps(plan: EditorPublishBakePlan) {
    return plan.steps.filter(
      step =>
        step !== 'save-scene' &&
        step !== 'generate-heightmap' &&
        step !== 'deploy-registry',
    )
  }

  async function runPublishBuildEndpoint(
    plan: EditorPublishBakePlan,
    targetLevelId: string,
  ) {
    const backendSteps = getBackendPublishSteps(plan)
    for (const step of backendSteps) {
      updatePublishStep(step, {
        state: 'running',
        message: `${EDITOR_PUBLISH_BAKE_STEP_LABELS[step]} queued in publish build.`,
      })
    }

    const response = await fetch(
      `${EDITOR_API_BASE}/api/editor-scene/publish-build`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          levelId: targetLevelId,
          plan: {
            ...plan,
            steps: backendSteps,
          },
        }),
      },
    )
    const payload = await response.json()
    const stepResults = (
      Array.isArray(payload?.steps) ? payload.steps : []
    ) as Array<{
      id?: EditorPublishBakeStep
      success?: boolean
      message?: string
      stdout?: string
      stderr?: string
      artifacts?: string[]
    }>

    for (const result of stepResults) {
      const step = result?.id as EditorPublishBakeStep | undefined
      if (!step || step === 'save-scene' || step === 'deploy-registry') {
        continue
      }

      updatePublishStep(step, {
        state: result.success ? 'passed' : 'failed',
        message:
          result.message ??
          `${EDITOR_PUBLISH_BAKE_STEP_LABELS[step]} ${result.success ? 'passed' : 'failed'}.`,
        stdout: String(result.stdout ?? ''),
        stderr: String(result.stderr ?? ''),
        artifacts: getPayloadArtifacts(result),
      })
    }

    if (!response.ok || !payload?.success) {
      const failedStep = payload?.failedStep as
        | EditorPublishBakeStep
        | undefined
      const message =
        payload?.message ??
        (failedStep
          ? `${EDITOR_PUBLISH_BAKE_STEP_LABELS[failedStep]} failed.`
          : 'Publish build failed.')

      if (
        failedStep &&
        failedStep !== 'save-scene' &&
        failedStep !== 'deploy-registry' &&
        !stepResults.some(result => result?.id === failedStep)
      ) {
        updatePublishStep(failedStep, {
          state: 'failed',
          message,
        })
      }

      throw new Error(message)
    }

    return payload
  }

  async function runPublishBakeStep(
    step: EditorPublishBakeStep,
    targetLevelId: string,
    scene: EditorSceneDocument,
  ) {
    if (step === 'save-scene') {
      updatePublishStep(step, {
        state: 'running',
        message: 'Saving the authoring scene before runtime publish.',
      })
      try {
        const payload = await saveSceneDocumentToDisk(targetLevelId, scene)
        updatePublishStep(step, {
          state: 'passed',
          message: 'Scene saved to disk. Runtime publish has not deployed yet.',
          artifacts: getPayloadArtifacts(payload),
        })
        return payload
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Scene save failed'
        updatePublishStep(step, {
          state: 'failed',
          message,
        })
        throw error
      }
    }

    if (step === 'bake-terrain-collision') {
      return postPublishStep(
        step,
        `${EDITOR_API_BASE}/api/editor-terrain/bake-collision`,
        { levelId: targetLevelId },
      )
    }

    if (step === 'generate-heightmap') {
      return postPublishStep(
        step,
        `${EDITOR_API_BASE}/api/editor-terrain/generate-heightmap`,
        { levelId: targetLevelId, bakeCollision: false },
      )
    }

    if (step === 'cook-terrain-chunks') {
      return postPublishStep(
        step,
        `${EDITOR_API_BASE}/api/editor-terrain/cook-chunks`,
        { levelId: targetLevelId },
      )
    }

    if (step === 'cook-world-partition') {
      return postPublishStep(
        step,
        `${EDITOR_API_BASE}/api/editor-scene/cook-world-partition`,
        { levelId: targetLevelId },
      )
    }

    if (step === 'cook-runtime-assets') {
      return postPublishStep(
        step,
        `${EDITOR_API_BASE}/api/editor-scene/cook-runtime-assets`,
        { levelId: targetLevelId },
      )
    }

    if (step === 'audit-engine') {
      return postPublishStep(
        step,
        `${EDITOR_API_BASE}/api/editor-scene/audit-engine`,
        { levelId: targetLevelId },
      )
    }

    return null
  }

  function saveScene() {
    const saved = deps.saveSceneToLocalStorage(deps.getActiveSceneLevelId())
    deps.setSaveMessage(saved ? `Saved ${saved.updatedAt}` : 'Save failed')
  }

  async function overwriteLevelScene() {
    const scene = get(deps.getEditorSceneStore()) as EditorSceneDocument | null
    if (!scene) {
      deps.setSaveMessage('Nothing to overwrite')
      return
    }

    try {
      const nextEntry = buildMetadataEntry(deps.getActiveSceneLevelId())
      const targetLevelId = deps.getActiveSceneLevelId()
      await saveSceneDocumentToDisk(targetLevelId, scene)
      deps.setSaveMessage(`Saved ${nextEntry.title}; cooking runtime manifest`)
      await cookRuntimeSceneManifests(targetLevelId)
      await persistLevelRegistryEntries(replaceRegistryEntry(nextEntry))
      deps.setSaveMessage(
        `Saved ${nextEntry.title} and cooked runtime manifest`,
      )
    } catch (error) {
      console.error('Overwrite level failed:', error)
      const message =
        error instanceof Error ? error.message : 'Save and cook failed'
      deps.setSaveMessage(`Save failed: ${message}`)
    }
  }

  async function publishLevel() {
    if (publishPipelineState.running) {
      deps.setSaveMessage('Publish is already running')
      return
    }

    const scene = get(deps.getEditorSceneStore()) as EditorSceneDocument | null
    if (!scene) {
      deps.setSaveMessage('Nothing to publish')
      return
    }

    try {
      const targetLevelId = deps.getActiveSceneLevelId()
      const state = deps.getMetadataState()
      const existingEntry = deps
        .getLevelRegistryEntries()
        .find(entry => entry.id === targetLevelId)
      const title =
        state.metadataTitle.trim() || existingEntry?.title || targetLevelId
      deps.setSaveMessage(`Checking publish readiness for ${title}`)
      const readiness = await loadEditorPublishReadiness({
        levelId: targetLevelId,
        scene,
      })
      const bakePlan = computeEditorPublishBakePlan({
        levelId: targetLevelId,
        scene,
        metadata: createEditorPublishBakePlanMetadataFromReadiness(readiness),
      })
      const publishBlocker = bakePlan.blockers[0]
      if (publishBlocker) {
        throw new Error(publishBlocker)
      }
      assertPublishableEditorSceneDocument(
        {
          ...scene,
          levelId: targetLevelId,
        },
        'Publish',
      )

      startPublishPipeline(bakePlan)

      const nextEntry: LevelRegistryEntry = {
        id: targetLevelId,
        title,
        status: 'active',
        deployed: true,
        aliases: existingEntry?.aliases ?? [],
        source: { kind: 'scene', sceneId: targetLevelId },
        starMap: {
          enabled: true,
          year: Number.isFinite(Number(state.metadataStarMapYear))
            ? Number(state.metadataStarMapYear)
            : existingEntry?.starMap?.year ?? 2100,
          era: existingEntry?.starMap?.era ?? 'unknown',
          description:
            state.metadataStarMapDescription.trim() ||
            existingEntry?.starMap?.description ||
            `Enter ${title}`,
        },
      }

      if (bakePlan.steps.includes('save-scene')) {
        deps.setSaveMessage(
          `Publishing ${title}: ${EDITOR_PUBLISH_BAKE_STEP_LABELS['save-scene']}`,
        )
        await runPublishBakeStep('save-scene', targetLevelId, scene)
      }

      if (bakePlan.steps.includes('generate-heightmap')) {
        deps.setSaveMessage(
          `Publishing ${title}: ${EDITOR_PUBLISH_BAKE_STEP_LABELS['generate-heightmap']}`,
        )
        await runPublishBakeStep('generate-heightmap', targetLevelId, scene)
      }

      deps.setSaveMessage(`Publishing ${title}: running publish build`)
      await runPublishBuildEndpoint(bakePlan, targetLevelId)

      updatePublishStep('deploy-registry', {
        state: 'running',
        message: 'Deploying registry entry after successful build and audit.',
      })
      try {
        await persistLevelRegistryEntries(replaceRegistryEntry(nextEntry))
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Registry deploy failed'
        updatePublishStep('deploy-registry', {
          state: 'failed',
          message,
        })
        throw error
      }
      updatePublishStep('deploy-registry', {
        state: 'passed',
        message: `${title} is active and deployed in the level registry.`,
        artifacts: ['apps/game/src/threlte/levels/level-registry.json'],
      })
      deps.setMetadataState({
        metadataStatus: 'active',
        metadataDeployed: true,
        metadataStarMapEnabled: true,
      })
      setPublishPipelineState({
        ...publishPipelineState,
        summary: {
          levelId: targetLevelId,
          title,
          stepsRun: bakePlan.steps,
          artifacts: Array.from(
            new Set(
              Object.values(publishPipelineState.stepResults).flatMap(
                result => result?.artifacts ?? [],
              ),
            ),
          ),
          registryDeployed: true,
        },
      })
      finishPublishPipeline()
      deps.setSaveMessage(`Published ${title}: runtime deployed`)
    } catch (error) {
      console.error('Publish level failed:', error)
      const message = error instanceof Error ? error.message : 'Publish failed'
      finishPublishPipeline(message)
      deps.setSaveMessage(`Publish failed: ${message}`)
    }
  }

  async function markLevelDraft() {
    try {
      const targetLevelId = deps.getActiveSceneLevelId()
      const state = deps.getMetadataState()
      const existingEntry = deps
        .getLevelRegistryEntries()
        .find(entry => entry.id === targetLevelId)
      const title =
        state.metadataTitle.trim() || existingEntry?.title || targetLevelId
      const nextEntry: LevelRegistryEntry = {
        id: targetLevelId,
        title,
        status: 'draft',
        deployed: false,
        aliases: existingEntry?.aliases ?? [],
        source: { kind: 'scene', sceneId: targetLevelId },
        starMap: {
          enabled: false,
          year: Number.isFinite(Number(state.metadataStarMapYear))
            ? Number(state.metadataStarMapYear)
            : existingEntry?.starMap?.year ?? 2100,
          era: existingEntry?.starMap?.era ?? 'unknown',
          description:
            state.metadataStarMapDescription.trim() ||
            existingEntry?.starMap?.description ||
            `Enter ${title}`,
        },
      }

      await persistLevelRegistryEntries(replaceRegistryEntry(nextEntry))
      deps.setMetadataState({
        metadataStatus: 'draft',
        metadataDeployed: false,
        metadataStarMapEnabled: false,
      })
      deps.setSaveMessage(`Marked ${title} as draft`)
    } catch (error) {
      console.error('Mark draft failed:', error)
      deps.setSaveMessage('Mark draft failed')
    }
  }

  async function saveAsNewLevel() {
    const state = deps.getMetadataState()
    const targetLevelId = deps.sanitizeLevelId(state.saveAsLevelId)
    const title =
      state.saveAsTitle.trim() || state.metadataTitle.trim() || targetLevelId

    if (!targetLevelId) {
      deps.setSaveMessage('Enter a level ID for Save As')
      return
    }

    if (
      deps.getLevelRegistryEntries().some(entry => entry.id === targetLevelId)
    ) {
      deps.setSaveMessage('That level ID already exists')
      return
    }

    const scene = get(deps.getEditorSceneStore())
    if (!scene) {
      deps.setSaveMessage('Nothing to save as a new level')
      return
    }

    const nextEntry: LevelRegistryEntry = {
      id: targetLevelId,
      title,
      status: 'draft',
      deployed: false,
      aliases: [],
      source: { kind: 'scene', sceneId: targetLevelId },
      starMap: {
        enabled: false,
        year: Number(state.metadataStarMapYear) || 2100,
        era: 'unknown',
        description: `Enter ${title}`,
      },
    }

    try {
      await saveSceneDocumentToDisk(targetLevelId, scene)
      await persistLevelRegistryEntries(replaceRegistryEntry(nextEntry))
      deps.setSaveMessage(`Saved new level ${title}`)
      deps.setMetadataState({ saveAsLevelId: '', saveAsTitle: '' })
      deps.clearSelection()
      deps.transitionToLevel(targetLevelId)
    } catch (error) {
      console.error('Save As new level failed:', error)
      deps.setSaveMessage('Save As failed')
    }
  }

  async function createNewLevel() {
    const state = deps.getMetadataState()
    const targetLevelId = deps.sanitizeLevelId(state.newLevelIdInput)
    const title = state.newLevelTitle.trim() || targetLevelId

    if (!targetLevelId) {
      deps.setSaveMessage('Enter a level ID')
      return
    }

    if (
      deps.getLevelRegistryEntries().some(entry => entry.id === targetLevelId)
    ) {
      deps.setSaveMessage('That level ID already exists')
      return
    }

    const templateScene =
      state.newLevelTemplateId === deps.getActiveSceneLevelId()
        ? get(deps.getEditorSceneStore()) ??
          createDefaultSceneForLevel(state.newLevelTemplateId) ??
          deps.createEmptyScene(state.newLevelTemplateId)
        : createDefaultSceneForLevel(state.newLevelTemplateId) ??
          deps.createEmptyScene(state.newLevelTemplateId)
    const scenePayload = createScenePayload(targetLevelId, templateScene)
    const nextEntry: LevelRegistryEntry = {
      id: targetLevelId,
      title,
      status: 'draft',
      deployed: false,
      aliases: [],
      source: { kind: 'scene', sceneId: targetLevelId },
      starMap: {
        enabled: false,
        year: 2100,
        era: 'unknown',
        description: `Enter ${title}`,
      },
    }

    try {
      await saveSceneDocumentToDisk(targetLevelId, scenePayload)
      await persistLevelRegistryEntries(replaceRegistryEntry(nextEntry))
      deps.setMetadataState({
        newLevelTitle: '',
        newLevelIdInput: '',
        newLevelTemplateId: targetLevelId,
      })
      deps.setSaveMessage(`Created level ${title}`)
      deps.clearSelection()
      deps.transitionToLevel(targetLevelId)
    } catch (error) {
      console.error('Create level failed:', error)
      deps.setSaveMessage('Create level failed')
    }
  }

  async function saveLevelMetadata() {
    try {
      const nextEntry = buildMetadataEntry(deps.getActiveSceneLevelId())
      await persistLevelRegistryEntries(replaceRegistryEntry(nextEntry))
      deps.setSaveMessage(`Updated ${nextEntry.title} metadata`)
    } catch (error) {
      console.error('Save level metadata failed:', error)
      deps.setSaveMessage('Metadata save failed')
    }
  }

  function copySceneJson() {
    navigator.clipboard.writeText(deps.exportSceneJson())
    deps.setSaveMessage('Scene JSON copied')
  }

  function applyImport() {
    const { importBuffer } = deps.getMetadataState()
    if (!importBuffer.trim()) return
    deps.importSceneJson(importBuffer)
    deps.setSaveMessage('Scene JSON imported')
  }

  return {
    refreshLevelRegistryFromDisk,
    saveSceneDocumentToDisk,
    saveScene,
    overwriteLevelScene,
    publishLevel,
    markLevelDraft,
    saveAsNewLevel,
    createNewLevel,
    saveLevelMetadata,
    copySceneJson,
    applyImport,
  }
}
