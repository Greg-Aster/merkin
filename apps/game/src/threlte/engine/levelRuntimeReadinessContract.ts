import {
  LEVEL_RUNTIME_ACTIVATION_GATE_IDS as LEVEL_RUNTIME_ACTIVATION_GATE_IDS_CORE,
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

export const LEVEL_RUNTIME_ACTIVATION_GATE_IDS: readonly string[] =
  LEVEL_RUNTIME_ACTIVATION_GATE_IDS_CORE

type CoreContractShape = ReturnType<
  typeof createLevelRuntimeReadinessContractCore
>
type CoreActivationShape = ReturnType<
  typeof evaluateLevelRuntimeActivationCore
>
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false
type AssertContractShapesMatch = Equals<
  CoreContractShape,
  LevelRuntimeReadinessContract
> extends true
  ? true
  : ['Drift between levelRuntimeReadinessContractCore.d.mts and LevelRuntimeReadinessContract in types.ts']
type AssertActivationShapesMatch = Equals<
  CoreActivationShape,
  LevelRuntimeActivationStatus
> extends true
  ? true
  : ['Drift between levelRuntimeReadinessContractCore.d.mts and LevelRuntimeActivationStatus in types.ts']
const _assertContractShapesMatch: AssertContractShapesMatch = true
const _assertActivationShapesMatch: AssertActivationShapesMatch = true
void _assertContractShapesMatch
void _assertActivationShapesMatch

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
