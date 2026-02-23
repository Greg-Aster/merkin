import type {
  LicenseConfig,
  NavBarConfig,
  ProfileConfig,
  SiteConfig,
} from '../types/config'
import { LinkPreset } from '../types/config'
import { AUTO_MODE } from '@constants/constants.ts'

export const siteConfig: SiteConfig = {
  title: "Trail Log",
  subtitle: "Pacific Crest Trail 2026",
  lang: "en",
  themeColor: {
    hue: 145,
    fixed: false,
  },
  transparency: 0.9,
  defaultTheme: AUTO_MODE,
  banner: {
    enable: false,
    src: "/assets/banner/0001.png",
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
  avatar: "/src/content/avatar/avatar.png",
  name: "Greg",
  bio: "Hiking the Pacific Crest Trail",
  links: [
    {
      name: "GitHub",
      icon: "fa6-brands:github",
      url: "https://github.com/Greg-Aster",
    },
  ],
  avatarFilename: "avatar.png",
}

export const licenseConfig: LicenseConfig = {
  enable: true,
  name: "CC BY-NC-SA 4.0",
  url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
}
