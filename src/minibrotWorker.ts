import {MandelbrotNavigator} from 'mandelbrot'

// One-shot minibrot search (period detection + Newton nucleus, arbitrary
// precision). It lives in its own disposable worker because the wasm call is a
// single synchronous run that can last minutes at depth: the only way to cancel
// it is Worker.terminate(), and running it here also keeps the reference
// worker free to extend the orbit meanwhile.

export type MinibrotSearchRequest = {
    cx: string
    cy: string
    scale: string
    angle: number
    precisionBudget: string
    viewportAspect: number
    maxIter: number
    radiusFactor: number
    /** When set, also frame the copy (fraction of the limiting screen axis it should span). */
    fill?: number
}

export type MinibrotSearchResponse =
    | {
          type: 'minibrotFound'
          status: 'ok' | 'none' | 'nonewton' | 'nosize'
          cx: string | null
          cy: string | null
          period: number | null
          scale: string | null
      }
    | { type: 'error'; message: string }
    // Posted once the wasm module is initialised; requests sent earlier could
    // be dropped, so the engine waits for it (same handshake as referenceWorker).
    | { type: 'ready' }

type WorkerContext = typeof globalThis & {
    postMessage(message: MinibrotSearchResponse): void
    onmessage: ((event: MessageEvent<MinibrotSearchRequest>) => void) | null
}

const ctx = self as unknown as WorkerContext

ctx.onmessage = (event: MessageEvent<MinibrotSearchRequest>) => {
    const request = event.data
    const navigator = new MandelbrotNavigator(request.cx, request.cy, request.scale, request.angle)
    try {
        navigator.set_precision_budget(request.precisionBudget)
        navigator.set_viewport_aspect(request.viewportAspect)
        const framed = request.fill !== undefined
        const res = framed
            ? navigator.find_minibrot_framed(request.maxIter, request.radiusFactor, request.fill as number)
            : navigator.find_minibrot(request.maxIter, request.radiusFactor)
        const status = res[0] as 'ok' | 'none' | 'nonewton' | 'nosize'
        const response: MinibrotSearchResponse = {
            type: 'minibrotFound',
            status,
            cx: status === 'ok' ? res[1] : null,
            cy: status === 'ok' ? res[2] : null,
            period:
                status === 'ok'
                    ? Number(res[3])
                    : status === 'nonewton' || status === 'nosize'
                      ? Number(res[1])
                      : null,
            scale: status === 'ok' && framed ? res[4] : null,
        }
        ctx.postMessage(response)
    } catch (error) {
        ctx.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) } satisfies MinibrotSearchResponse)
    } finally {
        navigator.free()
    }
}

ctx.postMessage({ type: 'ready' } satisfies MinibrotSearchResponse)
