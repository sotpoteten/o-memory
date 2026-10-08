import { describe, expect, it } from 'vitest'
import { displayName } from './playerName'

describe('displayName', () => {
  it('uses the trimmed name', () => {
    expect(displayName('  Kari ')).toBe('Kari')
  })

  it('falls back to Anonym for an empty name', () => {
    expect(displayName('')).toBe('Anonym')
    expect(displayName('   ')).toBe('Anonym')
  })
})
