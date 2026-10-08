import type { Card } from '../api'

export interface GameState {
  cards: Card[]
  /** Ids of face-up cards that are not (yet) matched. At most two. */
  flipped: string[]
  /** Pair ids that have been found. */
  matched: string[]
  moves: number
  startedAt: number | null
  finishedAt: number | null
}

export type GameAction =
  | { type: 'flip'; cardId: string; now: number }
  | { type: 'hideMismatch' }

/** Fisher–Yates shuffle; returns a new array. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function createGame(cards: Card[], random?: () => number): GameState {
  return { cards: shuffle(cards, random), flipped: [], matched: [], moves: 0, startedAt: null, finishedAt: null }
}

export const isFinished = (state: GameState) => state.finishedAt !== null

/** True while two non-matching cards are face up, waiting to be turned back. */
export const isShowingMismatch = (state: GameState) => state.flipped.length === 2

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'flip': {
      const card = state.cards.find(c => c.id === action.cardId)
      if (
        !card ||
        isFinished(state) ||
        isShowingMismatch(state) ||
        state.flipped.includes(card.id) ||
        state.matched.includes(card.pairId)
      ) {
        return state
      }

      const startedAt = state.startedAt ?? action.now

      if (state.flipped.length === 0) {
        return { ...state, startedAt, flipped: [card.id] }
      }

      // Second card of a move.
      const first = state.cards.find(c => c.id === state.flipped[0])!
      const moves = state.moves + 1

      if (first.pairId !== card.pairId) {
        return { ...state, startedAt, moves, flipped: [first.id, card.id] }
      }

      const matched = [...state.matched, card.pairId]
      const finishedAt = matched.length * 2 === state.cards.length ? action.now : null
      return { ...state, startedAt, moves, matched, flipped: [], finishedAt }
    }
    case 'hideMismatch':
      return isShowingMismatch(state) ? { ...state, flipped: [] } : state
  }
}
