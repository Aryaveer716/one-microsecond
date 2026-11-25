import { makeSky, measure, metersPerMicrosecond, solve, solveAtClock, traceClockGuesses } from './gps.mjs'
import { createFallback } from './fallback.mjs'

const $ = id => document.getElementById(id)
const phone = [135, -70, 18]
const firstFour = ['s1', 's2', 's3', 's4']
const ids = [...firstFour, 's5', 's6']
const rangeNoise = [.5, -.9, .7, -.3, .2, .4]
const motion = matchMedia('(prefers-reduced-motion: reduce)')
const integer = new Intl.NumberFormat('en', { maximumFractionDigits: 0 })
const fresh = () => ({
  offset: 1, fitClock: false, layout: 'open', enabled: new Set(firstFour), probe: 25,
  trailCenter: 0, restoreId: 's4', restored: false, fourthCheck: null, noise: 0, echo: 0
})

let state = fresh()
let mode = 'opening'
let scene = null
let model = null
const fallback = createFallback($('fallback'))
const displacement = xyz => xyz.map((value, i) => value - phone[i])
const clockWindow = .86
const clockGuess = percentage => state.trailCenter + (percentage / 50 - 1) * clockWindow

function signed(value, places = 0) {
  const magnitude = Number(Math.abs(value).toFixed(places))
  return (magnitude === 0 ? '' : value < 0 ? '−' : '+') + magnitude.toFixed(places)
}

function text(id, value) {
  const el = $(id)
  if (el.textContent !== value) el.textContent = value
}

function satelliteButton(id, parent, cls = '') {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = cls
  button.textContent = id.toUpperCase()
  button.setAttribute('aria-label', cls ? 'Toggle satellite ' + id.toUpperCase() + ' in scene' : 'Satellite ' + id.toUpperCase())
  button.addEventListener('click', () => toggleSignal(id))
  parent.append(button)
  return button
}

const switchButtons = ids.map(id => satelliteButton(id, $('sat-switches')))
const skyButtons = ids.map(id => satelliteButton(id, $('sky-buttons'), 'sky-button'))
const tags = { actual: $('actual-tag'), estimate: $('estimate-tag'), probe: $('probe-tag') }
ids.forEach(id => $('reading-satellite').add(new Option(id.toUpperCase(), id)))

function buildModel() {
  const sky = makeSky(state.layout)
  const errors = Object.fromEntries(ids.map((id, i) => [id, state.noise * rangeNoise[i]]))
  errors.s6 += state.echo
  const ideal = measure(sky, phone, 0)
  const observed = measure(sky, phone, state.offset, errors)
  const active = observed.filter(signal => state.enabled.has(signal.id))
  const result = solve(active, state.fitClock)
  const position = result.status === 'fixed' ? displacement(result.position) : null
  const error = position ? Math.hypot(position[0], position[1]) : null
  const onTarget = position && error < .5 && Math.abs(position[2]) < .5
  const trail = active.length === 3 && state.fitClock
    ? traceClockGuesses(active, Array.from({ length: 41 }, (_, index) => clockGuess(index * 2.5)))
      .map(fit => ({ ...fit, offset: displacement(fit.position) }))
    : []
  return { sky, ideal, observed, active, result, position, error, onTarget, trail }
}

function sampleTrail() {
  if (!model.trail.length) {
    model.sample = null
    return
  }
  const fit = solveAtClock(model.active, clockGuess(state.probe))
  model.sample = fit.status === 'fixed' ? { ...fit, offset: displacement(fit.position) } : model.trail[0]
}

function setLayoutVisibility() {
  document.body.dataset.mode = mode
  const opening = mode === 'opening'
  for (const id of ['scene-overlay', 'controls', 'inside', 'replay']) $(id).hidden = opening
  if (!opening) $('phone-entry').hidden = true
  fallback.setMode(mode)
}

function enter(animate = true) {
  if (mode === 'opening') {
    mode = 'lab'
    setLayoutVisibility()
    scene?.enter(animate)
    window.scrollTo(0, 0)
  }
  $('lesson-title').focus({ preventScroll: true })
}

function replay() {
  if (mode === 'opening') {
    scene?.replay()
    return
  }
  mode = 'opening'
  setLayoutVisibility()
  scene?.replay()
  window.scrollTo(0, 0)
  $('enter').focus({ preventScroll: true })
}

function openDetails() {
  enter(false)
  $('inside').scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth', block: 'start' })
  $('inside-title').focus({ preventScroll: true })
}

