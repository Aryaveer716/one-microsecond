# Inside the Blue Dot

[Open the live experiment](https://aryaveer716.github.io/one-microsecond/) · [Round 1 project page](submission.md) · [Demo video](https://github.com/Aryaveer716/one-microsecond/releases/download/blue-dot/inside-the-blue-dot.mp4)

The phone already knows where to start when you ask it for directions. Follow its blue dot into a 3D waterfront and see what the receiver does with its four satellite readings.

1. **Follow the blue dot.** The phone searches for Gardens by the Bay in a fictional navigation scene.
2. **Move the clock slider.** The true phone stays put. The GPS estimate moves. In the opening setup, one microsecond adds about 300 metres to each apparent distance and moves the horizontal fix about 163 metres.
3. **Let GPS solve it.** Solve position and clock together, then vary the clock again and watch the fix hold in the ideal case.
4. **Cut one satellite.** Three readings fit an entire nearby trail of locations and clock errors. Select a point on the trail or use the slider to inspect its clock guess and range agreement.
5. **Restore the fourth signal.** See how far that reading disagreed with your chosen guess. The trail converges to one local fix.

**How GPS works** opens the real readings, solver updates, and experiments with crowded satellite geometry and a reflected path.

## What the receiver computes

The signal generator knows the phone position and injected clock offset. It creates pseudoranges in local east, north and up coordinates, all in metres.

```text
apparent distance = straight-line range + c × receiver clock error + injected range error
```

The receiver receives only satellite coordinates and ranges. It starts at a survey origin with zero clock error, predicts the readings, computes each measurement’s difference from the prediction and repeatedly solves a linear least-squares update by modified Gram–Schmidt QR. Fitting the clock in metres makes its derivative 1, and the display converts the result to microseconds.

The experiment can force the clock to be exact, or it can estimate the clock along with three position coordinates. Solving for those four variables needs at least four independent measurements. The scene emphasizes a local solution around the survey origin.

### Why the trail exists

With the clock unknown and only three readings, the experiment tries 41 clock guesses around the previous clock estimate. For each one it subtracts that common clock distance from the same three readings and solves for a nearby 3D position. It draws those computed positions. The sweep covers a finite window of one nearby branch, with a slider that computes a fresh fit for the selected guess. The additional observation is compared against the selected guess before the restored solver runs with all four ranges.

Horizontal dilution of precision (HDOP) comes from the least-squares geometry. The noise-slider trial uses identical, repeatable signed range perturbations in both skies. The echo trial delays S6 and lets you clear that delay while keeping all six satellite positions and measurements besides that path fixed. The RMS residual shows how well the solution agrees with the readings. Enough observations can reveal inconsistency, but an exact fit with four readings can still be biased.

## Model and scene

The skyline, route, and satellite layouts are synthetic. The city and phone are procedural 3D assets. Orbital distances and the height axis are compressed for display. The physics uses the uncompressed coordinates. The model omits atmosphere, satellite-clock corrections, Earth rotation during signal flight, signal acquisition, and actual location access. The opening route is staged.

The project runs on GitHub Pages. The renderer, font, and all assets are hosted alongside the app. The browser computes the same interaction in Canvas when WebGL 2 is unavailable. Reduced-motion mode opens with the completed route and skips the camera flight.

## Run and verify

```sh
npm ci --ignore-scripts
npm run assets
python3 -m http.server 8661 --directory dist
node --test
```

Open `http://localhost:8661` after starting the server. Run the tests in another terminal.

| File | Role |
| --- | --- |
| `dist/gps.mjs` | Sky geometry, signal observations, solver and ambiguity trail |
| `dist/app.mjs` | Inputs, experiment state, readouts and timing inspector |
| `dist/scene.mjs` | WebGL camera, signal animation, markers and trail picking |
| `dist/city.mjs`, `dist/phone.mjs` | Procedural waterfront and navigational phone |
| `dist/fallback.mjs` | Interactive Canvas projection |
| `tests/` | Clock, geometry, insufficiency, echo and ambiguity cases |

The project code is MIT-licensed. Three.js r187 and its OrbitControls addon render the scene and handle the orbit gestures. WebGL provides depth, shading and the camera projection. Three.js does no GPS calculations. Space Grotesk is the locally hosted title font. The pinned npm packages provide the dependencies. The asset preparation step copies runtime files and third-party license texts into `dist/vendor/` for the static deployment. Codex assisted ideation, implementation, verification and documentation. The working receiver uses no AI service.

- [Three.js documentation](https://threejs.org/docs/)
- [GNSS-SDR on signal timing and pseudorange](https://gnss-sdr.org/docs/sp-blocks/observables/)
- [GNSS-SDR on estimating position and time](https://gnss-sdr.org/docs/sp-blocks/pvt/)
