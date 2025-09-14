# Realtime Online Mandelbrot set explorer

Use WGPU optimized pipeline to render the mandelbrot set in real time, 
even at high zoom level, around $10^{-38}$, while performing calculations 
in 32 bits floating point in GPU.

To achieve this, a reference point is computed in CPU with arbitrary precision.
Then perturbation theory is used to compute the other points around the reference point.

$$
Z_{n+1} = Z_n^2 + C
$$
$$
Z_{n+1} + \delta Z_{n+1} = (Z_n + \delta Z_n)^2 + (C + \delta C)
$$
$$\delta Z_{n+1} = 2 * Z_n * \delta Z_n + \delta Z_n^2 + \delta C$$

Where $Z_n$ and $C$ are the reference point computed in CPU, and $\delta Z_n$ and $\delta C$ are the small deltas computed in GPU.

Reference points with arbitrary precision are computed in WebAssembly.

The WebAssembly part is done in Rust, using AstroFloat crate and compiled to WebAssembly with wasm-pack.

## Live demo

https://gcollombet.github.io/mandelbrot/

Use mouse to navigate and mouse wheel to zoom.

You can also use keyboard: ZQSD to move, A and E to rotate

## Run it

Rust and wasm-pack are required as well as nodejs.

```bash
cd reference_calculus/pkg
npm link
cd ../..
npm link mandelbrot
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.