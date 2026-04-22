import { getContext, setContext } from 'svelte'
import type { BannerStageContextValue } from './types'

export const BANNER_STAGE_CONTEXT_KEY = Symbol('megameal.banner-stage')

export function setBannerStageContext(value: BannerStageContextValue) {
  setContext(BANNER_STAGE_CONTEXT_KEY, value)
  return value
}

export function getBannerStageContext() {
  return getContext<BannerStageContextValue>(BANNER_STAGE_CONTEXT_KEY)
}
