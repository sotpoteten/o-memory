import { useEffect, useReducer, useState } from 'react'
import type { Card } from '../api'
import { createGame, gameReducer, isShowingMismatch } from './memoryGame'

const MISMATCH_DELAY_MS = 1000
const MATCH_ZOOM_MS = 1200
/** Slightly longer than the card flip transition in index.css (0.3s). */
const TURN_BACK_MS = 320

export function useMemoryGame(cards: Card[]) {
  const [state, dispatch] = useReducer(gameReducer, cards, c => createGame(c))
  const elapsedMs = useElapsed(state.startedAt, state.finishedAt)

  useEffect(() => {
    if (!isShowingMismatch(state)) return
    const timer = setTimeout(() => dispatch({ type: 'hideMismatch' }), MISMATCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [state])

  useEffect(() => {
    if (!state.closing) return
    const timer = setTimeout(() => dispatch({ type: 'closed' }), TURN_BACK_MS)
    return () => clearTimeout(timer)
  }, [state.closing])

  // A found pair stays enlarged for a moment before shrinking back.
  const showingMatch = !state.reviewing && state.flipped.length === 0 && state.zoomed.length > 0
  useEffect(() => {
    if (!showingMatch) return
    const timer = setTimeout(() => dispatch({ type: 'clearZoom' }), MATCH_ZOOM_MS)
    return () => clearTimeout(timer)
  }, [showingMatch, state.zoomed])

  const flip = (cardId: string) => dispatch({ type: 'flip', cardId, now: Date.now() })
  const unzoom = (cardId: string) => dispatch({ type: 'unzoom', cardId })
  const review = () => dispatch({ type: 'review' })
  const toggleZoom = (cardId: string) => dispatch({ type: 'toggleZoom', cardId })

  return { state, flip, unzoom, review, toggleZoom, elapsedMs }
}

/** Ticks while the game is running and returns elapsed milliseconds. */
function useElapsed(startedAt: number | null, finishedAt: number | null) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startedAt === null || finishedAt !== null) return
    const interval = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(interval)
  }, [startedAt, finishedAt])

  if (startedAt === null) return 0
  return (finishedAt ?? now) - startedAt
}

export function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
