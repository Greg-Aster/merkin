import {
  bannerLayoutProfiles,
  type BannerLayoutProfile,
  type BannerLayoutProfiles,
} from '../../../../../config/banners/layout'

type MutableBannerConfig = Record<string, any>

const cloneDefaultLayoutProfiles = (): BannerLayoutProfiles =>
  JSON.parse(JSON.stringify(bannerLayoutProfiles)) as BannerLayoutProfiles

function mergeLayoutProfile(
  defaultProfile: BannerLayoutProfile,
  currentProfile: Partial<BannerLayoutProfile> = {},
): BannerLayoutProfile {
  const stageAspectRatio =
    defaultProfile.stageAspectRatio || currentProfile.stageAspectRatio
      ? {
          ...defaultProfile.stageAspectRatio,
          ...currentProfile.stageAspectRatio,
        }
      : undefined

  return {
    stageTop: { ...defaultProfile.stageTop, ...currentProfile.stageTop },
    stageHeight: {
      ...defaultProfile.stageHeight,
      ...currentProfile.stageHeight,
    },
    panelTop: { ...defaultProfile.panelTop, ...currentProfile.panelTop },
    contentTop: { ...defaultProfile.contentTop, ...currentProfile.contentTop },
    ...(stageAspectRatio ? { stageAspectRatio } : {}),
  }
}

export function ensureCurrentBannerLayoutConfig(
  bannerConfig: MutableBannerConfig,
): void {
  if (!bannerConfig) {
    return
  }

  const defaultProfiles = cloneDefaultLayoutProfiles()

  if (!bannerConfig.layoutProfiles) {
    bannerConfig.layoutProfiles = defaultProfiles
  } else {
    for (const [bannerType, profile] of Object.entries(defaultProfiles)) {
      bannerConfig.layoutProfiles[bannerType] = mergeLayoutProfile(
        profile,
        bannerConfig.layoutProfiles[bannerType],
      )
    }
  }

  if (!bannerConfig.layout) {
    bannerConfig.layout = {}
  }

  if (
    bannerConfig.layout.height &&
    typeof bannerConfig.layout.height === 'object'
  ) {
    bannerConfig.layout.mobileHeight =
      bannerConfig.layout.mobileHeight || bannerConfig.layout.height.mobile
    bannerConfig.layout.height = bannerConfig.layout.height.desktop
  }

  const profiles = bannerConfig.layoutProfiles as BannerLayoutProfiles

  bannerConfig.layout.height =
    bannerConfig.layout.height || profiles.standard.stageHeight.desktop
  bannerConfig.layout.mobileHeight =
    bannerConfig.layout.mobileHeight || profiles.standard.stageHeight.mobile
  bannerConfig.layout.mainContentOffset =
    bannerConfig.layout.mainContentOffset || profiles.standard.contentTop.desktop
  bannerConfig.layout.mainContentOffsetMobile =
    bannerConfig.layout.mainContentOffsetMobile ||
    profiles.standard.contentTop.mobile

  if (!bannerConfig.navbar) {
    bannerConfig.navbar = {}
  }

  if (!bannerConfig.navbar.spacing) {
    bannerConfig.navbar.spacing = bannerConfig.navbarSpacing || {}
  }

  for (const [bannerType, profile] of Object.entries(profiles)) {
    bannerConfig.navbar.spacing[bannerType] =
      bannerConfig.navbar.spacing[bannerType] || profile.stageTop.desktop
  }

  bannerConfig.navbar.mobileBannerGap =
    bannerConfig.navbar.mobileBannerGap || profiles.standard.stageTop.mobile
  bannerConfig.navbar.mobilePortraitSpacing =
    bannerConfig.navbar.mobilePortraitSpacing ||
    bannerConfig.navbar.mobileBannerGap

  if (!bannerConfig.panel) {
    bannerConfig.panel = {}
  }

  if (!bannerConfig.panel.top) {
    bannerConfig.panel.top = {}
  }

  for (const [bannerType, profile] of Object.entries(profiles)) {
    bannerConfig.panel.top[bannerType] =
      bannerConfig.panel.top[bannerType] || profile.panelTop.desktop
  }

  bannerConfig.panel.top.mobilePortrait =
    bannerConfig.panel.top.mobilePortrait || profiles.standard.panelTop.mobile
}

export function syncLegacyLayoutFields(
  bannerConfig: MutableBannerConfig,
): void {
  ensureCurrentBannerLayoutConfig(bannerConfig)

  const profiles = bannerConfig.layoutProfiles as BannerLayoutProfiles

  bannerConfig.layout.height = profiles.standard.stageHeight.desktop
  bannerConfig.layout.mobileHeight = profiles.standard.stageHeight.mobile
  bannerConfig.layout.mainContentOffset = profiles.standard.contentTop.desktop
  bannerConfig.layout.mainContentOffsetMobile =
    profiles.standard.contentTop.mobile

  for (const [bannerType, profile] of Object.entries(profiles)) {
    bannerConfig.navbar.spacing[bannerType] = profile.stageTop.desktop
    bannerConfig.panel.top[bannerType] = profile.panelTop.desktop
  }

  bannerConfig.navbar.mobileBannerGap = profiles.standard.stageTop.mobile
  bannerConfig.navbar.mobilePortraitSpacing =
    profiles.standard.stageTop.mobile
  bannerConfig.panel.top.mobilePortrait = profiles.standard.panelTop.mobile
}
