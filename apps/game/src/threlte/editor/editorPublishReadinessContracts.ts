import type {
  AssetLocalBounds,
  AssetLocalTransformMetadata,
} from '../engine/assetLocalTransform'
import type { RuntimeAssetManifest } from '../engine/runtimeAssetManifest'
import type { TerrainSourceContract } from '../features/terrain/TerrainManager'
import type { EditorTerrainSourceAssetStatus } from './editorTerrainPipeline'
import type { EditorSceneDocument } from './editorTypes'

export type MeshColliderBakeMetadata = {
  schemaVersion?: number
  generatedAt?: string
  sourceActorId?: string
  sourceAssetUrl?: string
  sourceAssetFingerprint?: {
    algorithm?: string
    value?: string
  }
  colliderUrl?: string
  metadataUrl?: string
  triangleCount?: number
  vertexCount?: number
  visualLocalBounds?: AssetLocalBounds | null
  colliderLocalBounds?: AssetLocalBounds | null
  bounds?: AssetLocalBounds | null
  assetLocalTransform?: AssetLocalTransformMetadata | null
  provenance?: {
    sourceActorId?: string
    sourceAssetUrl?: string
    sourceAssetFingerprint?: {
      algorithm?: string
      value?: string
    }
    bakeConfig?: Record<string, unknown>
    generatedAt?: string
  }
}

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
  runtime?: {
    mode?: 'scene-authored' | 'heightfield-terrain' | 'glb-chunk-terrain'
    visualSource?:
      | 'scene-actors'
      | 'heightmap-surface'
      | 'generated-heightmap-chunks'
      | 'source-glb-chunks'
      | 'none'
    fallbackSurfacePolicy?:
      | 'disabled'
      | 'debug-only'
      | 'until-required-chunks-ready'
      | 'always'
  }
  assets?: {
    heightmap?: string
    chunksPath?: string
    sourceGlb?: string
    sourceAssetUrl?: string
    sourceAssetHash?: string
    sourceAssetFingerprint?: {
      algorithm?: string
      value?: string
    }
  }
  source?: {
    assetUrl?: string
    assetHash?: string
    assetFingerprint?: {
      algorithm?: string
      value?: string
    }
  }
  collision?: {
    terrain?: {
      url?: string
      metadataUrl?: string
      triangleCount?: number
      vertexCount?: number
      colliderResolution?: number
      sourceContract?: TerrainSourceContract
    }
    product?: Record<string, unknown>
  }
  visualChunks?: {
    chunkCount?: number
    sourceContract?: TerrainSourceContract
    source?: 'generated-heightmap' | 'source-glb'
    preservesSourceUvs?: boolean
    preservesSourceMaterialSlots?: boolean
    product?: {
      type?: 'heightfield-terrain' | 'glb-chunk-terrain'
      chunksPath?: string
      chunkCount?: number
      sourceAssetUrl?: string
      sourceHash?: string
      preservesSourceUvs?: boolean
      preservesSourceMaterialSlots?: boolean
      textureReferencesPreserved?: boolean
    }
    activation?: {
      maxActiveChunks?: number
      maxActiveChunksByTier?: Record<string, number>
    }
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

export type EditorPublishBakeStep =
  | 'save-scene'
  | 'generate-heightmap'
  | 'bake-terrain-collision'
  | 'cook-terrain-chunks'
  | 'cook-terrain-glb-chunks'
  | 'cook-world-partition'
  | 'cook-runtime-assets'
  | 'audit-engine'
  | 'deploy-registry'

export type EditorPublishBakeStepState =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'skipped'

export interface EditorPublishBakePlan {
  levelId: string
  steps: EditorPublishBakeStep[]
  reasons: Record<EditorPublishBakeStep, string[]>
  blockers: string[]
  warnings: string[]
}

export interface EditorPublishBakeStepResult {
  id: EditorPublishBakeStep
  state: EditorPublishBakeStepState
  message: string
  stdout?: string
  stderr?: string
  artifacts?: string[]
}

export interface EditorPublishPipelineSummary {
  levelId: string
  title: string
  stepsRun: EditorPublishBakeStep[]
  artifacts: string[]
  registryDeployed: boolean
}

export interface EditorPublishPipelineState {
  running: boolean
  plan: EditorPublishBakePlan | null
  stepResults: Partial<
    Record<EditorPublishBakeStep, EditorPublishBakeStepResult>
  >
  summary: EditorPublishPipelineSummary | null
  error: string
  startedAt: string
  finishedAt: string
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
  terrainSourceAssets?: EditorTerrainSourceAssetStatus[]
  missingTerrainSourceAssets?: EditorTerrainSourceAssetStatus[]
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

export function createInitialEditorPublishPipelineState(): EditorPublishPipelineState {
  return {
    running: false,
    plan: null,
    stepResults: {},
    summary: null,
    error: '',
    startedAt: '',
    finishedAt: '',
  }
}
