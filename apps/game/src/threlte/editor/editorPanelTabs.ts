export type EditorPanelTab =
  | 'scene'
  | 'create'
  | 'world'
  | 'npc'
  | 'performance'
  | 'bake'
  | 'collision'
  | 'build'
  | 'ai'

export type EditorPanelTabItem = {
  id: EditorPanelTab
  icon: string
  label: string
  description?: string
}
