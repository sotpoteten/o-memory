import { useEffect, useReducer, useState } from 'react'
import type { Card } from '../api'
import { createGame, gameReducer, isShowingMismatch } from './memoryGame'

const MISMATCH_DELAY_MS = 1000

export function useMemoryGame(cards: Card[]) {
  const [state, dispatch] = useReducer(gameReducer, cards, c => createGame(c))
  const elapsedMs = useElapsed(state.startedAt, state.finishedAt)

  useEffect(() => {
    if (!isShowingMismatch(state)) return
    const timer = setTimeout(() => dispatch({ type: 'hideMismatch' }), MISMATCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [state])

  const flip = (cardId: string) => dispatch({ type: 'flip', cardId, now: Date.now() })

  return { state, flip, elapsedMs }
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
