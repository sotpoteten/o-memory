import { useEffect, useState } from 'react'
import { fetchSymbols, type SymbolInfo } from '../api'

const WIKI_URL = 'https://omapwiki.orienteering.sport/'
const LICENSE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/'

export function Credits() {
  const [symbols, setSymbols] = useState<SymbolInfo[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchSymbols().then(setSymbols).catch(() => setError(true))
  }, [])

  return (
    <section className="credits">
      <h2>Kilder og kreditering</h2>
      <p>
        Karttegn, definisjoner og foto er hentet fra <a href={WIKI_URL}>IOF O-Map Wiki</a> (International
        Orienteering Federation), og er lisensiert under{' '}
        <a href={LICENSE_URL}>Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)</a>. Bildene er
        nedskalert. Hvert foto lenker til sin originalside med fotograf og lisens.
      </p>

      {error && <p className="error">Kunne ikke hente symbollisten.</p>}
      {symbols === null && !error && <p className="muted">Laster…</p>}

      <ul className="credit-list">
        {symbols?.map(s => (
          <li key={s.id}>
            <div className="credit-symbol">
              <img src={s.symbolImageUrl} alt="" />
              <a href={s.pageUrl}>{s.id} {s.name}</a>
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
