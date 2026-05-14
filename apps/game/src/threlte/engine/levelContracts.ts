import { getLevelRuntimeContract as getLevelRuntimeContractCore } from './levelContractsCore.mjs'

export interface LevelRuntimeContract {
  levelId: string
  requiredActorIds: string[]
  requiredAssetActorIds: string[]
  requiredWalkableActorIds: string[]
  maxDefaultCollisionActors: number
  maxTrimeshActors: number
  maxRuntimeAssetCount: number
  maxPrimitiveActorCount: number
  maxNeverCullActorCount: number
  maxGameplayFireflyCount: number
}

export function getLevelRuntimeContract(levelId: string): LevelRuntimeContract {
  return getLevelRuntimeContractCore(levelId)
}
