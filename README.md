# Inside the Blue Dot

[Open the live experiment](https://aryaveer716.github.io/one-microsecond/) · [Round 1 project page](submission.md) · [Demo video](https://github.com/Aryaveer716/one-microsecond/releases/download/field-guide/inside-the-blue-dot.mp4)

Maya is waiting under the Supertrees. She asks if you’re on the bridge, but you’re still at the waterfront. Follow the blue dot into a simulated GPS receiver and see what went wrong.

1. **Catch a signal.** The scene follows a transmitted time stamp, shows the measured flight time, and turns it into a distance.
2. **Check the phone’s clock.** Try subtracting time from all four readings. Watch the four discrepancies and the pin move together. A one-microsecond error adds about 300 metres to each range and moves the horizontal fix about 163 metres in this setup.
3. **Take the covered walk.** The simulated phone moves and one measurement is removed. Three readings now fit different places with different clock guesses. Save two points on the actual computed trail.
4. **Restore the fourth signal.** Each saved point is compared against the fourth measurement. The camera follows the recovered fix down to the walk toward the Gardens.

**Open sandbox** skips the story. You can move the phone between four places, adjust the clock, switch signals, or load field cases for a clear view, a blocked signal, a crowded sky or a reflection. **How GPS works** opens individual readings, solver updates and experiments in measurement consistency.

## What the receiver computes

The signal generator knows the phone position and injected clock offset. It creates pseudoranges in local east, north and up coordinates, all in metres.

```text
apparent distance = straight-line range + c × receiver clock error + injected range error
```

The receiver receives only satellite coordinates and ranges. It starts at a survey origin with zero clock error, predicts the readings, computes each measurement’s difference from the prediction and repeatedly solves a linear least-squares update by modified Gram–Schmidt QR. Fitting the clock in metres makes its derivative 1, and the display converts the result to microseconds.

The experiment can force the clock to be exact, or it can estimate the clock along with three position coordinates. Solving for those four variables needs at least four independent measurements. The scene emphasizes a local solution around the survey origin.

### Why the trail exists

With the clock unknown and only three readings, the experiment tries 41 clock guesses around the previous clock estimate. For each one it subtracts that common clock distance from the same three readings and solves for a nearby 3D position. It draws those computed positions. The sweep covers a finite window of one nearby branch, with a slider that computes a fresh fit for the selected guess. The additional observation is compared against the selected guess before the restored solver runs with all four ranges.

## Try a reflection

A bad reading can creep into an apparently plausible fix. Load the reflection case to add 40 m to S6 while all six readings are active. **Compare all six** solves again six times, leaving out a different satellite each time. It compares the remaining readings’ RMS discrepancy and reports the omitted reading’s own difference from that fit.

Try omitting S6 in the open-sky fixture. The other readings can agree and the phone returns to the simulated location. The held-out range differs by 40 m. In the same fixture, omitting another satellite can also produce a small remaining mismatch while shifting the fix. This is evidence about what changes when one reading is removed. Real receivers use additional assumptions and integrity checks.

The noise slider applies identical signed perturbations in both views of the sky. Horizontal dilution of precision (HDOP) is computed from the local fit geometry. It describes typical horizontal uncertainty per metre of independent, equal-variance range noise.

## Model and scene

The skyline, route, and satellite layouts are synthetic. The city and phone are procedural 3D assets. Orbital distances and the height axis are compressed for display. The physics uses the uncompressed coordinates. The model omits atmosphere, satellite-clock corrections, Earth rotation during signal flight, signal acquisition, and actual location access. The fictional chat, opening map and final walking route are staged. The roof is modeled by relocating the simulated phone and removing one signal. The position and timing computations use measured ranges only.

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
| `dist/app.mjs` | Inputs, experiment state, story navigation, readouts and timing inspector |
| `dist/story.mjs` | Guided chapters, live readouts and exact checks of saved guesses |
| `dist/field.mjs` | Locations and named field tests |
| `dist/audit.mjs` | Leave-one-out measurement consistency comparison |
| `dist/scene.mjs` | WebGL camera, signal animation, markers and trail picking |
| `dist/city.mjs`, `dist/phone.mjs` | Procedural waterfront and navigational phone |
| `dist/fallback.mjs` | Interactive Canvas projection |
| `tests/` | Clock, geometry, insufficiency, echo and ambiguity cases |

The project code is MIT-licensed. Three.js r187 and its OrbitControls addon render the scene and handle the orbit gestures. WebGL provides depth, shading and the camera projection. Three.js does no GPS calculations. Space Grotesk is the locally hosted title font. The pinned npm packages provide the dependencies. The asset preparation step copies runtime files and third-party license texts into `dist/vendor/` for the static deployment. Codex assisted ideation, implementation, verification and documentation. The working receiver uses no AI service.

- [Three.js documentation](https://threejs.org/docs/)
- [GNSS-SDR on signal timing and pseudorange](https://gnss-sdr.org/docs/sp-blocks/observables/)
- [GNSS-SDR on estimating position and time](https://gnss-sdr.org/docs/sp-blocks/pvt/)
