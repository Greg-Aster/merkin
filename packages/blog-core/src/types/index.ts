import { LIGHT_MODE, DARK_MODE, AUTO_MODE } from '../constants'

export type LIGHT_DARK_MODE =
  | typeof LIGHT_MODE
  | typeof DARK_MODE
  | typeof AUTO_MODE

export type SiteConfig = {
  title: string
  subtitle: string
  description?: string
  url?: string
  lang: string
  themeColor: {
    hue: number
    fixed: boolean
  }
  transparency?: number
  defaultTheme: LIGHT_DARK_MODE
  banner: {
    enable: boolean
    src: string
    position?: 'top' | 'center' | 'bottom'
    credit: {
      enable: boolean
      text: string
      url?: string
    }
  }
  toc: {
    enable: boolean
    depth: 1 | 2 | 3
  }
  favicon: Favicon[]
}

export type Favicon = {
  src: string
  theme?: 'light' | 'dark'
  sizes?: string
}

export enum LinkPreset {
  Home = 0,
  Archive = 1,
  About = 2,
  Community = 3,
  Projects = 4,
  Configs = 5,
  Friends = 6,
  NewPost = 7,
}

export type PasswordConfig = {
  username: string
  passwordHash: string
  needsSetup: boolean
  createdAt?: string
}

export type NavBarLink = {
  name: string
  url: string
  external?: boolean
  dropdown?: {
    name: string
    url: string
    external?: boolean
  }[]
}

export type NavBarConfig = {
  links: (NavBarLink | LinkPreset)[]
}

export type ProfileConfig = {
  avatar?: string
  avatarFilename?: string
  name: string
  bio?: string
  links: {
    name: string
    url: string
    icon: string
  }[]
}

export type LicenseConfig = {
  enable: boolean
  name: string
  url: string
}

export type BlogPostData = {
  body: string
  title: string
  published: Date
  updated?: Date
  description: string
  tags: string[]
  draft?: boolean
  yIndex: number
  image?: string
  category?: string
  prevTitle?: string
  prevSlug?: string
  nextTitle?: string
  nextSlug?: string
  bannerLink?: string
  backgroundImage?: string
  timelineYear?: string
  timelineEra?: string
  isKeyEvent?: boolean
  timelineLocation?: string
  bannerType?: 'image' | 'video' | 'timeline' | 'assistant'
  bannerData?: {
    videoId?: string
    imageUrl?: string
    category?: string
    startYear?: number
    endYear?: number
    background?: string
    title?: string
    height?: string
    compact?: boolean
  }
}
