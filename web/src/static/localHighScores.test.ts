import { describe, expect, it } from 'vitest'
import type { NewHighScore } from '../api'
import { addScore, topScores } from './localHighScores'

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value) },
  }
}

const score = (moves: number, timeMs = 30_000, extra: Partial<NewHighScore> = {}): NewHighScore =>
  ({ name: 'Kari', mode: 'symbols', pairs: 8, moves, timeMs, ...extra })

describe('local high scores', () => {
  it('ranks by moves, then time, and gives each result an id', () => {
    const storage = memoryStorage()
    const slow = addScore(storage, score(12, 50_000))
    const best = addScore(storage, score(10))
    const fast = addScore(storage, score(12, 20_000))

    expect(topScores(storage, 8, 'symbols').map(s => s.id)).toEqual([best.id, fast.id, slow.id])
    expect(new Set([slow.id, best.id, fast.id]).size).toBe(3)
  })

  it('keeps separate lists per mode and difficulty', () => {
    const storage = memoryStorage()
    addScore(storage, score(10))
    addScore(storage, score(10, 30_000, { mode: 'descriptions' }))
    addScore(storage, score(14, 30_000, { pairs: 12 }))

    expect(topScores(storage, 8, 'symbols')).toHaveLength(1)
    expect(topScores(storage, 8, 'descriptions')).toHaveLength(1)
    expect(topScores(storage, 12, 'symbols')).toHaveLength(1)
    expect(topScores(storage, 6, 'symbols')).toEqual([])
  })

  it('keeps only the ten best results per list', () => {
    const storage = memoryStorage()
    for (let moves = 20; moves > 8; moves--) addScore(storage, score(moves))
    addScore(storage, score(10, 30_000, { mode: 'descriptions' }))

    const top = topScores(storage, 8, 'symbols')
    expect(top).toHaveLength(10)
    expect(top[0].moves).toBe(9)
    expect(top.at(-1)!.moves).toBe(18)
    expect(topScores(storage, 8, 'descriptions')).toHaveLength(1)
  })

  it('trims and shortens the name like the API', () => {
    const saved = addScore(memoryStorage(), score(10, 30_000, { name: '  Et altfor langt navn på en spiller  ' }))

    expect(saved.name).toBe('Et altfor langt navn')
  })

  it('treats a corrupt store as empty', () => {
    expect(topScores(memoryStorage({ 'mem.highscores': '{not json' }), 8, 'symbols')).toEqual([])
    expect(topScores(memoryStorage({ 'mem.highscores': '{"a":1}' }), 8, 'symbols')).toEqual([])
  })

  it('lets a refused write fail so the result can be saved again', () => {
    const storage = { ...memoryStorage(), setItem: () => { throw new Error('QuotaExceededError') } }

    expect(() => addScore(storage, score(10))).toThrow()
  })
})
