import { url } from './url-utils'

export function createLegacyStandardBannerConfig(config: any) {
  const bannerList = Array.isArray(config.bannerList) ? config.bannerList : []
  const bannerLinks = Array.isArray(config.bannerLinks)
    ? config.bannerLinks
    : []

  const getBannerLinkFromList = (index: number): string | null => {
    if (typeof bannerLinks[index] !== 'string') return null
    const link = bannerLinks[index].trim()
    return link.length > 0 ? link : null
  }

  return {
    bannerList,
    bannerLinks,
    animation: {
      enabled: config.animation?.enabled ?? true,
      interval: config.animation?.interval ?? 5000,
      transitionDuration: config.animation?.transitionDuration ?? 1000,
      direction: config.animation?.direction ?? 'forward',
    },
    video: {
      autoplay: true,
      muted: true,
      loop: true,
      playsInLine: true,
      controls: false,
      preload: 'none',
    },
    getBannerAnimationSettings: () => ({
      enabled: config.animation?.enabled ?? true,
      interval: config.animation?.interval ?? 5000,
      transitionDuration: config.animation?.transitionDuration ?? 1000,
      direction: config.animation?.direction ?? 'forward',
    }),
    getBannerLink: getBannerLinkFromList,
    hasAnyBannerLinks: () =>
      bannerLinks.some(
        (link: unknown) => typeof link === 'string' && link.trim().length > 0,
      ),
    getLinkPreviewData: (targetUrl: string) => ({
      title: 'Explore More',
      description: targetUrl || 'Click to visit this page',
      icon: 'arrow-up-right-from-square',
    }),
    getIconSVG: () => '',
    getBannerItemPreviewDetails: (index: number) => {
      const item = bannerList[index]
      const link = getBannerLinkFromList(index)
      return {
        hasValidLink: !!link,
        originalHref: link || '',
        urlForDisplay: link || '',
        previewTitle: item?.alt || `Banner ${index + 1}`,
        previewDescription: 'Click to explore this banner item.',
        previewIconSVG: '',
        isVideoButton: item?.type === 'video',
      }
    },
    isVideoBannerItem: (item: any) =>
      item?.type === 'video' ||
      (typeof item?.src === 'string' &&
        /\.(webm|mp4|mov|ogg)(\?.*)?$/i.test(item.src)),
    isImageBannerItem: (item: any) =>
      item?.type === 'image' ||
      (typeof item?.src !== 'undefined' && item?.type !== 'video'),
  }
}

export function normalizeCssSize(
  value: unknown,
  fallback: string,
  defaultUnit: 'vh' | 'rem' = 'vh',
): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value === 0 ? '0' : `${value}${defaultUnit}`
  }

  if (typeof value !== 'string') return fallback

  const trimmedValue = value.trim()
  if (!trimmedValue) return fallback
  if (trimmedValue === 'auto') return trimmedValue

  if (
    trimmedValue.startsWith('calc(') ||
    trimmedValue.startsWith('clamp(') ||
    trimmedValue.startsWith('min(') ||
    trimmedValue.startsWith('max(') ||
    trimmedValue.startsWith('var(')
  ) {
    return trimmedValue
  }

  if (
    /^-?\d*\.?\d+(px|rem|em|vh|vw|vmin|vmax|svh|lvh|dvh|%)$/i.test(trimmedValue)
  ) {
    return trimmedValue
  }

  if (/^-?\d*\.?\d+$/.test(trimmedValue)) {
    const numericValue = Number(trimmedValue)
    return numericValue === 0 ? '0' : `${trimmedValue}${defaultUnit}`
  }

  return fallback
}

