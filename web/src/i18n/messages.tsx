import type { ReactNode } from 'react'
import type { GameMode } from '../api'
import type { Language } from './language'

const en = {
  languageName: 'English',
  languagePicker: 'Language',
  nav: { credits: 'Sources' },
  footer: (wiki: ReactNode) => <>Content from {wiki}, CC BY-SA 4.0</>,

  setup: {
    intro:
      'Find the pairs: every map symbol from the orienteering map belongs with a photo of the same terrain feature in real life.',
    nameLabel: 'Name',
    optional: '(optional)',
    mode: 'Game',
    difficulty: 'Difficulty',
    levels: { 6: 'Easy', 8: 'Medium', 12: 'Hard' } as Record<number, string>,
    pairsCount: (pairs: number) => `${pairs} pairs`,
    start: 'Start game',
    loadingCards: 'Dealing cards…',
    startError: 'Could not start the game. Is the API running?',
    startErrorStatic: 'Could not load the game data. Try reloading the page.',
    highscoreHeading: (mode: string, level: string) => `High scores – ${mode}, ${level.toLowerCase()}`,
    localHighscoreHeading: (mode: string, level: string) => `Your best results – ${mode}, ${level.toLowerCase()}`,
    localHighscoreNote: 'Results are only saved in this browser.',
  },

  modes: {
    symbols: { title: 'Map symbols', description: 'Map symbol ↔ photo' },
    descriptions: { title: 'Control descriptions', description: 'Description ↔ terrain drawing' },
  } as Record<GameMode, { title: string; description: string }>,

  pairDetails: {
    placeholder: 'Find a pair to see the map excerpt and the text description.',
    mapAlt: 'Map excerpt with control circle',
  },

  anonymous: 'Anonymous',

  game: {
    moves: 'Moves',
    time: 'Time',
    pairs: 'Pairs',
    newGame: 'New game',
    quit: 'Quit',
    reviewHint: 'Click a card to enlarge it.',
  },

  card: {
    symbol: 'Map symbol',
    photo: 'Photo',
    description: 'Control description',
    terrain: 'Terrain drawing',
    hidden: 'Hidden card',
    clickToShrink: '(click to shrink)',
    clickToEnlarge: '(click to enlarge)',
  },

  result: {
    title: 'All pairs found!',
    stats: (moves: ReactNode, time: ReactNode) => <>{moves} moves in {time}</>,
    saving: 'Saving your result…',
    saveError: 'Could not save the result.',
    retry: 'Try again',
    playAgain: 'Play again',
    review: 'View the board',
    toStart: 'Back to start',
  },

  highscores: {
    loading: 'Loading…',
    loadError: 'Could not load high scores.',
    empty: 'No results yet – be the first!',
    emptyLocal: 'No results yet.',
    moves: (moves: number) => `${moves} moves`,
  },

  credits: {
    heading: 'Sources and credits',
    intro: (wiki: ReactNode, license: ReactNode) => (
      <>
        Map symbols, definitions and photos come from {wiki} (International Orienteering Federation) and are
        licensed under {license}. The images have been scaled down. Each photo links to its original page with
        photographer and license.
      </>
    ),
    norwegianNames: (translation: ReactNode) => <>Norwegian symbol names: {translation}.</>,
    norwegianTranslation: "the Norwegian Orienteering Federation's translation of ISOM 2017",
    controlDescriptions: (document: ReactNode, license: ReactNode) => (
      <>
        Control descriptions, terrain drawings, map excerpts and text descriptions: examples from {document} by
        the International Orienteering Federation, licensed under {license}. The excerpts are reproduced unchanged.
      </>
    ),
    loading: 'Loading…',
    loadError: 'Could not load the symbol list.',
  },
}

export type Messages = typeof en

const nb: Messages = {
  languageName: 'Norsk',
  languagePicker: 'Språk',
  nav: { credits: 'Kilder' },
  footer: wiki => <>Innhold fra {wiki}, CC BY-SA 4.0</>,

  setup: {
    intro:
      'Finn parene: hvert karttegn fra orienteringskartet hører sammen med et foto av det samme terrengobjektet i virkeligheten.',
    nameLabel: 'Navn',
    optional: '(valgfritt)',
    mode: 'Spill',
    difficulty: 'Vanskelighetsgrad',
    levels: { 6: 'Lett', 8: 'Middels', 12: 'Vanskelig' },
    pairsCount: pairs => `${pairs} par`,
    start: 'Start spill',
    loadingCards: 'Henter kort…',
    startError: 'Kunne ikke starte spillet. Kjører API-et?',
    startErrorStatic: 'Kunne ikke laste spilldataene. Prøv å laste siden på nytt.',
    highscoreHeading: (mode, level) => `Highscore – ${mode.toLowerCase()}, ${level.toLowerCase()}`,
    localHighscoreHeading: (mode, level) => `Dine beste resultater – ${mode.toLowerCase()}, ${level.toLowerCase()}`,
    localHighscoreNote: 'Resultatene lagres bare i denne nettleseren.',
  },

  modes: {
    symbols: { title: 'Karttegn', description: 'Karttegn ↔ foto' },
    descriptions: { title: 'Postbeskrivelser', description: 'Postbeskrivelse ↔ terrengtegning' },
  },

  pairDetails: {
    placeholder: 'Finn et par for å se kartutsnittet og tekstbeskrivelsen.',
    mapAlt: 'Kartutsnitt med postring',
  },

  anonymous: 'Anonym',

  game: {
    moves: 'Trekk',
    time: 'Tid',
    pairs: 'Par',
    newGame: 'Nytt spill',
    quit: 'Avslutt',
    reviewHint: 'Klikk på et kort for å forstørre det.',
  },

  card: {
    symbol: 'Karttegn',
    photo: 'Foto',
    description: 'Postbeskrivelse',
    terrain: 'Terrengtegning',
    hidden: 'Skjult kort',
    clickToShrink: '(klikk for å forminske)',
    clickToEnlarge: '(klikk for å forstørre)',
  },

  result: {
    title: 'Alle par funnet!',
    stats: (moves, time) => <>{moves} trekk på {time}</>,
    saving: 'Lagrer resultatet…',
    saveError: 'Kunne ikke lagre resultatet.',
    retry: 'Prøv igjen',
    playAgain: 'Spill igjen',
    review: 'Se på brettet',
    toStart: 'Til start',
  },

  highscores: {
    loading: 'Laster…',
    loadError: 'Kunne ikke hente highscore.',
    empty: 'Ingen resultater ennå – bli den første!',
    emptyLocal: 'Ingen resultater ennå.',
    moves: moves => `${moves} trekk`,
  },

  credits: {
    heading: 'Kilder og kreditering',
    intro: (wiki, license) => (
      <>
        Karttegn, definisjoner og foto er hentet fra {wiki} (International Orienteering Federation), og er
        lisensiert under {license}. Bildene er nedskalert. Hvert foto lenker til sin originalside med fotograf
        og lisens.
      </>
    ),
    norwegianNames: translation => <>Norske navn på karttegnene: {translation}.</>,
    norwegianTranslation: 'Norges Orienteringsforbunds oversettelse av ISOM 2017',
    controlDescriptions: (document, license) => (
      <>
        Postbeskrivelser, terrengtegninger, kartutsnitt og tekstbeskrivelser: eksempler fra {document} fra
        International Orienteering Federation, lisensiert under {license}. Utsnittene er gjengitt uendret.
      </>
    ),
    loading: 'Laster…',
    loadError: 'Kunne ikke hente symbollisten.',
  },
}

export const messages: Record<Language, Messages> = { en, nb }
