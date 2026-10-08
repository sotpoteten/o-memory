export const LANGUAGES = ['nb', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

const LANGUAGE_KEY = 'mem.language'

/** Norwegian (Bokmål, Nynorsk or plain "no") browsers get Norwegian; everyone else English. */
export function detectLanguage(browserLanguages: readonly string[]): Language {
  const primary = browserLanguages[0]?.toLowerCase().split('-')[0]
  return primary === 'nb' || primary === 'nn' || primary === 'no' ? 'nb' : 'en'
}

export function initialLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY)
    if (LANGUAGES.includes(stored as Language)) return stored as Language
  } catch {
    // Storage unavailable — fall back to the browser language.
  }
  return detectLanguage(typeof navigator === 'undefined' ? [] : navigator.languages)
}

export function storeLanguage(language: Language) {
  try {
    localStorage.setItem(LANGUAGE_KEY, language)
  } catch {
    // Storage unavailable — the choice is just not remembered.
  }
}

/** Picks the symbol name for the language, falling back to English. */
export function symbolName(names: Readonly<Record<string, string>>, language: Language) {
  return names[language] ?? names.en ?? ''
}
