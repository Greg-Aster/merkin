export type RuntimeEnginePillarId =
  | 'animationGraph'
  | 'navigation'
  | 'saveLoad'
  | 'inputBindings'
  | 'spatialAudio'
  | 'scriptingEvents'
  | 'runtimeProfiling'

export type RuntimeEnginePillarStatus =
  | 'contract-stub'
  | 'vertical-slice'
  | 'runtime-backed'

export interface RuntimeEnginePillarContract {
  id: RuntimeEnginePillarId
  label: string
  status: RuntimeEnginePillarStatus
  runtimeOwner: string
  contractSurface: readonly string[]
  validationSurface: readonly string[]
  nextSlice: string
}

export const RUNTIME_ENGINE_PILLAR_CONTRACTS = [
  {
    id: 'animationGraph',
    label: 'Animation Graph',
    status: 'contract-stub',
    runtimeOwner: 'runtime prefab animation descriptors',
    contractSurface: [
      'asset animation descriptor channels',
      'state graph transitions',
      'runtime animation controller lifecycle',
    ],
    validationSurface: ['runtime prefab bake audit', 'type-check'],
    nextSlice:
      'Promote existing prefab animation descriptors into named graph states for one animated prop.',
  },
  {
    id: 'navigation',
    label: 'Navigation And Pathfinding',
    status: 'contract-stub',
    runtimeOwner: 'level manifest navigation data plus movement policy',
    contractSurface: [
      'walkable navigation regions',
      'off-mesh links',
      'agent radius and slope constraints',
    ],
    validationSurface: ['level manifest audit', 'terrain collision audit'],
    nextSlice:
      'Bake a small nav region for one level and route a non-player actor through it.',
  },
  {
    id: 'saveLoad',
    label: 'Save And Load',
    status: 'contract-stub',
    runtimeOwner: 'game state stores and level state serialization',
    contractSurface: [
      'save slot metadata',
      'level id and spawn state',
      'player inventory and interaction flags',
    ],
    validationSurface: ['type-check', 'save snapshot smoke'],
    nextSlice:
      'Serialize current level, player transform, and visited levels into a versioned local save slot.',
  },
  {
    id: 'inputBindings',
    label: 'Input Rebinding',
    status: 'vertical-slice',
    runtimeOwner:
      'runtime input binding contract and player controller adapter',
    contractSurface: [
      'action descriptors',
      'keyboard binding snapshot',
      'settings rebinding UI',
    ],
    validationSurface: ['engine pillar audit', 'type-check'],
    nextSlice:
      'Extend the same contract to gamepad button remapping and conflict prompts.',
  },
  {
    id: 'spatialAudio',
    label: 'Spatial Audio',
    status: 'contract-stub',
    runtimeOwner: 'shared audio system and runtime audio emitters',
    contractSurface: [
      'audio emitter descriptors',
      'listener binding',
      'attenuation and region metadata',
    ],
    validationSurface: ['audio manifest audit', 'boot smoke'],
    nextSlice:
      'Move one ambient emitter from component-local behavior to a manifest-backed descriptor.',
  },
  {
    id: 'scriptingEvents',
    label: 'Scripting And Events',
    status: 'contract-stub',
    runtimeOwner: 'validated event bus and gameplay adapters',
    contractSurface: [
      'typed event ids',
      'payload schemas',
      'manifest-authored trigger bindings',
    ],
    validationSurface: ['scene manifest audit', 'type-check'],
    nextSlice:
      'Define one manifest-authored trigger that dispatches a typed gameplay event.',
  },
  {
    id: 'runtimeProfiling',
    label: 'Runtime Debug And Profiling',
    status: 'contract-stub',
    runtimeOwner: 'runtime diagnostics and performance stores',
    contractSurface: [
      'diagnostic records',
      'system timing samples',
      'runtime budget summaries',
    ],
    validationSurface: ['performance baseline', 'engine audit'],
    nextSlice:
      'Expose per-system timing budgets in the runtime diagnostics panel.',
  },
] as const satisfies readonly RuntimeEnginePillarContract[]
