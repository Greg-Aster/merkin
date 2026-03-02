import type {
  LicenseConfig,
  NavBarConfig,
  ProfileConfig,
  SiteConfig,
} from '../types/config'
import { LinkPreset } from '../types/config'
import { AUTO_MODE } from '@constants/constants.ts'

export const siteConfig: SiteConfig = {
  title: "Greg Aster Trail Log",
  subtitle: "PCT 2026 | Field Notes, Gear, and Trail Lessons",
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
  },
  favicon: [],
}

export const navBarConfig: NavBarConfig = {
  links: [
    0,
    1,
    2,
  ],
}

export const profileConfig: ProfileConfig = {
  avatar: "/avatar/avatar1.jpg",
  name: "Greg Aster",
  bio: "PCT Class of 2026 | Field notes, gear systems, and trail lessons",
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
