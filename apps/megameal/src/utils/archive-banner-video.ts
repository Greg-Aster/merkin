type ArchiveBannerVideoOptions = {
  selector: string
  playbackRate: number
}

const playbackRateDataKey = 'archiveBannerPlaybackRate'
const playbackRateLockedDataKey = 'archiveBannerPlaybackRateLocked'

function applyPlaybackRate(video: HTMLVideoElement): void {
  const playbackRate = Number(video.dataset[playbackRateDataKey])
  if (!Number.isFinite(playbackRate) || playbackRate <= 0) return

  video.defaultPlaybackRate = playbackRate
  video.playbackRate = playbackRate
}

export function configureArchiveBannerVideos({
  selector,
  playbackRate,
}: ArchiveBannerVideoOptions): void {
  if (typeof document === 'undefined') return

  document.querySelectorAll(selector).forEach(video => {
    if (!(video instanceof HTMLVideoElement)) return

    video.dataset[playbackRateDataKey] = String(playbackRate)
    applyPlaybackRate(video)

    if (video.dataset[playbackRateLockedDataKey] === 'true') return
    video.dataset[playbackRateLockedDataKey] = 'true'
    video.addEventListener('play', () => {
      applyPlaybackRate(video)
    })
  })
}

export function attachArchiveBannerVideoPlayback(
  options: ArchiveBannerVideoOptions,
): void {
  if (typeof document === 'undefined') return

  const apply = () => {
    configureArchiveBannerVideos(options)
  }

  apply()
  document.addEventListener('DOMContentLoaded', apply)
  document.addEventListener('astro:page-load', apply)
}
