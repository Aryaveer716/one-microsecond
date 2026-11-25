# One Microsecond

Move a GPS pin without moving the phone. A one-microsecond error in the receiver clock adds about 300 metres to every measured range. One Microsecond lets you turn that error up, turn the receiver’s clock estimate off, and see what happens to a position fix.

[Open the experiment](https://aryaveer716.github.io/one-microsecond/) · [Round 1 project page](submission.md)

## Try it

1. Drag **Phone clock error**. The actual phone stays still. The orange GPS estimate moves.
2. Click **Solve for the clock**. The receiver estimates its clock error and position from the same four signals. Change the clock again. This time, the estimate stays on the phone.
3. Tap **S4** to cut a signal. Three readings can’t independently determine east, north, height and time. Tap it again to restore the fix.

Under **Inside the fix**, compare spread-out and crowded skies with the same range perturbations, add a reflected signal, and inspect the exact measurements and updates the solver used.

## How it works

The simulation places satellites on an idealized orbital shell and generates pseudoranges in metres.

```text
measured range = straight-line distance + c × phone clock error + extra path
```

The signal generator knows the true receiver position and injected clock error. The receiver receives only satellite coordinates and measured ranges. It starts at a local survey origin with zero clock bias. On each update it predicts every pseudorange, finds the measured-minus-predicted difference, and linearizes the model at the current guess. It uses a QR factorization to solve the linear least-squares update. The clock bias is fitted in metres so the derivative for that variable is 1, then converted back to microseconds for display.

With the clock forced to zero, four ideal ranges from a fast clock generally have no single intersection. The receiver finds the position that minimizes the sum of squared discrepancies. With the clock unknown, four independent signals can determine four unknowns. That is a minimum, and their directions still matter. The horizontal dilution of precision (HDOP) is computed from the local linearized geometry and describes the horizontal RMS error per metre of independent, equal-standard-deviation range noise.

The noise slider scales a fixed set of signed range offsets so both sky layouts get identical disturbances. It is a repeatable example, not a statistical sampler.

The echo represents a receiver mistakenly tracking a longer reflected path. The model gives one measurement a positive offset and fits all six with equal weights. A nonzero residual shows the readings disagree. It cannot by itself identify the source of the error. With just four independent measurements, a wrong position and clock can still make all four ranges agree.

## What’s simulated

The code models one instant with a clear signal path for each satellite unless the echo is enabled. It uses local east, north and up coordinates, a spherical GPS-altitude shell, and straight-line ranges. The world coordinates and map are synthetic. The model omits atmosphere, satellite-clock corrections, Earth rotation during signal flight, radio acquisition, and any actual location access.

## Run and verify

```sh
python3 -m http.server 8654 --directory dist
node --test
```

Open `http://localhost:8654` after starting the server. The test suite runs independently in a second terminal.

| File | Role |
| --- | --- |
| `dist/gps.mjs` | Satellite geometry, signal generator, and independent receiver solver |
| `dist/app.mjs` | Controls, experiment states, readouts, and measurement tables |
| `dist/plots.mjs` | Canvas sky plot and schematic ground view |
| `dist/index.html`, `dist/style.css` | Layout and styling |
| `tests/gps.test.mjs` | Clock recovery, insufficient data, bad geometry, and reflected signal tests |

The site runs with native JavaScript, HTML, CSS, and Canvas. System fonts keep the app independent of font downloads. Node’s built-in test runner verifies the mathematics. Codex provided AI assistance with ideation, design, implementation, testing and documentation. The running project has no AI or network dependency for its calculations.

## References

- [GNSS-SDR observables and pseudorange](https://gnss-sdr.org/docs/sp-blocks/observables/)
- [GNSS-SDR single-point positioning](https://gnss-sdr.org/docs/sp-blocks/pvt/)
