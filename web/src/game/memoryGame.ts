import type { Card } from '../api'

export interface GameState {
  cards: Card[]
  /** Ids of face-up cards that are not (yet) matched. At most two. */
  flipped: string[]
  /** Pair ids that have been found. */
  matched: string[]
  /** Ids of cards shown enlarged: the cards just turned, until they are turned back or a match has been shown. */
  zoomed: string[]
  moves: number
  /** After finishing, the player can study the board and zoom any card. */
  reviewing: boolean
  startedAt: number | null
  finishedAt: number | null
}

export type GameAction =
  | { type: 'flip'; cardId: string; now: number }
  | { type: 'hideMismatch' }
  /** The player clicked an enlarged card to shrink it. */
  | { type: 'unzoom'; cardId: string }
  /** Ends the enlarged view of a just-found pair. */
  | { type: 'clearZoom' }
  /** Leaves the result dialog to study the finished board. */
  | { type: 'review' }
  /** While reviewing: enlarge a card, or shrink it if it is already enlarged. */
  | { type: 'toggleZoom'; cardId: string }

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
  return { cards: shuffle(cards, random), flipped: [], matched: [], zoomed: [], moves: 0, reviewing: false, startedAt: null, finishedAt: null }
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
        return { ...state, startedAt, flipped: [card.id], zoomed: [card.id] }
      }

      // Second card of a move.
      const first = state.cards.find(c => c.id === state.flipped[0])!
      const moves = state.moves + 1
      const zoomed = [...state.zoomed, card.id]

      if (first.pairId !== card.pairId) {
        return { ...state, startedAt, moves, zoomed, flipped: [first.id, card.id] }
      }

      const matched = [...state.matched, card.pairId]
      const finishedAt = matched.length * 2 === state.cards.length ? action.now : null
      return { ...state, startedAt, moves, zoomed, matched, flipped: [], finishedAt }
    }
    case 'hideMismatch':
      return isShowingMismatch(state) ? { ...state, flipped: [], zoomed: [] } : state
    case 'unzoom':
      return state.zoomed.includes(action.cardId)
        ? { ...state, zoomed: state.zoomed.filter(id => id !== action.cardId) }
        : state
    case 'clearZoom':
      return state.zoomed.length > 0 ? { ...state, zoomed: [] } : state
    case 'review':
      return isFinished(state) ? { ...state, reviewing: true, zoomed: [] } : state
    case 'toggleZoom':
      if (!state.reviewing) return state
      return { ...state, zoomed: state.zoomed.includes(action.cardId) ? [] : [action.cardId] }
  }
}
