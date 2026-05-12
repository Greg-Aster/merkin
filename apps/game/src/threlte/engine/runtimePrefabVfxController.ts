import * as THREE from 'three'
import { evaluateRuntimePrefabLoopChannel } from './runtimePrefabLoopChannels'
import type { RuntimePrefabVfxContract } from './runtimePrefabTypes'

export interface RuntimePrefabTransformBase {
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
}

export interface RuntimePrefabVfxBaseState {
  materials: Map<
    THREE.Material,
    {
      opacity: number
      transparent: boolean
      depthWrite: boolean
      emissiveIntensity?: number
    }
  >
  visibility: Map<THREE.Object3D, boolean>
}

export function snapshotRuntimePrefabVfxState(
  root: THREE.Object3D,
): RuntimePrefabVfxBaseState {
  const materials = new Map<
    THREE.Material,
    {
      opacity: number
      transparent: boolean
      depthWrite: boolean
      emissiveIntensity?: number
    }
  >()
  const visibility = new Map<THREE.Object3D, boolean>()

  root.traverse(object => {
    visibility.set(object, object.visible)
    if (!(object instanceof THREE.Mesh) || !object.material) return

    const targetMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material]
    for (const material of targetMaterials) {
      if (materials.has(material)) continue
      const standardMaterial = material as THREE.Material & {
        opacity?: number
        transparent?: boolean
        depthWrite?: boolean
        emissiveIntensity?: number
      }
      materials.set(material, {
        opacity: standardMaterial.opacity ?? 1,
        transparent: standardMaterial.transparent ?? false,
        depthWrite: standardMaterial.depthWrite ?? true,
        emissiveIntensity: standardMaterial.emissiveIntensity,
      })
    }
  })

  return { materials, visibility }
}

function applyVfxMaterial(
  object: THREE.Object3D,
  materialVfx: NonNullable<
    RuntimePrefabVfxContract['targets'][number]['material']
  >,
  baseState: RuntimePrefabVfxBaseState,
  time: number,
) {
  if (!(object instanceof THREE.Mesh) || !object.material) return

  const materials = Array.isArray(object.material)
    ? object.material
    : [object.material]
  for (const material of materials) {
    const base = baseState.materials.get(material)
    if (!base) continue

    const target = material as THREE.Material & {
      opacity?: number
      transparent?: boolean
      depthWrite?: boolean
      emissiveIntensity?: number
    }
    if (materialVfx.opacity) {
      target.opacity = Math.max(
        0,
        Math.min(
          1,
          evaluateRuntimePrefabLoopChannel(
            materialVfx.opacity,
            base.opacity,
            time,
          ),
        ),
      )
      target.transparent = base.transparent || target.opacity < 0.999
      target.depthWrite = target.transparent ? false : base.depthWrite
    }
    if (
      materialVfx.emissiveIntensity &&
      typeof base.emissiveIntensity === 'number'
    ) {
      target.emissiveIntensity = Math.max(
        0,
        evaluateRuntimePrefabLoopChannel(
          materialVfx.emissiveIntensity,
          base.emissiveIntensity,
          time,
        ),
      )
    }
    target.needsUpdate = true
  }
}

function applyVfxTransform(
  object: THREE.Object3D,
  transformVfx: NonNullable<
    RuntimePrefabVfxContract['targets'][number]['transform']
  >,
  baseTransform: RuntimePrefabTransformBase,
  time: number,
) {
  const rotation = transformVfx.rotation
  if (rotation) {
    object.rotation.x = evaluateRuntimePrefabLoopChannel(
      rotation.x,
      baseTransform.rotation.x,
      time,
    )
    object.rotation.y = evaluateRuntimePrefabLoopChannel(
      rotation.y,
      baseTransform.rotation.y,
      time,
    )
    object.rotation.z = evaluateRuntimePrefabLoopChannel(
      rotation.z,
      baseTransform.rotation.z,
      time,
    )
  }

  const position = transformVfx.position
  if (position) {
    object.position.x = evaluateRuntimePrefabLoopChannel(
      position.x,
      baseTransform.position.x,
      time,
    )
    object.position.y = evaluateRuntimePrefabLoopChannel(
      position.y,
      baseTransform.position.y,
      time,
    )
    object.position.z = evaluateRuntimePrefabLoopChannel(
      position.z,
      baseTransform.position.z,
      time,
    )
  }

  const scale = transformVfx.scale
  if (scale?.uniform) {
    const uniform = evaluateRuntimePrefabLoopChannel(scale.uniform, 1, time)
    object.scale.set(
      baseTransform.scale.x * uniform,
      baseTransform.scale.y * uniform,
      baseTransform.scale.z * uniform,
    )
  } else if (scale) {
    object.scale.x = evaluateRuntimePrefabLoopChannel(
      scale.x,
      baseTransform.scale.x,
      time,
    )
    object.scale.y = evaluateRuntimePrefabLoopChannel(
      scale.y,
      baseTransform.scale.y,
      time,
    )
    object.scale.z = evaluateRuntimePrefabLoopChannel(
      scale.z,
      baseTransform.scale.z,
      time,
    )
  }
}

export function resetRuntimePrefabVfx(
  baseState: RuntimePrefabVfxBaseState | null,
) {
  if (!baseState) return

  for (const [object, visible] of baseState.visibility) {
    object.visible = visible
  }
  for (const [material, base] of baseState.materials) {
    const target = material as THREE.Material & {
      opacity?: number
      transparent?: boolean
      depthWrite?: boolean
      emissiveIntensity?: number
    }
    target.opacity = base.opacity
    target.transparent = base.transparent
    target.depthWrite = base.depthWrite
    if (
      typeof base.emissiveIntensity === 'number' &&
      'emissiveIntensity' in target
    ) {
      target.emissiveIntensity = base.emissiveIntensity
    }
    target.needsUpdate = true
  }
}

export function applyRuntimePrefabVfx({
  root,
  contract,
  transformBases,
  baseState,
  time,
}: {
  root: THREE.Object3D | null
  contract: RuntimePrefabVfxContract | null
  transformBases: Map<THREE.Object3D, RuntimePrefabTransformBase>
  baseState: RuntimePrefabVfxBaseState | null
  time: number
}) {
  if (!root || !contract || !baseState) return

  for (const target of contract.targets) {
    const object = root.getObjectByName(target.name)
    if (!object) continue

    const baseTransform = transformBases.get(object)
    if (target.transform && baseTransform) {
      applyVfxTransform(object, target.transform, baseTransform, time)
    }
    if (target.material) {
      applyVfxMaterial(object, target.material, baseState, time)
    }
    if (target.visibility) {
      const baseVisible = baseState.visibility.get(object) ?? object.visible
      const visibleValue = evaluateRuntimePrefabLoopChannel(
        target.visibility,
        baseVisible ? 1 : 0,
        time,
      )
      object.visible = visibleValue >= 0.5
    }
  }
}
