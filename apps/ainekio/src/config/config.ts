import { DARK_MODE } from '@constants/constants.ts'
import type {
  LicenseConfig,
  NavBarConfig,
  ProfileConfig,
  SiteConfig,
} from '../types/config'

export const siteConfig: SiteConfig = {
  title: 'Ainekio',
  subtitle: '12-Servo ESP32-P4 Quadruped Robot Companion & Ainekio OS',
  enablePostFooterNav: true,
  lang: 'en',
  themeColor: {
    hue: 190,
    fixed: false,
  },
  transparency: 0.9,
  defaultTheme: DARK_MODE,
  banner: {
    enable: false,
    src: '/assets/ainekio/2026-10-12-refresh/render-front.webp',
    position: 'center',
    credit: {
      enable: false,
      text: 'Ainekio V2 shell design.',
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
      pageLinkLabel: 'Open build journal',
    },
  },
  favicon: [],
}

export const navBarConfig: NavBarConfig = {
  links: [
    { name: 'Overview', url: '/posts/project-overview/' },
    { name: 'Ainekio OS', url: '/posts/ainekio-os/' },
    { name: 'System Reference', url: '/archive/?kind=reference' },
    { name: 'Build Journal', url: '/updates/' },
    { name: 'Gallery', url: '/gallery/' },
    { name: 'About', url: '/about/' },
  ],
}

export const profileConfig: ProfileConfig = {
  avatar: '/assets/ainekio/2026-10-12-refresh/render-front.webp',
  name: 'Ainekio',
  bio: 'Personal workbench log and technical documentation for a custom 12-servo quadruped robot and Ainekio OS—its local-first software mind for voice, memory, and personality.',
  links: [
    {
      name: 'Ainekio-bot',
      icon: 'fa6-brands:github',
      url: 'https://github.com/Greg-Aster/Ainekio-bot',
    },
    {
      name: 'Ainekio OS',
      icon: 'fa6-brands:github',
      url: 'https://github.com/Greg-Aster/ainekio-os',
    },
    {
      name: 'Contact Greg',
      icon: 'fa6-solid:envelope',
      url: 'mailto:greg@ainek.io',
    },
  ],
  avatarFilename: 'assembly-september-20.webp',
}

export const licenseConfig: LicenseConfig = {
  enable: true,
  name: 'CC BY-NC-SA 4.0',
  url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
}
