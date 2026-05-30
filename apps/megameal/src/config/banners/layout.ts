import type { BannerType } from './types'

type ResponsiveCssValue = {
  desktop: string
  mobile: string
}

export type BannerLayoutProfile = {
  stageTop: ResponsiveCssValue
  stageHeight: ResponsiveCssValue
  panelTop: ResponsiveCssValue
  contentTop: ResponsiveCssValue
  stageAspectRatio?: Partial<ResponsiveCssValue>
}

export type BannerLayoutProfiles = Record<BannerType, BannerLayoutProfile>

export type ResolvedBannerLayout = {
  bannerType: BannerType
  stageTop: string
  stageTopMobile: string
  stageHeight: string
  stageHeightMobile: string
  panelTop: string
  panelTopMobile: string
  contentTop: string
  contentTopMobile: string
  stageAspectRatio: string
  stageAspectRatioMobile: string
}

const defaultStageHeight = {
  desktop: '90vh',
  mobile: 'clamp(32rem, 76svh, 40rem)',
}

const defaultContentTop = {
  desktop: '1rem',
  mobile: '1rem',
}

const defaultBannerStageTop = {
  desktop: '5.5rem',
  mobile: '2.75rem',
}

// Canonical banner spacing contract for Megameal. Shared layout and
// banner-stage components consume these resolved values instead of owning
// route-specific gap overrides.
export const bannerLayoutProfiles = {
  standard: {
    stageTop: { desktop: '3rem', mobile: '2.75rem' },
    stageHeight: { ...defaultStageHeight },
    panelTop: { desktop: '-6rem', mobile: '-4.5rem' },
    contentTop: { ...defaultContentTop },
  },
  image: {
    stageTop: { desktop: '4rem', mobile: '2.75rem' },
    stageHeight: { ...defaultStageHeight },
    panelTop: { desktop: '0', mobile: '0' },
    contentTop: { ...defaultContentTop },
  },
  video: {
    stageTop: {
      desktop: '5.5rem',
      mobile: 'calc(3.375rem + 1.65rem)',
    },
    stageHeight: { desktop: defaultStageHeight.desktop, mobile: 'auto' },
    stageAspectRatio: { mobile: '16 / 9' },
    panelTop: { desktop: '0', mobile: '0' },
    contentTop: { desktop: '0', mobile: '0' },
  },
  timeline: {
    stageTop: { ...defaultBannerStageTop },
    stageHeight: { ...defaultStageHeight },
    panelTop: { desktop: '0', mobile: '0' },
    contentTop: { ...defaultContentTop },
  },
  assistant: {
    stageTop: { ...defaultBannerStageTop },
    stageHeight: { ...defaultStageHeight },
    panelTop: { desktop: '0', mobile: '0' },
    contentTop: { ...defaultContentTop },
  },
  cookbook: {
    stageTop: { ...defaultBannerStageTop },
    stageHeight: {
      desktop: 'clamp(28rem, 58vh, 38rem)',
      mobile: 'clamp(30rem, 62svh, 34rem)',
    },
    panelTop: { desktop: '0', mobile: '0' },
    contentTop: { ...defaultContentTop },
  },
  archive: {
    stageTop: { ...defaultBannerStageTop },
    stageHeight: { ...defaultStageHeight },
    panelTop: { desktop: '0', mobile: '0' },
    contentTop: { ...defaultContentTop },
  },
  reader: {
    stageTop: { ...defaultBannerStageTop },
    stageHeight: {
      desktop: 'clamp(34rem, 58vh, 38rem)',
      mobile: 'clamp(28rem, 52svh, 32rem)',
    },
    panelTop: { desktop: '0', mobile: '0' },
    contentTop: { ...defaultContentTop },
  },
  none: {
    stageTop: { desktop: '-7.5rem', mobile: '0' },
    stageHeight: { desktop: '0', mobile: '0' },
    panelTop: { desktop: '12rem', mobile: '2.75rem' },
    contentTop: { desktop: defaultContentTop.desktop, mobile: '2rem' },
  },
} satisfies BannerLayoutProfiles

export function getBannerLayoutProfile(
  bannerType: BannerType,
): BannerLayoutProfile {
  return bannerLayoutProfiles[bannerType] ?? bannerLayoutProfiles.standard
}

export function resolveBannerLayout(
  bannerType: BannerType,
  options: {
    fullscreen?: boolean
    profiles?: Partial<Record<BannerType, BannerLayoutProfile>>
  } = {},
): ResolvedBannerLayout {
  if (options.fullscreen) {
    return {
      bannerType: 'none',
      stageTop: '0',
      stageTopMobile: '0',
      stageHeight: '0',
      stageHeightMobile: '0',
      panelTop: '0',
      panelTopMobile: '0',
      contentTop: defaultContentTop.desktop,
      contentTopMobile: defaultContentTop.mobile,
      stageAspectRatio: 'auto',
      stageAspectRatioMobile: 'auto',
    }
  }

  const profile =
    options.profiles?.[bannerType] ?? getBannerLayoutProfile(bannerType)
  const stageAspectRatio = profile.stageAspectRatio?.desktop ?? 'auto'

  return {
    bannerType,
    stageTop: profile.stageTop.desktop,
    stageTopMobile: profile.stageTop.mobile,
    stageHeight: profile.stageHeight.desktop,
    stageHeightMobile: profile.stageHeight.mobile,
    panelTop: profile.panelTop.desktop,
    panelTopMobile: profile.panelTop.mobile,
    contentTop: profile.contentTop.desktop,
    contentTopMobile: profile.contentTop.mobile,
    stageAspectRatio,
    stageAspectRatioMobile:
      profile.stageAspectRatio?.mobile ?? stageAspectRatio,
  }
}

export function createLegacyNavbarSpacing(): Record<BannerType, string> {
  return Object.fromEntries(
    Object.entries(bannerLayoutProfiles).map(([bannerType, profile]) => [
      bannerType,
      profile.stageTop.desktop,
    ]),
  ) as Record<BannerType, string>
}

export function createLegacyPanelTop(): Record<BannerType, string> & {
  mobilePortrait: string
} {
  return {
    ...(Object.fromEntries(
      Object.entries(bannerLayoutProfiles).map(([bannerType, profile]) => [
        bannerType,
        profile.panelTop.desktop,
      ]),
    ) as Record<BannerType, string>),
    mobilePortrait: bannerLayoutProfiles.standard.panelTop.mobile,
  }
}
