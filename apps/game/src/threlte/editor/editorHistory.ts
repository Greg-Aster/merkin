import { derived, get, writable } from 'svelte/store'

export interface EditorHistoryState<TDocument> {
  document: TDocument
  changed: boolean
}

export interface CreateEditorHistoryOptions<TDocument> {
  clone: (document: TDocument | null) => TDocument | null
}

export function createEditorHistory<TDocument>(
  options: CreateEditorHistoryOptions<TDocument>,
) {
  const undoStackStore = writable<TDocument[]>([])
  const redoStackStore = writable<TDocument[]>([])
  const canUndoStore = derived(undoStackStore, $undo => $undo.length > 0)
  const canRedoStore = derived(redoStackStore, $redo => $redo.length > 0)

  let transactionDepth = 0

  function pushUndoSnapshot(document: TDocument | null) {
    if (!document) return
    undoStackStore.update(stack => [...stack, options.clone(document)!])
  }

  function clearRedoStack() {
    redoStackStore.set([])
  }

  function prepareForMutation(current: TDocument | null) {
    if (!current) return false

    if (transactionDepth === 0) {
      pushUndoSnapshot(current)
      clearRedoStack()
    }

    return true
  }

  function reset() {
    undoStackStore.set([])
    redoStackStore.set([])
    transactionDepth = 0
  }

  function startTransaction(current: TDocument | null) {
    if (transactionDepth === 0) {
      pushUndoSnapshot(current)
      clearRedoStack()
    }

    transactionDepth += 1
  }

  function endTransaction() {
    transactionDepth = Math.max(0, transactionDepth - 1)
  }

  function undo(current: TDocument | null): EditorHistoryState<TDocument> {
    const undoStack = get(undoStackStore)
    if (undoStack.length === 0 || !current) {
      return {
        document: current as TDocument,
        changed: false,
      }
    }

    const previous = undoStack[undoStack.length - 1]
    undoStackStore.set(undoStack.slice(0, -1))
    redoStackStore.update(stack => [...stack, options.clone(current)!])

    return {
      document: options.clone(previous)!,
      changed: true,
    }
  }

  function redo(current: TDocument | null): EditorHistoryState<TDocument> {
    const redoStack = get(redoStackStore)
    if (redoStack.length === 0 || !current) {
      return {
        document: current as TDocument,
        changed: false,
      }
    }

    const next = redoStack[redoStack.length - 1]
    redoStackStore.set(redoStack.slice(0, -1))
    undoStackStore.update(stack => [...stack, options.clone(current)!])

    return {
      document: options.clone(next)!,
      changed: true,
    }
  }

  return {
    canUndoStore,
    canRedoStore,
    reset,
    prepareForMutation,
    startTransaction,
    endTransaction,
    undo,
    redo,
  }
}
