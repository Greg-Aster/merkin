import { RIGHT_ANGLES, mesh } from './runtimePrefabMeshFactory'
import type { RuntimePrefabBakeData } from './runtimePrefabBakeTypes'

function storyMarkerColor(variant?: string) {
  if (variant === 'amber') return '#ffaa00'
  if (variant === 'green') return '#5edeb9'
  if (variant === 'red') return '#ff6666'
  if (variant === 'magenta') return '#ff00ff'
  return '#00ccff'
}

export function courtyardFountainMeshes(time: number) {
  return [
    mesh('basin-base', 'cylinder', [1.8, 2.05, 0.24, 8], {
      position: [0, 0.12, 0],
      color: '#254658',
      emissive: '#11202b',
      emissiveIntensity: 0.08,
      metalness: 0.34,
      roughness: 0.6,
    }),
    ...RIGHT_ANGLES.map(angle =>
      mesh(`basin-block-${angle}`, 'box', [0.34, 0.46, 0.7], {
        position: [Math.cos(angle) * 1.0, 0.48, Math.sin(angle) * 1.0],
        rotation: [0, -angle, 0],
        color: '#2b566d',
        emissive: '#152833',
        emissiveIntensity: 0.06,
        metalness: 0.36,
        roughness: 0.58,
      }),
    ),
    mesh('basin-inner', 'cylinder', [1.22, 1.46, 0.44, 8], {
      position: [0, 0.46, 0],
      color: '#2d5f7a',
      emissive: '#17384a',
      emissiveIntensity: 0.08,
      metalness: 0.42,
      roughness: 0.56,
    }),
    mesh('water-ring', 'torus', [1.02, 0.09, 14, 36], {
      position: [0, 0.82, 0],
      rotation: [Math.PI / 2, 0, 0],
      color: '#86d8ff',
      emissive: '#86d8ff',
      emissiveIntensity: 0.48,
      metalness: 1,
      roughness: 0.04,
    }),
    mesh('water-bowl', 'cylinder', [0.96, 1.12, 0.34, 8], {
      position: [0, 1, 0],
      color: '#1a3d5a',
      emissive: '#17384a',
      emissiveIntensity: 0.08,
      metalness: 0.55,
      roughness: 0.28,
      transparent: true,
      opacity: 0.9,
    }),
    mesh('water-surface', 'cylinder', [0.85, 0.85, 0.05, 32], {
      position: [0, 1 + Math.sin(time * 1.5) * 0.1, 0],
      color: '#4488cc',
      emissive: '#0066aa',
      emissiveIntensity: 0.6,
      metalness: 0.08,
      roughness: 0.14,
      transparent: true,
      opacity: 0.7,
    }),
    mesh('core', 'cylinder', [0.2, 0.26, 0.9, 8], {
      position: [0, 1.28, 0],
      color: '#ff00ff',
      emissive: '#ff00ff',
      emissiveIntensity: 1,
      metalness: 0.95,
      roughness: 0.08,
    }),
    ...RIGHT_ANGLES.map(angle =>
      mesh(`core-vane-${angle}`, 'box', [0.08, 0.5, 0.18], {
        position: [Math.cos(angle) * 0.26, 1.42, Math.sin(angle) * 0.26],
        rotation: [0, angle, 0],
        color: '#a8edff',
        emissive: '#a8edff',
        emissiveIntensity: 0.76,
        metalness: 1,
        roughness: 0.03,
      }),
    ),
    mesh('upper-halo', 'torus', [2.35, 0.08, 16, 48], {
      position: [0, 3 + Math.sin(time * 0.35) * 0.08, 0],
      rotation: [Math.PI / 2, time * 0.25, 0],
      color: '#9fd6ff',
      emissive: '#9fd6ff',
      emissiveIntensity: 1.3,
      metalness: 0.95,
      roughness: 0.08,
    }),
  ]
}

export function storyMarkerMeshes(prefab: RuntimePrefabBakeData) {
  const color = storyMarkerColor(prefab.variant)
  return [
    mesh('ring', 'torus', [0.34, 0.02, 12, 24], {
      position: [0, 0.05, 0],
      rotation: [Math.PI / 2, 0, 0],
      color,
      emissive: color,
      emissiveIntensity: 0.38,
      metalness: 1,
      roughness: 0.04,
      transparent: true,
      opacity: 0.72,
    }),
    ...[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle, index) =>
      mesh(
        `satellite-${index}`,
        index === 1 ? 'tetrahedron' : 'box',
        index === 1 ? [0.12, 0] : [0.05, 0.2, 0.05],
        {
          position: [Math.cos(angle) * 0.42, 0.1, Math.sin(angle) * 0.42],
          rotation: [index, angle, 0],
          color,
          emissive: color,
          emissiveIntensity: 0.3,
          metalness: 0.98,
          roughness: 0.05,
        },
      ),
    ),
  ]
}
