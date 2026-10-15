# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

O-memory: a memory game for orienteering. Two modes, each pairing two images of the same thing:
- **symbols** – ISOM 2017-2 map symbol ↔ photo of the terrain feature (data from IOF O-Map Wiki, CC BY-SA 4.0).
- **descriptions** – IOF control description strip ↔ terrain drawing; the map excerpt and text are shown once a pair is found (examples from IOF "Control Descriptions 2024", **CC BY-ND 4.0** – images must stay unchanged apart from cropping, and the English text must not be translated).

Stack: .NET 10 (tools + ASP.NET Core Minimal API + EF Core SQLite) and React 19 + Vite + TypeScript. UI and commit messages are in Norwegian.

## Environment quirks (Windows)

- An old 32-bit `dotnet` in `C:\Program Files (x86)` shadows the real SDK on PATH. Use the full path: `"/c/Program Files/dotnet/dotnet.exe"` (Git Bash) or `& "C:\Program Files\dotnet\dotnet.exe"` (PowerShell).
- Node may also be missing from PATH in tool shells: prefix with `PATH="/c/Program Files/nodejs:$PATH"`.
- A running `Mem.Api` locks `bin/…/Mem.Api.exe`; stop it before `dotnet build`/`dotnet test`, or the build fails with MSB3021/MSB3026.

## Commands

```sh
# .NET (from repo root)
dotnet build
dotnet test                                                  # all three test projects
dotnet test tests/Mem.Api.Tests --filter "FullyQualifiedName~GameTests"   # one class
dotnet test tests/Mem.Api.Tests --filter "DisplayName~confusable"         # by name
dotnet run --project src/Mem.Api --launch-profile http       # API on http://localhost:5126

# Frontend (from web/)
npm run dev        # http://localhost:5173, proxies /api and /images to :5126 (override with MEM_API_URL)
npm run dev:pages  # static version without the API, at http://localhost:5173/o-memory/
npm test           # vitest run
npx vitest run src/game/zoomLayout.test.ts                   # one file
npx tsc -b         # typecheck
npx oxlint         # lint
npm run build
npm run build:pages   # static GitHub Pages build (copies data/ into dist/data)

# Data tools (only needed to regenerate data/, which is committed)
dotnet run --project tools/OmapScraper [-- --max-photos 4 --limit N]
dotnet run --project tools/ControlDescriptionExtractor -- "<IOF Control Descriptions 2024.pdf>" [--contact-sheet out.html]
```

## Architecture

**Data is generated offline and committed** under `data/`; the API only reads it.
- `tools/OmapScraper` scrapes the wiki into `data/symbols.json` + `data/images/{id}/`. It shells out to `curl` because Cloudflare rejects .NET's HttpClient; HTML is cached in `tools/OmapScraper/.cache/`. Only categories 1–5 are scraped (6xx/7xx have no real-world photo).
- `tools/ControlDescriptionExtractor` renders PDF pages 18–29 (PDFtoImage/PDFium), finds the table grid from dark-pixel projections, and reads row numbers/text with PdfPig. Pure parsing logic lives in `TableParser` (unit-tested); writes `data/control-descriptions.json`, images, and `data/control-descriptions-groups.json` (rows with identical text). Re-running overwrites that groups file.
- Hand-maintained data: `data/i18n/symbols.nb.json` (Norwegian symbol names; 203.2, 513.2, 532 are manual translations) and `data/confusable-groups.json`.

**Confusable groups** (`*groups.json`, `{ name, ids[] }`): a game contains at most one item per group. `Game.PickRandom` shuffles all items then `Game.PickNonConfusable` skips items whose group is already used — so larger groups appear more often while each item is picked about equally. Both repositories call `ConfusableGroups.EnsureCapacity` at startup and throw if fewer than 12 (max pairs) distinct items remain; `DataTests` check the real files.

**API** (`src/Mem.Api/Program.cs`): `GET /api/game?pairs=6|8|12&mode=symbols|descriptions` returns unshuffled cards (client shuffles); `GET/POST /api/highscores` per mode; `GET /api/symbols` for the credits page. Images are served from `data/images` at `/images` and from `data/control-descriptions` at `/images/control-descriptions`. Config is read lazily (factories/after `Build`) so `WebApplicationFactory` tests can override `DataDirectory` and `ConnectionStrings:Mem`. The DB uses `EnsureCreated` (no migrations); schema additions to an existing `mem.db` are done by hand in `DatabaseUpgrade` (e.g. the `Mode` column) — follow that pattern and add a test like `DatabaseUpgradeTests`.

**Two backends, chosen at build time** in `web/src/api.ts` (`import.meta.env.VITE_BACKEND`, set to `static` by `web/.env.pages`):
- *API* (default): the .NET API above, shared high scores in SQLite.
- *Static* (`--mode pages`, deployed to https://sotpoteten.github.io/o-memory/ by `.github/workflows/pages.yml`): `web/src/static/` reads the files in `data/` directly (the `staticData` plugin in `vite.config.ts` serves them in dev and copies them into `dist/data`), builds decks in `deck.ts` and keeps high scores in localStorage (`localHighScores.ts`). Base path is `/o-memory/`.
`deck.ts` mirrors `SymbolRepository`/`ControlDescriptionRepository`/`Game` in C#: change deck or group rules in both, with tests on both sides.

**Cards** carry `symbolNames` per language (`en` always present; description mode uses IOF's English text for all languages) and optional `details` (map excerpt + text). The client picks the name with `symbolName(names, lang)` falling back to `en`.

**Frontend game logic** is a pure reducer in `web/src/game/memoryGame.ts` (flip, mismatch lock incl. the 0.45 s turn-back animation, zoom state, review mode); `useMemoryGame` adds timers. Keep new game rules in the reducer and test them there.

**Layout is computed in JS and written straight to the DOM** in `GameBoard.tsx`:
- `useZoomLayout` → `zoomLayout.ts`: places all enlarged cards together so neighbours sit edge to edge (never overlap), within the viewport; cards mark themselves with `data-card-id`. The zoom is applied as a real size and position (`left/top/width/height` of the card inside its `.card-box`), not a scale transform: Chrome draws a scaled 3D-flipped card small and blows it up, which blurs the SVG symbols. `--zoom-order` keeps the latest-opened card on top; CSS animates `z-index` down while a card shrinks.
- `useFitToWindow` → `boardFit.ts`: on PC screens picks the column count (only divisors of the card count, so rows are full) and board width (`--fit-cols`, `--fit-width`) so the whole page fits without scrolling. Phones (≤600 px) keep the CSS `--cols` and scroll.
Both pure functions have Vitest tests; verify visual changes in a real browser (Chrome extension) since tests can't see layout.

**i18n**: no library. `web/src/i18n/messages.tsx` has typed `en`/`nb` dictionaries (`nb: Messages = typeof en`, so missing keys fail `tsc`); some messages are functions returning JSX for embedded links. Language: localStorage, else browser language (`nb`/`nn`/`no` → Norwegian).

**Credits**: any new third-party content must be attributed on the Kilder page (`Credits.tsx`) with its license.
