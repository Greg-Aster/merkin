import type I18nKey from './i18nKey'
import { en } from './languages/en'

export type Translation = {
  [K in I18nKey]: string
}

export function getTranslation(_lang?: string): Translation {
  return en
}

export function i18n(key: I18nKey): string {
  return en[key]
}
