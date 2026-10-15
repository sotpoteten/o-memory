interface ImportMetaEnv {
  /** "static" for the GitHub Pages build (see .env.pages); otherwise the .NET API is used. */
  readonly VITE_BACKEND?: 'static' | 'api'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
