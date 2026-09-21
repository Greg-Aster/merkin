import { DARK_MODE } from '@constants/constants.ts'
import type {
  LicenseConfig,
  NavBarConfig,
  ProfileConfig,
  SiteConfig,
} from '../types/config'
import { LinkPreset } from '../types/config'

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
    src: '/assets/ainekio/v2/assembly-september-20-concept.webp',
    position: 'center',
    credit: {
      enable: false,
      text: 'AI concept illustration based on the September 20, 2026 CAD assembly',
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
    {
      name: 'Overview',
      url: '/',
    },
    {
      name: 'Updates',
      url: '/updates/',
    },
    {
      name: 'Guides',
      url: '/#project-guides',
    },
    {
      name: 'All articles',
      url: '/archive/',
    },
    LinkPreset.About,
  ],
}

export const profileConfig: ProfileConfig = {
  avatar: '/assets/avatar/assembly-september-20.webp',
  name: 'Ainekio',
  bio: 'Ainekio’s build journal: a working eight-servo robot, and the chassis, printed legs, and gait experiments for its twelve-servo successor.',
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