function beforeCut() {
  const prior = solve(model.active, true)
  if (prior.status === 'fixed') state.trailCenter = prior.clockUs
  state.probe = 25
  state.fitClock = true
  state.restored = false
  state.fourthCheck = null
}

function toggleSignal(id) {
  state.restored = false
  state.fourthCheck = null
  if (state.enabled.has(id)) {
    if (state.enabled.size === 4) {
      beforeCut()
      state.restoreId = id
    }
    state.enabled.delete(id)
  } else {
    if (model.trail.length > 1 && model.sample && state.enabled.size === 3) {
      const reading = model.observed[ids.indexOf(id)]
      const [prediction] = measure([reading], model.sample.position, model.sample.clockUs)
      state.fourthCheck = { id: id.toUpperCase(), gap: Math.abs(prediction.range - reading.range) }
      state.restored = true
    }
    state.enabled.add(id)
  }
  update()
}

function indicateClock() {
  const { result, sample, error, trail, active } = model
  const hasTrail = trail.length > 1
  const fixed = result.status === 'fixed'
  let headline
  let copy
  let action
  let phase

  if (hasTrail) {
    phase = 'THREE SIGNALS'
    headline = 'The dot becomes a trail.'
    copy = 'Try two spots on the trail. Changing the clock guess changes the possible location, while all three readings still agree.'
    action = 'Restore the fourth signal'
  } else if (!fixed) {
    phase = 'SIGNAL LOSS'
    headline = 'Too few signals for a fix.'
    copy = 'GPS needs enough independent readings to work out where the phone is and how far off its clock is.'
    action = 'Restore four signals'
  } else if (!state.fitClock) {
    phase = 'THE CLOCK'
    headline = 'A fast clock moves the pin.'
    copy = 'GPS works out distance by timing each signal’s trip. A fast clock makes each trip seem longer. Move the slider to see the pin shift.'
    action = 'Let GPS solve it'
  } else {
    phase = state.restored ? 'FOUR SIGNALS' : 'POSITION AND TIME'
    headline = state.restored ? 'Back to one position.' : model.onTarget ? 'The pin is back.' : 'GPS found a best fit.'
    if (state.restored && state.fourthCheck.gap >= .05) {
      const { id, gap } = state.fourthCheck
      copy = `Your chosen point missed ${id}’s reading by ${gap < 1 ? gap.toFixed(2) : integer.format(gap)} m. That fourth reading rules it out.`
    } else if (state.restored) {
      copy = 'Your chosen point matches the fourth reading too. That extra reading separates it from the other positions on the trail.'
    } else {
      copy = 'GPS estimated east, north, height and clock error together. Cut a signal to see what the receiver loses.'
    }
    action = active.length === 4 ? 'Cut one satellite' : 'Try with three signals'
  }
  text('phase', phase)
  text('lesson-title', headline)
  text('lesson-copy', copy)
  if ($('action').firstChild.textContent.trim() !== action) $('action').firstChild.textContent = action + ' '
  $('assume-clock').hidden = !state.fitClock || hasTrail || !fixed
  $('clock-control').hidden = hasTrail
  $('probe-control').hidden = !hasTrail
  $('offset').value = state.offset
  $('offset').setAttribute('aria-valuetext', state.offset === 0 ? 'Clock exact' : Math.abs(state.offset) + ' microseconds ' + (state.offset < 0 ? 'slow' : 'fast'))
  text('clock-value', signed(state.offset, 2) + ' µs')
  $('probe').value = state.probe
  if (sample) {
    text('probe-value', signed(sample.clockUs, 2) + ' µs')
    $('probe').setAttribute('aria-valuetext', signed(sample.clockUs, 2) + ' microseconds guessed clock error')
  }

  $('scene-value').dataset.kind = hasTrail ? 'trail' : model.onTarget ? 'fit' : 'error'
  text('scene-status-label', hasTrail ? 'NO UNIQUE GPS FIX' : 'GPS ESTIMATE')
  text('scene-value', hasTrail ? 'Many places fit.' : fixed ? (model.onTarget ? 'On target.' : integer.format(error) + ' m off') : 'No fix.')
  text('scene-note', hasTrail && sample
    ? integer.format(Math.hypot(sample.offset[0], sample.offset[1])) + ' m away · ' + integer.format(Math.abs(sample.offset[2])) + (sample.offset[2] < -.5 ? ' m lower' : ' m higher')
    : fixed ? (model.onTarget ? 'Position and time agree.' : 'Ground distance from the actual phone.') : 'The actual phone is still here.')
  $('estimate-key').hidden = !fixed
  $('trail-key').hidden = !hasTrail
  text('orbit-hint', scene ? (hasTrail ? 'Tap the trail or drag to orbit' : 'Drag to orbit') : 'Projected view')
  text('signal-count', active.length + ' in use')
}

