import * as THREE from 'three'
import { OrbitControls } from './vendor/OrbitControls.js'
import { createCity } from './city.mjs'
import { createPhone } from './phone.mjs'

const colors = [0x82b8ff, 0xb6a4ff, 0x8de2ce, 0xffca9f, 0xa8d89a, 0xffa4c7]
const groundHeight = 0.45
const TAU = Math.PI * 2
const ease = t => t * t * (3 - 2 * t)
const limit = (n, low, high) => Math.min(high, Math.max(low, n))
const vector = (x, y, z) => new THREE.Vector3(x, y, z)

function local(offset, onGround = false) {
  return vector(offset[0] / 16, groundHeight + (onGround ? 0 : offset[2] / 62), -offset[1] / 16)
}

function line(points, color, opacity, depthTest = true) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({
    color, transparent: true, opacity, depthTest, depthWrite: false, fog: false
  }))
}

function halo(radius, color, opacity = 1) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(radius * .8, radius, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false })
  )
  mesh.rotation.x = -Math.PI / 2
  return mesh
}

function starField() {
  let seed = 719
  function random() {
    seed = (1664525 * seed + 1013904223) >>> 0
    return seed / 2 ** 32
  }
  const points = []
  for (let i = 0; i < 1350; i++) {
    const az = TAU * random()
    const y = .04 + random() * .94
    points.push(vector(162 * Math.cos(az) * Math.sqrt(1 - y * y), 162 * y, 162 * Math.sin(az) * Math.sqrt(1 - y * y)))
  }
  return new THREE.Points(new THREE.BufferGeometry().setFromPoints(points), new THREE.PointsMaterial({
    color: 0xb4c4eb, opacity: .60, transparent: true, size: .23, fog: false
  }))
}

function hardware(color) {
  const group = new THREE.Group()
  const metal = new THREE.MeshStandardMaterial({ color: 0x8396af, metalness: .48, roughness: .3 })
  const panel = new THREE.MeshStandardMaterial({ color: 0x285796, emissive: color, emissiveIntensity: .20, roughness: .42 })
  const grid = new THREE.MeshBasicMaterial({ color: 0xaac7ff, transparent: true, opacity: .36 })
  function block(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
    mesh.position.set(x, y, z)
    group.add(mesh)
  }
  block(.7, .63, .64, 0, 0, 0, metal)
  for (const side of [-1, 1]) {
    block(.46, .10, .11, side * .51, 0, 0, metal)
    block(1.07, .59, .11, side * 1.15, 0, 0, panel)
    for (const x of [-.3, 0, .3]) block(.012, .56, .015, side * 1.15 + x, 0, .062, grid)
    block(1.02, .012, .015, side * 1.15, 0, .062, grid)
  }
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 7), metal)
  cap.scale.set(1, 1, .43)
  cap.position.z = .34
  group.add(cap)
  return group
}

function makeSignals(field) {
  return colors.map((color, i) => {
    const unit = hardware(color)
    const beam = line([vector(0, 0, 0), vector(0, 0, 0)], color, .55, false)
    beam.frustumCulled = false
    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(.21, 10, 7),
      new THREE.MeshBasicMaterial({ color, fog: false, depthTest: false })
    )
    const core = halo(.76, color, .5)
    core.rotation.x = 0
    unit.add(core)
    unit.rotation.set(-.24, -.37 + .17 * i, .12 + .095 * i)
    field.add(beam, pulse, unit)
    return { unit, beam, pulse }
  })
}

