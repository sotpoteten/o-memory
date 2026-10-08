import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { I18nContext } from './context'
import { initialLanguage, storeLanguage, type Language } from './language'
import { messages } from './messages'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo(
    () => ({
      language,
      t: messages[language],
      setLanguage: (next: Language) => {
        storeLanguage(next)
        setLanguageState(next)
      },
    }),
    [language],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
