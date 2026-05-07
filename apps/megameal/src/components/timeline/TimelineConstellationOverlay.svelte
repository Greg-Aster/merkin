<script lang="ts">
import { getEraMarkerColor } from './timelinePortalCarouselModel'

export type TimelineConstellationLine = {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  eraKey: string
  isActive: boolean
  length: number
}

export let lines: TimelineConstellationLine[] = []
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
      stroke-opacity={line.isActive ? 0.12 : 0.035}
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
      stroke-opacity={line.isActive ? 0.42 : 0.18}
      filter="url(#timelineConstellationGlow)"
    >
      <animate
        attributeName="stroke-dashoffset"
        values={`0;-${Math.max(2, line.length * 0.18).toFixed(2)}`}
        dur={line.isActive ? '12s' : '18s'}
        repeatCount="indefinite"
      />
    </line>
    <line
      x1={line.x1}
      y1={line.y1}
      x2={line.x2}
      y2={line.y2}
      stroke="white"
      stroke-width={line.isActive ? 0.028 : 0.015}
      stroke-linecap="round"
      stroke-dasharray="0.18 2.8"
      stroke-opacity={line.isActive ? 0.22 : 0.08}
    />
  {/each}
</svg>
