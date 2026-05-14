import { DEFAULT_LEVEL_ID } from '../levels/levelRegistry'

export type NormalizeLevelId = (levelId: string | null | undefined) => string

export type GameShellRouteState = {
  shouldEnableEditor: boolean
  shouldShowDebugPanel: boolean
  levelParam: string | null
  roomName: string
  deprecatedJoinParam: string
}

export type GameShellBootstrapState = GameShellRouteState & {
  requestedLevelId: string
  initialLevelId: string | null
  isMobileDevice: boolean
}

function getUrlFlagValue(params: URLSearchParams, key: string) {
  return params.get(key)?.trim().replace(/\/+$/, '') ?? ''
}

function isUrlFlagEnabled(params: URLSearchParams, key: string) {
  return getUrlFlagValue(params, key) === '1'
}

export function getGameShellRouteState(search = ''): GameShellRouteState {
  const params = new URLSearchParams(search)

  return {
    shouldEnableEditor: isUrlFlagEnabled(params, 'editor'),
    shouldShowDebugPanel: isUrlFlagEnabled(params, 'debug'),
    levelParam: params.get('level'),
    roomName: params.get('room')?.trim() ?? '',
    deprecatedJoinParam: params.get('join')?.trim() ?? '',
  }
}

export function isMobileUserAgent(userAgent: string) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    userAgent,
  )
}

export function createGameShellBootstrapState({
  currentLevel,
  normalizeLevelId,
  search = '',
  userAgent = '',
}: {
  currentLevel: string | null | undefined
  normalizeLevelId: NormalizeLevelId
  search?: string
  userAgent?: string
}): GameShellBootstrapState {
  const routeState = getGameShellRouteState(search)
  const requestedLevelId = normalizeLevelId(routeState.levelParam)
  const initialLevelId =
    requestedLevelId !== DEFAULT_LEVEL_ID
      ? requestedLevelId
      : !currentLevel
        ? DEFAULT_LEVEL_ID
        : null

  return {
    ...routeState,
    requestedLevelId,
    initialLevelId,
    isMobileDevice: isMobileUserAgent(userAgent),
  }
}

export function createRoomJoinLoadingMessage(roomName: string) {
  return `Joining room "${roomName}"...`
}

export function createRoomJoinErrorMessage(roomName: string) {
  return `Failed to join room "${roomName}". Please try again.`
}

export function createDeprecatedJoinErrorMessage() {
  return 'Direct host ID joining is no longer supported. Please use room names instead.'
}
