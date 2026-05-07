<script lang="ts">
import type {
  TimelineCarouselScreen,
  TimelinePortalEvent,
} from './timelinePortalCarouselModel'

export let selectedScreen: TimelinePortalEvent | null = null
export let selectedScreenView: TimelineCarouselScreen | null = null
export let selectedCardStyle = ''
export let selectedStatusStyle = ''
</script>

{#if selectedScreen && selectedScreenView}
  <div class="home-intro-copy home-intro-copy--status" style={selectedStatusStyle} aria-live="polite">
    <div class="home-intro-copy__label">{selectedScreenView.kicker}</div>
    <div class="home-intro-copy__stat">{selectedScreenView.stat}</div>
  </div>

  <aside
    class="home-intro-copy home-intro-copy--feature"
    style={selectedCardStyle}
    aria-label={`Timeline event: ${selectedScreen.title}`}
    data-timeline-selected-card
    data-timeline-interactive
  >
    <div class="home-intro-copy__label">{selectedScreenView.kicker}</div>
    {#if selectedScreenView.stillSrc}
      <img
        class="aspect-video w-full rounded-md border border-white/15 object-cover shadow-[0_0.8rem_1.8rem_rgb(0_0_0_/_0.32)]"
        src={selectedScreenView.stillSrc}
        alt=""
        loading="lazy"
      />
    {/if}
    <h2>{selectedScreen.title}</h2>
    <p>{selectedScreen.description}</p>
    {#if selectedScreen.url}
      <a
        href={selectedScreen.url}
        class="home-intro-copy__button"
        data-sfx-hover="portal-hover"
        data-sfx-click="portal-activate"
      >
        Open Record
      </a>
    {/if}
  </aside>
{/if}
