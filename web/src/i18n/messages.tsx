import type { ReactNode } from 'react'
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
    difficulty: 'Difficulty',
    levels: { 6: 'Easy', 8: 'Medium', 12: 'Hard' } as Record<number, string>,
    pairsCount: (pairs: number) => `${pairs} pairs`,
    start: 'Start game',
    loadingCards: 'Dealing cards…',
    startError: 'Could not start the game. Is the API running?',
    highscoreHeading: (level: string) => `High scores – ${level.toLowerCase()}`,
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
    hidden: 'Hidden card',
    clickToShrink: '(click to shrink)',
    clickToEnlarge: '(click to enlarge)',
    symbolAlt: (id: string) => `Map symbol ${id}`,
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
    difficulty: 'Vanskelighetsgrad',
    levels: { 6: 'Lett', 8: 'Middels', 12: 'Vanskelig' },
    pairsCount: pairs => `${pairs} par`,
    start: 'Start spill',
    loadingCards: 'Henter kort…',
    startError: 'Kunne ikke starte spillet. Kjører API-et?',
    highscoreHeading: level => `Highscore – ${level.toLowerCase()}`,
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
    hidden: 'Skjult kort',
    clickToShrink: '(klikk for å forminske)',
    clickToEnlarge: '(klikk for å forstørre)',
    symbolAlt: id => `Karttegn ${id}`,
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
    loading: 'Laster…',
    loadError: 'Kunne ikke hente symbollisten.',
  },
}

export const messages: Record<Language, Messages> = { en, nb }
