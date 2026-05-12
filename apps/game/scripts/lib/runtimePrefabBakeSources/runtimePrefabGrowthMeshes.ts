import { SIX_WAY_ANGLES, mesh } from './runtimePrefabMeshFactory'

export function benchGrowthMeshes(time: number) {
  return [
    mesh('seat', 'box', [2, 0.15, 0.6], {
      position: [0, 0.5, 0],
      color: '#4d3d2d',
      emissive: '#20160f',
      emissiveIntensity: 0.04,
      metalness: 0.16,
      roughness: 0.76,
    }),
    mesh('back', 'box', [2, 0.8, 0.15], {
      position: [0, 1.2, -0.6],
      color: '#4d3d2d',
      emissive: '#20160f',
      emissiveIntensity: 0.04,
      metalness: 0.16,
      roughness: 0.76,
    }),
    ...[-0.8, 0.8].flatMap(x =>
      [-0.2, 0.2].map(z =>
        mesh(`leg-${x}-${z}`, 'box', [0.1, 0.5, 0.1], {
          position: [x, 0.25, z],
          color: '#3d2d1d',
          emissive: '#20160f',
          emissiveIntensity: 0.03,
          metalness: 0.12,
          roughness: 0.82,
        }),
      ),
    ),
    ...[-0.85, -0.28, 0.34, 0.92].map((offset, index) =>
      mesh(
        `growth-${index}`,
        index % 2 === 0 ? 'box' : 'tetrahedron',
        index % 2 === 0
          ? [0.09, 0.95 + index * 0.18, 0.11]
          : [0.22 + index * 0.03, 0],
        {
          position: [offset, 1.2 + index * 0.15, -0.42 - index * 0.18],
          rotation: [
            -0.18 - index * 0.06,
            offset * 0.35,
            Math.sin(time * 0.6 + index) * 0.18,
          ],
          color: index % 2 === 0 ? '#87c8ff' : '#ff7ce3',
          emissive: index % 2 === 0 ? '#87c8ff' : '#ff7ce3',
          emissiveIntensity: 0.46,
          metalness: 0.96,
          roughness: 0.05,
        },
      ),
    ),
    mesh('growth-halo', 'torus', [1.35, 0.045, 12, 32], {
      position: [0, 1.45, -0.38],
      rotation: [Math.PI / 2 - 0.2, time * 0.32, 0.1],
      color: '#9edfff',
      emissive: '#9edfff',
      emissiveIntensity: 0.3,
      metalness: 1,
      roughness: 0.03,
      transparent: true,
      opacity: 0.54,
    }),
  ]
}

export function growthPlanterMeshes(time: number) {
  return [
    mesh('pot', 'cylinder', [0.4, 0.5, 0.8, 8], {
      position: [0, 0.4, 0],
      color: '#7a5a3a',
      emissive: '#27190d',
      emissiveIntensity: 0.04,
      metalness: 0.28,
      roughness: 0.72,
    }),
    mesh('rim', 'torus', [0.54, 0.05, 12, 24], {
      position: [0, 0.84, 0],
      rotation: [Math.PI / 2, time * 0.45, 0],
      color: '#6df5c6',
      emissive: '#6df5c6',
      emissiveIntensity: 0.34,
      metalness: 1,
      roughness: 0.04,
      transparent: true,
      opacity: 0.72,
    }),
    ...Array.from({ length: 5 }, (_, layer) => {
      const radius = 0.3 - layer * 0.05
      return mesh(`leaf-layer-${layer}`, 'box', [radius * 2, 0.3, radius * 2], {
        position: [0, 1.2 + layer * 0.4, 0],
        rotation: [0, layer * 0.6 + time * 0.3, 0],
        color: '#00aa44',
        emissive: '#00cc66',
        emissiveIntensity: 0.7,
        metalness: 0.92,
        roughness: 0.08,
      })
    }),
    ...SIX_WAY_ANGLES.map((angle, spokeIndex) =>
      mesh(
        `spoke-${spokeIndex}`,
        spokeIndex % 2 === 0 ? 'tetrahedron' : 'box',
        spokeIndex % 2 === 0 ? [0.18, 0] : [0.08, 0.42, 0.08],
        {
          position: [
            Math.cos(angle + time * 0.18) * (0.42 + spokeIndex * 0.03),
            1.55 + Math.sin(time * 0.9 + spokeIndex) * 0.12 + spokeIndex * 0.12,
            Math.sin(angle + time * 0.18) * (0.42 + spokeIndex * 0.03),
          ],
          rotation: [
            angle + time * 0.35,
            time * 0.28 + spokeIndex * 0.3,
            angle * 0.5,
          ],
          scale: [1, 1 + spokeIndex * 0.08, 1],
          color: spokeIndex % 2 === 0 ? '#9dffcf' : '#5edeb9',
          emissive: spokeIndex % 2 === 0 ? '#9dffcf' : '#5edeb9',
          emissiveIntensity: 0.4,
          metalness: 0.92,
          roughness: 0.08,
        },
      ),
    ),
  ]
}
