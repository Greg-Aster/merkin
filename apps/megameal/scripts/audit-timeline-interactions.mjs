import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const failures = []

function readSource(relativePath) {
  return readFileSync(path.resolve(appRoot, relativePath), 'utf8')
}

const carousel = readSource('src/components/timeline/TimelinePortalCarousel.svelte')
const scene = readSource('src/components/timeline/TimelinePortalCarouselScene.svelte')
const presentation = readSource('src/components/timeline/timelinePortalPresentation.ts')
const selectedRecord = readSource('src/components/timeline/TimelineSelectedRecord.svelte')
const constellationOverlay = readSource('src/components/timeline/TimelineConstellationOverlay.svelte')
const carouselModel = readSource('src/components/timeline/timelinePortalCarouselModel.ts')
const autoplayButton = readSource('src/components/timeline/TimelineAutoplayButton.svelte')
const selectedRecordStyles = readSource(
  'src/styles/features/timeline/timeline-selected-record.css',
)
const viewModeButton = readSource('src/components/timeline/TimelineViewModeButton.svelte')
const mainGridLayout = readSource('src/layouts/MainGridLayout.astro')
const timelinePageLayout = readSource('src/layouts/TimelinePageLayout.astro')
const timelineBannerAdapter = readSource('src/components/timeline/TimelineBanner.astro')
const legacyMapRoute = readSource('src/pages/timeline/2d.astro')
const timelineBannerConfig = readSource('src/config/banners/timeline.ts')
const sharedBannerStage = readSource(
  '../../packages/blog-core/src/components/banner-stage/BannerStage.astro',
)

if (
  !mainGridLayout.includes("layoutPost?.data?.bannerType === 'timeline'") ||
  !mainGridLayout.includes("await import('@components/timeline/TimelineBanner.astro')") ||
  !mainGridLayout.includes('renderTimelineBannerSlot: rendersTimelineBanner')
) {
  failures.push('timeline posts must render the Megameal-owned timeline adapter')
}

if (
  !timelineBannerAdapter.includes('TimelinePortalCarousel') ||
  !timelineBannerAdapter.includes('isPublishedManifestRecord') ||
  !timelineBannerAdapter.includes('initialViewMode="map"') ||
  !timelineBannerAdapter.includes('presentation="banner"') ||
  timelineBannerAdapter.includes('SharedTimelineBanner')
) {
  failures.push('article banners must use the canonical portal in overview presentation')
}

if (
  !timelinePageLayout.includes('isPublishedManifestRecord') ||
  !timelinePageLayout.includes('initialViewMode="travel"') ||
  !timelinePageLayout.includes('presentation="full"')
) {
  failures.push('the full route must use published records and begin in first-person mode')
}

if (
  !viewModeButton.includes('<button') ||
  !viewModeButton.includes("dispatch('change', nextViewMode)") ||
  viewModeButton.includes('/timeline/2d')
) {
  failures.push('view changes must happen in place rather than navigating to a second route')
}

if (
  !carousel.includes('virtualWheel = 0') ||
  !carousel.includes('input.wheel = 0') ||
  !carousel.includes('if (!prefersReducedMotion && !isMapMode) playAutoplay()') ||
  !carousel.includes("if (nextViewMode === 'travel' && !prefersReducedMotion)") ||
  !autoplayButton.includes('Pause timeline autoplay') ||
  carousel.includes('getDefaultTimelinePosition')
) {
  failures.push('first-person chronology must start at the beginning, autoplay, and expose pause control')
}

if (
  !scene.includes('defaultCamera.set(camera)') ||
  !scene.includes('size: canvasSize') ||
  !scene.includes('manual={true}') ||
  !scene.includes("viewMode === 'map' ? mapCamera : travelCamera") ||
  !scene.includes('getTimelineStarTarget(index, input.wheel, viewMode, portraitMobile)')
) {
  failures.push('the scene must own camera switching, canvas framing, and responsive target updates')
}

if (!legacyMapRoute.includes("Astro.redirect('/timeline/', 301)")) {
  failures.push('the legacy map URL must permanently redirect to the canonical timeline')
}

if (
  timelineBannerConfig.includes('timelineBannerViewConfig') ||
  timelineBannerConfig.includes('timelineBannerInteraction') ||
  timelineBannerConfig.includes('timelineBannerEraConfig')
) {
  failures.push('banner registration must not retain a second timeline engine configuration')
}

if (
  sharedBannerStage.includes('TimelineController') ||
  sharedBannerStage.includes('timeline-mobile-inactive') ||
  !sharedBannerStage.includes('<slot name="timeline-banner-content" />')
) {
  failures.push('the shared banner stage must be a neutral slot host without a timeline fallback')
}

if (!carousel.includes('isTimelineInteractiveTarget(event.target)')) {
  failures.push('timeline scene input must exempt interactive targets from pointer capture')
}

if (
  !/function handleWheel[^]*?if \(\s*isBannerPresentation \|\|/.test(carousel) ||
  !/function handleKeyboardScroll[^]*?if \(\s*isBannerPresentation \|\|/.test(carousel) ||
  !carousel.includes('isBannerPresentation && event.touches.length < 2') ||
  carousel.split("isBannerPresentation ? 'touch-pan-y' : 'touch-none'").length - 1 < 2
) {
  failures.push('embedded timeline banners must preserve document wheel, keyboard, and touch scrolling')
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
  !selectedRecord.includes("this={selectedHref ? 'a' : 'aside'}") ||
  !selectedRecord.includes('href={selectedHref || undefined}') ||
  !selectedRecord.includes('getTimelineRecordHref(selectedScreen?.url)') ||
  !carousel.includes('window.location.href = getTimelineRecordHref(url)') ||
  !carouselModel.includes("return `${url.split('#', 1)[0]}#post-container`")
) {
  failures.push('timeline records must remain native links and post links must target article content')
}

if (
  !carousel.includes('displayedScreenIndex = selectedScreenIndex >= 0 || isMapMode') ||
  !carousel.includes('selectedScreenIndex={displayedScreenIndex}')
) {
  failures.push('travel mode must preview the current record without overriding manual selection')
}

if (
  !carousel.includes('isOverview={isMapMode}') ||
  !constellationOverlay.includes('isOverview ? 0.34 : 0.18') ||
  !constellationOverlay.includes('isOverview ? 0.16 : 0.08')
) {
  failures.push('overview mode must render its constellation lines with stronger visibility')
}

if (failures.length > 0) {
  console.error('[timeline-interactions] Contract audit failed:')
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(
  '[timeline-interactions] Verified one portal owner, travel suggestions, overview lines, article targeting, autoplay, and banner scrolling.',
)
