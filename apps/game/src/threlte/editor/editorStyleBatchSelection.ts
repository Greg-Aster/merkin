import { canBakeSceneNode } from './editorBakeSource'
import type { EditorSceneNode } from './editorStore'

export interface EditorStyleBriefPreset {
  id: string
  label: string
  prompt: string
  negativePrompt: string
  loraNotes: string
  controlNetNotes: string
}

export interface EditorStyleSceneCandidate {
  id: string
  name: string
  kindLabel: string
  descriptor: string
  selected: boolean
  status: string
}

export interface EditorStyleBatchSelectionState {
  selectedIds: string[]
  initialized: boolean
}

export const stylePresetOptions: EditorStyleBriefPreset[] = [
  {
    id: 'yggdrasil-abyssal-neon',
    label: 'Yggdrasil · Abyssal Neon Horror',
    prompt:
      'extremely dark cosmic horror sacred material, blackened ancient, abyssal rune-carved, magenta and violet neon fissures, cold pink-purple emissive veins, starless depth, drowned shrine surfaces, monumental age, painterly but legible, strong silhouette hierarchy, selective luminous accents only, uncanny sacred dread',
    negativePrompt: '',
    loraNotes:
      'Favor blackened, abyssal , violet-magenta rune glow, cosmic dread, monumental sacred architecture, and Norse myth gravitas over generic fantasy prettiness.',
    controlNetNotes:
      'Preserve silhouette, traversal readability, climbability, collision anchors, route legibility, and the overwhelming mass of the world-tree. Keep emissive accents selective so the magenta and violet lights feel rare and ominous.',
  },
  {
    id: 'yggdrasil-sacred-natural',
    label: 'Yggdrasil · Sacred Mythic Natural',
    prompt:
      'ancient sacred material language, weathered cosmic wood, rune-carved stone, moss, lichen, cold mist, restrained gold accents, monumental age, painterly but grounded, cohesive mythic surfaces, reverent atmosphere, carved history, readable forms',
    negativePrompt: '',
    loraNotes:
      'Lean toward mythic Scandinavian sacred landscape and old ritual craft rather than generic high fantasy prettiness.',
    controlNetNotes:
      'Preserve silhouette, climbability, collision readability, path readability, and landmark hierarchy.',
  },
  {
    id: 'painterly-storybook',
    label: 'Painterly Storybook',
    prompt:
      'hand-painted storybook environment art, unified surface language, stylized materials, painterly wear, broad readable forms',
    negativePrompt: '',
    loraNotes: '',
    controlNetNotes:
      'Preserve silhouette and major surface breakup from the source asset.',
  },
  {
    id: 'ruin-cathedral-neon',
    label: 'Ruin Cathedral · Neon Rune',
    prompt:
      'dark ruin cathedral environment, sacred stone, fractured monoliths, magenta and cyan emissive rune channels, cold volumetric haze, monumental forms, restrained sci-fantasy glow, painterly surfaces',
    negativePrompt: '',
    loraNotes: 'Emphasize rune emissives and monumental ruin silhouettes.',
    controlNetNotes:
      'Preserve landmark readability and broad architecture masses.',
  },
]

export const levelStyleBatchPresets: EditorStyleBriefPreset[] = [
  {
    id: 'yggdrasil-abyssal-neon',
    label: 'Abyssal Neon Cosmic Horror',
    prompt:
      'extremely dark cosmic horror material, blackened ancient, abyssal rune-carved, magenta and violet neon fissures, cold pink-purple emissive veins, starless depth, drowned shrine surfaces, monumental age, painterly but legible, strong silhouette hierarchy, selective luminous accents only, uncanny sacred dread',
    negativePrompt:
      'daylight, cheerful fantasy, bright saturated rainbow everywhere, literal tree branches replacing everything, photorealistic bark noise, modern clean architecture, sci-fi panels, plastic surfaces, glossy toy materials, cluttered microdetail, cozy forest, warm pastoral fantasy, cute bioluminescence',
    loraNotes:
      'Favor blackened, abyssal, violet-magenta rune glow, cosmic dread, and monumental sacred',
    controlNetNotes:
      'Preserve silhouette, traversal readability, climbability, collision anchors, route legibility, and the overwhelming mass of the world-tree. Keep emissive accents selective so the magenta and violet lights feel rare and ominous.',
  },
]

export function getStyleBatchPresetById(presetId: string | null | undefined) {
  if (!presetId) return null
  return (
    levelStyleBatchPresets.find(preset => preset.id === presetId) ??
    stylePresetOptions.find(preset => preset.id === presetId) ??
    null
  )
}

function getStyleCandidateKindLabel(node: EditorSceneNode) {
  if (node.asset) return 'Imported asset'
  if (node.prefab) return `Prefab · ${node.prefab.type}`
  if (node.primitive) return `Primitive · ${node.primitive.geometry}`
  return node.kind
}

function isCuratedStyleCandidate(node: EditorSceneNode) {
  if (node.generation?.styleBatch === 'exclude') return false
  if (node.gameplay) return false
  if (node.prefab?.type === 'story-marker') return false
  if (node.prefab?.type === 'portal-apparatus') return false
  if (node.prefab?.type === 'observation-rig') return false
  return true
}

export function buildStyleSceneCandidates(
  nodes: EditorSceneNode[],
  selectedIds: string[],
  statusById: Record<string, string>,
  getDescriptor: (node: EditorSceneNode) => string,
): EditorStyleSceneCandidate[] {
  return nodes
    .filter(node => canBakeSceneNode(node))
    .map(node => ({
      id: node.id,
      name: node.name,
      kindLabel: getStyleCandidateKindLabel(node),
      descriptor: getDescriptor(node),
      selected: selectedIds.includes(node.id),
      status: statusById[node.id] ?? '',
    }))
}

export function getCuratedStyleBatchCandidateIds(nodes: EditorSceneNode[]) {
  return nodes
    .filter(node => canBakeSceneNode(node) && isCuratedStyleCandidate(node))
    .map(node => node.id)
}

export function reconcileStyleBatchSelection(
  candidates: EditorStyleSceneCandidate[],
  selectedIds: string[],
  initialized: boolean,
  getDefaultSelectedIds: () => string[],
): EditorStyleBatchSelectionState {
  const candidateIds = candidates.map(candidate => candidate.id)
  const candidateIdSet = new Set(candidateIds)
  const retained = selectedIds.filter(id => candidateIdSet.has(id))

  if (
    (!initialized ||
      (candidateIds.length > 0 &&
        retained.length === 0 &&
        selectedIds.length > 0)) &&
    candidateIds.length > 0
  ) {
    return {
      selectedIds: getDefaultSelectedIds(),
      initialized: true,
    }
  }

  if (retained.length !== selectedIds.length) {
    return {
      selectedIds: retained,
      initialized,
    }
  }

  if (candidateIds.length === 0) {
    return {
      selectedIds,
      initialized: false,
    }
  }

  return {
    selectedIds,
    initialized,
  }
}
