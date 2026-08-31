<script lang="ts">
import { getEraMarkerColor } from './timelinePortalCarouselModel'
import type { TimelineConstellationLine } from './timelinePortalPresentation'

export let lines: TimelineConstellationLine[] = []
export let guideLine: TimelineConstellationLine | null = null
export let isOverview = false
</script>

<svg
  class="pointer-events-none absolute inset-0 z-[4] h-full w-full"
  viewBox="0 0 100 100"
  preserveAspectRatio="none"
  aria-hidden="true"
>
  <defs>
    <filter id="timelineConstellationGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="0.65" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  {#each lines as line (line.id)}
    <line
      x1={line.x1}
      y1={line.y1}
      x2={line.x2}
      y2={line.y2}
      stroke={getEraMarkerColor(line.eraKey)}
      stroke-width={line.isActive ? 0.32 : 0.14}
      stroke-linecap="round"
      stroke-opacity={line.isActive ? (isOverview ? 0.2 : 0.12) : (isOverview ? 0.08 : 0.035)}
      filter="url(#timelineConstellationGlow)"
    />
    <line
      x1={line.x1}
      y1={line.y1}
      x2={line.x2}
      y2={line.y2}
      stroke={getEraMarkerColor(line.eraKey)}
      stroke-width={line.isActive ? 0.11 : 0.055}
      stroke-linecap="round"
      stroke-dasharray={line.isActive ? '0.75 1.55' : '0.34 1.9'}
      stroke-opacity={line.isActive ? (isOverview ? 0.62 : 0.42) : (isOverview ? 0.34 : 0.18)}
      filter="url(#timelineConstellationGlow)"
    ></line>
    <line
      x1={line.x1}
      y1={line.y1}
      x2={line.x2}
      y2={line.y2}
      stroke="white"
      stroke-width={line.isActive ? 0.028 : 0.015}
      stroke-linecap="round"
      stroke-dasharray="0.18 2.8"
      stroke-opacity={line.isActive ? (isOverview ? 0.36 : 0.22) : (isOverview ? 0.16 : 0.08)}
    />
  {/each}
  {#if guideLine}
    <line
      data-timeline-selected-guide
      x1={guideLine.x1}
      y1={guideLine.y1}
      x2={guideLine.x2}
      y2={guideLine.y2}
      stroke={getEraMarkerColor(guideLine.eraKey)}
      stroke-width="0.24"
      stroke-linecap="round"
      stroke-opacity="0.18"
      filter="url(#timelineConstellationGlow)"
    />
    <line
      data-timeline-selected-guide
      x1={guideLine.x1}
      y1={guideLine.y1}
      x2={guideLine.x2}
      y2={guideLine.y2}
      stroke={getEraMarkerColor(guideLine.eraKey)}
      stroke-width="0.085"
      stroke-linecap="round"
      stroke-dasharray="0.56 1.24"
      stroke-opacity="0.48"
      filter="url(#timelineConstellationGlow)"
    ></line>
    <circle
      data-timeline-selected-guide
      cx={guideLine.x2}
      cy={guideLine.y2}
      r="0.28"
      fill={getEraMarkerColor(guideLine.eraKey)}
      fill-opacity="0.28"
      filter="url(#timelineConstellationGlow)"
    />
  {/if}
</svg>
