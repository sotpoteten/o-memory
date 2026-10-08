const NAME_KEY = 'mem.playerName'

export const ANONYMOUS = 'Anonym'
export const MAX_NAME_LENGTH = 20

/** The name to store on the highscore list; empty input plays as anonymous. */
export const displayName = (name: string) => name.trim() || ANONYMOUS

export function readStoredName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function storeName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name.trim())
  } catch {
    // Storage unavailable (private mode etc.) — the name is just not remembered.
  }
}
