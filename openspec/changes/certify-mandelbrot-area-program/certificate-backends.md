# Certificate formats for numerical and symbolic backends

External programs may search for certificates, but their floating-point
conclusions are never trusted directly. Each backend must emit finite data
that is reconstructed and checked by Lean.

## Trapping and interval certificates

A trapping certificate records the parameter, an entry time, a represented
compact region, a forward-invariance proof, and a uniform norm bound. Boxes,
balls, rational polygons, Taylor models, or interval-polynomial regions may
all instantiate the same `FiniteTrappingRegionCertificate` interface. Every
outward rounding decision must be encoded by rational endpoints or exact
directed-rounding lemmas.

## Validated contour certificates

A contour certificate must record a finite piecewise-polynomial or rational
parametrization, its orientation, nonintersection and winding data, explicit
error bounds for any quadrature remainder, and the exact identity translating
the contour integral into area. The checker proves all interval inclusions
and then exposes only a theorem bounding `volume carrier`.

## Picard--Fuchs certificates

A Picard--Fuchs backend must emit the differential operator with rational or
algebraic coefficients, exact initial values or certified isolating intervals,
a path avoiding every singularity, and a validated continuation/remainder
bound. A numerical ODE solution without these data is exploratory evidence,
not an area theorem.

## Polynomial and SOS certificates

Rational multivariate polynomials are serialized as finite monomial maps.
An SOS certificate is a finite list of rational polynomials whose squared sum
must equal the target polynomial. `polynomialIdentityCheck` and
`sosIdentityCheck` decide that equality exactly; the soundness theorem then
proves nonnegativity after every real evaluation. Decimal approximations are
not accepted as coefficients.

## Area accounting

Every certified inner region supplies measurability, inclusion in Mandelbrot,
and a checked lower bound on its own area. A separate pairwise-disjointness
certificate lets Lean sum those lower bounds through
`sum_certifiedInnerRegion_area_le_volume_Mandelbrot`. Overlaps must be split,
subtracted with a separately certified bound, or rejected; they are never
silently double-counted.
