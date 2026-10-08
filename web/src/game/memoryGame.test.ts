import { describe, expect, it } from 'vitest'
import type { Card } from '../api'
import { createGame, gameReducer, isFinished, isLocked, shuffle, type GameState } from './memoryGame'

const card = (pairId: string, kind: 'symbol' | 'photo'): Card => ({
  id: `${pairId}-${kind[0]}`,
  pairId,
  kind,
  imageUrl: '',
  symbolId: pairId,
  symbolNames: { en: pairId },
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

  it('zooms turned cards and shrinks them when a mismatch is turned back', () => {
    let state = flip(newGame(), 'a-s')
    expect(state.zoomed).toEqual(['a-s'])

    state = flip(state, 'b-p')
    expect(state.zoomed).toEqual(['a-s', 'b-p'])

    state = gameReducer(state, { type: 'hideMismatch' })
    expect(state.zoomed).toEqual([])
  })

  it('keeps a found pair zoomed until the zoom is cleared', () => {
    let state = flip(flip(newGame(), 'a-s'), 'a-p')
    expect(state.zoomed).toEqual(['a-s', 'a-p'])

    state = gameReducer(state, { type: 'clearZoom' })
    expect(state.zoomed).toEqual([])
  })

  it('lets the player shrink a zoomed card without turning it', () => {
    let state = flip(newGame(), 'a-s')
    state = gameReducer(state, { type: 'unzoom', cardId: 'a-s' })

    expect(state.zoomed).toEqual([])
    expect(state.flipped).toEqual(['a-s'])

    state = flip(state, 'b-p')
    expect(state.zoomed).toEqual(['b-p'])
  })

  it('replaces the zoom of a found pair when the next card is turned', () => {
    let state = flip(flip(newGame(), 'a-s'), 'a-p')
    state = flip(state, 'b-s')
    expect(state.zoomed).toEqual(['b-s'])
  })

  it('locks the board from a mismatch until the cards are fully turned back', () => {
    let state = flip(flip(newGame(), 'a-s'), 'b-p')
    expect(isLocked(state)).toBe(true)
    // Neither clicking the second card again nor another card does anything.
    expect(gameReducer(state, { type: 'unzoom', cardId: 'b-p' })).toBe(state)
    expect(flip(state, 'b-p')).toBe(state)
    expect(flip(state, 'b-s')).toBe(state)

    state = gameReducer(state, { type: 'hideMismatch' })
    expect(isLocked(state)).toBe(true)
    expect(flip(state, 'b-p')).toBe(state)

    state = gameReducer(state, { type: 'closed' })
    expect(isLocked(state)).toBe(false)
    expect(flip(state, 'b-p').flipped).toEqual(['b-p'])
  })

  it('lets the player review the finished board and toggle zoom on any card', () => {
    let state = flip(flip(newGame(), 'a-s'), 'a-p')
    expect(gameReducer(state, { type: 'review' })).toBe(state) // not finished yet
    expect(gameReducer(state, { type: 'toggleZoom', cardId: 'b-s' })).toBe(state)

    state = flip(flip(state, 'b-s'), 'b-p')
    state = gameReducer(state, { type: 'review' })
    expect(state.reviewing).toBe(true)
    expect(state.zoomed).toEqual([])

    state = gameReducer(state, { type: 'toggleZoom', cardId: 'a-p' })
    expect(state.zoomed).toEqual(['a-p'])
    state = gameReducer(state, { type: 'toggleZoom', cardId: 'b-s' })
    expect(state.zoomed).toEqual(['b-s'])
    state = gameReducer(state, { type: 'toggleZoom', cardId: 'b-s' })
    expect(state.zoomed).toEqual([])
  })

  it('finishes when all pairs are found', () => {
    let state = newGame()
    state = flip(state, 'a-s', 1000)
    state = flip(state, 'b-p', 2000)
    state = gameReducer(state, { type: 'hideMismatch' })
    state = gameReducer(state, { type: 'closed' })
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
