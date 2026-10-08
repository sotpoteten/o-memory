import { describe, expect, it } from 'vitest'
import { displayName } from './playerName'

describe('displayName', () => {
  it('uses the trimmed name', () => {
    expect(displayName('  Kari ', 'Anonym')).toBe('Kari')
  })

  it('falls back to the anonymous label for an empty name', () => {
    expect(displayName('', 'Anonym')).toBe('Anonym')
    expect(displayName('   ', 'Anonymous')).toBe('Anonymous')
  })
})
