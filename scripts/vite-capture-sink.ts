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

export const CAPTURE_DIR = 'captures'
export const CAPTURE_ROUTE = '/__capture/save'

const NAME = /^[\w][\w.-]{0,127}$/
const MAX_BODY = 64 * 1024 * 1024

export function captureSink(): Plugin {
  return {
    name: 'mandelbrot-capture-sink',
    apply: 'serve',
    configureServer(server) {
      const dir = path.resolve(server.config.root, CAPTURE_DIR)
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
