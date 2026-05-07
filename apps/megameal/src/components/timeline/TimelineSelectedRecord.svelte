<script lang="ts">
import type {
  TimelineCarouselScreen,
  TimelinePortalEvent,
} from './timelinePortalCarouselModel'
import '../../styles/features/timeline/timeline-selected-record.css'

export let selectedScreen: TimelinePortalEvent | null = null
export let selectedScreenView: TimelineCarouselScreen | null = null
export let selectedCardStyle = ''
export let selectedStatusStyle = ''

function cssUrl(value = '') {
  return `url("${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}")`
}

function formatRecordType(event: TimelinePortalEvent) {
  const source = event.contentType || event.sourceCollection || 'record'
  return `${source.replaceAll('-', ' ').replaceAll('_', ' ')} record`
}

$: selectedTypeLabel = selectedScreen ? formatRecordType(selectedScreen) : ''
$: selectedBackgroundStyle = selectedScreenView?.stillSrc
  ? `${selectedCardStyle}; --timeline-selected-bg: ${cssUrl(selectedScreenView.stillSrc)}`
  : selectedCardStyle
</script>

{#if selectedScreen && selectedScreenView}
  <div class="home-intro-copy home-intro-copy--status" style={selectedStatusStyle} aria-live="polite">
    <div class="home-intro-copy__label">{selectedScreenView.kicker}</div>
    <div class="home-intro-copy__stat">{selectedScreenView.stat}</div>
  </div>

  <svelte:element
    this={selectedScreen.url ? 'a' : 'aside'}
    href={selectedScreen.url || undefined}
    class="home-intro-copy home-intro-copy--feature home-intro-copy--timeline-selected"
    class:home-intro-copy--timeline-link={!!selectedScreen.url}
    style={selectedBackgroundStyle}
    aria-label={`Timeline event: ${selectedScreen.title}`}
    data-timeline-selected-card
    data-timeline-interactive
    data-sfx-hover={selectedScreen.url ? 'portal-hover' : undefined}
    data-sfx-click={selectedScreen.url ? 'portal-activate' : undefined}
  >
    {#if selectedScreenView.stillSrc}
      <div class="timeline-selected-record__background" aria-hidden="true"></div>
    {/if}
    <div class="timeline-selected-record__header">
      <div class="home-intro-copy__label">{selectedTypeLabel}</div>
    </div>
    <div class="timeline-selected-record__body">
      <h2>{selectedScreen.title}</h2>
    </div>
    {#if selectedScreen.url}
      <div class="timeline-selected-record__affordance" aria-hidden="true">
        <span>Open record</span>
        <span class="timeline-selected-record__affordance-icon">&gt;</span>
      </div>
    {/if}
  </svelte:element>
{/if}
