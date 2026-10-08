# O-memory

Memory-spill der hvert par er et ISOM-karttegn og et foto av det samme terrengobjektet.
Data og bilder hentes fra [IOF O-Map Wiki](https://omapwiki.orienteering.sport/specifications/isom/) (CC BY-SA 4.0).

| Del | Teknologi | Mappe |
| --- | --- | --- |
| Scraper | .NET 10 konsollapp + AngleSharp (nedlasting via curl) | `tools/OmapScraper` |
| API | ASP.NET Core Minimal API + EF Core SQLite | `src/Mem.Api` |
| Frontend | React + Vite + TypeScript | `web` |

## Kom i gang

Krever .NET 10 SDK og Node 20.19+.

```sh
# 1. Hent data fra wikien (én gang; HTML caches i tools/OmapScraper/.cache)
dotnet run --project tools/OmapScraper            # valgfritt: -- --max-photos 4 --limit 10

# 2. Start API-et (http://localhost:5126)
dotnet run --project src/Mem.Api

# 3. Start frontend (http://localhost:5173, proxyer /api og /images til API-et)
cd web && npm install && npm run dev
```

## Tester

```sh
dotnet test          # parser- og API-tester
cd web && npm test   # spillogikk (Vitest)
```

## API

- `GET /api/game?pairs=6|8|12` – kortstokk (symbol + foto per par, ustokket)
- `GET /api/symbols` – alle symboler med foto og kreditering
- `GET /api/highscores?pairs=8` – topp 10
- `POST /api/highscores` – `{ name, pairs, moves, timeMs }`

## Produksjon

`cd web && npm run build`, kopier `web/dist` til `src/Mem.Api/wwwroot`, og publiser API-et.
API-et serverer da også frontend. Sett `DataDirectory` og `ConnectionStrings:Mem` for miljøet.

## Spillmoduser

- **Karttegn:** ISOM-karttegn ↔ foto fra O-Map Wiki.
- **Postbeskrivelser:** IOF-postbeskrivelse ↔ terrengtegning. Når et par er funnet, vises kartutsnitt og tekstbeskrivelse.
  Eksemplene (side 18–29 i «International Specification for Control Descriptions 2024», CC BY-ND 4.0) trekkes ut med:

  ```sh
  dotnet run --project tools/ControlDescriptionExtractor -- "<sti til IOF Control Descriptions 2024.pdf>" [--contact-sheet oversikt.html]
  ```

  Verktøyet finner tabellrutenettet på hver side og klipper ut kart, terrengtegning og postbeskrivelse **uendret**
  (bare beskåret) til `data/control-descriptions/`. Tekstene havner i `data/control-descriptions.json`.
  Rader med identisk tekst (og dermed lik postbeskrivelse, f.eks. rad 6 og 8 «Re-entrant») havner i samme
  forvekslingsgruppe i `data/control-descriptions-groups.json` og kommer aldri i samme spill. Filen kan redigeres
  for hånd, men overskrives hvis verktøyet kjøres på nytt.

Hver modus har sin egen highscore-liste.

## Språk

Spillet finnes på norsk og engelsk (velger øverst til høyre). Første gang følges nettleserens språk.

- UI-tekster: `web/src/i18n/messages.tsx`
- Norske karttegnnavn: `data/i18n/symbols.nb.json` (`{ "204": "Stein", … }`), fra Norges Orienteringsforbunds
  oversettelse av ISOM 2017. 203.2, 513.2 og 532 finnes ikke der (nye i ISOM 2017-2) og er oversatt manuelt.
  Flere språk legges til som `symbols.<språk>.json`; mangler et navn, brukes engelsk.

## Lisens for innhold

Karttegn, definisjoner og foto: © IOF og bidragsytere til O-Map Wiki, CC BY-SA 4.0.
Fotograf og lisens per bilde står på kildesiden og vises på «Kilder»-siden i spillet.
