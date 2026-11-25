# Inside the Blue Dot

[Live experiment](https://aryaveer716.github.io/one-microsecond/) · [Public source](https://github.com/Aryaveer716/one-microsecond) · [Demo video](https://github.com/Aryaveer716/one-microsecond/releases/download/blue-dot/inside-the-blue-dot.mp4)

## Round 1 project page

**Project title**

Inside the Blue Dot

**Tech used**

JavaScript, HTML, CSS, Three.js for 3D rendering and Canvas for fallback. The GPS solver is our project’s JavaScript, verified with Node’s built-in test runner. Codex assisted development.

**What your project is about**

Follow a phone’s blue dot into a 3D receiver. Change the phone’s clock and watch its location jump while the actual phone stays put. Let GPS fit the clock and location, then turn off one satellite. The fix opens into a trail of possible locations. Pick two different spots and see how both can match the same three readings. Restore the fourth reading and see exactly how far it disagreed with your pick.

**Who is it for?**

Anyone who has used a map app and wondered where its blue dot comes from.

**One-line summary**

Pull apart a GPS fix and see why three signals leave a trail of possibilities.

**How it works**

The app simulates straight-line distances and adds one shared receiver clock error to the satellite readings. Its iterative least-squares solver receives only satellite coordinates and apparent distances. With four independent signals it can fit east, north, height and clock error together. With three, we try a range of clock guesses and solve three distances at each guess. The 3D trail plots those computed candidates, and the fourth reading tests the selected candidate directly. The scene uses synthetic locations and compressed distances. All calculations run in the browser.

**Why it matters**

GPS has to work out what time it is while figuring out where you are. A millionth of a second changes each apparent distance by about 300 metres. Fixing one shared clock error explains a property of navigation that you can test from the same readings, with and without one measurement.

## Interview prep

- Show exactly what `solve` receives. Explain where the simulator uses ground truth and why the receiver never gets it.
- Pick two points on the trail. Explain what changes and what stays the same. Predict which reading will differ when you restore the missing satellite.
- Trace one number from signal time through apparent distance through measured-minus-predicted residual.
- Explain what Four signals means in this model. Count the unknowns and describe why the measurements still need independent geometry.
- Explain how a fit can have almost zero residual even when the phone estimate is wrong. Try the 40 m echo with six signals and then remove two.
- Explain the model’s limits and the reasons for using Three.js. Use your own words and describe each team member’s contributions and AI assistance accurately.

## First-view test

Open the live link in a new browser session for someone who has never seen it. Ask them to explore without hints. Afterwards ask what made the pin move, what changed while they scrubbed the trail, and how the fourth signal helped. Record how long they took and whether their explanation matches what happened.
