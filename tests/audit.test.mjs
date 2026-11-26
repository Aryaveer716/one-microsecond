import test from 'node:test'
import assert from 'node:assert/strict'
import { auditSignals } from '../dist/audit.mjs'
import { makeSky, measure } from '../dist/gps.mjs'

const sky = makeSky('open')
const phone = [135, -70, 18]
const clockUs = 1

test('omitting a 40 m delay on S6 recovers the original position and clock', () => {
  const readings = measure(sky, phone, clockUs, { s6: 40 })
  readings.forEach(reading => {
    Object.freeze(reading.position)
    Object.freeze(reading)
  })
  const audit = auditSignals(Object.freeze(readings))

  assert.equal(audit.status, 'ready')
  assert.ok(audit.baselineRms > 1)
  assert.equal(audit.options.length, 6)
  assert.deepEqual(audit.options.map(option => option.id).sort(), ['s1', 's2', 's3', 's4', 's5', 's6'])
  assert.ok(audit.options.every((option, index) => index === 0 || option.rms >= audit.options[index - 1].rms))

  const [best, next] = audit.options
  assert.equal(best.id, 's6')
  assert.ok(best.rms < 1e-6)
  assert.ok(next.rms > 1e-3)
  assert.ok(Math.abs(best.omittedResidual - 40) < 1e-6)
  assert.ok(Math.hypot(...best.position.map((value, axis) => value - phone[axis])) < 1e-5)
  assert.ok(Math.abs(best.clockUs - clockUs) < 1e-8)
})

test('all omissions retain a close fit when the readings are clean', () => {
  const audit = auditSignals(measure(sky, phone, -2.5))

  assert.equal(audit.status, 'ready')
  assert.ok(audit.baselineRms < 1e-6)
  assert.equal(audit.options.length, 6)
  for (const option of audit.options) {
    assert.ok(option.rms < 1e-6)
    assert.ok(Math.abs(option.omittedResidual) < 1e-6)
  }
})

test('five signals cannot support an omit-one comparison', () => {
  const readings = measure(sky.slice(0, 5), phone, clockUs, { s5: 40 })

  assert.deepEqual(auditSignals(readings), { status: 'insufficient', baselineRms: null, options: [] })
})

test('a rank-deficient sky makes the whole audit unavailable', () => {
  const repeated = sky.map(({ id }) => ({ id, position: sky[0].position }))

  assert.deepEqual(auditSignals(measure(repeated, phone, clockUs)), {
    status: 'unavailable', baselineRms: null, options: []
  })
})

test('a failed omission leaves the baseline available without ranking an incomplete set', () => {
  const fragile = [...sky.slice(0, 4), ...sky.slice(4).map(({ id }) => ({ id, position: sky[0].position }))]
  const audit = auditSignals(measure(fragile, phone, clockUs))

  assert.equal(audit.status, 'unavailable')
  assert.ok(Number.isFinite(audit.baselineRms))
  assert.deepEqual(audit.options, [])
})
