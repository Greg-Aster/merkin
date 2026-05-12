export type EditorPanelTab =
  | 'workflow'
  | 'scene'
  | 'collision'
  | 'environment'
  | 'player'
  | 'create'
  | 'hierarchy'
  | 'inspect'
  | 'style'
  | 'ai'
  | 'save'

export type EditorPanelTabItem = {
  id: EditorPanelTab
  icon: string
  label: string
}
