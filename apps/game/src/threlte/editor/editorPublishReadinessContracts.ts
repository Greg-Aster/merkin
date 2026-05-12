import type { RuntimeAssetManifest } from '../engine/runtimeAssetManifest'
import type { EditorSceneDocument } from './editorTypes'

export type RuntimeAssetCookManifest = RuntimeAssetManifest & {
  generatedAt?: string
  summary?: {
    requiredAssetCount?: number
    optionalAssetCount?: number
    runtimeSceneManifestCount?: number
  }
  runtimeScenes?: Record<
    string,
    {
      url?: string
      requiredAssetCount?: number
      runtimeAssetCount?: number
      buildErrors?: string[]
      buildWarnings?: string[]
    }
  >
}

export type RuntimePrefabManifest = {
  generatedAt?: string
  summary?: {
    prefabCount?: number
    triangleCount?: number
    sizeBytes?: number
  }
  prefabs?: Array<{
    type?: string
    variant?: string | null
    url?: string
    triangleCount?: number
    sizeBytes?: number
  }>
}

export type TerrainManifest = {
  id?: string
  assets?: {
    heightmap?: string
    chunksPath?: string
  }
  collision?: {
    terrain?: {
      url?: string
      metadataUrl?: string
      triangleCount?: number
      vertexCount?: number
      colliderResolution?: number
    }
  }
  visualChunks?: {
    chunkCount?: number
    lods?: Array<{ level?: number; distance?: number; resolution?: number }>
  }
}

export type LoadedManifest<T> = {
  value: T | null
  error: string
}

export type EditorPublishReadinessSeverity = 'ready' | 'warning' | 'blocker'

export interface EditorPublishReadinessItem {
  id: string
  label: string
  severity: EditorPublishReadinessSeverity
  detail: string
}

export interface EditorPublishReadinessCommand {
  id: string
  command: string
  reason: string
}

export interface EditorPublishReadinessPanel {
  id: string
  label: string
  severity: EditorPublishReadinessSeverity
  items: EditorPublishReadinessItem[]
}

export interface EditorPublishWorkflowStep {
  id: string
  label: string
  command: string
  expectedOutput: string
  reason: string
  required: boolean
}

export interface EditorPublishReadinessMetric {
  label: string
  value: string
  budget?: string
  overBudget?: boolean
}

export interface EditorPublishReadinessViewModel {
  levelId: string
  status: EditorPublishReadinessSeverity
  headline: string
  buildId: string
  generatedAt: string
  blockers: EditorPublishReadinessItem[]
  warnings: EditorPublishReadinessItem[]
  sections: EditorPublishReadinessItem[]
  panels: EditorPublishReadinessPanel[]
  metrics: EditorPublishReadinessMetric[]
  commands: EditorPublishReadinessCommand[]
  workflow: EditorPublishWorkflowStep[]
}

export interface LoadEditorPublishReadinessInput {
  levelId: string
  scene: EditorSceneDocument | null
  fetchImpl?: typeof fetch
}

export function createEmptyEditorPublishReadinessViewModel(
  levelId: string,
): EditorPublishReadinessViewModel {
  return {
    levelId,
    status: 'blocker',
    headline: 'Publish blocked',
    buildId: '',
    generatedAt: '',
    blockers: [],
    warnings: [],
    sections: [],
    panels: [],
    metrics: [],
    commands: [],
    workflow: [],
  }
}
