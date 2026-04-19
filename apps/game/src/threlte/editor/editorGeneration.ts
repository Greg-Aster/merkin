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
  if (nodeId.startsWith('yggdrasil-trunk-')) return 'colossal ancient trunk segment of blackened sacred timber, fissured bark mass'
  if (nodeId.startsWith('yggdrasil-root-')) return 'ancient root buttress of cyclopean sacred wood, root-cathedral mass'
  if (nodeId.startsWith('yggdrasil-searoot-')) return 'descending sea root of drowned cosmic timber'
  if (nodeId.startsWith('yggdrasil-branch-')) return 'high sacred branch span, storm-dark wood, immense overhead limb'
  if (nodeId.startsWith('yggdrasil-canopy-')) return 'dense mythic canopy mass, void-dark leaves, eerie crown volume'
  if (nodeId.startsWith('yggdrasil-bifrost-ribbon-')) return 'neon bifrost causeway ribbon, magenta violet spectral light'
  if (nodeId.startsWith('yggdrasil-path-stone-')) return 'ceremonial approach stone, weathered runic slab'
  if (nodeId.startsWith('yggdrasil-shorestone-')) return 'weathered shoreline stone, sea-worn ruin fragment'
  if (nodeId.startsWith('yggdrasil-shelfbreak-')) return 'broken island shelf segment, collapsed sacred ledge'
  if (nodeId.startsWith('yggdrasil-islet-')) return 'outer sacred islet, drowned mythic outcrop'
  if (nodeId.includes('well-') && nodeId.endsWith('-pool')) return 'sacred abyssal well pool, dark reflective myth-water'
  if (nodeId.includes('well-') && nodeId.endsWith('-ring')) return 'carved stone well ring, runic shrine circumference'
  if (nodeId.startsWith('yggdrasil-crown-path-')) return 'ritual ascent platform, root-wood pilgrimage path'
  if (nodeId === 'yggdrasil-ground') return 'vast circular island foundation of dark earth and root-laced stone'
  if (nodeId === 'yggdrasil-island-shelf') return 'broad outer island shelf of weathered sacred stone'
  if (nodeId === 'yggdrasil-shore-ring') return 'shoreline ring, drowned shrine perimeter'

  const name = node.name.trim().toLowerCase()
  if (name) return name

  if (geometry === 'box') return 'rectangular solid object or block-like structural form'
  if (geometry === 'cylinder') return 'cylindrical object or column-like structural form'
  if (geometry === 'torus') return 'ring-shaped object or circular ornamental form'
  if (geometry === 'icosahedron') return 'faceted crystal-like object'
  if (geometry === 'dodecahedron') return 'faceted polyhedral object'
  if (geometry === 'octahedron') return 'octahedral faceted object'
  if (geometry === 'tetrahedron') return 'tetrahedral faceted object'
  return `${geometry}-shaped sculpted object`
}

export function inferNodeGenerationDescriptor(node: EditorSceneNode) {
  const explicitDescriptor = node.generation?.descriptor?.trim()
  if (explicitDescriptor) return explicitDescriptor
  if (node.id.startsWith('yggdrasil-monolith-')) return 'weathered rune monolith, neon fissures, cosmic shrine stone'
  if (node.id.startsWith('yggdrasil-drowned-monolith-')) return 'drowned shoreline monolith ruin, abyssal runes, salt-dark sacred stone'
  if (node.id.startsWith('yggdrasil-drowned-ring-')) return 'half-submerged sacred ring ruin, broken ritual stone'
  if (node.id.startsWith('yggdrasil-arrival-monolith-')) return 'threshold world-tree monolith, magenta-violet rune channels'
  if (node.id.startsWith('yggdrasil-hvergelmir-depth-monolith-')) return 'cold root-depth monolith, underworld shrine stone'
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
