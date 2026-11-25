import { metersPerMicrosecond } from './gps.mjs'

export const storySteps = ['listen', 'range', 'clock', 'fix', 'trail', 'arrival']

const copy = {
  listen: {
    title: 'Where are you starting?',
    body: 'Your friend is waiting at the Gardens. To get you there, your phone first has to find you. Start with a signal from one satellite.',
    action: 'Catch a signal'
  },
  range: {
    title: 'Time becomes distance.',
    body: 'The satellite stamps its signal with the time it left. The phone compares that with the arrival time. Multiply the time in flight by the speed of light and you get a distance.',
    action: 'Make the clock run fast'
  },
  clock: {
    title: 'A tiny error sends the pin off.',
    body: 'Set the phone’s clock one millionth of a second fast. Every signal seems to take longer, so the phone thinks every satellite is farther away. You haven’t moved a step.',
    action: 'Find the right fix'
  },
  fix: {
    title: 'GPS solves for time, too.',
    body: 'GPS adjusts both the location and the clock until the readings agree. It solves for east, north, height and clock error together.',
    action: 'Take one signal away'
  },
  trail: {
    title: 'Three signals leave a trail.',
    body: 'Try two points on the trail. Change the clock guess and a different location can still match the same three readings.',
    action: 'Restore the fourth signal'
  },
  arrival: {
    title: 'Now the route can start.',
    body: 'The fourth reading picks a single nearby fix. You’ve found the phone’s starting point and figured out how far off its clock was.',
    action: 'Explore the sandbox'
  }
}

const metres = (n, integer) => integer.format(n) + ' m'

export function storyCard(step, model, check, integer, signed) {
  const card = copy[step]
  if (step === 'listen') return card
  const { observed, ideal, result, error, active, sample } = model
  let facts

  if (step === 'range') {
    facts = [
      [(observed[0].range / metersPerMicrosecond / 1000).toFixed(3) + ' ms', 'Milliseconds in flight'],
      [integer.format(observed[0].range / 1000) + ' km', 'Distance the phone measures']
    ]
  } else if (step === 'clock') {
    facts = [
      [signed(observed[0].range - ideal[0].range) + ' m', 'Added to each reading'],
      [metres(error, integer), 'Ground error']
    ]
  } else if (step === 'fix') {
    facts = [
      [signed(result.clockUs, 2) + ' µs', 'Clock error GPS found'],
      [metres(error, integer), 'Ground error']
    ]
  } else if (step === 'trail') {
    const matches = sample.residuals.filter(residual => Math.abs(residual) < .01).length
    facts = [
      [matches + ' of ' + active.length, 'Readings that match'],
      [metres(Math.hypot(sample.offset[0], sample.offset[1]), integer), 'Ground distance from the phone']
    ]
  } else {
    facts = [
      [metres(check.gap, integer), 'Your guess’s mismatch on S4'],
      [active.length + ' of 4', 'Signals restored']
    ]
  }
  return { ...card, facts }
}
