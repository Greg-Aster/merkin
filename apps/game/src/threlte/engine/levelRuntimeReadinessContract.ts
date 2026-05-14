import {
  createLevelRuntimeReadinessContract as createLevelRuntimeReadinessContractCore,
  evaluateLevelRuntimeActivation as evaluateLevelRuntimeActivationCore,
  getActorRuntimeAssetUrl as getActorRuntimeAssetUrlCore,
} from './levelRuntimeReadinessContractCore.mjs'
import { getRuntimePrefabAssetUrl } from './runtimePrefabRegistry'
import type {
  ActorDefinition,
  LevelDefinition,
  LevelRuntimeActivationState,
  LevelRuntimeActivationStatus,
  LevelRuntimeReadinessContract,
} from './types'

export interface LevelRuntimeReadinessContractOptions {
  requiredInitialCellKeys?: string[] | null
  worldPartitionReadiness?: {
    requiredInitialCellKeys?: string[] | null
  } | null
  worldPartition?: {
    readiness?: {
      requiredInitialCellKeys?: string[] | null
    } | null
  } | null
}

const prefabResolver = {
  resolvePrefabAssetUrl: getRuntimePrefabAssetUrl,
}

export function getActorRuntimeAssetUrl(actor: ActorDefinition): string {
  return getActorRuntimeAssetUrlCore(actor, prefabResolver)
}

export function createLevelRuntimeReadinessContract(
  level: LevelDefinition,
  options: LevelRuntimeReadinessContractOptions = {},
): LevelRuntimeReadinessContract {
  return createLevelRuntimeReadinessContractCore(level, {
    ...options,
    ...prefabResolver,
  })
}

export function evaluateLevelRuntimeActivation(
  contract: LevelRuntimeReadinessContract,
  state: LevelRuntimeActivationState = {},
): LevelRuntimeActivationStatus {
  return evaluateLevelRuntimeActivationCore(contract, state)
}
