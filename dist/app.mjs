import { makeSky, measure, metersPerMicrosecond, solve } from './gps.mjs'
import { drawGround, drawSky } from './plots.mjs'

const $ = id => document.getElementById(id)
const skyCanvas = $('sky-grid')
const groundCanvas = $('ground')
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
const phone = [135, -70, 18]
const firstFour = ['s1', 's2', 's3', 's4']
// Use identical signed errors in both skies for an apples-to-apples trial.
const noisePattern = [0.5, -0.9, 0.7, -0.3, 0.2, 0.4]
const format = new Intl.NumberFormat('en', { maximumFractionDigits: 0 })
const defaultState = () => ({
  offset: 1, fitClock: false, layout: 'open', echo: 0, noise: 0, enabled: new Set(firstFour)
})
let state = defaultState()
let satellites = makeSky(state.layout)
let target = null
let displayed = null
let frame = 0

function signed(value, places = 0) {
  const rounded = +Math.abs(value).toFixed(places)
  return (rounded === 0 ? '' : value < 0 ? '−' : '+') + rounded.toFixed(places)
}

const buttons = new Map(satellites.map(({ id }) => {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'satellite'
  button.textContent = id.toUpperCase()
  button.addEventListener('click', () => {
    if (state.enabled.has(id)) state.enabled.delete(id)
    else state.enabled.add(id)
    render(true)
  })
  $('satellites').append(button)
  return [id, button]
}))

function setGround(location, animate) {
  target = location
  cancelAnimationFrame(frame)
  if (!animate || !displayed || !location || reducedMotion.matches) {
    displayed = location
    drawGround(groundCanvas, displayed)
    return
  }
  const origin = displayed
  const extent = origin.map((value, i) => Math.max(Math.abs(value), Math.abs(location[i])))
  const start = performance.now()
  function draw(now) {
    const elapsed = Math.min((now - start) / 440, 1)
    const t = 1 - (1 - elapsed) ** 3
    displayed = origin.map((value, i) => value + (location[i] - value) * t)
    drawGround(groundCanvas, displayed, extent)
    if (elapsed < 1) frame = requestAnimationFrame(draw)
    else drawGround(groundCanvas, location)
  }
  frame = requestAnimationFrame(draw)
}

function describeFix(result, horizontalError) {
  if (result.status === 'insufficient') return 'NO FIX · TOO FEW SIGNALS'
  if (result.status === 'geometry') return 'NO FIX · POOR GEOMETRY'
  if (result.status === 'unconverged') return 'NO FIX · SOLVER STALLED'
  if (!state.fitClock) return 'CLOCK ASSUMED EXACT'
  return result.rms < 0.05 && horizontalError < 0.5 ? 'POSITION AND TIME SOLVED' : 'BEST FIT WITH CLOCK'
}

function describeAction(result, count, horizontalError) {
  if (result.status === 'insufficient') {
    const unknowns = state.fitClock ? 'east, north, height and time' : 'east, north and height'
    return `${count} signals for ${unknowns}. Tap a satellite to restore a signal.`
  }
  if (result.status !== 'fixed') return 'Try spreading the satellites out or adding a signal.'
  if (!state.fitClock) return 'The receiver assumes its clock is perfect. Try solving for the clock.'
  if (state.echo > 0 && state.enabled.has('s6')) {
    if (count === 4) return 'Four readings can agree on the wrong fix. Add a signal to expose the echo.'
    return 'The receiver estimates the clock, but the echo still pulls the pin away.'
  }
  if (state.noise > 0) return 'The receiver estimates the clock, but small range errors can still move the pin.'
  if (horizontalError < 0.5) return 'The estimate is back on the phone. Move the clock again and watch it stay put.'
  return 'The receiver has found a position and a clock estimate.'
}

function renderLedger(all, active, result) {
  $('measurements').innerHTML = all.map(({ id, position, range }) => {
    const index = active.findIndex(item => item.id === id)
    const distance = Math.hypot(...position.map((value, axis) => value - phone[axis]))
    const online = index >= 0
    const residual = online && result.status === 'fixed' ? signed(result.residuals[index], 2) + ' m' : '—'
    const time = online ? (range / metersPerMicrosecond / 1000).toFixed(6) + ' ms' : '—'
    const pseudo = online ? format.format(range) + ' m' : '—'
    return `<tr data-muted="${!online}"><td>${id.toUpperCase()}${online ? '' : ' · off'}</td><td>${format.format(distance)} m</td><td>${time}</td><td>${pseudo}</td><td>${residual}</td></tr>`
  }).join('')
  $('iterations').innerHTML = result.status === 'fixed'
    ? [{ position: [0, 0, 0], clockUs: 0 }, ...result.steps].map(({ position, clockUs }, index) =>
      `<tr><td>${index === 0 ? 'Start' : index}</td>${position.map(value => `<td>${signed(value, 3)} m</td>`).join('')}<td>${signed(clockUs, 4)} µs</td></tr>`
    ).join('')
    : '<tr><td colspan="5">Restore the fix to see the updates.</td></tr>'
}