export function normalizeBannerConfig(config: any) {
  const standardBannerConfig =
    config.standardBannerConfig ?? createLegacyStandardBannerConfig(config)

  const rawDesktopBannerHeight =
    typeof config.layout?.height === 'string'
      ? config.layout.height
      : config.layout?.height?.desktop
  const desktopBannerHeight = normalizeCssSize(rawDesktopBannerHeight, '60vh')

  const rawMobileBannerHeight =
    config.layout?.mobileHeight ??
    (typeof config.layout?.height === 'object'
      ? config.layout?.height?.mobile
      : undefined)
  const mobileBannerHeight = normalizeCssSize(
    rawMobileBannerHeight,
    desktopBannerHeight,
  )

  const spacingFromConfig = config.navbar?.spacing ?? config.navbarSpacing ?? {}
  const mobileBannerGap =
    config.navbar?.mobileBannerGap ??
    config.navbar?.mobilePortraitSpacing ??
    config.navbar?.height?.mobile ??
    '4rem'
  const mobilePortraitPanelTop =
    config.panel?.top?.mobilePortrait ?? config.panel?.top?.standard ?? '0'

  return {
    ...config,
    defaultBannerType: config.defaultBannerType ?? 'standard',
    defaultBannerData: config.defaultBannerData ?? {},
    standardBannerConfig,
    layout: {
      ...config.layout,
      height: desktopBannerHeight,
      mobileHeight: mobileBannerHeight,
      maxWidth: config.layout?.maxWidth ?? 1920,
      mainContentOffset: config.layout?.mainContentOffset ?? '1.5rem',
    },
    visual: {
      objectFit: config.visual?.objectFit ?? 'cover',
      objectPosition: config.visual?.objectPosition ?? 'center',
      applyGradientOverlay: config.visual?.applyGradientOverlay ?? false,
      gradientOverlay:
        config.visual?.gradientOverlay ??
        'linear-gradient(to bottom, rgba(0,0,0,0.2), transparent)',
      borderRadius: config.visual?.borderRadius ?? '0',
    },
    fallback: {
      enabled: config.fallback?.enabled ?? true,
      type: config.fallback?.type ?? 'gradient',
      value:
        config.fallback?.value ??
        'linear-gradient(to bottom, var(--color-primary-light), var(--color-primary))',
    },
    navbar: {
      ...config.navbar,
      height:
        typeof config.navbar?.height === 'string'
          ? config.navbar.height
          : config.navbar?.height?.desktop ?? '4.5rem',
      mobileBannerGap,
      mobilePortraitSpacing: mobileBannerGap,
      spacing: {
        standard: spacingFromConfig.standard ?? '0',
        timeline: spacingFromConfig.timeline ?? '5.5rem',
        video: spacingFromConfig.video ?? '5.5rem',
        image: spacingFromConfig.image ?? '0',
        cookbook:
          spacingFromConfig.cookbook ??
          spacingFromConfig.video ??
          spacingFromConfig.standard ??
          '0',
        archive:
          spacingFromConfig.archive ??
          spacingFromConfig.video ??
          spacingFromConfig.standard ??
          '0',
        reader:
          spacingFromConfig.reader ??
          spacingFromConfig.video ??
          spacingFromConfig.standard ??
          '0',
        none: spacingFromConfig.none ?? '0',
      },
    },
    panel: {
      ...config.panel,
      top: {
        standard: config.panel?.top?.standard ?? '0',
        timeline: config.panel?.top?.timeline ?? '0',
        video: config.panel?.top?.video ?? '0',
        image: config.panel?.top?.image ?? '0',
        archive:
          config.panel?.top?.archive ??
          config.panel?.top?.video ??
          config.panel?.top?.standard ??
          '0',
        reader:
          config.panel?.top?.reader ??
          config.panel?.top?.video ??
          config.panel?.top?.standard ??
          '0',
        none: config.panel?.top?.none ?? '0',
        mobilePortrait: mobilePortraitPanelTop,
      },
    },
    parallax: {
      enabled: config.parallax?.enabled ?? false,
      scrollFactor: config.parallax?.scrollFactor ?? -0.02,
      easingFactor: config.parallax?.easingFactor ?? 0.1,
    },
  }
}

export function createAssetUrlNormalizer(baseUrlInput?: string) {
  const rawBaseUrl = baseUrlInput || '/'
  const baseUrl = rawBaseUrl.replace(/\/$/, '')

  return function normalizeAssetUrl(assetPath?: string | null): string {
    if (!assetPath) return ''
    if (
      assetPath.startsWith('http://') ||
      assetPath.startsWith('https://') ||
      assetPath.startsWith('//') ||
      assetPath.startsWith('data:')
    ) {
      return assetPath
    }
    if (!assetPath.startsWith('/')) return assetPath
    if (baseUrl && assetPath.startsWith(`${baseUrl}/`)) return assetPath
    return url(assetPath, rawBaseUrl)
  }
}

