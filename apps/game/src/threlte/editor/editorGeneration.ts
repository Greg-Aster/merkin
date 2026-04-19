import type { EditorGenerationData, EditorPrefabType, EditorSceneDocument, EditorSceneNode } from './editorTypes'

export const EDITOR_PREFAB_GENERATION_LABELS: Record<EditorPrefabType, string> = {
  'anomaly-cluster': 'anomalous floating crystal cluster',
  'bench-growth': 'overgrown haunted bench',
  'broken-ring': 'broken ancient stone ring ruin',
  'command-console': 'retro-futurist command console',
  'command-fin': 'dark retro-futurist fin pillar',
  'courtyard-fountain': 'strange luminous courtyard fountain',
  'courtyard-pylon': 'weathered courtyard pylon',
  'growth-planter': 'biomechanical growth planter',
  'hanging-light': 'ornate hanging industrial light',
  'interior-archway': 'ancient interior archway ruin',
  'observation-rig': 'cosmic observation rig',
  'portal-apparatus': 'occult portal apparatus',
  'story-marker': 'ritual story marker obelisk',
  'support-column': 'retro-futurist support column',
  'wasteland-archway': 'wasteland stone archway',
  'wasteland-monolith': 'weathered monolith pillar',
}

function describePrimitive(node: EditorSceneNode) {
  const geometry = node.primitive?.geometry
  if (!geometry) return ''

  const nodeId = node.id.toLowerCase()
  if (nodeId.startsWith('yggdrasil-trunk-')) return 'colossal world-tree trunk segment'
  if (nodeId.startsWith('yggdrasil-root-')) return 'ancient world-root buttress'
  if (nodeId.startsWith('yggdrasil-searoot-')) return 'world-root descending into the sea'
  if (nodeId.startsWith('yggdrasil-branch-')) return 'high sacred branch span'
  if (nodeId.startsWith('yggdrasil-canopy-')) return 'dense mythic canopy mass'
  if (nodeId.startsWith('yggdrasil-bifrost-ribbon-')) return 'luminous bifrost causeway ribbon'
  if (nodeId.startsWith('yggdrasil-path-stone-')) return 'ceremonial path stone'
  if (nodeId.startsWith('yggdrasil-shorestone-')) return 'weathered shoreline stone'
  if (nodeId.startsWith('yggdrasil-shelfbreak-')) return 'broken island shelf segment'
  if (nodeId.startsWith('yggdrasil-islet-')) return 'outer sacred islet'
  if (nodeId.includes('well-') && nodeId.endsWith('-pool')) return 'sacred mythic well pool'
  if (nodeId.includes('well-') && nodeId.endsWith('-ring')) return 'carved stone well ring'
  if (nodeId.startsWith('yggdrasil-crown-path-')) return 'ritual ascent platform'
  if (nodeId === 'yggdrasil-ground') return 'vast circular island foundation'
  if (nodeId === 'yggdrasil-island-shelf') return 'outer island shelf'
  if (nodeId === 'yggdrasil-shore-ring') return 'shoreline ring'

  const name = node.name.trim().toLowerCase()
  if (name) return name

  if (geometry === 'box') return 'stone floor slab'
  if (geometry === 'cylinder') return 'round carved plinth'
  if (geometry === 'torus') return 'broken ritual ring'
  if (geometry === 'icosahedron') return 'faceted crystal prop'
  return `${geometry} sculpted prop`
}

export function inferNodeGenerationDescriptor(node: EditorSceneNode) {
  const explicitDescriptor = node.generation?.descriptor?.trim()
  if (explicitDescriptor) return explicitDescriptor
  if (node.id.startsWith('yggdrasil-monolith-')) return 'weathered rune monolith'
  if (node.id.startsWith('yggdrasil-drowned-monolith-')) return 'drowned shoreline monolith ruin'
  if (node.id.startsWith('yggdrasil-drowned-ring-')) return 'half-submerged sacred ring ruin'
  if (node.id.startsWith('yggdrasil-arrival-monolith-')) return 'threshold world-tree monolith'
  if (node.id.startsWith('yggdrasil-hvergelmir-depth-monolith-')) return 'cold root-depth monolith'
  if (node.prefab?.type) return EDITOR_PREFAB_GENERATION_LABELS[node.prefab.type] ?? node.name.trim()
  if (node.primitive) return describePrimitive(node)
  if (node.asset) return node.name.trim() || 'environment prop'
  return node.name.trim()
}

export function ensureNodeGeneration(node: EditorSceneNode): EditorSceneNode {
  if (!node.asset && !node.prefab && !node.primitive) {
    return node
  }

  const nextGeneration: EditorGenerationData = {
    ...(node.generation ?? {}),
    descriptor: inferNodeGenerationDescriptor(node),
  }

  return {
    ...node,
    generation: nextGeneration,
  }
}

export function ensureSceneGeneration(scene: EditorSceneDocument): EditorSceneDocument {
  return {
    ...scene,
    nodes: scene.nodes.map((node) => ensureNodeGeneration(node)),
  }
}