function render(animate = false) {
  satellites = makeSky(state.layout)
  const errors = Object.fromEntries(satellites.map(({ id }, i) => [id, noisePattern[i] * state.noise]))
  errors.s6 += state.echo
  const all = measure(satellites, phone, state.offset, errors)
  const active = all.filter(item => state.enabled.has(item.id))
  const result = solve(active, state.fitClock)
  const fixed = result.status === 'fixed'
  const displacement = fixed ? result.position.map((value, i) => value - phone[i]) : null
  const horizontalError = fixed ? Math.hypot(displacement[0], displacement[1]) : null
  const onTarget = fixed && horizontalError < 0.5
  const error = fixed ? (onTarget ? '<1 m off' : format.format(horizontalError) + ' m off') : 'No estimate'

  $('offset').value = state.offset
  $('offset').setAttribute('aria-valuetext', state.offset === 0 ? 'No clock error' :
    Math.abs(state.offset) + ' microseconds ' + (state.offset < 0 ? 'slow' : 'fast'))
  $('offset-value').innerHTML = signed(state.offset, 2) + ' <small>µs</small>'
  $('range-note').innerHTML = state.offset === 0 ? 'Clock adds <strong>0 m</strong> to each signal.' :
    `Each signal looks <strong>${format.format(Math.abs(state.offset) * metersPerMicrosecond)} m ${state.offset < 0 ? 'shorter' : 'longer'}.</strong>`
  $('clock').textContent = state.fitClock ? 'Assume a perfect clock' : 'Solve for the clock'
  $('clock').dataset.fitted = state.fitClock
  setText('hint', describeAction(result, active.length, horizontalError))
  setText('status', describeFix(result, horizontalError))
  $('status').classList.toggle('good', state.fitClock && onTarget && result.rms < 0.05)
  setText('map-error', error)
  $('map-error').classList.toggle('good', onTarget)
  setText('map-description', fixed ? `GPS estimate ${onTarget ? 'within one metre' : format.format(horizontalError) + ' metres'} of the actual phone on the ground.` :
    'No GPS estimate. The actual phone remains in place.')
  setText('signal-count', active.length + (active.length === 1 ? ' signal' : ' signals'))
  $('estimated-clock').innerHTML = state.fitClock
    ? (fixed ? signed(result.clockUs, 2) + ' µs' : '—')
    : '0.00 µs <small>assumed</small>'
  setText('height-error', fixed ? signed(displacement[2]) + ' m' : '—')
  setText('mismatch', fixed ? result.rms.toFixed(1) + ' m' : '—')

  satellites.forEach(({ id, azimuth, elevation }) => {
    const button = buttons.get(id)
    const name = id.toUpperCase() + (id === 's6' && state.echo ? ', delayed signal' : '')
    button.setAttribute('aria-pressed', state.enabled.has(id))
    button.setAttribute('aria-label', 'Satellite ' + name)
    button.title = `${name} · azimuth ${azimuth}° · elevation ${elevation}°`
    button.dataset.delayed = id === 's6' && state.echo > 0
  })

  setText('trial-four', isThreeSignalTrial() ? 'Restore the fourth signal' : 'Try with three signals')
  document.querySelector(`input[name="layout"][value="${state.layout}"]`).checked = true
  setText('dop-value', fixed ? result.hdop.toFixed(2) : '—')
  setText('dop-caption', fixed ? 'Higher means noisier positions.' : 'A fix is needed to measure this.')
  $('noise').value = state.noise
  setText('noise-value', state.noise + ' m')
  $('noise-result').hidden = state.noise === 0 || !fixed
  setText('noise-result', fixed ? `This fix is ${format.format(horizontalError)} m off on the ground.` : '')
  const sixthSignalEnabled = state.enabled.has('s6')
  setText('trial-echo', sixthSignalEnabled && state.echo > 0 ? 'Clear the echo' : 'Add a 40 m echo')
  $('echo-control').hidden = !sixthSignalEnabled
  $('echo').value = state.echo
  setText('echo-value', state.echo + ' m')
  $('echo-result').hidden = !sixthSignalEnabled
  setText('echo-result', fixed ? `${error} · ${result.rms.toFixed(1)} m signal mismatch` : 'Restore the fix to see signal mismatch.')

  renderLedger(all, active, result)
  drawSky(skyCanvas, satellites, buttons, state.enabled)
  setGround(displacement, animate)
}

function setText(id, text) {
  if ($(id).textContent !== text) $(id).textContent = text
}

$('offset').addEventListener('input', event => {
  state.offset = Number(event.currentTarget.value)
  render()
})
$('clock').addEventListener('click', () => {
  state.fitClock = !state.fitClock
  render(true)
})
$('reset').addEventListener('click', () => {
  state = defaultState()
  render(true)
})
function isThreeSignalTrial() {
  return state.fitClock && state.enabled.size === 3 && firstFour.slice(0, 3).every(id => state.enabled.has(id))
}

$('trial-four').addEventListener('click', () => {
  const restore = isThreeSignalTrial()
  state.fitClock = true
  state.enabled = new Set(restore ? firstFour : firstFour.slice(0, 3))
  state.echo = 0
  state.noise = 0
  render()
  $('experiment').scrollIntoView()
  buttons.get('s4').focus({ preventScroll: true })
})
document.querySelectorAll('input[name="layout"]').forEach(input => input.addEventListener('change', () => {
  state.layout = input.value
  state.fitClock = true
  render(true)
}))
$('noise').addEventListener('input', event => {
  state.noise = Number(event.currentTarget.value)
  state.fitClock = true
  render()
})
$('trial-echo').addEventListener('click', () => {
  if (state.enabled.has('s6') && state.echo > 0) {
    state.echo = 0
  } else {
    state.enabled = new Set([...firstFour, 's5', 's6'])
    state.echo = 40
    state.fitClock = true
  }
  render(true)
})
$('echo').addEventListener('input', event => {
  state.echo = Number(event.currentTarget.value)
  render()
})
const resize = new ResizeObserver(() => {
  drawSky(skyCanvas, satellites, buttons, state.enabled)
  setGround(target, false)
})
resize.observe(skyCanvas)
resize.observe(groundCanvas)
render()