function makeMarkers(field) {
  const actual = new THREE.Group()
  actual.position.copy(local([0, 0, 0]))
  actual.add(halo(.94, 0x9df2d1, .96), halo(1.52, 0x9df2d1, .32))
  const trueCenter = new THREE.Mesh(
    new THREE.SphereGeometry(.24, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xbcffe5, fog: false })
  )
  trueCenter.position.y = .10
  actual.add(trueCenter)
  const estimate = new THREE.Group()
  const pin = new THREE.Mesh(
    new THREE.OctahedronGeometry(.52),
    new THREE.MeshBasicMaterial({ color: 0xffb78f, fog: false })
  )
  pin.scale.y = 1.35
  pin.position.y = .72
  estimate.add(pin, halo(.78, 0xffba91, .72))
  const probe = new THREE.Mesh(
    new THREE.SphereGeometry(.40, 14, 9),
    new THREE.MeshBasicMaterial({ color: 0xf2f5ff, depthTest: false, fog: false })
  )
  probe.renderOrder = 13
  const delta = line([vector(0, 0, 0), vector(0, 0, 0)], 0xffbd9a, .75, false)
  delta.frustumCulled = false
  field.add(actual, estimate, delta, probe)
  return { actual, estimate, delta, probe }
}

function updateLine(object, start, end) {
  const positions = object.geometry.attributes.position
  positions.setXYZ(0, start.x, start.y, start.z)
  positions.setXYZ(1, end.x, end.y, end.z)
  positions.needsUpdate = true
}

function placeTag(element, target, camera, width, height, blocked) {
  const point = target.clone().project(camera)
  const x = (point.x * .5 + .5) * width
  const y = (.5 - point.y * .5) * height
  const intersects = blocked && x > blocked.x - 22 && x < blocked.right + 22 && y > blocked.y - 15 && y < blocked.bottom + 15
  const visible = point.z >= -1 && point.z <= 1 && Math.abs(point.x) < .96 && Math.abs(point.y) < .93 && !intersects
  element.hidden = !visible
  if (visible) {
    element.style.left = x + 'px'
    element.style.top = y + 'px'
  }
}

