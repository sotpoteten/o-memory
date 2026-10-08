import { useEffect, useState } from 'react'
import { fetchSymbols, type SymbolInfo } from '../api'
import { useI18n } from '../i18n/context'
import { symbolName } from '../i18n/language'

const WIKI_URL = 'https://omapwiki.orienteering.sport/'
const LICENSE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/'
const CONTROL_DESCRIPTIONS_URL = 'https://orienteering.sport/iof/rules/control-descriptions/'
const CONTROL_DESCRIPTIONS_LICENSE_URL = 'https://creativecommons.org/licenses/by-nd/4.0/'
const NOF_TRANSLATION_URL = 'https://www.orientering.no/storage/Downloadfile?id=2320e527-19b7-4747-8648-2cd334928acd'

export function Credits() {
  const { t, language } = useI18n()
  const [symbols, setSymbols] = useState<SymbolInfo[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchSymbols().then(setSymbols).catch(() => setError(true))
  }, [])

  return (
    <section className="credits">
      <h2>{t.credits.heading}</h2>
      <p>
        {t.credits.intro(
          <a href={WIKI_URL}>IOF O-Map Wiki</a>,
          <a href={LICENSE_URL}>Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)</a>,
        )}
      </p>
      <p>{t.credits.norwegianNames(<a href={NOF_TRANSLATION_URL}>{t.credits.norwegianTranslation}</a>)}</p>
      <p>
        {t.credits.controlDescriptions(
          <a href={CONTROL_DESCRIPTIONS_URL}>International Specification for Control Descriptions 2024</a>,
          <a href={CONTROL_DESCRIPTIONS_LICENSE_URL}>Creative Commons Attribution-NoDerivatives 4.0 (CC BY-ND 4.0)</a>,
        )}
      </p>

      {error && <p className="error">{t.credits.loadError}</p>}
      {symbols === null && !error && <p className="muted">{t.credits.loading}</p>}

      <ul className="credit-list">
        {symbols?.map(s => (
          <li key={s.id}>
            <div className="credit-symbol">
              <img src={s.symbolImageUrl} alt="" />
              <a href={s.pageUrl}>{s.id} {symbolName(s.names, language)}</a>
            </div>
            <ul>
              {s.photos.map(p => (
                <li key={p.imageUrl}>
                  <a href={p.sourceUrl}>{p.caption ?? p.alt ?? p.sourceUrl}</a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}
