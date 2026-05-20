type RuntimeComponent = any

type EditorSessionState = {
  enabled: boolean
  collisionOverlayEnabled: boolean
  viewportMode?: 'edit' | 'playtest'
}

export type RuntimeEditorFeatureComponents = {
  editorPanelComponent: RuntimeComponent
  editorControlsOverlayComponent: RuntimeComponent
  editorCircleSelectOverlayComponent: RuntimeComponent
  editorMarqueeOverlayComponent: RuntimeComponent
  editorSceneLayerComponent: RuntimeComponent
  editorTerrainSculptLayerComponent: RuntimeComponent
  editorViewportControlsComponent: RuntimeComponent
  editorWorkbenchLightingComponent: RuntimeComponent
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

let editorUiCssLoaded = false
let editorUiCssPromise: Promise<void> | null = null

async function loadEditorUiCss() {
  if (editorUiCssLoaded || typeof document === 'undefined') return

  if (!editorUiCssPromise) {
    editorUiCssPromise = import('./editor-ui.css?inline')
      .then(module => {
        const styleId = 'game-editor-ui-css'
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style')
          style.id = styleId
          style.textContent = (module as any).default ?? ''
          document.head.appendChild(style)
        }
        editorUiCssLoaded = true
      })
      .catch(error => {
        editorUiCssPromise = null
        throw error
      })
  }

  return editorUiCssPromise
}

export function createGameEditorFeatureLoader() {
  let sceneLayerComponent: RuntimeComponent | null = null
  let sceneLayerComponentPromise: Promise<RuntimeComponent> | null = null
  let editorFeatures: RuntimeEditorFeatureComponents | null = null
  let editorFeaturesPromise: Promise<RuntimeEditorFeatureComponents> | null =
    null

  return {
    async loadSceneLayerComponent() {
      if (sceneLayerComponent) return sceneLayerComponent

      if (!sceneLayerComponentPromise) {
        sceneLayerComponentPromise = import('./EditorSceneLayer.svelte')
          .then(module => {
            sceneLayerComponent = getModuleDefault(module, 'editor scene layer')
            return sceneLayerComponent
          })
          .catch(error => {
            sceneLayerComponentPromise = null
            throw error
          })
      }

      return sceneLayerComponentPromise
    },

    async loadEditorFeatures() {
      if (editorFeatures) return editorFeatures

      if (!editorFeaturesPromise) {
        await loadEditorUiCss()
        editorFeaturesPromise = Promise.all([
          import('./EditorPanel.svelte'),
          import('./EditorControlsOverlay.svelte'),
          import('./EditorCircleSelectOverlay.svelte'),
          import('./EditorMarqueeOverlay.svelte'),
          import('./EditorSceneLayer.svelte'),
          import('./EditorViewportControls.svelte'),
          import('./EditorWorkbenchLighting.svelte'),
        ])
          .then(
            ([
              editorPanelModule,
              editorControlsOverlayModule,
              editorCircleSelectOverlayModule,
              editorMarqueeOverlayModule,
              editorSceneLayerModule,
              editorViewportControlsModule,
              editorWorkbenchLightingModule,
            ]) => {
              editorFeatures = {
                editorPanelComponent: getModuleDefault(
                  editorPanelModule,
                  'editor panel',
                ),
                editorControlsOverlayComponent: getModuleDefault(
                  editorControlsOverlayModule,
                  'editor controls overlay',
                ),
                editorCircleSelectOverlayComponent: getModuleDefault(
                  editorCircleSelectOverlayModule,
                  'editor circle select overlay',
                ),
                editorMarqueeOverlayComponent: getModuleDefault(
                  editorMarqueeOverlayModule,
                  'editor marquee overlay',
                ),
                editorSceneLayerComponent: getModuleDefault(
                  editorSceneLayerModule,
                  'editor scene layer',
                ),
                editorTerrainSculptLayerComponent: null,
                editorViewportControlsComponent: getModuleDefault(
                  editorViewportControlsModule,
                  'editor viewport controls',
                ),
                editorWorkbenchLightingComponent: getModuleDefault(
                  editorWorkbenchLightingModule,
                  'editor workbench lighting',
                ),
              }
              sceneLayerComponent = editorFeatures.editorSceneLayerComponent
              return editorFeatures
            },
          )
          .catch(error => {
            editorFeaturesPromise = null
            throw error
          })
      }

      return editorFeaturesPromise
    },

    async enableEditorSession(onState: (state: EditorSessionState) => void) {
      const module = await import('./editorSessionStore')
      const unsubscribe = module.editorStateStore.subscribe(onState)

      module.initializeEditor(true)
      return () => {
        module.initializeEditor(false)
        unsubscribe()
      }
    },
  }
}
