import { RIGHT_ANGLES, SIX_WAY_ANGLES, mesh } from './runtimePrefabMeshFactory'

export function commandConsoleMeshes(time: number) {
  return [
    mesh('base', 'box', [2.0, 0.3, 1.6], {
      position: [0, 0.18, 0],
      color: '#1a5f7a',
      emissive: '#17394a',
      emissiveIntensity: 0.2,
      metalness: 0.92,
      roughness: 0.18,
    }),
    mesh('screen-riser', 'box', [2.0, 1.4, 0.1], {
      position: [0, 1.48, -0.6],
      color: '#1a5f7a',
      emissive: '#17394a',
      emissiveIntensity: 0.22,
      metalness: 0.9,
      roughness: 0.22,
    }),
    ...[-0.5, 0.5].map(x =>
      mesh(`screen-${x}`, 'box', [0.8, 1.0, 0.02], {
        position: [x, 1.48, -0.55],
        color: '#6ad7ff',
        emissive: '#6ad7ff',
        emissiveIntensity: 0.85 + Math.sin(time * 2 + x) * 0.18,
        metalness: 0.16,
        roughness: 0.08,
      }),
    ),
    ...[
      [-0.7, 0.55],
      [0, 0.6],
      [0.7, 0.55],
    ].map(([x, z], index) =>
      mesh(`control-${index}`, 'box', [0.28, 0.08, 0.22], {
        position: [x, 0.41, z],
        color: index === 1 ? '#6ad7ff' : '#2d4452',
        emissive: index === 1 ? '#6ad7ff' : '#111920',
        emissiveIntensity: index === 1 ? 0.8 : 0.15,
        metalness: 0.95,
        roughness: 0.18,
      }),
    ),
    ...RIGHT_ANGLES.map((angle, index) =>
      mesh(`antenna-${index}`, 'box', [0.12, 0.7, 0.16], {
        position: [
          Math.cos(angle) * 1.22,
          0.73 + Math.sin(time * 0.7 + index) * 0.05,
          Math.sin(angle) * 0.86,
        ],
        rotation: [
          time * 0.25 + index * 0.2,
          angle,
          Math.sin(time * 0.35 + index) * 0.25,
        ],
        scale: [1, 1 + Math.sin(time * 0.8 + index) * 0.12, 1],
        color: index % 2 === 0 ? '#7ee0ff' : '#ff6bd8',
        emissive: index % 2 === 0 ? '#7ee0ff' : '#ff6bd8',
        emissiveIntensity: 0.7,
        metalness: 1,
        roughness: 0.04,
      }),
    ),
    mesh('halo', 'torus', [1.28, 0.05, 12, 28], {
      position: [0, 0.9, 0],
      rotation: [Math.PI / 2, time * 0.4, 0],
      color: '#84dfff',
      emissive: '#84dfff',
      emissiveIntensity: 0.46,
      metalness: 1,
      roughness: 0.03,
      transparent: true,
      opacity: 0.82,
    }),
  ]
}

export function portalApparatusMeshes(time: number) {
  return [
    mesh('base-disc', 'cylinder', [0.8, 0.8, 0.08, 32], {
      position: [0, 0.04, 0],
      color: '#ff00ff',
      emissive: '#ff00ff',
      emissiveIntensity: 1.6,
      metalness: 1,
      roughness: 0.05,
    }),
    mesh('base-ring', 'torus', [0.9, 0.12, 16, 32], {
      position: [0, 0.2, 0],
      rotation: [0, time * 2, 0],
      color: '#ff00ff',
      emissive: '#ff00ff',
      emissiveIntensity: 2,
      metalness: 1,
      roughness: 0.05,
    }),
    mesh('outer-ring', 'torus', [1.58, 0.04, 12, 36], {
      position: [0, 1.12, 0],
      rotation: [
        Math.PI / 2 + Math.sin(time * 0.25) * 0.25,
        time * -0.55,
        time * 0.18,
      ],
      color: '#a2f0ff',
      emissive: '#a2f0ff',
      emissiveIntensity: 0.48,
      metalness: 1,
      roughness: 0.03,
      transparent: true,
      opacity: 0.7,
    }),
    mesh('inner-ring', 'torus', [1.15, 0.07, 16, 48], {
      position: [0, 1.05, 0],
      rotation: [Math.PI / 2, time * -1.4, 0],
      color: '#ff7aff',
      emissive: '#ff7aff',
      emissiveIntensity: 2.1,
      metalness: 1,
      roughness: 0.05,
    }),
    mesh('core', 'cylinder', [0.06, 0.12, 1.7, 12], {
      position: [0, 1.0, 0],
      color: '#e38bff',
      emissive: '#e38bff',
      emissiveIntensity: 1.4,
      metalness: 0.9,
      roughness: 0.08,
      transparent: true,
      opacity: 0.8,
    }),
    ...SIX_WAY_ANGLES.map((angle, index) =>
      mesh(
        `strut-${index}`,
        index % 2 === 0 ? 'box' : 'tetrahedron',
        index % 2 === 0 ? [0.1, 1.18, 0.16] : [0.24, 0],
        {
          position: [
            Math.cos(angle) * 1.15,
            1.05 + Math.sin(time * 0.8 + index) * 0.08,
            Math.sin(angle) * 1.15,
          ],
          rotation: [
            0.35 + Math.sin(time * 0.35 + index) * 0.1,
            -angle + Math.PI / 2,
            angle * 0.5 + time * 0.18,
          ],
          scale: [1, 1 + index * 0.04, 1],
          color: index % 2 === 0 ? '#ff8cff' : '#9ce8ff',
          emissive: index % 2 === 0 ? '#ff8cff' : '#9ce8ff',
          emissiveIntensity: 0.72,
          metalness: 0.98,
          roughness: 0.04,
        },
      ),
    ),
  ]
}

