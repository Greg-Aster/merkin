import { derived, get, writable } from 'svelte/store'
import type { EditorSceneDocument } from '../editor/editorTypes'
import {
  adaptEditorSceneToLevelDefinition,
  createLevelBuildReport,
} from '../engine'
import initialRegistry from './level-registry.json'

export const DEFAULT_LEVEL_ID = 'observatory'

export type LevelLifecycleStatus = 'active' | 'draft' | 'archived'
export type BuiltInLevelComponentKey = 'observatory' | 'solitude'

export interface LevelRegistryComponentSource {
  kind: 'component'
  componentKey: BuiltInLevelComponentKey
}

export interface LevelRegistrySceneSource {
  kind: 'scene'
  sceneId: string
}

export type LevelRegistrySource =
  | LevelRegistryComponentSource
  | LevelRegistrySceneSource

export interface LevelRegistryStarMapSettings {
  enabled: boolean
  year: number
  era: string
  description?: string
}

export interface LevelRegistryEntry {
  id: string
  title: string
  status: LevelLifecycleStatus
  deployed: boolean
  aliases?: string[]
  source: LevelRegistrySource
  starMap?: LevelRegistryStarMapSettings
}

export interface LevelRegistryValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

const packagedSceneModules = import.meta.glob('../editor/scenes/*.scene.json', {
  eager: true,
  import: 'default',
}) as Record<string, EditorSceneDocument>

function cloneEntry<T>(value: T): T {
  return structuredClone(value)
}

function normalizeEntry(entry: LevelRegistryEntry): LevelRegistryEntry {
  return {
    ...cloneEntry(entry),
    aliases: Array.from(new Set((entry.aliases ?? []).filter(Boolean))),
  }
}

function normalizeEntries(entries: LevelRegistryEntry[]): LevelRegistryEntry[] {
  const normalized = entries.map(normalizeEntry)
  const uniqueEntries = new Map<string, LevelRegistryEntry>()

  for (const entry of normalized) {
    uniqueEntries.set(entry.id, entry)
  }

  if (!uniqueEntries.has(DEFAULT_LEVEL_ID)) {
    uniqueEntries.set(DEFAULT_LEVEL_ID, {
      id: DEFAULT_LEVEL_ID,
      title: 'Observatory',
      status: 'active',
      deployed: true,
      source: { kind: 'component', componentKey: 'observatory' },
      aliases: [
        'observatory-level',
        'hybrid-observatory',
        'hybrid-observatory-level',
      ],
      starMap: {
        enabled: true,
        year: 2150,
        era: 'unknown',
        description: 'Travel to the Observatory',
      },
    })
  }

  return Array.from(uniqueEntries.values())
}

export const levelRegistryStore = writable<LevelRegistryEntry[]>(
  normalizeEntries(initialRegistry as LevelRegistryEntry[]),
)

export const playableLevelsStore = derived(levelRegistryStore, $entries =>
  $entries.filter(entry => entry.deployed),
)

export const starMapLevelsStore = derived(levelRegistryStore, $entries =>
  $entries.filter(entry => entry.deployed && entry.starMap?.enabled),
)

export function sanitizeLevelId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function setLevelRegistry(entries: LevelRegistryEntry[]) {
  levelRegistryStore.set(normalizeEntries(entries))
}

export function getLevelRegistry() {
  return get(levelRegistryStore)
}

export function upsertLevelRegistryEntry(entry: LevelRegistryEntry) {
  const normalizedEntry = normalizeEntry(entry)
  levelRegistryStore.update(entries => {
    const nextEntries = entries.filter(
      candidate => candidate.id !== normalizedEntry.id,
    )
    nextEntries.push(normalizedEntry)
    return normalizeEntries(nextEntries)
  })
}

export function getLevelRegistryEntry(
  levelId: string | null | undefined,
  entries = getLevelRegistry(),
) {
  if (!levelId) {
    return (
      entries.find(entry => entry.id === DEFAULT_LEVEL_ID) ?? entries[0] ?? null
    )
  }

  return (
    entries.find(entry => entry.id === levelId) ??
    entries.find(entry => entry.aliases?.includes(levelId)) ??
    null
  )
}

export function resolveLevelId(
  levelId: string | null | undefined,
  entries = getLevelRegistry(),
) {
  const matched = getLevelRegistryEntry(levelId, entries)
  return matched?.id ?? DEFAULT_LEVEL_ID
}

export function isPlayableLevel(
  levelId: string | null | undefined,
  entries = getLevelRegistry(),
) {
  const matched = getLevelRegistryEntry(levelId, entries)
  return Boolean(matched?.deployed)
}

function getPackagedRegistryScene(sceneId: string) {
  const match = Object.entries(packagedSceneModules).find(([path]) =>
    path.endsWith(`/${sceneId}.scene.json`),
  )
  return match ? (structuredClone(match[1]) as EditorSceneDocument) : null
}

export function validateLevelRegistryEntry(
  entry: LevelRegistryEntry,
): LevelRegistryValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!entry.id.trim()) {
    errors.push('Level registry entry has an empty id.')
  }

  if (!entry.title.trim()) {
    errors.push(`${entry.id}: title is empty.`)
  }

  if (entry.source.kind === 'component') {
    if (!['observatory', 'solitude'].includes(entry.source.componentKey)) {
      errors.push(`${entry.id}: unknown component source.`)
    }
    warnings.push(
      `${entry.id}: component source is not LevelDefinition-backed yet.`,
    )
    return { valid: errors.length === 0, errors, warnings }
  }

  const scene = getPackagedRegistryScene(entry.source.sceneId)
  if (!scene) {
    errors.push(`${entry.id}: missing packaged scene ${entry.source.sceneId}.`)
    return { valid: false, errors, warnings }
  }

  const levelDefinition = adaptEditorSceneToLevelDefinition(scene)
  const buildReport = createLevelBuildReport(levelDefinition)
  errors.push(...buildReport.errors)
  warnings.push(...buildReport.warnings)

  if (levelDefinition.id !== entry.id) {
    warnings.push(
      `${entry.id}: registry id differs from LevelDefinition id ${levelDefinition.id}.`,
    )
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

export function isLevelRegistryEntryValidForStarMap(entry: LevelRegistryEntry) {
  return validateLevelRegistryEntry(entry).valid
}

export function createStarMapLevelEvents(entries = getLevelRegistry()) {
  return entries
    .filter(
      entry =>
        entry.deployed &&
        entry.starMap?.enabled &&
        isLevelRegistryEntryValidForStarMap(entry),
    )
    .map(entry => ({
      id: `level-star-${entry.id}`,
      uniqueId: `level-star-${entry.id}`,
      title: entry.title,
      description: entry.starMap?.description ?? `Enter ${entry.title}`,
      slug: null,
      year: entry.starMap?.year ?? 2100,
      era: 'level-portals',
      isLevel: true,
      levelId: entry.id,
      isKeyEvent: false,
      category: 'level',
    }))
}
