import type {
  LicenseConfig,
  NavBarConfig,
  ProfileConfig,
  SiteConfig,
} from '../types/config'
import { LinkPreset } from '../types/config'
import { AUTO_MODE } from '@constants/constants.ts'
import { url } from '../utils/url-utils'

export const siteConfig: SiteConfig = {
  title: "Greg Aster Trail Log",
  subtitle: "PCT 2026 | Field Notes, Gear, and Trail Lessons",
  enablePostFooterNav: true,
  lang: "en",
  themeColor: {
    hue: 145,
    fixed: false,
  },
  transparency: 0.9,
  defaultTheme: AUTO_MODE,
  banner: {
    enable: false,
    src: "/avatar/avatar1.jpg",
    position: "center",
    credit: {
      enable: false,
      text: "",
      url: "",
    },
  },
  toc: {
    enable: true,
    depth: 3,
    minHeadings: 3,
  },
  rightRail: {
    enable: true,
    showOnHome: true,
    showOnPostsWithoutToc: true,
    stickyTop: "3.5rem",
    mobilePortraitHero: {
      enabled: true,
      style: "banner-overlay",
    },
    widget: {
      type: "updates",
      collection: "updates",
      slug: "trail-updates",
      excerptLength: 1000,
      pageUrl: url("/journal/"),
      pageLinkLabel: "Open full trail journal",
    },
  },
  favicon: [],
}

export const navBarConfig: NavBarConfig = {
  links: [
    0,
    {
      name: "Journal",
      url: url("/journal/"),
    },
    1,
    2,
  ],
}

export const profileConfig: ProfileConfig = {
  avatar: "/avatar/avatar1.jpg",
  name: "Greg Aster",
  bio: "Field notes, gear systems, and trail lessons",
  links: [
    {
      name: "Bluesky",
      icon: "fa6-brands:bluesky",
      url: "https://bsky.app/profile/astervisualarts.bsky.social",
    },
    {
      name: "GitHub",
      icon: "fa6-brands:github",
      url: "https://github.com/Greg-Aster",
    },
  ],
  avatarFilename: "avatar1.jpg",
}

export const licenseConfig: LicenseConfig = {
  enable: true,
  name: "CC BY-NC-SA 4.0",
  url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
}
