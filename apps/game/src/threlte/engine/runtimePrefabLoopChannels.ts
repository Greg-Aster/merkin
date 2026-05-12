import type { RuntimePrefabLoopChannel } from './runtimePrefabTypes'

export function evaluateRuntimePrefabLoopChannel(
  channel: RuntimePrefabLoopChannel | undefined,
  base: number,
  time: number,
) {
  if (!channel) return base

  const origin = channel.base ?? base
  const phase = channel.phase ?? 0
  const amplitude = channel.amplitude
  if (typeof amplitude === 'number' && Number.isFinite(amplitude)) {
    return origin + Math.sin(time * channel.speed + phase) * amplitude
  }
  return origin + time * channel.speed
}
