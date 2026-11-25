import test from 'node:test'
import assert from 'node:assert/strict'
import { metersPerMicrosecond, makeSky, measure, solve } from '../dist/gps.mjs'

const sky = makeSky('open').slice(0, 4)
const truth = [135, -70, 18]
const distance = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]))

test('a microsecond adds the same light-travel distance to each pseudorange', () => {
  const slow = measure(sky, truth, -1)
  const fast = measure(sky, truth, 1)
  for (let i = 0; i < sky.length; i++) {
    assert.ok(Math.abs(fast[i].range - slow[i].range - 2 * metersPerMicrosecond) < 1e-7)
  }
})

test('four measurements recover independent positions and signed clock errors', () => {
  for (const position of [truth, [-420, 260, -27], [0, 0, 0]]) {
    for (const offset of [-4, -0.3, 0, 1, 4]) {
      const result = solve(measure(sky, position, offset), true)
      assert.equal(result.status, 'fixed')
      assert.ok(distance(result.position, position) < 1e-5)
      assert.ok(Math.abs(result.clockUs - offset) < 1e-8)
    }
  }
})

test('assuming a perfect clock moves a stationary receiver and leaves mismatches', () => {
  const result = solve(measure(sky, truth, 1), false)
  assert.equal(result.clockUs, 0)
  assert.ok(distance(result.position, truth) > 100)
  assert.ok(result.rms > 10)
})

test('three signals cannot independently recover four unknowns', () => {
  const three = measure(sky.slice(0, 3), truth, 1)
  assert.equal(solve(three, true).status, 'insufficient')
  assert.equal(solve(three, false).status, 'fixed')
})

test('repeated satellite directions cannot separate position and clock', () => {
  const repeated = Array.from({ length: 4 }, () => sky[0])
  assert.equal(solve(measure(repeated, truth, 1), true).status, 'geometry')
})

test('clustered satellites amplify uncertainty with the same number of signals', () => {
  const open = solve(measure(sky, truth, 0), true)
  const clustered = solve(measure(makeSky('cluster').slice(0, 4), truth, 0), true)
  assert.ok(clustered.hdop > open.hdop * 4)
  assert.ok(distance(clustered.position, truth) < 1e-5)
})

test('a delayed sixth signal produces a compromised fit with all six signals', () => {
  const open = makeSky('open')
  const clean = solve(measure(open, truth, 1), true)
  const echo = solve(measure(open, truth, 1, { s6: 40 }), true)
  assert.ok(clean.rms < 1e-6)
  assert.ok(echo.rms > 1)
  assert.ok(distance(echo.position, truth) > 2)
})

test('a biased range can fit the wrong position exactly when there are only four readings', () => {
  const open = makeSky('open')
  const four = [open[0], open[1], open[2], open[5]]
  const result = solve(measure(four, truth, 1, { s6: 40 }), true)
  assert.equal(result.status, 'fixed')
  assert.ok(result.rms < 1e-6)
  assert.ok(distance(result.position, truth) > 10)
})
