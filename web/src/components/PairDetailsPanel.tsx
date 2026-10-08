import type { CardDetails } from '../api'
import { useI18n } from '../i18n/context'

/**
 * Shows the map excerpt and IOF's text description of the most recently found pair
 * (or, while reviewing, of the enlarged card). Always rendered in description mode so the board does not jump.
 */
export function PairDetailsPanel({ details }: { details: CardDetails | null }) {
  const { t } = useI18n()

  return (
    <div className="pair-details" aria-live="polite">
      {details ? (
        <>
          <img src={details.mapImageUrl} alt={t.pairDetails.mapAlt} />
          <p lang="en">{details.text}</p>
        </>
      ) : (
        <p className="muted">{t.pairDetails.placeholder}</p>
      )}
    </div>
  )
}
