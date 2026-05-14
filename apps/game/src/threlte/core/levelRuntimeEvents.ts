import type { Vec3 } from '../engine/types'

export interface StaticWorldReadyDetail {
  levelId: string
  source:
    | 'scene-document'
    | 'scene-document-terrain'
    | 'terrain-runtime'
    | 'component-level'
    | 'editor-live-playtest'
  metadata?: Record<string, unknown>
}

export interface PlayerLevelPositionDetail {
  levelId: string
  position: Vec3
  rotation?: Vec3
  reason:
    | 'level_load'
    | 'level_transition'
    | 'editor_preview'
    | 'editor_playtest'
  metadata?: Record<string, unknown>
}