export function createScene({ canvas, visual, tags, skyButtons, phoneEntry, status, motion, onLost, onProbe }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setClearColor(0x0b1326)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15

  const world = new THREE.Scene()
  world.fog = new THREE.FogExp2(0x121d34, .014)
  const camera = new THREE.PerspectiveCamera(42, 1, .045, 255)
  const controller = new OrbitControls(camera, canvas)
  controller.enabled = false
  controller.enableDamping = true
  controller.enablePan = false
  controller.rotateSpeed = .66
  controller.minDistance = 20
  controller.maxDistance = 88
  controller.minPolarAngle = .18
  controller.maxPolarAngle = Math.PI * .475
  controller.zoomSpeed = .66
  const hemisphere = new THREE.HemisphereLight(0xaec4f6, 0x293949, 1.80)
  const key = new THREE.DirectionalLight(0xc8d8ff, 3.1)
  key.position.set(-6, 16, 21)
  const rim = new THREE.DirectionalLight(0x8d9fff, 3.4)
  rim.position.set(9, 11, -9)
  const warm = new THREE.DirectionalLight(0xffbb83, 1.7)
  warm.position.set(-16, 5, -4)

  const city = createCity(THREE)
  const phone = createPhone(THREE)
  const phoneMark = vector(...phone.screenPoint)
  const field = new THREE.Group()
  const signals = makeSignals(field)
  const marker = makeMarkers(field)
  world.add(hemisphere, key, rim, warm, city.group, phone.group, starField(), field)

  let width = 1
  let height = 1
  let mode = 'opening'
  let started = performance.now()
  let flightStarted = 0
  let frame = 0
  let current = null
  let previousTrail = null
  let ribbon = null
  let ribbonOrigin = vector(0, 0, 0)
  let ribbonChange = 0
  let ribbonClosing = false
  const shownEstimate = vector(0, groundHeight, 0)
  const aimEstimate = vector(0, groundHeight, 0)
  let initializedEstimate = false
  let webglLost = false
  let pointerDown = null
  let statusBounds

  const statusObserver = new ResizeObserver(() => {
    const { offsetLeft: x, offsetTop: y, offsetWidth, offsetHeight } = status
    statusBounds = { x, y, right: x + offsetWidth, bottom: y + offsetHeight }
  })
  statusObserver.observe(status)

  function resize() {
    const bounds = visual.getBoundingClientRect()
    width = Math.max(1, bounds.width)
    height = Math.max(1, bounds.height)
    camera.aspect = width / height
    renderer.setSize(width, height, false)
    if (mode === 'lab') resetView()
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(visual)

  const labTarget = () => vector(0, width < 650 ? 6 : 5.5, -4)
  const labEye = () => width < 650 ? vector(31, 25, 43) : vector(27, 18, 37)

  function resetView() {
    camera.fov = width < 650 ? 48 : 42
    camera.updateProjectionMatrix()
    camera.position.copy(labEye())
    controller.target.copy(labTarget())
    camera.lookAt(controller.target)
    controller.update()
  }

  function openCamera(seconds) {
    const mobile = width < 620
    camera.fov = 42
    camera.position.set(19 + Math.min(seconds, 6) * .45, 7.2, 38)
    camera.lookAt(0, 4.0, -15)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    const distance = mobile ? 15.0 : 12.9
    const half = Math.tan(camera.fov * Math.PI / 360) * distance
    const right = vector(1, 0, 0).applyQuaternion(camera.quaternion)
    const up = vector(0, 1, 0).applyQuaternion(camera.quaternion)
    phone.group.position.copy(camera.position)
      .addScaledVector(camera.getWorldDirection(vector(0, 0, 0)), distance)
      .addScaledVector(right, half * camera.aspect * (mobile ? .30 : .46))
      .addScaledVector(up, half * (mobile ? -.50 : -.025))
    const speed = motion.matches ? 0 : seconds
    const localTilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(-.085, -.27 + .045 * Math.sin(speed * .55), -.12 - .012 * Math.sin(speed)))
    phone.group.quaternion.copy(camera.quaternion).multiply(localTilt)
    phone.group.updateMatrixWorld(true)
  }

  function removeRibbon() {
    if (!ribbon) return
    ribbon.traverse(node => {
      node.geometry?.dispose()
      node.material?.dispose()
    })
    field.remove(ribbon)
    ribbon = null
  }

  function drawRibbon(trail) {
    removeRibbon()
    const points = trail.map(point => local(point.offset))
    if (points.length < 2) return
    ribbonOrigin = points[Math.floor(points.length / 2)].clone()
    const curve = new THREE.CatmullRomCurve3(points.map(point => point.clone().sub(ribbonOrigin)))
    ribbon = new THREE.Group()
    for (const [radius, opacity] of [[.32, .12], [.14, .52], [.068, 1]]) {
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 48, radius, 7, false),
        new THREE.MeshBasicMaterial({ color: 0xa4bdff, transparent: opacity < 1, opacity, depthTest: false, depthWrite: false, fog: false })
      )
      tube.renderOrder = 8
      ribbon.add(tube)
    }
    for (let i = 0; i < points.length; i += 4) {
      const sample = new THREE.Mesh(
        new THREE.SphereGeometry(.12, 8, 5),
        new THREE.MeshBasicMaterial({ color: 0xe5edff, depthTest: false, fog: false })
      )
      sample.position.copy(points[i]).sub(ribbonOrigin)
      sample.renderOrder = 9
      ribbon.add(sample)
    }
    ribbon.position.copy(ribbonOrigin)
    const footprint = line(points.map(point => vector(point.x, .14, point.z)).map(point => point.sub(ribbonOrigin)), 0x99b7ff, .40, false)
    footprint.renderOrder = 7
    ribbon.add(footprint)
    field.add(ribbon)
  }

  function update(data) {
    const firstTrail = !previousTrail?.length && data.trail.length
    if (data.trail !== previousTrail) {
      if (data.trail.length) {
        drawRibbon(data.trail)
        if (firstTrail) ribbonChange = performance.now()
        ribbonClosing = false
      } else if (ribbon && data.position) {
        ribbonClosing = true
        ribbonChange = performance.now()
      } else {
        removeRibbon()
      }
      previousTrail = data.trail
    }
    current = data
    if (data.position) {
      aimEstimate.copy(local(data.position, true))
      if (!initializedEstimate || motion.matches) shownEstimate.copy(aimEstimate)
      initializedEstimate = true
    }
  }

  function drawField(now) {
    if (!current) return
    const seconds = now / 1000
    const truePosition = marker.actual.position
    const hasFix = !!current.position
    const hasTrail = current.trail.length > 1
    marker.estimate.visible = hasFix
    marker.delta.visible = hasFix && !current.onTarget
    marker.probe.visible = !!current.sample && hasTrail
    if (hasFix) {
      shownEstimate.lerp(aimEstimate, motion.matches ? 1 : .16)
      marker.estimate.position.copy(shownEstimate)
      updateLine(marker.delta, truePosition.clone().add(vector(0, .25, 0)), shownEstimate.clone().add(vector(0, .52, 0)))
    }
    if (marker.probe.visible) marker.probe.position.copy(local(current.sample.offset))

    const elapsed = motion.matches ? 1 : limit((now - ribbonChange) / 660, 0, 1)
    if (ribbon && ribbonClosing) {
      ribbon.scale.setScalar(Math.max(.0001, 1 - ease(elapsed)))
      ribbon.position.lerpVectors(ribbonOrigin, local(current.position), ease(elapsed))
      if (elapsed === 1) removeRibbon()
    } else if (ribbon) {
      ribbon.scale.setScalar(.06 + .94 * ease(elapsed))
    }

    const tagPositions = [truePosition.clone().add(vector(0, .65, 0)), shownEstimate.clone().add(vector(0, 1.35, 0)), marker.probe.position.clone().add(vector(0, .65, 0))]
    Object.values(tags).forEach((label, i) => {
      if ((i === 1 && (!hasFix || current.onTarget)) || (i === 2 && !marker.probe.visible)) label.hidden = true
      else placeTag(label, tagPositions[i], camera, width, height, statusBounds)
    })
    const pulseTarget = marker.actual.position.clone().add(vector(0, .35, 0))
    const singleSignal = current.storyStep === 'listen' || current.storyStep === 'range'
    signals.forEach(({ unit, beam, pulse }, i) => {
      const satellite = current.sky[i]
      const active = current.enabled.has(satellite.id)
      const visible = active || (!singleSignal && i < 4)
      const [east, north, up] = satellite.position
      const length = Math.hypot(east, north, up)
      const position = vector(23 * east / length, 5.8 + 15 * up / length, -19 * north / length)
      unit.position.copy(position)
      unit.position.y += motion.matches ? 0 : .16 * Math.sin(seconds * .86 + i)
      unit.visible = visible
      beam.visible = active
      pulse.visible = active
      if (active) {
        updateLine(beam, unit.position, pulseTarget)
        let phase = motion.matches ? .53 : (seconds * .85 + i * .21) % 1
        if (current.storyStep === 'listen') phase = 0
        if (current.storyStep === 'range') phase = motion.matches ? 1 : limit((now - current.flightAt) / 920, 0, 1)
        pulse.position.lerpVectors(unit.position, pulseTarget, phase)
        pulse.scale.setScalar(.77 + .39 * Math.sin(phase * Math.PI))
      }
      const button = skyButtons[i]
      if (visible) placeTag(button, unit.position.clone().add(vector(0, 1.05, 0)), camera, width, height, statusBounds)
      else button.hidden = true
    })
  }

  function loop(now) {
    if (webglLost) return
    const seconds = (now - started) / 1000
    const isFlying = mode === 'flight'
    const t = isFlying ? Math.min(1, (now - flightStarted) / 1450) : 0
    const showPhone = mode === 'opening' || (isFlying && t < .42)
    phone.group.visible = showPhone
    field.visible = !showPhone
    city.tick(motion.matches ? 0 : now / 1000, !showPhone)

    if (showPhone) {
      openCamera(seconds)
      phone.tick(seconds, motion.matches)
      if (isFlying) {
        const point = phone.group.localToWorld(phoneMark.clone())
        const zoom = ease(Math.min(t / .42, 1))
        const near = point.clone().addScaledVector(vector(0, 0, 1).applyQuaternion(phone.group.quaternion), .47)
        const oldTarget = camera.getWorldDirection(vector(0, 0, 0)).multiplyScalar(20).add(camera.position)
        camera.position.lerp(near, zoom)
        camera.lookAt(oldTarget.lerp(point, zoom))
        canvas.style.opacity = String(Math.max(.08, 1 - Math.max(0, zoom - .72) * 3.4))
      } else {
        placeTag(phoneEntry, phone.group.localToWorld(phoneMark.clone()), camera, width, height)
      }
    } else if (isFlying) {
      const lift = ease(limit((t - .42) / .58, 0, 1))
      camera.fov = width < 650 ? 48 : 42
      camera.updateProjectionMatrix()
      camera.position.lerpVectors(vector(8, 4, 18), labEye(), lift)
      camera.lookAt(vector(0, 1.5, 0).lerp(labTarget(), lift))
      canvas.style.opacity = String(Math.min(1, .2 + lift * 3.6))
      if (t >= 1) {
        mode = 'lab'
        controller.enabled = true
        canvas.style.opacity = '1'
        resetView()
      }
    } else {
      controller.update()
    }
    camera.updateMatrixWorld()
    if (!showPhone) drawField(now)
    else if (isFlying) Object.values(tags).forEach(tag => { tag.hidden = true })
    renderer.render(world, camera)
    frame = requestAnimationFrame(loop)
  }

  function nearestSample(event) {
    if (mode !== 'lab' || !current?.trail.length) return null
    const bounds = canvas.getBoundingClientRect()
    const x = event.clientX - bounds.left
    const y = event.clientY - bounds.top
    let nearest = null
    let min = 24
    for (const sample of current.trail) {
      const point = local(sample.offset).project(camera)
      if (point.z < -1 || point.z > 1) continue
      const distance = Math.hypot(x - (point.x * .5 + .5) * width, y - (.5 - point.y * .5) * height)
      if (distance < min) {
        min = distance
        nearest = sample
      }
    }
    return nearest
  }

  canvas.addEventListener('pointerdown', event => {
    pointerDown = { x: event.clientX, y: event.clientY, id: event.pointerId }
    canvas.style.cursor = 'grabbing'
  })
  canvas.addEventListener('pointerup', event => {
    if (pointerDown?.id === event.pointerId && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) < 6) {
      const sample = nearestSample(event)
      if (sample) onProbe(sample.clockUs)
    }
    pointerDown = null
    canvas.style.cursor = nearestSample(event) ? 'crosshair' : 'grab'
  })
  canvas.addEventListener('pointercancel', () => { pointerDown = null })
  canvas.addEventListener('pointermove', event => {
    if (!pointerDown) canvas.style.cursor = nearestSample(event) ? 'crosshair' : 'grab'
  })

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault()
    webglLost = true
    cancelAnimationFrame(frame)
    resizeObserver.disconnect()
    statusObserver.disconnect()
    controller.dispose()
    onLost()
  }, { once: true })
  resize()
  frame = requestAnimationFrame(loop)

  return {
    update,
    resetView,
    enter(animate = true) {
      controller.enabled = false
      if (motion.matches || !animate) {
        mode = 'lab'
        resetView()
        controller.enabled = true
      } else {
        mode = 'flight'
        flightStarted = performance.now()
      }
    },
    replay() {
      mode = 'opening'
      started = performance.now()
      controller.enabled = false
      canvas.style.opacity = '1'
    }
  }
}
