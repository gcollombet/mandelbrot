# Why monotone convergence is not yet an area algorithm

The certified finite-escape areas form a decreasing sequence whose limit is
the Mandelbrot area. This proves a sequence of rigorous upper bounds. An
increasing sequence of certified inner areas would similarly give rigorous
lower bounds.

Those two convergence statements alone do not provide a finite procedure
that answers a requested precision. To call the area computable, the formal
development still needs an effective gap modulus: given any positive
`epsilon`, it must return a concrete index `n` together with a checked proof
that `U n - L n < epsilon`.

`LeanProofs.EffectiveAreaGap` encodes this distinction. A
`CertifiedAreaSequences` value only states monotonicity and correctness of
the two bounds. An `EffectiveAreaGapModulus` is separate data and is the only
interface that yields arbitrary-precision enclosures. No such modulus for
the Mandelbrot area is claimed by the present development.
