type RuntimeComponent = any

export type RuntimeGameplayCoreComponents = {
  physicsSystemComponent: RuntimeComponent
  playerComponentClass: RuntimeComponent
}

export type RuntimeMultiplayerFeatures = {
  multiplayerManagerComponent: RuntimeComponent
  initializeClientFn: (roomName: string) => void
}

function getModuleDefault<T>(module: T | undefined | null, label: string) {
  if (
    !module ||
    typeof module !== 'object' ||
    !('default' in module) ||
    !(module as any).default
  ) {
    throw new Error(`Failed to load ${label}.`)
  }

  return (module as any).default
}

export function createGameRuntimeFeatureLoader() {
  const levelComponentCache = new Map<string, RuntimeComponent>()
  let gameplayCore: RuntimeGameplayCoreComponents | null = null
  let gameplayCorePromise: Promise<RuntimeGameplayCoreComponents> | null = null
  let multiplayerFeatures: RuntimeMultiplayerFeatures | null = null

  return {
    async loadLevelComponent(cacheKey: string) {
      const cached = levelComponentCache.get(cacheKey)
      if (cached) return cached

      const module = await import('../levels/SceneDocumentLevel.svelte')
      const component = getModuleDefault(module, 'scene document level')
      levelComponentCache.set(cacheKey, component)
      return component
    },

    async loadSettingsPanelComponent() {
      const module = await import('../ui/SettingsPanel.svelte')
      return getModuleDefault(module, 'settings panel')
    },

    async loadConversationDialogComponent() {
      const module = await import('../features/conversation/ui')
      return getModuleDefault(module, 'conversation dialog')
    },

    async loadRuntimeDiagnosticsPanelComponent() {
      const module = await import('../ui/RuntimeDiagnosticsPanel.svelte')
      return getModuleDefault(module, 'runtime diagnostics panel')
    },

    async loadChatBoxComponent() {
      const module = await import('../features/multiplayer/ui/ChatBox.svelte')
      return getModuleDefault(module, 'chat box')
    },

    async loadAudioSystemComponent() {
      const module = await import('../systems/Audio.svelte')
      return getModuleDefault(module, 'audio system')
    },

    async loadGameplayCore() {
      if (gameplayCore) return gameplayCore

      if (!gameplayCorePromise) {
        gameplayCorePromise = Promise.all([
          import('../systems/Physics.svelte'),
          import('../features/player/Player.svelte'),
        ])
          .then(([physicsModule, playerModule]) => {
            gameplayCore = {
              physicsSystemComponent: getModuleDefault(
                physicsModule,
                'physics system',
              ),
              playerComponentClass: getModuleDefault(
                playerModule,
                'player component',
              ),
            }
            return gameplayCore
          })
          .catch(error => {
            gameplayCorePromise = null
            throw error
          })
      }

      return gameplayCorePromise
    },

    async loadMultiplayerFeatures() {
      if (multiplayerFeatures) return multiplayerFeatures

      const [componentModule, serviceModule] = await Promise.all([
        import('../features/multiplayer/components/MultiplayerManager.svelte'),
        import('../features/multiplayer/services/MultiplayerService'),
      ])

      multiplayerFeatures = {
        multiplayerManagerComponent: getModuleDefault(
          componentModule,
          'multiplayer manager',
        ),
        initializeClientFn: serviceModule.initializeClient,
      }

      return multiplayerFeatures
    },
  }
}
