import { useEffect, useRef, useState } from 'react'
import { postHighScore, type NewHighScore } from '../api'

export type SaveStatus =
  | { state: 'saving' }
  | { state: 'saved'; id: number }
  | { state: 'error' }

function post(score: NewHighScore, setResult: (status: SaveStatus) => void) {
  postHighScore(score)
    .then(saved => setResult({ state: 'saved', id: saved.id }))
    .catch(() => setResult({ state: 'error' }))
}

/**
 * Posts the result to the highscore list once, as soon as `score` is available
 * (i.e. the game is finished). Returns the save status and a retry function for failures.
 */
export function useSaveResult(score: NewHighScore | null) {
  const [result, setResult] = useState<SaveStatus | null>(null)
  // Guards against posting twice (React StrictMode runs effects twice in development).
  const postedRef = useRef(false)

  useEffect(() => {
    if (score === null || postedRef.current) return
    postedRef.current = true
    post(score, setResult)
  }, [score])

  const retry = () => {
    if (score === null) return
    setResult({ state: 'saving' })
    post(score, setResult)
  }

  const status: SaveStatus | null = score === null ? null : (result ?? { state: 'saving' })
  return { status, retry }
}
