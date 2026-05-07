import { DARK_MODE } from '@constants/constants.ts'
import type {
  LicenseConfig,
  NavBarConfig,
  ProfileConfig,
  SiteConfig,
} from '../types/config'

export const siteConfig: SiteConfig = {
  title: 'MEGA MEAL SAGA',
  subtitle: 'Consuming Time Itself Since 3042',
  enablePostFooterNav: false,
  lang: 'en',
  themeColor: {
    hue: 220, // Blue hue for cosmic horror
    fixed: false,
  },
  transparency: 0.89, // Single value from 0 to 1
  defaultTheme: DARK_MODE, // Dark mode fits the cosmic horror vibe
  themeLock: DARK_MODE,
  banner: {
    enable: true,
    src: '/assets/banner/posters/golden-era-poster.webp', // Used as fallback and OG image
    video: '/assets/banner/golden-era12fps.webm', // Animated video background
    playbackRate: 0.25,
    position: 'center',
    credit: {
      enable: false,
      text: 'Corporate Archives Division',
      url: '',
    },
  },
  toc: {
    enable: true,
    depth: 3,
  },
  rightRail: {
    enable: true,
    showOnHome: true,
    showOnPostsWithoutToc: false,
    stickyTop: '3.5rem',
  },
  favicon: [],
}

export const navBarConfig: NavBarConfig = {
  links: [
    0,
    {
      name: 'Timeline',
      url: '/timeline/',
    },
    {
      name: 'Videos',
      url: '/videos/',
    },
    {
      name: 'Game',
      url: '/game/',
    },
    3,
    1,
    {
      name: 'More',
      url: '/about/',
      dropdown: [
        {
          name: 'Cookbook',
          url: '/cookbook/',
        },
        {
          name: 'Quizzes',
          url: '/quiz/',
        },
        {
          name: 'About',
          url: '/about/',
        },
      ],
    },
  ],
}

export const profileConfig: ProfileConfig = {
  avatar: '/src/assets/content-avatar/avatar.png',
  name: 'MEGA MEAL SAGA',
  bio: 'Cosmic Horror and Food.',
  links: [
    {
      name: 'Interdimensional Transit',
      icon: 'fa6-brands:discord',
      url: 'https://discord.gg/megameal',
    },
    {
      name: 'Temporal Archives',
      icon: 'fa6-brands:github',
      url: 'https://github.com/megameal',
    },
    {
      name: 'Quantum Communications',
      icon: 'fa6-brands:bluesky',
      url: 'https://bsky.app/profile/megameal',
    },
  ],
}

export const licenseConfig: LicenseConfig = {
  enable: true,
  name: 'Corporate Holdings Act 3042-B',
  url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
}

// 🎬 NEW: Avatar configuration for video playback settings
export const avatarConfig = {
  videoConfig: {
    playbackRate: 0.5, // Default to 50% speed
    loop: true, // Default to true, can be disabled
    loopDelay: 5000, // Delay between loops in ms
    playOnce: false, // Play once then stop
  },
}
