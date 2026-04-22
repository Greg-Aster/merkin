<script lang="ts">
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

<style>
  .banner-stage-lab {
    display: grid;
    gap: 1rem;
  }

  .banner-stage-lab__status {
    display: grid;
    gap: 0.9rem;
    padding: 1rem 1.1rem;
    border-radius: 1rem;
    background: rgba(2, 6, 12, 0.72);
    border: 1px solid rgba(148, 163, 184, 0.14);
    color: rgba(226, 232, 240, 0.9);
  }

  .banner-stage-lab__label {
    margin: 0;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: rgba(148, 163, 184, 0.78);
  }

  .banner-stage-lab__value {
    margin: 0.35rem 0 0;
    font-size: 0.95rem;
    line-height: 1.6;
    word-break: break-word;
  }

  button {
    justify-self: start;
    border: 0;
    border-radius: 999px;
    padding: 0.75rem 1rem;
    background: rgba(51, 65, 85, 0.92);
    color: rgba(241, 245, 249, 0.94);
    font: inherit;
    cursor: pointer;
  }
</style>

