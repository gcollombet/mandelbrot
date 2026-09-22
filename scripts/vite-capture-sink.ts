// Dev-server sink for the console capture tooling (src/devCapture.ts).
//
// `__capture({ save: 'name' })` POSTs the rendered PNG here and the file lands
// in captures/<name>.png at the repository root, so an agent driving the page
// from a browser console never has to move a data URL through the JS bridge
// or go through the browser's download dialog. Dev only: configureServer never
// runs for `vite build`.
import type {Plugin} from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {execSync} from 'node:child_process'

export const CAPTURE_DIR = 'captures'
export const CAPTURE_ROUTE = '/__capture/save'
/** Test bench (src/devBench.ts): binary files under bench/out/, and build provenance. */
export const BENCH_OUT_DIR = 'bench/out'
export const BENCH_FILE_ROUTE = '/__bench/file'
export const BENCH_ENV_ROUTE = '/__bench/env'
const BENCH_PATH = /^[\w][\w.-]{0,127}(\/[\w][\w.-]{0,127}){0,4}$/

function newestMtime(dir: string): number {
  let newest = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    newest = Math.max(newest, entry.isDirectory() ? newestMtime(full) : fs.statSync(full).mtimeMs)
  }
  return newest
}

/**
 * Which wasm the dev server serves, and whether it predates the Rust sources
 * (a stale pkg once shifted the whole BLA table: see the bench README).
 */
function benchEnv(root: string) {
  const wasm = path.resolve(root, 'node_modules/mandelbrot/mandelbrot_bg.wasm')
  const linked = fs.existsSync(wasm)
  const wasmMtime = linked ? fs.statSync(wasm).mtimeMs : 0
  const srcMtime = newestMtime(path.resolve(root, 'reference_calculus/src'))
  const git = (cmd: string) => { try { return execSync(cmd, { cwd: root }).toString().trim() } catch { return '' } }
  return {
    wasmLinked: linked,
    wasmSha256: linked ? crypto.createHash('sha256').update(fs.readFileSync(wasm)).digest('hex') : '',
    wasmBuiltAt: linked ? new Date(wasmMtime).toISOString() : '',
    rustSrcModifiedAt: new Date(srcMtime).toISOString(),
    wasmStale: !linked || srcMtime > wasmMtime,
    gitHead: git('git rev-parse --short HEAD'),
    gitDirty: git('git status --porcelain') !== '',
  }
}

const NAME = /^[\w][\w.-]{0,127}$/
const MAX_BODY = 64 * 1024 * 1024

export function captureSink(): Plugin {
  return {
    name: 'mandelbrot-capture-sink',
    apply: 'serve',
    configureServer(server) {
      const dir = path.resolve(server.config.root, CAPTURE_DIR)
      const benchDir = path.resolve(server.config.root, BENCH_OUT_DIR)
      server.middlewares.use(BENCH_ENV_ROUTE, (_req, res) => {
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(benchEnv(server.config.root)))
      })
      server.middlewares.use(BENCH_FILE_ROUTE, (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        const rel = new URL(req.url ?? '', 'http://x').searchParams.get('path') ?? ''
        if (!BENCH_PATH.test(rel) || rel.split('/').some(seg => seg.startsWith('.'))) { res.statusCode = 400; res.end('chemin de banc invalide'); return }
        const chunks: Buffer[] = []
        let size = 0
        req.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > MAX_BODY) { res.statusCode = 413; res.end('fichier trop volumineux'); req.destroy(); return }
          chunks.push(chunk)
        })
        req.on('end', () => {
          try {
            const file = path.join(benchDir, rel)
            fs.mkdirSync(path.dirname(file), { recursive: true })
            fs.writeFileSync(file, Buffer.concat(chunks))
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ file: path.relative(server.config.root, file) }))
          } catch (error) {
            res.statusCode = 500
            res.end(error instanceof Error ? error.message : String(error))
          }
        })
      })
      server.middlewares.use(CAPTURE_ROUTE, (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        const chunks: Buffer[] = []
        let size = 0
        req.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > MAX_BODY) { res.statusCode = 413; res.end('capture trop volumineuse'); req.destroy(); return }
          chunks.push(chunk)
        })
        req.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { name?: unknown; dataUrl?: unknown }
            const name = typeof body.name === 'string' ? body.name.replace(/\.png$/i, '') : ''
            const dataUrl = typeof body.dataUrl === 'string' ? body.dataUrl : ''
            if (!NAME.test(name)) { res.statusCode = 400; res.end('nom de capture invalide'); return }
            const comma = dataUrl.indexOf(',')
            if (!dataUrl.startsWith('data:image/png;base64,') || comma < 0) { res.statusCode = 400; res.end('PNG attendu'); return }
            fs.mkdirSync(dir, { recursive: true })
            const file = path.join(dir, `${name}.png`)
            fs.writeFileSync(file, Buffer.from(dataUrl.slice(comma + 1), 'base64'))
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ file: path.relative(server.config.root, file) }))
          } catch (error) {
            res.statusCode = 500
            res.end(error instanceof Error ? error.message : String(error))
          }
        })
      })
    },
  }
}
