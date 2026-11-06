import { DARK_MODE } from '@constants/constants.ts'
import type {
  LicenseConfig,
  NavBarConfig,
  ProfileConfig,
  SiteConfig,
} from '../types/config'

export const siteConfig: SiteConfig = {
  title: 'Ainekio',
  subtitle: 'Open-Source 12-Servo ESP32-P4 Quadruped Robot Companion & MetaHuman OS',
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
    { name: 'System Reference', url: '/archive/?kind=reference' },
    { name: 'Build Journal', url: '/updates/' },
    { name: 'Gallery', url: '/gallery/' },
    { name: 'About', url: '/about/' },
  ],
}

export const profileConfig: ProfileConfig = {
  avatar: '/assets/avatar/assembly-september-20.webp',
  name: 'Ainekio',
  bio: 'A twelve-servo quadruped robot companion in active development: closed-loop 4th-wire ESP32-P4 hardware paired with MetaHuman OS for conversation, memory, perception, bounded autonomy, and learned locomotion.',
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
