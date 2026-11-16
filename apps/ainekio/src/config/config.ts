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
    {
      name: 'Robots',
      url: '/#generations',
      dropdown: [
        { name: 'All 3 Generations', url: '/#generations' },
        { name: 'V1 · 8-Servo S3', url: '/posts/ainekio-v1/' },
        { name: 'V2 · 12-Servo P4', url: '/posts/ainekio-v2/' },
        { name: 'V3 · Armored SBC', url: '/posts/ainekio-v3-preview/' },
        { name: 'V1 vs. V2', url: '/posts/v1-v2-comparison/' },
      ],
    },
    {
      name: 'Docs',
      url: '/archive/?kind=reference',
      dropdown: [
        { name: 'System Overview', url: '/posts/project-overview/' },
        { name: 'Ainekio OS', url: '/posts/ainekio-os/' },
        { name: 'Ainekio Cockpit', url: '/posts/ainekio-cockpit/' },
        { name: '3-System Neural', url: '/posts/three-system-neural-architecture/' },
        { name: 'Jam & Thermal Fuse', url: '/posts/jam-protection-and-thermal-safety/' },
        { name: 'All Reference Guides', url: '/archive/?kind=reference' },
        { name: 'About & Licensing', url: '/about/' },
      ],
    },
    { name: 'Journal', url: '/updates/' },
    { name: 'Gallery', url: '/gallery/' },
  ],
}

export const profileConfig: ProfileConfig = {
  avatar: '/assets/ainekio/2026-10-12-refresh/render-front.webp',
  name: 'Ainekio',
  bio: 'Technical documentation and progress notes for Ainekio, a custom 12-servo ESP32-P4 quadruped robot paired with Ainekio OS.',
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
