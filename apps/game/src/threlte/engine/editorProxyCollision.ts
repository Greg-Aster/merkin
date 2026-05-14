function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

export function isEditorProxyCollision(
  collision: unknown,
): boolean {
  if (!isRecord(collision)) return false
  return (
    collision.proxy === true ||
    collision.bakeStatus === 'needsBake' ||
    collision.bakeStatus === 'stale'
  )
}

export function isEditorProxyCollisionNeedingBake(
  collision: unknown,
): boolean {
  if (!isRecord(collision)) return false
  return collision.proxy === true || collision.bakeStatus === 'needsBake'
}
