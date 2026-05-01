import type { Vec3 } from '../engine'

export interface StaticWorldReadyDetail {
  levelId: string
  source:
    | 'scene-document'
    | 'scene-document-terrain'
    | 'terrain-runtime'
    | 'component-level'
  metadata?: Record<string, unknown>
}

export interface PlayerLevelPositionDetail {
  levelId: string
  position: Vec3
  reason: 'level_load' | 'level_transition' | 'editor_preview'
  metadata?: Record<string, unknown>
}
