import { mesh } from './runtimePrefabMeshFactory'

export function wastelandMonolithMeshes() {
  return [
    mesh('body', 'box', [1, 1, 1], {
      color: '#4f5563',
      emissive: '#293240',
      emissiveIntensity: 0.08,
      metalness: 0.1,
      roughness: 0.9,
    }),
    ...[-0.62, 0.62].map(offset =>
      mesh(`side-${offset}`, 'box', [0.18, 0.92, 0.34], {
        position: [offset, 0.04, 0],
        color: '#252d38',
        emissive: '#11161d',
        emissiveIntensity: 0.03,
        metalness: 0.18,
        roughness: 0.78,
      }),
    ),
    mesh('front-light', 'box', [0.16, 0.82, 0.06], {
      position: [0, 0.08, 0.51],
      color: '#88daf8',
      emissive: '#88daf8',
      emissiveIntensity: 0.46,
      metalness: 1,
      roughness: 0.04,
    }),
    mesh('cap', 'box', [0.58, 0.12, 0.58], {
      position: [0, 0.58, 0],
      color: '#3a4550',
      emissive: '#1a2028',
      emissiveIntensity: 0.03,
      metalness: 0.16,
      roughness: 0.76,
    }),
  ]
}

export function brokenRingMeshes() {
  return [
    mesh('ring', 'torus', [2.6, 0.25, 14, 28, Math.PI], {
      color: '#4f5669',
      emissive: '#344056',
      emissiveIntensity: 0.08,
      metalness: 0.14,
      roughness: 0.84,
    }),
  ]
}
