export interface LevelRuntimeContract {
  levelId: string
  requiredActorIds: string[]
  requiredAssetActorIds: string[]
  requiredWalkableActorIds: string[]
  maxDefaultCollisionActors: number
  maxTrimeshActors: number
  maxRuntimeAssetCount: number
}

const DEFAULT_RUNTIME_CONTRACT: LevelRuntimeContract = {
  levelId: '*',
  requiredActorIds: [],
  requiredAssetActorIds: [],
  requiredWalkableActorIds: [],
  maxDefaultCollisionActors: 0,
  maxTrimeshActors: 0,
  maxRuntimeAssetCount: 60,
}

const LEVEL_RUNTIME_CONTRACTS: Record<string, Partial<LevelRuntimeContract>> = {
  observatory: {
    requiredActorIds: ['observatory-terrain', 'observatory-player-spawn'],
    requiredAssetActorIds: [],
    requiredWalkableActorIds: ['observatory-terrain'],
    maxDefaultCollisionActors: 0,
    maxTrimeshActors: 0,
    maxRuntimeAssetCount: 0,
  },
  solitude: {
    requiredActorIds: ['solitude-terrain', 'solitude-player-spawn'],
    requiredAssetActorIds: [],
    requiredWalkableActorIds: ['solitude-terrain'],
    maxDefaultCollisionActors: 0,
    maxTrimeshActors: 0,
    maxRuntimeAssetCount: 24,
  },
  yggdrasil: {
    requiredActorIds: [
      'yggdrasil-ground',
      'yggdrasil-spawn-pad',
      'yggdrasil-tree-merged',
    ],
    requiredAssetActorIds: ['yggdrasil-tree-merged'],
    requiredWalkableActorIds: ['yggdrasil-ground', 'yggdrasil-spawn-pad'],
    maxDefaultCollisionActors: 0,
    maxTrimeshActors: 0,
    maxRuntimeAssetCount: 24,
  },
}

export function getLevelRuntimeContract(levelId: string): LevelRuntimeContract {
  const normalizedLevelId = levelId.trim().toLowerCase()
  const contract = LEVEL_RUNTIME_CONTRACTS[normalizedLevelId] ?? {}

  return {
    ...DEFAULT_RUNTIME_CONTRACT,
    ...contract,
    levelId: normalizedLevelId || DEFAULT_RUNTIME_CONTRACT.levelId,
  }
}
