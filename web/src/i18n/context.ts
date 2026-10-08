import { createContext, useContext } from 'react'
import type { Language } from './language'
import { messages, type Messages } from './messages'

export interface I18n {
  language: Language
  setLanguage: (language: Language) => void
  t: Messages
}

export const I18nContext = createContext<I18n>({
  language: 'en',
  setLanguage: () => {},
  t: messages.en,
})

export const useI18n = () => useContext(I18nContext)
