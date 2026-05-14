import type { EditorPanelTab } from './editorPanelTabs'

export type EditorCommandCategory =
  | 'Selection'
  | 'Transform'
  | 'View'
  | 'Object'
  | 'Create'
  | 'Asset'
  | 'World'
  | 'Collision'
  | 'Build'
  | 'AI'
  | 'Diagnostics'

export type EditorCommandStatus =
  | 'ready'
  | 'needs-selection'
  | 'offline'
  | 'experimental'
  | 'danger'

export type EditorCommand = {
  id: string
  label: string
  description: string
  category: EditorCommandCategory
  ownerWorkspace: EditorPanelTab | 'header' | 'outliner' | 'viewport'
  enabled: boolean
  disabledReason?: string
  status: EditorCommandStatus
  shortcut?: string
  run: () => void | Promise<void>
}

export const EDITOR_COMMAND_CATEGORIES: EditorCommandCategory[] = [
  'Selection',
  'Transform',
  'View',
  'Object',
  'Create',
  'Asset',
  'World',
  'Collision',
  'Build',
  'AI',
  'Diagnostics',
]

export function getEditorCommand(
  commands: EditorCommand[],
  id: string,
): EditorCommand | null {
  return commands.find(command => command.id === id) ?? null
}

export function commandMatchesQuery(command: EditorCommand, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  return [
    command.id,
    command.label,
    command.description,
    command.category,
    command.ownerWorkspace,
    command.shortcut ?? '',
    command.disabledReason ?? '',
    command.status,
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery)
}
