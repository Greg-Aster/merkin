import { Howler } from 'howler'

export function ensureHowlerAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null

  if (!Howler.ctx && Howler.usingWebAudio !== false) {
    Howler.volume()
  }

  return Howler.ctx ?? null
}

export function canUnlockWithoutHowlerContext(): boolean {
  return Howler.usingWebAudio === false
}
