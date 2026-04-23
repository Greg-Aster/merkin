import type { EditorPrefabType, EditorSceneNode } from './editorTypes'

interface CreateEditorPrefabFactoryOptions {
  createId: (prefix: string) => string
  addNode: (node: EditorSceneNode) => string
}

export function createEditorPrefabFactory(options: CreateEditorPrefabFactoryOptions) {
  const { addNode, createId } = options

  return {
    addAnomaly(parentId: string | null = null) {
      return addNode({
        id: createId('anomaly'),
        name: 'Anomaly Cluster',
        kind: 'primitive',
        parentId,
        position: [0, 2, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        primitive: {
          geometry: 'icosahedron',
          args: [0.8, 0],
          color: '#86dfff',
          emissive: '#86dfff',
          emissiveIntensity: 0.7,
          metalness: 0.95,
          roughness: 0.05,
        },
      })
    },
    addMarker(parentId: string | null = null) {
      return addNode({
        id: createId('marker'),
        name: 'Editor Marker',
        kind: 'primitive',
        parentId,
        position: [0, 1.2, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        primitive: {
          geometry: 'torus',
          args: [0.45, 0.04, 12, 28],
          color: '#ff8cff',
          emissive: '#ff8cff',
          emissiveIntensity: 0.8,
          metalness: 1,
          roughness: 0.03,
          transparent: true,
          opacity: 0.7,
        },
      })
    },
    addPointLight(parentId: string | null = null) {
      return addNode({
        id: createId('light'),
        name: 'Point Light',
        kind: 'light',
        parentId,
        position: [0, 2.5, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        light: {
          color: '#7ecbff',
          intensity: 8,
          distance: 10,
          decay: 2,
        },
      })
    },
    addFireflyDialogue(parentId: string | null = null) {
      return addNode({
        id: createId('firefly'),
        name: 'Firefly Dialogue',
        kind: 'group',
        parentId,
        position: [0, 2.4, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        gameplay: {
          type: 'firefly',
          markerColor: '#ff4658',
          markerSize: 0.58,
          wanderEnabled: true,
          wanderRadius: 0.16,
          wanderSpeed: 0.18,
          hoverHeight: 0.28,
          bobAmplitude: 0.08,
          bobSpeed: 0.55,
          twinkleSpeed: 0.9,
          lightIntensity: 1.15,
          lightDistance: 4.6,
          lightDecay: 1.25,
          spriteIntensity: 1.15,
          title: 'Solitude',
          author: 'The Firefly',
          location: 'The Solitude Plain',
          excerpt: 'A patient glow waits where the ruined circle remembers its shape.',
          body: 'This is a place for solitude. You are alone here.',
        },
      })
    },
    addAmbientAudioRegion(parentId: string | null = null) {
      return addNode({
        id: createId('audio-region'),
        name: 'Ambient Audio Region',
        kind: 'group',
        parentId,
        position: [0, 4, 0],
        rotation: [0, 0, 0],
        scale: [60, 12, 60],
        visible: true,
        gameplay: {
          type: 'audio-region',
          markerColor: '#7ecbff',
          title: 'Wind Bed',
          audioTrack: '/audio/ambient/Wicked Shadows Whisper.mp3',
          audioVolume: 0.24,
          regionFalloff: 14,
        },
      })
    },
    addFogVolume(parentId: string | null = null) {
      return addNode({
        id: createId('fog-volume'),
        name: 'Fog Volume',
        kind: 'group',
        parentId,
        position: [0, 4, 0],
        rotation: [0, 0, 0],
        scale: [42, 10, 42],
        visible: true,
        gameplay: {
          type: 'fog-volume',
          markerColor: '#cfdcff',
          title: 'Haze Pocket',
          fogColor: '#9ba9bb',
          fogDensity: 0.0025,
          regionFalloff: 8,
        },
      })
    },
    addMistRegion(parentId: string | null = null) {
      return addNode({
        id: createId('mist-region'),
        name: 'Mist Region',
        kind: 'group',
        parentId,
        position: [0, 0.55, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        gameplay: {
          type: 'mist-region',
          markerColor: '#b992ff',
          title: 'Ground Mist',
          mistColor: '#241557',
          mistOpacity: 0.14,
          mistLayers: 3,
          mistSpacing: 0.45,
          mistScale: 360,
          mistDriftSpeed: 0.05,
        },
      })
    },
    addAsset(
      name: string,
      url: string,
      parentId: string | null = null,
      scale: [number, number, number] = [0.001, 0.001, 0.001]
    ) {
      return addNode({
        id: createId('asset'),
        name,
        kind: 'asset',
        parentId,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale,
        visible: true,
        asset: { url },
      })
    },
    addPrefab(
      name: string,
      type: EditorPrefabType,
      position: [number, number, number] = [0, 0, 0],
      parentId: string | null = null
    ) {
      return addNode({
        id: createId('prefab'),
        name,
        kind: 'prefab',
        parentId,
        position,
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        prefab: { type },
      })
    },
    addEmpty(name = 'Empty', parentId: string | null = null, position: [number, number, number] = [0, 0, 0]) {
      return addNode({
        id: createId('group'),
        name,
        kind: 'group',
        parentId,
        position,
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
      })
    },
  }
}
