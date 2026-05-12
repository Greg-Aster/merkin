import { writable } from 'svelte/store'

export const heightmapSourcePreviewNodeIdsStore = writable<string[]>([])

export function setHeightmapSourcePreviewNodeIds(nodeIds: string[]) {
  heightmapSourcePreviewNodeIdsStore.set(nodeIds)
}

export function clearHeightmapSourcePreviewNodeIds() {
  heightmapSourcePreviewNodeIdsStore.set([])
}
