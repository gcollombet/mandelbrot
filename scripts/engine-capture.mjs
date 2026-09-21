#!/usr/bin/env node
// Headless driver for the dev console capture tooling (src/devCapture.ts).
// Renders deterministic stills through the engine's export session, so the
// PNGs only come back once every pixel has converged. Needs the Vite dev
// server on :5173 (`npm run dev`) and Playwright's Chromium.
//
//   node scripts/engine-capture.mjs compare --cx=-0.75 --cy=0.1 --scale=1e-11 --eps=1e-8 --out=/tmp/cap
//   node scripts/engine-capture.mjs capture --mode=bla --settings='{"cx":"…","cy":"…","scale":"…"}' --out=/tmp/cap
//
// Options: --width (1024) --height (576) --aa (1) --iter-mult (maxIterationMultiplier, 0.6)
//          --settings=<json> (merged into mandelbrot_last_settings) --gpu=swiftshader|native (swiftshader)
//          --threshold (compare: per-channel difference counted as different, 8)
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const [command = 'compare', ...rest] = process.argv.slice(2)
const opts = Object.fromEntries(rest.map(a => {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a)
    return m ? [m[1], m[2] ?? 'true'] : [a, 'true']
}))
const out = opts.out ?? 'tests/screenshots/engine-capture'
fs.mkdirSync(out, { recursive: true })
const width = Number(opts.width ?? 1024)
const height = Number(opts.height ?? 576)
const eps = opts.eps === undefined ? undefined : Number(opts.eps)
const settings = {
    ...(opts.cx ? { cx: opts.cx } : {}),
    ...(opts.cy ? { cy: opts.cy } : {}),
    ...(opts.scale ? { scale: opts.scale } : {}),
    angle: 0,
    antialiasLevel: 1,
    aaAuto: false,
    aaAdaptive: false,
    dprMultiplier: 0.25,
    maxIterationMultiplier: Number(opts['iter-mult'] ?? 0.6),
    ...(opts.settings ? JSON.parse(opts.settings) : {}),
}

// SwiftShader keeps the run reproducible on machines without a GPU; the
// canvas swap chain only works with this exact flag set in headless mode.
const gpuArgs = (opts.gpu ?? 'swiftshader') === 'native'
    ? ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--ignore-gpu-blocklist']
    : ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--use-webgpu-adapter=swiftshader',
        '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader']
// Playwright's own headless shell lacks WebGPU: use the full Chromium build.
// ENGINE_CAPTURE_CHROME overrides the auto-detection.
function findChrome() {
    if (process.env.ENGINE_CAPTURE_CHROME) return process.env.ENGINE_CAPTURE_CHROME
    const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, path.join(process.env.HOME ?? '', '.cache/ms-playwright'), '/opt/pw-browsers'].filter(Boolean)
    for (const root of roots) {
        if (!fs.existsSync(root)) continue
        const dirs = fs.readdirSync(root).filter(d => /^chromium-\d+$/.test(d)).sort().reverse()
        for (const d of dirs) {
            for (const rel of ['chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-win/chrome.exe']) {
                const candidate = path.join(root, d, rel)
                if (fs.existsSync(candidate)) return candidate
            }
        }
    }
    return undefined
}
const browser = await chromium.launch({ headless: true, executablePath: findChrome(), args: ['--no-sandbox', ...gpuArgs] })
const page = await browser.newPage({ viewport: { width: 320, height: 200 } })
// External fonts / CDNs are irrelevant to the capture and only slow the load.
await page.route(/^https?:\/\/(?!localhost)/, r => r.abort())
page.on('console', m => { const t = m.text(); if (/\[(capture|compare|still)\]|lost|Error/.test(t)) console.log(m.type() + ': ' + t) })
page.on('pageerror', e => console.log('pageerror: ' + e.message))

await page.goto('http://localhost:5173/')
await page.evaluate(s => {
    const prev = JSON.parse(localStorage.getItem('mandelbrot_last_settings') ?? '{}')
    localStorage.setItem('mandelbrot_last_settings', JSON.stringify({ ...prev, ...s }))
}, settings)
await page.reload()
await page.waitForFunction(() => !!window.__compare && !!window.__mandelbrotEngine, null, { timeout: 180_000 })

const save = (name, dataUrl) => {
    const file = path.join(out, name)
    fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'))
    console.log('saved', file)
}
const t0 = Date.now()
if (command === 'capture') {
    const r = await page.evaluate(async o => {
        const c = await window.__capture(o)
        return { dataUrl: c.dataUrl, pumps: c.pumps, ms: c.ms, shaderFlag: c.shaderFlag, blaLevels: c.blaLevels, mode: c.mode, eps: c.eps }
    }, { mode: opts.mode ?? 'bla', eps, width, height, aa: Number(opts.aa ?? 1), download: false, timeoutMs: 1_800_000 })
    save(`${r.mode}-${width}x${height}.png`, r.dataUrl)
    console.log(JSON.stringify({ ...r, dataUrl: undefined }))
} else {
    const r = await page.evaluate(async o => {
        const c = await window.__compare(o)
        return {
            exact: c.exact.dataUrl, bla: c.bla.dataUrl, diff: c.diff.toDataURL('image/png'),
            differing: c.differing, total: c.total, fraction: c.fraction,
            exactPumps: c.exact.pumps, blaPumps: c.bla.pumps, blaFlag: c.bla.shaderFlag, blaLevels: c.bla.blaLevels, eps: c.bla.eps,
        }
    }, { eps, width, height, aa: Number(opts.aa ?? 1), download: false, threshold: Number(opts.threshold ?? 8), timeoutMs: 1_800_000 })
    save(`exact-${width}x${height}.png`, r.exact)
    save(`bla-${width}x${height}.png`, r.bla)
    save(`diff-${width}x${height}.png`, r.diff)
    console.log(JSON.stringify({ ...r, exact: undefined, bla: undefined, diff: undefined }))
}
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s`)
await browser.close()
