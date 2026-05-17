const DEFAULT_RUNTIME_CONTRACT = {
  levelId: '*',
  requiredActorIds: [],
  requiredRenderActorIds: [],
  requiredWalkableActorIds: [],
  maxDefaultCollisionActors: 0,
  maxTrimeshActors: 32,
  maxRuntimeAssetCount: 60,
  maxPrimitiveActorCount: 80,
  maxNeverCullActorCount: 4,
  maxFireflyNpcCount: 40,
}

const LEVEL_RUNTIME_CONTRACTS = {
  observatory: {
    requiredActorIds: ['observatory-terrain', 'observatory-player-spawn'],
    requiredRenderActorIds: [],
    requiredWalkableActorIds: ['observatory-terrain'],
    maxDefaultCollisionActors: 0,
    maxTrimeshActors: 0,
    maxRuntimeAssetCount: 0,
    maxPrimitiveActorCount: 8,
    maxFireflyNpcCount: 8,
  },
  solitude: {
    requiredActorIds: [
      'solitude-ground-plateau',
      'solitude-ground-dais',
      'solitude-player-spawn',
    ],
    requiredRenderActorIds: [],
    requiredWalkableActorIds: [
      'solitude-ground-plateau',
      'solitude-ground-dais',
    ],
    maxDefaultCollisionActors: 0,
    maxTrimeshActors: 16,
    maxRuntimeAssetCount: 24,
    maxPrimitiveActorCount: 16,
    maxFireflyNpcCount: 16,
  },
  'sci-fi-room': {
    requiredActorIds: [
      'sci-fi-floor-interior-slab',
      'sci-fi-floor-courtyard-slab',
      'sci-fi-floor-wasteland-tile-4-4',
      'sci-fi-room-player-spawn',
    ],
    requiredWalkableActorIds: [
      'sci-fi-floor-interior-slab',
      'sci-fi-floor-courtyard-slab',
      'sci-fi-floor-wasteland-tile-4-4',
    ],
    maxDefaultCollisionActors: 0,
    maxTrimeshActors: 38,
    maxRuntimeAssetCount: 32,
    maxPrimitiveActorCount: 24,
    maxFireflyNpcCount: 0,
  },
  yggdrasil: {
    requiredActorIds: [
      'yggdrasil-ground',
      'yggdrasil-spawn-pad',
      'yggdrasil-tree-merged',
    ],
    requiredRenderActorIds: ['yggdrasil-tree-merged'],
    requiredWalkableActorIds: [
      'yggdrasil-ground',
      'yggdrasil-island-shelf',
      'yggdrasil-dais',
      'yggdrasil-bifrost-path',
      'yggdrasil-spawn-pad',
    ],
    maxDefaultCollisionActors: 0,
    maxTrimeshActors: 48,
    maxRuntimeAssetCount: 48,
    maxPrimitiveActorCount: 80,
    maxNeverCullActorCount: 4,
    maxFireflyNpcCount: 40,
  },
}

export function getLevelRuntimeContract(levelId) {
  const normalizedLevelId = String(levelId ?? '')
    .trim()
    .toLowerCase()
  const contract = LEVEL_RUNTIME_CONTRACTS[normalizedLevelId] ?? {}

  return {
    ...DEFAULT_RUNTIME_CONTRACT,
    ...contract,
    levelId: normalizedLevelId || DEFAULT_RUNTIME_CONTRACT.levelId,
  }
}
