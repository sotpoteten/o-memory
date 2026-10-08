import { describe, expect, it } from 'vitest'
import type { Card } from '../api'
import { createGame, gameReducer, isFinished, shuffle, type GameState } from './memoryGame'

const card = (pairId: string, kind: 'symbol' | 'photo'): Card => ({
  id: `${pairId}-${kind[0]}`,
  pairId,
  kind,
  imageUrl: '',
  symbolId: pairId,
  symbolName: pairId,
  alt: null,
})

const deck = [card('a', 'symbol'), card('a', 'photo'), card('b', 'symbol'), card('b', 'photo')]
const newGame = () => createGame(deck, () => 0.5)

const flip = (state: GameState, cardId: string, now = 1000) => gameReducer(state, { type: 'flip', cardId, now })

describe('shuffle', () => {
  it('keeps all items', () => {
    expect(shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5])
  })
})

describe('gameReducer', () => {
  it('starts the clock on the first flip', () => {
    const state = flip(newGame(), 'a-s', 5000)
    expect(state.startedAt).toBe(5000)
    expect(state.flipped).toEqual(['a-s'])
    expect(state.moves).toBe(0)
  })

  it('records a match and counts one move', () => {
    const state = flip(flip(newGame(), 'a-s'), 'a-p')
    expect(state.matched).toEqual(['a'])
    expect(state.flipped).toEqual([])
    expect(state.moves).toBe(1)
  })

  it('keeps a mismatch face up until hidden, ignoring further flips', () => {
    let state = flip(flip(newGame(), 'a-s'), 'b-p')
    expect(state.flipped).toEqual(['a-s', 'b-p'])
    expect(state.moves).toBe(1)

    expect(flip(state, 'b-s')).toBe(state)

    state = gameReducer(state, { type: 'hideMismatch' })
    expect(state.flipped).toEqual([])
  })

  it('ignores flipping the same card twice or an already matched card', () => {
    const one = flip(newGame(), 'a-s')
    expect(flip(one, 'a-s')).toBe(one)

    const matched = flip(one, 'a-p')
    expect(flip(matched, 'a-s')).toBe(matched)
  })

  it('finishes when all pairs are found', () => {
    let state = newGame()
    state = flip(state, 'a-s', 1000)
    state = flip(state, 'b-p', 2000)
    state = gameReducer(state, { type: 'hideMismatch' })
    state = flip(state, 'a-s', 3000)
    state = flip(state, 'a-p', 4000)
    expect(isFinished(state)).toBe(false)
    state = flip(state, 'b-s', 5000)
    state = flip(state, 'b-p', 6000)

    expect(isFinished(state)).toBe(true)
    expect(state.finishedAt).toBe(6000)
    expect(state.moves).toBe(3)
  })
})
