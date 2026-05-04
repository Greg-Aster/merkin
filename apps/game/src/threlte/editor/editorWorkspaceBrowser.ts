import { EDITOR_API_BASE } from '@config/editorApi'

export interface EditorWorkspaceEntry {
  name: string
  path: string
  isDirectory: boolean
}

export async function browseEditorWorkspace(path: string) {
  const response = await fetch(
    `${EDITOR_API_BASE}/api/browse?path=${encodeURIComponent(path)}`,
  )
  const payload = await response.json()
  if (!payload?.success) {
    throw new Error(payload?.message ?? `Failed to browse ${path}`)
  }
  return Array.isArray(payload.items)
    ? (payload.items as EditorWorkspaceEntry[])
    : []
}

export function sortWorkspaceEntriesByDirectoryAndName<
  T extends EditorWorkspaceEntry,
>(entries: T[]) {
  return [...entries].sort(
    (a, b) =>
      Number(b.isDirectory) - Number(a.isDirectory) ||
      a.name.localeCompare(b.name),
  )
}

export function resolvePublicAssetUrl(path: string, fallbackName: string) {
  const publicPrefixes = ['apps/game/public/', 'apps/megameal/public/']
  const matchedPrefix = publicPrefixes.find(prefix => path.startsWith(prefix))
  if (matchedPrefix) {
    return `/${path.slice(matchedPrefix.length)}`
  }

  return `/${fallbackName}`
}

export function getPublicAssetDirectoryPath(assetUrl: string) {
  if (typeof assetUrl !== 'string' || !assetUrl.startsWith('/')) return ''
  const normalized = assetUrl.replace(/^\/+/, '')
  const workspacePath = `apps/megameal/public/${normalized}`
  return workspacePath.replace(/\/[^/]+$/, '')
}

export function isModelWorkspaceEntry(entry: EditorWorkspaceEntry) {
  return entry.isDirectory || /\.(gltf|glb)$/i.test(entry.name)
}

export function isGeneratedModelFile(entry: EditorWorkspaceEntry) {
  return !entry.isDirectory && /\.(glb|gltf)$/i.test(entry.name)
}

export function isJsonWorkspaceEntry(entry: EditorWorkspaceEntry) {
  return entry.isDirectory || /\.json$/i.test(entry.name)
}
