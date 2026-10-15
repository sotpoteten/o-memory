import { cpSync, existsSync, readFileSync, statSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const apiUrl = process.env.MEM_API_URL ?? 'http://localhost:5126'
const dataDir = resolve(import.meta.dirname, '../data')

const contentTypes: Record<string, string> = {
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
}

/**
 * For the static version (no API): serves the repository's data/ folder at <base>data/ in development and
 * copies it into the build output, so the game can read the data files and images directly.
 */
function staticData(): Plugin {
  let outDir = ''
  return {
    name: 'o-memory-static-data',
    configResolved: config => { outDir = resolve(config.root, config.build.outDir) },
    configureServer: server => {
      server.middlewares.use(`${server.config.base}data`, (req, res, next) => {
        const file = resolve(dataDir, '.' + decodeURIComponent((req.url ?? '/').split('?')[0]))
        if (!file.startsWith(dataDir + sep) || !existsSync(file) || !statSync(file).isFile()) return next()
        res.setHeader('Content-Type', contentTypes[extname(file).toLowerCase()] ?? 'application/octet-stream')
        res.end(readFileSync(file))
      })
    },
    closeBundle: () => cpSync(dataDir, resolve(outDir, 'data'), { recursive: true }),
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // `--mode pages`: the static GitHub Pages build, served from https://sotpoteten.github.io/o-memory/.
  const pages = mode === 'pages'
  return {
    base: pages ? '/o-memory/' : '/',
    plugins: [react(), ...(pages ? [staticData()] : [])],
    server: pages ? {} : {
      proxy: {
        '/api': apiUrl,
        '/images': apiUrl,
      },
    },
    test: {
      environment: 'node',
    },
  }
})
