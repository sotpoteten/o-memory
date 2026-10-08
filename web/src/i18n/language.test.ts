import { describe, expect, it } from 'vitest'
import { detectLanguage, symbolName } from './language'

describe('detectLanguage', () => {
  it.each([['nb-NO'], ['nb'], ['nn-NO'], ['no']])('uses Norwegian for %s', lang => {
    expect(detectLanguage([lang, 'en-US'])).toBe('nb')
  })

  it.each([['sv-SE'], ['en-US'], ['de']])('uses English for %s', lang => {
    expect(detectLanguage([lang, 'nb-NO'])).toBe('en')
  })

  it('uses English when the browser reports no language', () => {
    expect(detectLanguage([])).toBe('en')
  })
})

describe('symbolName', () => {
  const names = { en: 'Boulder', nb: 'Stein' }

  it('picks the name for the language', () => {
    expect(symbolName(names, 'nb')).toBe('Stein')
    expect(symbolName(names, 'en')).toBe('Boulder')
  })

  it('falls back to English when there is no translation', () => {
    expect(symbolName({ en: 'Stairway' }, 'nb')).toBe('Stairway')
  })
})
