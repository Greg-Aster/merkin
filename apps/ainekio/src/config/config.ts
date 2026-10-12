import { DARK_MODE } from '@constants/constants.ts'
import type {
  LicenseConfig,
  NavBarConfig,
  ProfileConfig,
  SiteConfig,
} from '../types/config'

export const siteConfig: SiteConfig = {
  title: 'Ainekio',
  subtitle: 'A robot build journal: chassis, printed legs, and gait experiments',
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
      text: 'October 12 shell design.',
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
    { name: 'Start here', url: '/posts/project-overview/' },
    { name: 'Build journal', url: '/updates/' },
    { name: 'Build reference', url: '/archive/?kind=reference' },
    { name: 'Original V1', url: '/posts/v1-original-posts/' },
  ],
}

export const profileConfig: ProfileConfig = {
  avatar: '/assets/avatar/assembly-september-20.webp',
  name: 'Ainekio',
  bio: 'Ainekio’s build journal: the original eight-servo robot and a twelve-servo prototype now standing, walking and responding to commands.',
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
  avatarFilename: 'assembly-september-20.webp',
}

export const licenseConfig: LicenseConfig = {
  enable: true,
  name: 'CC BY-NC-SA 4.0',
  url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
}
