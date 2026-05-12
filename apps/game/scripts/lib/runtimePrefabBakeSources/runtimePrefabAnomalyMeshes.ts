import { RIGHT_ANGLES, mesh } from './runtimePrefabMeshFactory'
import type { RuntimePrefabBakeData } from './runtimePrefabBakeTypes'

function anomalyVariant(variant?: string) {
  if (variant === 'green') {
    return {
      shellColor: '#00ff88',
      accentColor: '#c8fff4',
      shellGeometry: 'tetrahedron' as const,
      shellArgs: [0.8, 0],
    }
  }

  if (variant === 'cyan') {
    return {
      shellColor: '#00d4ff',
      accentColor: '#d9f4ff',
      shellGeometry: 'dodecahedron' as const,
      shellArgs: [0.8, 0],
    }
  }

  if (variant === 'rose') {
    return {
      shellColor: '#ff0088',
      accentColor: '#ffd0f0',
      shellGeometry: 'icosahedron' as const,
      shellArgs: [0.7, 0],
    }
  }

  return {
    shellColor: '#ff00ff',
    accentColor: '#8fd8ff',
    shellGeometry: 'octahedron' as const,
    shellArgs: [1.0, 0],
  }
}

export function anomalyClusterMeshes(
  prefab: RuntimePrefabBakeData,
  time: number,
) {
  const variant = anomalyVariant(prefab.variant)
  return [
    mesh('shell', variant.shellGeometry, variant.shellArgs, {
      position: [0, Math.sin(time * 0.7) * 0.18, 0],
      rotation: [time * 0.55, time * 0.34, time * 0.18],
      color: variant.shellColor,
      emissive: variant.shellColor,
      emissiveIntensity: 1.05,
      metalness: 0.96,
      roughness: 0.03,
    }),
    ...RIGHT_ANGLES.map((angle, index) =>
      mesh(
        `orbital-${index}`,
        index % 2 === 0 ? 'box' : 'tetrahedron',
        index % 2 === 0 ? [0.16, 0.52, 0.16] : [0.22, 0],
        {
          position: [
            Math.cos(angle + time * 0.3) * 1.05,
            0.18 + Math.sin(time * 0.85 + index) * 0.16,
            Math.sin(angle + time * 0.3) * 1.05,
          ],
          rotation: [time * 0.7, angle, time * 0.35 + index],
          scale: [1, 1 + index * 0.08, 1],
          color: variant.accentColor,
          emissive: variant.accentColor,
          emissiveIntensity: 0.58,
          metalness: 1,
          roughness: 0.04,
        },
      ),
    ),
    mesh('ring', 'torus', [1.3, 0.04, 12, 32], {
      position: [0, 0.12, 0],
      rotation: [Math.PI / 2 + time * 0.18, time * 0.25, 0],
      color: variant.accentColor,
      emissive: variant.accentColor,
      emissiveIntensity: 0.4,
      metalness: 1,
      roughness: 0.03,
      transparent: true,
      opacity: 0.72,
    }),
  ]
}
