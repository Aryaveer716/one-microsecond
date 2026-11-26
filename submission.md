# Inside the Blue Dot

[Live experiment](https://aryaveer716.github.io/one-microsecond/) · [Public source](https://github.com/Aryaveer716/one-microsecond) · [Demo video](https://github.com/Aryaveer716/one-microsecond/releases/download/field-guide/inside-the-blue-dot.mp4)

## Round 1 project page

**Project title**

Inside the Blue Dot

**Tech used**

JavaScript, HTML, CSS, Three.js for 3D rendering and Canvas for fallback. The GPS solver is our project’s JavaScript, verified with Node’s built-in test runner. Codex assisted development.

**What your project is about**

Maya thinks you’re on the bridge. You’re still by the water. Fly through the phone’s screen, catch a signal, and turn its travel time into distance. Tune the phone’s clock until four readings agree. Then take a covered walk and save two places that fit the same three signals. The fourth tests both guesses. In the sandbox you can move the phone, change the sky, or investigate a signal reflected off a building.

**Who is it for?**

Anyone who has used a map app and wondered where its blue dot comes from.

**One-line summary**

Pull apart a GPS fix and see why three signals leave a trail of possibilities.

**How it works**

The simulator produces ranges from satellite coordinates, phone position and a shared receiver clock error. An iterative least-squares solver receives just the satellite positions and measured ranges. With four readings it can estimate east, north, height and clock error. With three, it tries a range of clock guesses and plots a nearby position for each. Restoring the fourth tests your saved positions. In the reflection case it refits the position six times, leaving out each reading in turn. The 3D city is synthetic and the display compresses heights and orbital distances. The receiver runs in the browser.

**Why it matters**

GPS has to work out what time it is while figuring out where you are. A millionth of a second changes each apparent distance by about 300 metres. Fixing one shared clock error explains a property of navigation that you can test from the same readings, with and without one measurement.

## Interview prep

- Show exactly what `solve` receives. Explain where the simulator uses ground truth and why the receiver never gets it.
- Pick two points on the trail. Explain what changes and what stays the same. Predict which reading will differ when you restore the missing satellite.
- Trace one number from signal time through apparent distance through measured-minus-predicted residual.
- Explain what Four signals means in this model. Count the unknowns and describe why the measurements still need independent geometry.
- Load the 40 m echo case. Explain why omitting S6 recovers the position, and why another omission can fit the remaining measurements closely while moving the estimated pin.
- Explain the model’s limits and the reasons for using Three.js. Use your own words and describe each team member’s contributions and AI assistance accurately.

## First-view test

Open the live link in a new browser session for someone who has never seen it. Ask them to follow the story without hints. Afterwards ask what the phone measured, why its clock moved the pin, and how the fourth signal helped. Record how long they took and whether their explanation matches what happened.
