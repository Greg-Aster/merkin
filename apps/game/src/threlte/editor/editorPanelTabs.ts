export type EditorPanelTab =
  | 'workflow'
  | 'scene'
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
