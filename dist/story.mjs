import { measure, metersPerMicrosecond } from './gps.mjs'

export const storySteps = ['listen', 'range', 'clock', 'fix', 'trail', 'arrival']

const copy = {
  listen: {
    chapter: 'THE MESSAGE',
    title: '“Are you on the bridge?”',
    body: 'Maya is waiting under the Supertrees. Your blue dot says you’ve moved, but you’re still by the water. Open the receiver and follow one signal to see where that dot comes from.',
    action: 'Catch a signal'
  },
  range: {
    chapter: 'A SIGNAL FROM ORBIT',
    title: 'Time becomes distance.',
    body: 'A satellite stamps the time it sends the signal. The phone subtracts that from the arrival time, then multiplies the time in flight by the speed of light. Now it has one distance.',
    action: 'Check the phone’s clock'
  },
  clock: {
    chapter: 'THE WRONG PIN',
    title: 'Get the signals to agree.',
    body: 'The clock makes each trip seem longer. Try subtracting time from every reading. Watch the pin and see how the disagreement between signals changes.',
    action: 'Let GPS solve it'
  },
  fix: {
    chapter: 'BACK ON THE WATERFRONT',
    title: 'The phone found you.',
    body: 'GPS had to solve for east, north, height and clock error together. On the way to Maya, try taking the covered walk. Its roof blocks one signal in this model.',
    action: 'Take the covered walk'
  },
  trail: {
    chapter: 'UNDER THE COVERED WALK',
    title: 'Three signals. Many places.',
    body: 'Save two spots. Each fits the same three readings with a different clock guess. See which spot the fourth signal agrees with.',
    action: 'Restore the fourth signal'
  },
  arrival: {
    chapter: 'DESTINATION IN VIEW',
    title: '“Got you. See you soon.”',
    body: 'The fourth reading tests each guess. The phone can now send Maya a starting point and draw the route to the Gardens.',
    action: 'Explore the sandbox'
  }
}

const metres = (n, integer) => integer.format(n) + ' m'

export function rangeDifference(reading, candidate) {
  return measure([reading], candidate.position, candidate.clockUs)[0].range - reading.range
}

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
      [metres(result.rms, integer), 'Disagreement left']
    ]
    if (result.rms < .05) return { ...card, facts, action: 'Lock this fix' }
  } else if (step === 'fix') {
    facts = [
      [signed(result.clockUs, 2) + ' µs', 'Clock error GPS found'],
      [metres(error, integer), 'Ground error']
    ]
  } else if (step === 'trail') {
    const matches = sample.residuals.filter(residual => Math.abs(residual) < .01).length
    facts = [
      [matches + ' of ' + active.length, 'Readings that match'],
      [metres(Math.hypot(sample.offset[0] - model.actualOffset[0], sample.offset[1] - model.actualOffset[1]), integer), 'Away on the ground']
    ]
  } else {
    facts = [
      [metres(check.gap, integer), 'Your last guess’s mismatch on S4'],
      [active.length + ' of 4', 'Signals in use']
    ]
  }
  return { ...card, facts }
}
