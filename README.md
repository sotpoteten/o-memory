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

## Lisens for innhold

Karttegn, definisjoner og foto: © IOF og bidragsytere til O-Map Wiki, CC BY-SA 4.0.
Fotograf og lisens per bilde står på kildesiden og vises på «Kilder»-siden i spillet.