function renderStrips() {
  const { active, ideal, observed, result, sample } = model
  const fitClock = state.fitClock && result.status === 'fixed'
  const bias = state.offset * metersPerMicrosecond
  const fittedBias = fitClock ? result.clockUs * metersPerMicrosecond : 0
  const stillWrong = state.noise > 0 || (state.echo > 0 && state.enabled.has('s6'))
  const description = sample
    ? sample.rms < .01 ? 'All 3 readings match this guess.' : 'This guess leaves ' + sample.rms.toFixed(2) + ' m of mismatch.'
    : fitClock ? 'Estimated clock error ' + signed(result.clockUs, 2) + ' µs.' + (stillWrong ? ' Some range error remains.' : '')
      : bias === 0 ? 'The clock adds no error to the readings.' :
        'The clock makes every signal look ' + integer.format(Math.abs(bias)) + (bias < 0 ? ' m shorter.' : ' m longer.')
  text('signal-caption', description)

  $('signal-strips').innerHTML = ids.map((id, i) => {
    const signalIndex = active.findIndex(reading => reading.id === id)
    if (i >= 4 && signalIndex === -1) return ''
    const extra = sample && signalIndex >= 0 ? sample.residuals[signalIndex] : observed[i].range - ideal[i].range - fittedBias
    const cursor = Math.max(3, Math.min(97, 50 + extra / 13))
    return `<div class="strip" data-active="${signalIndex !== -1}" data-delayed="${i === 5 && state.echo > 0}">${id.toUpperCase()}<span class="strip-track" style="--cursor:${cursor}%"></span></div>`
  }).join('')
}

function renderButtons() {
  ids.forEach((id, index) => {
    const active = state.enabled.has(id)
    const button = switchButtons[index]
    button.hidden = index > 3 && !active
    button.setAttribute('aria-pressed', active)
    skyButtons[index].setAttribute('aria-pressed', active)
    skyButtons[index].dataset.active = active
  })
}

function milliseconds(metres) {
  return (metres / metersPerMicrosecond / 1000).toFixed(6) + ' ms'
}

function inspectReading() {
  const index = ids.indexOf($('reading-satellite').value)
  const observed = model.observed[index]
  const ideal = model.ideal[index]
  const enabled = state.enabled.has(observed.id)
  text('true-time', milliseconds(ideal.range))
  text('measured-time', enabled ? milliseconds(observed.range) : 'Signal off')
  text('apparent-distance', enabled ? integer.format(observed.range) + ' m' : '—')
  text('reading-note', enabled
    ? signed(observed.range - ideal.range, 2) + ' m compared with the true range.'
    : 'The receiver is ignoring this satellite. Restore the signal in the scene to use its reading.')
}

function renderDetails() {
  const { result, active, observed, ideal, error, sample } = model
  const fixed = result.status === 'fixed'
  document.querySelector(`input[name="layout"][value="${state.layout}"]`).checked = true
  $('noise').value = state.noise
  text('noise-value', state.noise + ' m')
  text('geometry-result', fixed ? integer.format(error) + ' m off on the ground · HDOP ' + result.hdop.toFixed(2) : 'Restore the fix to compare the geometry.')
  const sixthOn = state.enabled.has('s6')
  text('trial-echo', sixthOn && state.echo > 0 ? 'Clear the echo' : 'Add a 40 m echo')
  $('echo-control').hidden = !sixthOn
  $('echo').value = state.echo
  text('echo-value', state.echo + ' m')
  text('echo-result', sixthOn && fixed ? result.rms.toFixed(1) + ' m signal mismatch · ' + integer.format(error) + ' m off on the ground' : '')
  inspectReading()

  $('measurements').innerHTML = observed.map(({ id, range }, i) => {
    const index = active.findIndex(signal => signal.id === id)
    const residuals = fixed ? result.residuals : sample?.residuals
    const values = index >= 0
      ? [milliseconds(range), integer.format(range) + ' m', residuals ? signed(residuals[index], 2) + ' m' : '—']
      : ['Signal off', '—', '—']
    return `<tr><td>${id.toUpperCase()}</td><td>${integer.format(ideal[i].range)} m</td>${values.map(value => `<td>${value}</td>`).join('')}</tr>`
  }).join('')
  const steps = fixed ? result.steps : sample?.steps
  $('iterations').innerHTML = !steps
    ? '<tr><td colspan="5">Restore signals to see the receiver updates.</td></tr>'
    : [{ position: [0, 0, 0], clockUs: sample?.clockUs ?? 0 }, ...steps].map((step, i) =>
      `<tr><td>${i || 'Start'}</td>${step.position.map(value => `<td>${signed(value, 3)} m</td>`).join('')}<td>${signed(sample?.clockUs ?? step.clockUs, 4)} µs</td></tr>`
    ).join('')
}

