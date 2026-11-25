import test from 'node:test'
import assert from 'node:assert/strict'
import { makeSky, measure, solve, solveAtClock, traceClockGuesses } from '../dist/gps.mjs'

const phone = [135, -70, 18]
const sky = makeSky('open').slice(0, 4)
const observations = measure(sky, phone, 1)
const gap = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]))

test('different clock guesses fit the same three ranges at different positions', () => {
  const trail = traceClockGuesses(observations.slice(0, 3), [0.4, 1, 1.6])
  assert.equal(trail.length, 3)
  assert.deepEqual(trail.map(fix => fix.clockUs), [0.4, 1, 1.6])
  for (const fix of trail) {
    assert.ok(fix.rms < 1e-6)
    const predicted = measure(sky.slice(0, 3), fix.position, fix.clockUs)
    predicted.forEach((reading, i) => assert.ok(Math.abs(reading.range - observations[i].range) < 1e-6))
  }
  assert.ok(gap(trail[0].position, trail[2].position) > 250)
})

test('the fourth measurement distinguishes the candidates from three readings', () => {
  const [wrong, correct] = traceClockGuesses(observations.slice(0, 3), [0.4, 1])
  const fourth = fix => measure([sky[3]], fix.position, fix.clockUs)[0].range
  assert.ok(Math.abs(fourth(wrong) - observations[3].range) > 10)
  assert.ok(Math.abs(fourth(correct) - observations[3].range) < 1e-6)
  assert.ok(gap(solve(observations, true).position, correct.position) < 1e-5)
})

test('two measurements do not define a nearby position at a given clock guess', () => {
  assert.equal(solveAtClock(observations.slice(0, 2), 1).status, 'insufficient')
  assert.deepEqual(traceClockGuesses(observations.slice(0, 2), [0.5, 1, 1.5]), [])
})