export function getPanelTopPositionForBanner(
  bannerConfig: ReturnType<typeof normalizeBannerConfig>,
  bannerType: string,
): string {
  switch (bannerType) {
    case 'video':
      return bannerConfig.panel.top.video
    case 'image':
      return bannerConfig.panel.top.image
    case 'timeline':
      return bannerConfig.panel.top.timeline
    case 'cookbook':
      return bannerConfig.panel.top.video ?? bannerConfig.panel.top.standard
    case 'archive':
      return (
        bannerConfig.panel.top.archive ??
        bannerConfig.panel.top.video ??
        bannerConfig.panel.top.standard
      )
    case 'reader':
      return (
        bannerConfig.panel.top.reader ??
        bannerConfig.panel.top.video ??
        bannerConfig.panel.top.standard
      )
    case 'none':
      return bannerConfig.panel.top.none
    default:
      return bannerConfig.panel.top.standard
  }
}

export function resolveFallbackBannerConfiguration(params: {
  postValue: any
  defaultBannerLink?: string
  bannerConfig: ReturnType<typeof normalizeBannerConfig>
  normalizeAssetUrl: (assetPath?: string | null) => string
}) {
  const {
    postValue,
    defaultBannerLink = '',
    bannerConfig,
    normalizeAssetUrl,
  } = params
  const postData = {
    bannerLink: postValue?.data?.bannerLink || '',
    customAvatar: normalizeAssetUrl(postValue?.data?.avatarImage || ''),
    customName: postValue?.data?.authorName || '',
    customBio: postValue?.data?.authorBio || '',
    slug: postValue?.slug || '',
    wantsNoDefaultBanner: false,
  }

  const hasPostTimelineBanner =
    postValue?.data?.bannerType === 'timeline' &&
    postValue?.data?.bannerData?.category
  const hasPostVideoBanner =
    postValue?.data?.bannerType === 'video' &&
    postValue?.data?.bannerData?.videoId
  const hasPostCookbookBanner = postValue?.data?.bannerType === 'cookbook'
  const hasPostArchiveBanner = postValue?.data?.bannerType === 'archive'
  const hasPostReaderBanner = postValue?.data?.bannerType === 'reader'
  const hasPostImageBanner =
    !!(
      postValue?.data?.image ||
      (postValue?.data?.bannerType === 'image' &&
        postValue?.data?.bannerData?.imageUrl)
    ) &&
    !hasPostVideoBanner &&
    !hasPostTimelineBanner &&
    !hasPostCookbookBanner &&
    !hasPostArchiveBanner &&
    !hasPostReaderBanner

  const hasPostBanner =
    hasPostVideoBanner ||
    hasPostImageBanner ||
    hasPostTimelineBanner ||
    hasPostCookbookBanner ||
    hasPostArchiveBanner ||
    hasPostReaderBanner

  const defaultBannerType = bannerConfig.defaultBannerType
  const hasTimelineBanner =
    hasPostTimelineBanner ||
    (!hasPostBanner && defaultBannerType === 'timeline')
  const hasVideoBanner =
    hasPostVideoBanner || (!hasPostBanner && defaultBannerType === 'video')
  const hasImageBanner =
    hasPostImageBanner || (!hasPostBanner && defaultBannerType === 'image')
  const hasCookbookBanner = hasPostCookbookBanner
  const hasArchiveBanner = hasPostArchiveBanner
  const hasReaderBanner = hasPostReaderBanner
  const hasStandardBanner =
    !hasPostBanner &&
    !hasTimelineBanner &&
    !hasVideoBanner &&
    !hasImageBanner &&
    !hasCookbookBanner &&
    !hasArchiveBanner &&
    !hasReaderBanner

  const currentBannerType = hasVideoBanner
    ? 'video'
    : hasImageBanner
      ? 'image'
      : hasTimelineBanner
        ? 'timeline'
        : hasCookbookBanner
          ? 'cookbook'
          : hasArchiveBanner
            ? 'archive'
            : hasReaderBanner
              ? 'reader'
              : hasStandardBanner
                ? 'standard'
                : 'none'

  const postImage = normalizeAssetUrl(
    postValue?.data?.bannerData?.imageUrl || postValue?.data?.image,
  )

  return {
    postData,
    bannerType: {
      hasTimelineBanner,
      hasVideoBanner,
      hasImageBanner,
      hasCookbookBanner,
      hasArchiveBanner,
      hasReaderBanner,
      hasStandardBanner,
      hasPostBanner,
      isStandardPage: !hasPostBanner,
      currentBannerType,
    },
    bannerDataSources: {
      videoBannerData:
        hasVideoBanner && postValue?.data?.bannerType === 'video'
          ? postValue.data.bannerData
          : hasVideoBanner
            ? bannerConfig.defaultBannerData
            : null,
      imageBannerData: hasImageBanner
        ? postImage
          ? { imageUrl: postImage }
          : bannerConfig.imageBannerConfig?.data || null
        : null,
      timelineBannerData:
        hasTimelineBanner && postValue?.data?.bannerType === 'timeline'
          ? postValue.data.bannerData
          : hasTimelineBanner
            ? bannerConfig.defaultBannerData
            : null,
      cookbookBannerData:
        hasCookbookBanner && postValue?.data?.bannerType === 'cookbook'
          ? postValue.data.bannerData
          : null,
      archiveBannerData:
        hasArchiveBanner && postValue?.data?.bannerType === 'archive'
          ? postValue.data.bannerData
          : null,
      readerBannerData:
        hasReaderBanner && postValue?.data?.bannerType === 'reader'
          ? postValue.data.bannerData
          : null,
    },
    layout: {
      mainPanelTop: getPanelTopPositionForBanner(bannerConfig, currentBannerType),
      navbarSpacing:
        bannerConfig.navbar.spacing[currentBannerType] ??
        bannerConfig.navbar.spacing.standard,
      bannerHeight: bannerConfig.layout.height,
      bannerHeightMobile:
        bannerConfig.layout.mobileHeight ?? bannerConfig.layout.height,
      mainContentOffset: bannerConfig.layout.mainContentOffset,
    },
    finalBannerLink: postData.bannerLink || defaultBannerLink,
    currentBannerType,
  }
}

