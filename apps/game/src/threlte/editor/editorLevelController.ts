import { EDITOR_API_BASE } from '@config/editorApi'
import { get } from 'svelte/store'
import { withEditorSceneEngineData } from '../engine/sceneDocumentRuntime'
import type {
  LevelLifecycleStatus,
  LevelRegistryEntry,
} from '../levels/levelRegistry'
import { createDefaultSceneForLevel } from './defaultScenes'
import { assertValidEditorSceneDocument } from './editorSceneDocumentValidation'
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
    metadataSourceKind: 'component' | 'scene'
    metadataSourceComponentKey: 'observatory' | 'solitude'
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
}

export function createEditorLevelController(deps: EditorLevelControllerDeps) {
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

    return assertValidEditorSceneDocument(
      withEditorSceneEngineData({
        ...clonedScene,
        levelId: targetLevelId,
        updatedAt: new Date().toISOString(),
      }),
      'Scene disk save',
    )
  }

  function hasMeaningfulSceneContent(scene: any) {
    if (!scene) return false
    if (Array.isArray(scene.nodes) && scene.nodes.length > 0) return true
    if (
      scene.settings &&
      typeof scene.settings === 'object' &&
      Object.keys(scene.settings).length > 0
    )
      return true
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

    return {
      id: targetLevelId,
      title: nextTitle,
      status: state.metadataStatus,
      deployed: state.metadataDeployed,
      aliases: existingEntry?.aliases ?? [],
      source:
        state.metadataSourceKind === 'component'
          ? {
              kind: 'component',
              componentKey: state.metadataSourceComponentKey,
            }
          : { kind: 'scene', sceneId: targetLevelId },
      starMap: {
        enabled: state.metadataStarMapEnabled,
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

  function saveScene() {
    const saved = deps.saveSceneToLocalStorage(deps.getActiveSceneLevelId())
    deps.setSaveMessage(saved ? `Saved ${saved.updatedAt}` : 'Save failed')
  }

  async function overwriteLevelScene() {
    const scene = get(deps.getEditorSceneStore())
    if (!scene) {
      deps.setSaveMessage('Nothing to overwrite')
      return
    }

    try {
      const nextEntry = buildMetadataEntry(deps.getActiveSceneLevelId())
      await saveSceneDocumentToDisk(deps.getActiveSceneLevelId(), scene)
      await persistLevelRegistryEntries(replaceRegistryEntry(nextEntry))
      deps.setSaveMessage(`Overwrote level ${nextEntry.title}`)
    } catch (error) {
      console.error('Overwrite level failed:', error)
      deps.setSaveMessage('Overwrite failed')
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
    saveAsNewLevel,
    createNewLevel,
    saveLevelMetadata,
    copySceneJson,
    applyImport,
  }
}
