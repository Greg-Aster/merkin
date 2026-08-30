import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const failures = []

function readSource(relativePath) {
  return readFileSync(path.join(appRoot, relativePath), 'utf8')
}

const carousel = readSource(
  'src/components/timeline/TimelinePortalCarousel.svelte',
)
const presentation = readSource(
  'src/components/timeline/timelinePortalPresentation.ts',
)
const selectedRecord = readSource(
  'src/components/timeline/TimelineSelectedRecord.svelte',
)
const selectedRecordStyles = readSource(
  'src/styles/features/timeline/timeline-selected-record.css',
)
const mainGridLayout = readSource('src/layouts/MainGridLayout.astro')
const timelineBannerAdapter = readSource(
  'src/components/timeline/TimelineBanner.astro',
)

if (
  !mainGridLayout.includes("layoutPost?.data?.bannerType === 'timeline'") ||
  !mainGridLayout.includes(
    "await import('@components/timeline/TimelineBanner.astro')",
  ) ||
  !mainGridLayout.includes('renderTimelineBannerSlot: rendersTimelineBanner')
) {
  failures.push(
    'timeline posts must conditionally render the Megameal timeline adapter instead of an empty shared banner',
  )
}

if (
  !timelineBannerAdapter.includes(
    "packages/shared-data/generated/timeline.json",
  ) ||
  !timelineBannerAdapter.includes('events={timelineManifest.items as any}')
) {
  failures.push(
    'the Megameal timeline banner adapter must own the generated event manifest',
  )
}

if (!carousel.includes('isTimelineInteractiveTarget(event.target)')) {
  failures.push('timeline scene input must exempt interactive targets from pointer capture')
}

if (
  carousel.includes('isTimelineSceneDragBlockedTarget') ||
  presentation.includes('isTimelineSceneDragBlockedTarget')
) {
  failures.push('timeline input must not retain a second map-only drag-blocking path')
}

if (!carousel.includes('absolute inset-0 z-[5]')) {
  failures.push('timeline star-control hit layer must retain its declared stacking level')
}

const selectedLayer = selectedRecordStyles.match(
  /\.home-intro-copy--timeline-selected\s*\{[^}]*\bz-index:\s*(\d+)/s,
)
if (!selectedLayer || Number(selectedLayer[1]) <= 5) {
  failures.push('selected timeline record must stack above the star-control hit layer')
}

if (
  !selectedRecord.includes("this={selectedScreen.url ? 'a' : 'aside'}") ||
  !selectedRecord.includes('href={selectedScreen.url || undefined}')
) {
  failures.push('selected timeline records with URLs must remain native links')
}

if (failures.length > 0) {
  console.error('[timeline-interactions] Contract audit failed:')
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(
  '[timeline-interactions] Verified pointer ownership, layer order, and native record links.',
)
