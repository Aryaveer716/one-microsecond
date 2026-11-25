# Round 1 project page

**Project title**

One Microsecond

**Tech used**

HTML, CSS, vanilla JavaScript and Canvas. Our JavaScript models the signals and fits the GPS fix with least squares. Node’s built-in test runner checks the solver. Codex assisted development.

**What your project is about**

The GPS pin moves while the phone stays still. All we changed was the phone’s clock by one microsecond. Try the slider, then let the receiver solve for the clock as well as position. The pin comes back. Cut the fourth signal and the fix disappears. Crowded satellites and a signal reflected off a building show how even a receiver that solves for its clock can land in the wrong place.

**Who is it for?**

Anyone who has watched their location jump on a map and wondered what the phone is actually measuring.

**One-line summary**

Move a GPS pin with a clock error, then use four satellite signals to bring it back.

**How it works**

The simulator turns straight-line satellite distances into travel times, then adds the same phone clock error to every reading and an optional delay to one signal. The receiver gets only satellite coordinates and measured ranges. Starting at a survey origin, it predicts the ranges from its current guess and repeatedly fits an update that reduces their squared mismatches. It can assume the clock is exact or fit time alongside east, north and height. The map, residuals and iteration table all read from that calculation. Satellite positions and the ground map are synthetic. The solver runs locally in the browser.

**Why it matters**

The phone’s location depends on measuring time accurately enough that a millionth of a second matters. The receiver can work around an imperfect clock by estimating the error from the signals it already has. The experiment also shows why counting satellites alone tells you so little, and why a clean-looking fit can still be wrong.

[Live experiment](https://aryaveer716.github.io/one-microsecond/) · [Public source](https://github.com/Aryaveer716/one-microsecond) · [Demo video](https://github.com/Aryaveer716/one-microsecond/releases/download/round-1/one-microsecond-demo.mp4)

## Interview prep

Each team member should be able to demo the loop cold and trace one path through the code. Use the actual contributions your team made when discussing authorship.

- Why does 1 µs move a range by about 300 m but move the default ground fix by 84 m? The first number is a shared measurement error. The second is how this geometry distributes that error across three position coordinates when the clock is fixed at zero.
- Where does the solver see the real phone position? It receives no ground truth. The signal model and the map use it. The solver receives only satellite coordinates and the measured ranges.
- Why do four signals sometimes fail? Four is the number of unknowns. The measurements must add independent information, which depends on the satellite directions.
- Why solve the clock in metres? Multiplying time by the speed of light makes the clock term the same unit as the measured ranges and gives its Jacobian column a scale comparable to the three position columns.
- What does a fit residual mean? It is observed minus predicted range at the final estimate. A residual is about agreement with the measurements. Four measurements can fit a biased solution exactly.
- How would you extend the experiment? One improvement is to compare equal-weight fits with fits that use receiver-reported per-signal uncertainty. Explain what assumptions that adds and how you would test it from simulated known truth.

## Cold-test prompt

Give a first-time viewer the live link, say nothing about GPS or the controls, and time them. Ask them afterwards to explain why the pin moved, how it came back, and why it disappeared with one satellite missing. Record the actual time and where they hesitated.