export function resolveBannerModuleHelpers(params: {
  bannerModule: any
  bannerConfig: ReturnType<typeof normalizeBannerConfig>
  siteConfig: any
  normalizeAssetUrl: (assetPath?: string | null) => string
}) {
  const { bannerModule, bannerConfig, siteConfig, normalizeAssetUrl } = params

  const determineBannerConfiguration =
    typeof bannerModule.determineBannerConfiguration === 'function'
      ? bannerModule.determineBannerConfiguration
      : (postValue: any, _pageType = 'default', defaultBannerLink = '') =>
          resolveFallbackBannerConfiguration({
            postValue,
            defaultBannerLink,
            bannerConfig,
            normalizeAssetUrl,
          })

  const getBannerAnimationSettings =
    typeof bannerModule.getBannerAnimationSettings === 'function'
      ? bannerModule.getBannerAnimationSettings
      : () => bannerConfig.standardBannerConfig.getBannerAnimationSettings()

  const getDynamicBackgroundImage =
    typeof bannerModule.getDynamicBackgroundImage === 'function'
      ? bannerModule.getDynamicBackgroundImage
      : (bgImage?: string | null) => {
          if (bgImage === 'none' || bgImage === '') return null
          if (bgImage) return bgImage
          if (siteConfig?.banner?.enable && siteConfig?.banner?.src) {
            return siteConfig.banner.src
          }
          return null
        }

  const getShouldShowParallaxBackground =
    typeof bannerModule.getShouldShowParallaxBackground === 'function'
      ? bannerModule.getShouldShowParallaxBackground
      : (bgImage?: string | null) =>
          !!(getDynamicBackgroundImage(bgImage) && bannerConfig.parallax.enabled)

  return {
    determineBannerConfiguration,
    getBannerAnimationSettings,
    getDynamicBackgroundImage,
    getShouldShowParallaxBackground,
  }
}