export function supportColumnMeshes() {
  return [
    mesh('lower-cap', 'cylinder', [0.62, 0.74, 0.28, 8], {
      position: [0, -3.58, 0],
      color: '#1a5f7a',
      emissive: '#17384a',
      emissiveIntensity: 0.18,
      metalness: 0.82,
      roughness: 0.3,
    }),
    mesh('lower-collar', 'cylinder', [0.48, 0.58, 0.22, 8], {
      position: [0, -3.34, 0],
      color: '#142532',
      emissive: '#0f1820',
      emissiveIntensity: 0.06,
      metalness: 0.78,
      roughness: 0.34,
    }),
    mesh('shaft', 'cylinder', [0.26, 0.3, 7.37, 8], {
      position: [0, 0.25, 0],
      color: '#0a3d4d',
      emissive: '#102734',
      emissiveIntensity: 0.08,
      metalness: 0.64,
      roughness: 0.4,
    }),
    ...[
      [-0.24, 0],
      [0.24, 0],
      [0, -0.24],
      [0, 0.24],
    ].map(([rx, rz], index) =>
      mesh(`rib-${index}`, 'box', [0.08, 7.07, 0.08], {
        position: [rx, 0.25, rz],
        color: '#213846',
        emissive: '#111b23',
        emissiveIntensity: 0.04,
        metalness: 0.72,
        roughness: 0.32,
      }),
    ),
    mesh('top-ring', 'torus', [0.4, 0.05, 12, 24], {
      position: [0, 3.42, 0],
      rotation: [Math.PI / 2, 0, 0],
      color: '#00d4ff',
      emissive: '#00d4ff',
      emissiveIntensity: 0.9,
      metalness: 1,
      roughness: 0.05,
    }),
    mesh('top-cap', 'cylinder', [0.4, 0.26, 0.42, 8], {
      position: [0, 3.82, 0],
      color: '#00d4ff',
      emissive: '#00d4ff',
      emissiveIntensity: 1,
      metalness: 0.95,
      roughness: 0.08,
    }),
    mesh('top-core', 'box', [0.16, 0.24, 0.16], {
      position: [0, 4.08, 0],
      color: '#d2f1ff',
      emissive: '#00d4ff',
      emissiveIntensity: 0.85,
      metalness: 1,
      roughness: 0.04,
    }),
  ]
}

