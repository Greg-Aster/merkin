import { anomalyClusterMeshes } from './runtimePrefabAnomalyMeshes'
import {
  courtyardFountainMeshes,
  storyMarkerMeshes,
} from './runtimePrefabCourtyardMeshes'
import {
  benchGrowthMeshes,
  growthPlanterMeshes,
} from './runtimePrefabGrowthMeshes'
import {
  archwayMeshes,
  commandConsoleMeshes,
  commandFinMeshes,
  courtyardPylonMeshes,
  observationRigMeshes,
  portalApparatusMeshes,
  supportColumnMeshes,
} from './runtimePrefabTechMeshes'
import type {
  RuntimePrefabBakeData,
  RuntimePrefabBakeMeshDescriptor,
} from './runtimePrefabBakeTypes'
import {
  brokenRingMeshes,
  wastelandMonolithMeshes,
} from './runtimePrefabWastelandMeshes'

export function resolveRuntimePrefabMeshes(
  prefab: RuntimePrefabBakeData,
  time = 0,
): RuntimePrefabBakeMeshDescriptor[] {
  const type = prefab.type

  switch (type) {
    case 'anomaly-cluster':
      return anomalyClusterMeshes(prefab, time)
    case 'command-console':
      return commandConsoleMeshes(time)
    case 'command-fin':
      return commandFinMeshes()
    case 'portal-apparatus':
      return portalApparatusMeshes(time)
    case 'support-column':
      return supportColumnMeshes()
    case 'interior-archway':
      return archwayMeshes(type, true)
    case 'courtyard-pylon':
      return courtyardPylonMeshes()
    case 'story-marker':
      return storyMarkerMeshes(prefab)
    case 'wasteland-archway':
      return archwayMeshes(type, false)
    case 'courtyard-fountain':
      return courtyardFountainMeshes(time)
    case 'observation-rig':
      return observationRigMeshes()
    case 'bench-growth':
      return benchGrowthMeshes(time)
    case 'growth-planter':
      return growthPlanterMeshes(time)
    case 'wasteland-monolith':
      return wastelandMonolithMeshes()
    case 'broken-ring':
      return brokenRingMeshes()
    default:
      return []
  }
}
