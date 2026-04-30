<script lang="ts">
import '../../styles/features/banner-stage/banner-stage-lab.css'
import BannerStage from './BannerStage.svelte'
import { mockBannerStageRegistry } from './mock-scenes/mockRegistry'
import type { BannerSceneEvent } from './types'

let latestEvent = $state<BannerSceneEvent | null>(null)
let currentSceneId = $state<string | null>(null)

function handleSceneEvent(event: BannerSceneEvent) {
  latestEvent = event
}

function handleSceneSelected(sceneId: string | null) {
  currentSceneId = sceneId
}

function resetStageCookie() {
  document.cookie =
    'megameal_banner_stage_history=%5B%5D; Path=/; Max-Age=1; SameSite=Lax'
  window.location.reload()
}
</script>

<div class="banner-stage-lab">
  <BannerStage
    registry={mockBannerStageRegistry}
    pagePath="/labs/banner-stage/"
    randomize={true}
    cookie={typeof document === 'undefined' ? '' : document.cookie}
    debug={true}
    onSceneEvent={handleSceneEvent}
    onSceneSelected={handleSceneSelected}
    themeTokens={{
      accent: '#38bdf8',
      accentAlt: '#34d399',
      surface: '#08121f',
    }}
  />

  <section class="banner-stage-lab__status">
    <div>
      <p class="banner-stage-lab__label">Current Scene</p>
      <p class="banner-stage-lab__value">{currentSceneId ?? 'none'}</p>
    </div>
    <div>
      <p class="banner-stage-lab__label">Latest Event</p>
      <p class="banner-stage-lab__value">
        {latestEvent ? JSON.stringify(latestEvent) : 'No scene event emitted yet.'}
      </p>
    </div>
    <button type="button" onclick={resetStageCookie}>Clear Rotation Cookie</button>
  </section>
</div>

