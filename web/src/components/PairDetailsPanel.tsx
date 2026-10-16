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
        // Keyed by the text, so a newly found pair fades in instead of replacing the old one in place.
        <div className="pair-details-content" key={details.text}>
          <img src={details.mapImageUrl} alt={t.pairDetails.mapAlt} />
          <p lang="en">{details.text}</p>
        </div>
      ) : (
        <p className="muted">{t.pairDetails.placeholder}</p>
      )}
    </div>
  )
}
