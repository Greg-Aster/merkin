import { AUTO_MODE } from '@constants/constants.ts'
import type {
  LicenseConfig,
  NavBarConfig,
  ProfileConfig,
  SiteConfig,
} from '../types/config'
import { LinkPreset } from '../types/config'

export const siteConfig: SiteConfig = {
  title: 'Ainekio',
  subtitle: 'Building a physical interface for MetaHuman OS',
  enablePostFooterNav: true,
  lang: 'en',
  themeColor: {
    hue: 190,
    fixed: false,
  },
  transparency: 0.9,
  defaultTheme: AUTO_MODE,
  banner: {
    enable: false,
    src: '/assets/ainekio/hero.webp',
    position: 'center',
    credit: {
      enable: false,
      text: '',
      url: '',
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
    stickyTop: '3.5rem',
    widget: {
      type: 'updates',
      collection: 'updates',
      slug: 'site-updates',
      excerptLength: 420,
      pageUrl: '/updates/',
      pageLinkLabel: 'Open field updates',
    },
  },
  favicon: [],
}

export const navBarConfig: NavBarConfig = {
  links: [
    LinkPreset.Home,
    {
      name: 'Status',
      url: '/posts/current-status/',
    },
    {
      name: 'Updates',
      url: '/updates/',
    },
    LinkPreset.Archive,
    LinkPreset.About,
  ],
}

export const profileConfig: ProfileConfig = {
  avatar: '/src/content/avatar/avatar.webp',
  name: 'Ainekio',
  bio: 'A desk-scale robot familiar. Source, runtime, semantic, and physical proof reported separately.',
  links: [
    {
      name: 'GitHub',
      icon: 'fa6-brands:github',
      url: 'https://github.com/Greg-Aster/Ainekio-bot',
    },
    {
      name: 'MetaHuman OS',
      icon: 'fa6-brands:github',
      url: 'https://github.com/Greg-Aster/metahuman-os',
    },
  ],
  avatarFilename: 'avatar.webp',
}

export const licenseConfig: LicenseConfig = {
  enable: true,
  name: 'CC BY-NC-SA 4.0',
  url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
}
