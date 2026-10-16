import { useI18n } from '../i18n/context'

interface Props {
  /** Number of pairs in the game. */
  total: number
  /** Number of pairs found so far. */
  found: number
}

/**
 * The game's progress drawn as an orienteering course in the purple overprint: a start triangle, one control
 * circle per pair (numbered once that pair is found) joined by legs, and the finish double circle.
 */
export function ControlProgress({ total, found }: Props) {
  const { t } = useI18n()
  const finished = found === total

  return (
    <div className="course" role="img" aria-label={t.game.pairsProgress(found, total)}>
      <svg className="course-start" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.5 21.5 20h-19z" />
      </svg>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`course-control ${i < found ? 'is-found' : ''}`} aria-hidden="true">
          {i < found && <span className="course-number">{i + 1}</span>}
        </span>
      ))}
      <span className={`course-finish ${finished ? 'is-found' : ''}`} aria-hidden="true" />
    </div>
  )
}
