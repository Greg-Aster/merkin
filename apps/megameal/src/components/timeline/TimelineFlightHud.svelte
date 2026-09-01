<script lang="ts">
import { formatTimelineYear } from '@merkin/shared-content'
import type {
  TimelineCarouselScreen,
  TimelinePortalEvent,
} from './timelinePortalCarouselModel'
import type { TimelineStarScreenPosition } from './timelinePortalPresentation'

export let lockEvent: TimelinePortalEvent | null = null
export let lockScreen: TimelineCarouselScreen | null = null
export let lockPosition: TimelineStarScreenPosition | null = null
export let lockIsVisited = false
export let isBoosting = false
export let visitedCount = 0
export let totalCount = 0
export let eraName = ''
export let eraTransitionName = ''
export let eraTransitionSequence = 0
export let eraTransitionVisible = false

$: hasVisibleLock = Boolean(lockEvent && lockScreen && lockPosition?.visible)
$: lockStyle = lockPosition
  ? `--timeline-lock-x: ${lockPosition.x}%; --timeline-lock-y: ${lockPosition.y}%; --timeline-lock-size: ${Math.max(68, lockPosition.size + 30)}px`
  : ''
</script>

<div class="timeline-flight-hud" data-timeline-flight-hud>
  <div
    class="timeline-flight-hud__atmosphere"
    class:timeline-flight-hud__atmosphere--boosting={isBoosting}
    aria-hidden="true"
  ></div>

  <div
    class="timeline-flight-hud__temporal-lens"
    data-timeline-temporal-lens
    aria-hidden="true"
  ></div>

  <section
    class="timeline-flight-hud__progress"
    aria-label={`${visitedCount} of ${totalCount} timeline records visited`}
    data-timeline-discovery
  >
    <span>Accessed</span>
    <strong>{visitedCount}<small>/{totalCount}</small></strong>
  </section>

  <div
    class="timeline-flight-hud__lock"
    class:timeline-flight-hud__lock--visible={hasVisibleLock}
    class:timeline-flight-hud__lock--visited={lockIsVisited}
    class:timeline-flight-hud__lock--label-left={Boolean(lockPosition && lockPosition.x < 50)}
    class:timeline-flight-hud__lock--label-right={Boolean(lockPosition && lockPosition.x >= 50)}
    style={lockStyle}
    data-timeline-lock-on
    aria-hidden="true"
  >
    <i></i><i></i><i></i><i></i>
    {#if lockEvent && lockScreen}
      <div class="timeline-flight-hud__lock-label">
        <span>{lockIsVisited ? 'Record accessed' : 'Signal acquired'}</span>
        <strong>{formatTimelineYear(lockEvent.year)}</strong>
        <small>{lockScreen.eraKey.replaceAll('-', ' ')}</small>
      </div>
    {/if}
  </div>

  <div
    class="timeline-flight-hud__era"
    class:timeline-flight-hud__era--visible={eraTransitionVisible}
    aria-live="polite"
    aria-atomic="true"
    data-timeline-era-transition
  >
    {#if eraTransitionVisible}
      {#key eraTransitionSequence}
        <div>
          <span>Entering chronology sector</span>
          <strong>{eraTransitionName}</strong>
        </div>
      {/key}
    {/if}
  </div>

  <p class="sr-only" aria-live="polite">
    {isBoosting ? 'Timeline boost engaged.' : ''}
    {eraName ? `Current era: ${eraName}.` : ''}
  </p>
</div>
