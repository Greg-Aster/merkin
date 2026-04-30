<script lang="ts">
import { onMount } from 'svelte'
import { writable } from 'svelte/store'
import { fade } from 'svelte/transition'
import '../../styles/features/banner-stage/banner-stage.css'
import { setBannerStageContext } from './context'
import { type BannerStageRegistry, bannerStageRegistry } from './registry'
import {
  BANNER_STAGE_HISTORY_COOKIE,
  chooseSceneFromRegistry,
  isSceneEligibleForPage,
  serializeSceneHistoryCookie,
} from './rotation'
import type {
  BannerSceneComponent,
  BannerSceneEvent,
  BannerStageAudioBus,
  BannerStageGlobalState,
  BannerStageTransition,
  SceneDefinition,
  SceneProps,
} from './types'

interface Props {
  registry?: BannerStageRegistry
  sceneId?: string | null
  pagePath?: string
  randomize?: boolean
  cookie?: string
  cookieName?: string
  historyLimit?: number
  sceneProps?: Record<string, unknown>
  themeTokens?: Record<string, string>
  audioBus?: BannerStageAudioBus
  globalState?: BannerStageGlobalState
  transition?: BannerStageTransition
  fallbackText?: string
  class?: string
  debug?: boolean
  onSceneEvent?: ((event: BannerSceneEvent) => void) | null
  onSceneSelected?: ((sceneId: string | null) => void) | null
}

const {
  registry = bannerStageRegistry,
  sceneId = null,
  pagePath = '/',
  randomize = false,
  cookie = '',
  cookieName = BANNER_STAGE_HISTORY_COOKIE,
  historyLimit = 12,
  sceneProps = {},
  themeTokens = {},
  audioBus = {},
  globalState = {},
  transition = 'fade',
  fallbackText = 'No banner scene is registered for this slot.',
  class: className = '',
  debug = false,
  onSceneEvent = null,
  onSceneSelected = null,
}: Props = $props()

const currentSceneIdStore = writable<string | null>(null)

let mounted = false
let activeSceneDefinition = $state<SceneDefinition | null>(null)
let activeSceneComponent = $state<BannerSceneComponent | null>(null)
let activeSceneProps = $state<SceneProps | null>(null)
let activeTransition = $state<BannerStageTransition>(transition)
let isLoading = $state(true)
let errorMessage = $state<string | null>(null)
let renderKey = $state('stage-empty')

async function activateScene(nextSceneId: string) {
  const definition = registry.get(nextSceneId)
  if (!definition) {
    errorMessage = `Scene "${nextSceneId}" is not registered.`
    activeSceneDefinition = null
    activeSceneComponent = null
    activeSceneProps = null
    currentSceneIdStore.set(null)
    return
  }

  isLoading = true
  errorMessage = null

  try {
    const module = await definition.load()
    activeSceneDefinition = definition
    activeSceneComponent = module.default
    activeTransition = definition.transition ?? transition
    activeSceneProps = {
      sceneId: definition.id,
      pagePath,
      payload: {
        ...(definition.sceneProps ?? {}),
        ...sceneProps,
      },
      themeTokens,
      audioBus,
      globalState,
      emit: handleSceneEvent,
      requestSceneChange: activateScene,
    }
    renderKey = `${definition.id}:${Date.now()}`
    currentSceneIdStore.set(definition.id)
    onSceneSelected?.(definition.id)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown scene load failure.'
    errorMessage = message
    activeSceneDefinition = null
    activeSceneComponent = null
    activeSceneProps = null
    currentSceneIdStore.set(null)
  } finally {
    isLoading = false
  }
}

function transitionDuration(value: BannerStageTransition) {
  switch (value) {
    case 'cut':
      return 0
    case 'glitch':
      return 180
    default:
      return 260
  }
}

function handleSceneEvent(event: BannerSceneEvent) {
  onSceneEvent?.(event)

  if (typeof document !== 'undefined') {
    document.dispatchEvent(
      new CustomEvent('megameal:banner-stage:event', {
        detail: {
          sceneId: activeSceneDefinition?.id ?? null,
          event,
        },
      }),
    )
  }
}

async function selectInitialScene() {
  const definitions = registry.list()
  const cookieSource =
    cookie || (typeof document !== 'undefined' ? document.cookie : '')

  if (sceneId) {
    await activateScene(sceneId)
    return
  }

  if (randomize) {
    const { selected, nextHistory } = chooseSceneFromRegistry(definitions, {
      cookie: cookieSource,
      cookieName,
      pagePath,
      historyLimit,
    })

    if (selected) {
      await activateScene(selected.id)
      if (typeof document !== 'undefined') {
        document.cookie = serializeSceneHistoryCookie(nextHistory, {
          cookieName,
        })
      }
      return
    }
  }

  const firstEligible =
    definitions.find(definition =>
      isSceneEligibleForPage(definition, pagePath),
    ) ?? null

  if (firstEligible) {
    await activateScene(firstEligible.id)
    return
  }

  isLoading = false
}

setBannerStageContext({
  themeTokens,
  audioBus,
  globalState,
  stage: {
    currentSceneId: currentSceneIdStore,
    emit: handleSceneEvent,
    navigateToScene: activateScene,
  },
})

onMount(async () => {
  mounted = true
  await selectInitialScene()
})

$effect(() => {
  if (!mounted) return
  if (!sceneId) return
  void activateScene(sceneId)
})
</script>

<div
  class={[
    'banner-stage-shell',
    activeTransition === 'glitch' ? 'banner-stage-shell--glitch' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')}
  data-scene-id={activeSceneDefinition?.id ?? ''}
>
  {#if activeSceneComponent && activeSceneProps}
    {#key renderKey}
      <div
        class="banner-stage-frame"
        transition:fade={{ duration: transitionDuration(activeTransition) }}
      >
        <activeSceneComponent {...activeSceneProps}></activeSceneComponent>
      </div>
    {/key}
  {:else if errorMessage}
    <div class="banner-stage-fallback banner-stage-fallback--error">
      <p>{errorMessage}</p>
    </div>
  {:else if isLoading}
    <div class="banner-stage-fallback">
      <p>Loading transmission stage...</p>
    </div>
  {:else}
    <div class="banner-stage-fallback">
      <p>{fallbackText}</p>
    </div>
  {/if}

  {#if debug}
    <div class="banner-stage-debug">
      <span>scene={activeSceneDefinition?.id ?? 'none'}</span>
      <span>transition={activeTransition}</span>
    </div>
  {/if}
</div>