function render() {
  indicateClock()
  renderStrips()
  renderButtons()
  renderDetails()
  const data = { ...model, enabled: state.enabled }
  if (scene) scene.update(data)
  else fallback.update(data)
}

function update() {
  model = buildModel()
  sampleTrail()
  render()
}

function useFallback() {
  scene = null
  $('world').hidden = true
  $('fallback').hidden = false
  $('phone-entry').hidden = true
  $('sky-buttons').hidden = true
  $('scene-tags').hidden = true
  $('reset-view').hidden = true
  text('orbit-hint', 'Projected view')
  document.body.dataset.renderer = 'canvas'
  fallback.setMode(mode)
  fallback.update({ ...model, enabled: state.enabled })
}

$('enter').addEventListener('click', () => enter())
$('phone-entry').addEventListener('click', () => enter())
$('replay').addEventListener('click', replay)
$('brand').addEventListener('click', replay)
$('inspect-link').addEventListener('click', openDetails)
$('back-to-experiment').addEventListener('click', () => {
  $('experiment').scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth' })
  $('lesson-title').focus({ preventScroll: true })
})
$('reset-view').addEventListener('click', () => scene?.resetView())
$('reset').addEventListener('click', () => {
  state = fresh()
  update()
  scene?.resetView()
})
$('offset').addEventListener('input', event => {
  state.offset = Number(event.currentTarget.value)
  state.restored = false
  update()
})
$('probe').addEventListener('input', event => {
  state.probe = Number(event.currentTarget.value)
  sampleTrail()
  render()
})
$('action').addEventListener('click', () => {
  if (model.trail.length > 1) {
    const restore = state.enabled.has(state.restoreId) ? ids.find(id => !state.enabled.has(id)) : state.restoreId
    toggleSignal(restore)
    return
  }
  if (model.result.status !== 'fixed') {
    state.enabled = new Set(firstFour)
    state.fitClock = true
  } else if (!state.fitClock) {
    state.fitClock = true
  } else {
    beforeCut()
    const last = model.active.length === 4 ? model.active.at(-1).id : 's4'
    state.restoreId = last
    state.enabled = new Set(model.active.length === 4 ? model.active.slice(0, 3).map(signal => signal.id) : firstFour.slice(0, 3))
  }
  update()
})
$('assume-clock').addEventListener('click', () => {
  state.fitClock = false
  state.restored = false
  update()
})
$('reading-satellite').addEventListener('change', inspectReading)
document.querySelectorAll('input[name="layout"]').forEach(input => input.addEventListener('change', () => {
  state.layout = input.value
  state.fitClock = true
  state.restored = false
  update()
}))
$('noise').addEventListener('input', event => {
  state.noise = Number(event.currentTarget.value)
  state.fitClock = true
  state.restored = false
  update()
})
$('trial-echo').addEventListener('click', () => {
  state.restored = false
  if (state.enabled.has('s6') && state.echo > 0) state.echo = 0
  else {
    state.enabled = new Set(ids)
    state.fitClock = true
    state.echo = 40
    $('reading-satellite').value = 's6'
  }
  update()
})
$('echo').addEventListener('input', event => {
  state.echo = Number(event.currentTarget.value)
  state.restored = false
  update()
})

update()
setLayoutVisibility()

import('./scene.mjs').then(({ createScene }) => {
  scene = createScene({
    canvas: $('world'), visual: $('visual'), tags, skyButtons, phoneEntry: $('phone-entry'),
    status: document.querySelector('.scene-status'), motion, onLost: useFallback,
    onProbe(clockUs) {
      state.probe = Math.round(50 * (1 + (clockUs - state.trailCenter) / clockWindow))
      sampleTrail()
      render()
    }
  })
  if (mode === 'lab') scene.enter(false)
  render()
  document.body.dataset.renderer = 'webgl'
  requestAnimationFrame(() => {
    if (scene) $('fallback').hidden = true
  })
}).catch(error => {
  console.info('Using the Canvas view.', error.message)
  useFallback()
})