export function archwayMeshes(prefix: string, lit: boolean) {
  const baseColor = lit ? '#2a3d4a' : '#1a5f7a'
  const baseEmissive = lit ? '#2a7a9a' : '#17384a'
  const sideMeshes = [-1.2, 1.2].flatMap((x, sideIndex) => [
    mesh(`${prefix}-foot-${sideIndex}`, 'box', [0.62, lit ? 0.4 : 0.42, 0.62], {
      position: [x, lit ? 0.08 : 0.05, 0],
      color: baseColor,
      emissive: lit ? '#173244' : baseEmissive,
      emissiveIntensity: lit ? 0.08 : 0.06,
      metalness: lit ? 0.7 : 0.3,
      roughness: lit ? 0.3 : 0.66,
    }),
    mesh(
      `${prefix}-post-${sideIndex}`,
      'box',
      [0.34, lit ? 7.94 : 7.74, 0.34],
      {
        position: [x, lit ? 4.05 : 3.92, 0],
        color: baseColor,
        emissive: baseEmissive,
        emissiveIntensity: lit ? 0.4 : 0.08,
        metalness: lit ? 0.72 : 0.35,
        roughness: lit ? 0.26 : 0.62,
      },
    ),
    ...(lit
      ? [
          mesh(`${prefix}-light-${sideIndex}`, 'box', [0.12, 7.09, 0.14], {
            position: [x, 4.05, 0.18],
            rotation: [0, 0, x < 0 ? 0.2 : -0.2],
            color: '#7ed8ff',
            emissive: '#7ed8ff',
            emissiveIntensity: 0.84,
            metalness: 1,
            roughness: 0.04,
          }),
        ]
      : []),
    mesh(
      `${prefix}-brace-${sideIndex}`,
      'box',
      [0.12, lit ? 1.0 : 0.94, 0.12],
      {
        position: [x < 0 ? x + 0.22 : x - 0.22, lit ? 0.95 : 0.92, 0],
        rotation: [0, 0, x < 0 ? (lit ? -0.55 : -0.45) : lit ? 0.55 : 0.45],
        color: lit ? '#213846' : '#2d4857',
        emissive: lit ? '#12202a' : '#162029',
        emissiveIntensity: lit ? 0.05 : 0.04,
        metalness: lit ? 0.72 : 0.54,
        roughness: lit ? 0.34 : 0.42,
      },
    ),
    ...(lit
      ? [
          mesh(`${prefix}-cap-${sideIndex}`, 'box', [0.58, 0.18, 0.58], {
            position: [x, 7.7, 0],
            color: '#223544',
            emissive: '#152433',
            emissiveIntensity: 0.06,
            metalness: 0.84,
            roughness: 0.22,
          }),
        ]
      : []),
  ])

  return [
    ...sideMeshes,
    mesh(
      `${prefix}-span`,
      'box',
      [lit ? 3.2 : 3.3, lit ? 0.36 : 0.38, lit ? 0.48 : 0.5],
      {
        position: [0, lit ? 7.96 : 7.72, 0],
        color: baseColor,
        emissive: baseEmissive,
        emissiveIntensity: lit ? 0.34 : 0.08,
        metalness: lit ? 0.72 : 0.35,
        roughness: lit ? 0.26 : 0.62,
      },
    ),
    mesh(
      `${prefix}-top-light`,
      'box',
      [lit ? 2.6 : 2.4, 0.12, lit ? 0.2 : 0.18],
      {
        position: [0, lit ? 8.18 : 8.04, 0],
        color: lit ? '#9ae6ff' : '#8dd8f7',
        emissive: lit ? '#9ae6ff' : '#8dd8f7',
        emissiveIntensity: lit ? 0.9 : 0.68,
        metalness: 1,
        roughness: lit ? 0.02 : 0.03,
      },
    ),
  ]
}

export function commandFinMeshes() {
  return [
    mesh('fin', 'box', [0.22, 3.6, 1.4], {
      color: '#0d1724',
      emissive: '#11263a',
      emissiveIntensity: 0.18,
      metalness: 0.65,
      roughness: 0.35,
    }),
  ]
}

export function courtyardPylonMeshes() {
  return [
    mesh('foot', 'box', [0.56, 0.34, 0.56], {
      position: [0, 0.07, 0],
      color: '#1a5f7a',
      emissive: '#17384a',
      emissiveIntensity: 0.06,
      metalness: 0.28,
      roughness: 0.66,
    }),
    mesh('post', 'box', [0.28, 7.74, 0.28], {
      position: [0, 3.94, 0],
      color: '#1a5f7a',
      emissive: '#17384a',
      emissiveIntensity: 0.08,
      metalness: 0.35,
      roughness: 0.62,
    }),
    mesh('light-strip', 'box', [0.1, 7.24, 0.12], {
      position: [0, 3.94, 0.16],
      color: '#79cce8',
      emissive: '#79cce8',
      emissiveIntensity: 0.52,
      metalness: 0.95,
      roughness: 0.06,
    }),
  ]
}

export function observationRigMeshes() {
  return [
    mesh('leg', 'cylinder', [0.18, 0.26, 1.4, 10], {
      position: [5.4, 0.8, 22.72],
      rotation: [0, -0.7, 0],
      color: '#1d2630',
      emissive: '#21384d',
      emissiveIntensity: 0.2,
      metalness: 0.75,
      roughness: 0.28,
    }),
    mesh('scope', 'cylinder', [0.18, 0.28, 2.6, 12], {
      position: [5.1, 1.8, 21.62],
      rotation: [-0.55, -0.75, 0],
      color: '#0f1c28',
      emissive: '#234764',
      emissiveIntensity: 0.24,
      metalness: 0.82,
      roughness: 0.18,
    }),
    mesh('body', 'box', [0.7, 0.45, 1.0], {
      position: [5.85, 1.05, 23.12],
      rotation: [0, -0.35, 0],
      color: '#17212a',
      emissive: '#18344a',
      emissiveIntensity: 0.18,
      metalness: 0.6,
      roughness: 0.42,
    }),
  ]
}
