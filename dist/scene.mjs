import * as THREE from 'three'
import { OrbitControls } from './vendor/OrbitControls.js'
import { createCity } from './city.mjs'
import { createPhone } from './phone.mjs'

const colors = [0x82b8ff, 0xb6a4ff, 0x8de2ce, 0xffca9f, 0xa8d89a, 0xffa4c7]
const groundHeight = 0.45
const TAU = Math.PI * 2
const trailColors = [0xffcb8d, 0x77e9d4]
const storyViews = {
  listen: { eye: [9, 12, 25], aim: [-11.1, 6.4, -4.35], fov: 41, duration: 1000 },
  range: { eye: [23, 12, 24], aim: [-16, 6.75, -1.7], fov: 39, duration: 710 },
  clock: { eye: [28, 18, 38], aim: [1.8, 6, -4.4], fov: 43, duration: 1080 },
  fix: { eye: [29, 21, 41], aim: [0, 6, -4], fov: 42, duration: 870 },
  trail: { eye: [13, 34, 23], aim: [1.25, 1.9, -1.1], fov: 41, duration: 1180 },
  arrival: { eye: [23, 12.4, 13.7], aim: [6.5, 2.9, -5.1], fov: 41, duration: 1360 }
}
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
  actual.name = 'Actual receiver'
  actual.position.copy(local([0, 0, 0]))
  for (const [radius, opacity] of [[.94, .96], [1.52, .32]]) {
    const ring = halo(radius, 0x9df2d1, opacity)
    ring.material.depthTest = false
    ring.renderOrder = 10
    actual.add(ring)
  }
  const trueCenter = new THREE.Mesh(
    new THREE.SphereGeometry(.24, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xbcffe5, fog: false, depthTest: false, depthWrite: false })
  )
  trueCenter.position.y = .10
  trueCenter.renderOrder = 11
  actual.add(trueCenter)
  const estimate = new THREE.Group()
  estimate.name = 'GPS estimate'
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
  probe.name = 'Selected candidate'
  probe.renderOrder = 13
  const bookmarks = trailColors.map((color, i) => {
    const saved = new THREE.Group()
    saved.name = i === 0 ? 'Saved candidate A' : 'Saved candidate B'
    const shape = i === 0 ? new THREE.OctahedronGeometry(.41) : new THREE.BoxGeometry(.54, .54, .54)
    const material = new THREE.MeshBasicMaterial({ color, depthTest: false, fog: false })
    const pin = new THREE.Mesh(shape, material)
    pin.rotation.y = Math.PI / 4
    pin.position.y = .65
    pin.renderOrder = 15
    const stem = line([vector(0, 0, 0), vector(0, .67, 0)], color, .88, false)
    stem.renderOrder = 14
    saved.add(pin, stem)
    return saved
  })
  const delta = line([vector(0, 0, 0), vector(0, 0, 0)], 0xffbd9a, .75, false)
  delta.frustumCulled = false
  field.add(actual, estimate, delta, probe, ...bookmarks)
  return { actual, estimate, delta, probe, bookmarks }
}

function arrivalWaypoint([x, z]) {
  const group = new THREE.Group()
  group.name = 'Garden waypoint'
  group.position.set(x, .148, z)
  const ring = halo(.76, 0xb2f4c5, .72)
  const point = new THREE.Mesh(new THREE.OctahedronGeometry(.28),
    new THREE.MeshBasicMaterial({ color: 0xc9ffd9 }))
  point.position.y = .81
  const stem = line([vector(0, .015, 0), vector(0, .83, 0)], 0xb2f4c5, .82)
  group.add(ring, point, stem)
  return group
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
  const waypoint = arrivalWaypoint(city.arrivalRoute.at(-1))
  const route = new THREE.Mesh(new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({ color: 0xa2f8c5, transparent: true, opacity: .9, depthWrite: false }))
  route.name = 'Garden route from estimate'
  route.visible = false
  waypoint.visible = false
  field.add(route, waypoint)
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
  let shot = null
  let guidedFraming = true
  let routeStart = null
  let routeAt = 0
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

  function viewFor(step) {
    const preset = storyViews[step]
    if (!preset) {
      const compact = width < 650
      return {
        eye: compact ? vector(31, 25, 43) : vector(27, 18, 37),
        aim: vector(0, compact ? 6 : 5.5, -4),
        fov: compact ? 48 : 42,
        duration: 820
      }
    }
    const compact = limit((1.57 - camera.aspect) * 14, 0, 9)
    const aim = vector(...preset.aim)
    if (step === 'trail') aim.x -= compact * .12
    return { eye: vector(...preset.eye), aim, fov: preset.fov + compact, duration: preset.duration }
  }

  function setView({ eye, aim, fov }) {
    camera.position.copy(eye)
    controller.target.copy(aim)
    camera.lookAt(aim)
    camera.fov = fov
    camera.updateProjectionMatrix()
  }

  function resize() {
    const bounds = visual.getBoundingClientRect()
    width = Math.max(1, bounds.width)
    height = Math.max(1, bounds.height)
    camera.aspect = width / height
    renderer.setSize(width, height, false)
    if (mode === 'lab' && guidedFraming) {
      if (shot) shot.to = viewFor(current?.storyStep)
      else setView(viewFor(current?.storyStep))
    }
    camera.updateProjectionMatrix()
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(visual)

  function resetView() {
    shot = null
    guidedFraming = true
    setView(viewFor(current?.storyStep))
  }

  function playShot(step) {
    if (motion.matches) {
      resetView()
      return
    }
    guidedFraming = true
    shot = {
      at: performance.now(),
      step,
      from: { eye: camera.position.clone(), aim: controller.target.clone(), fov: camera.fov },
      to: viewFor(step)
    }
  }

  function moveCamera(now) {
    if (!shot) {
      controller.update()
      return
    }
    const { at, from, to, step } = shot
    const elapsed = motion.matches ? 1 : limit((now - at) / to.duration, 0, 1)
    if (elapsed === 1) {
      setView(to)
      shot = null
      return
    }
    const t = ease(elapsed)
    camera.position.lerpVectors(from.eye, to.eye, t)
    if (step === 'arrival') camera.position.x += Math.sin(t * Math.PI) * 3.1
    controller.target.lerpVectors(from.aim, to.aim, t)
    camera.lookAt(controller.target)
    camera.fov = THREE.MathUtils.lerp(from.fov, to.fov, t)
    camera.updateProjectionMatrix()
  }

  controller.addEventListener('start', () => {
    shot = null
    guidedFraming = false
  })

  function openCamera(seconds) {
    const mobile = width < 620
    camera.fov = 42
    camera.position.set(19 + Math.min(seconds, 6) * .45, 7.2, 38)
    camera.lookAt(0, 4.0, -15)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    const distance = mobile ? 16.8 : 12.9
    const half = Math.tan(camera.fov * Math.PI / 360) * distance
    const right = vector(1, 0, 0).applyQuaternion(camera.quaternion)
    const up = vector(0, 1, 0).applyQuaternion(camera.quaternion)
    phone.group.position.copy(camera.position)
      .addScaledVector(camera.getWorldDirection(vector(0, 0, 0)), distance)
      .addScaledVector(right, half * camera.aspect * (mobile ? .24 : .46))
      .addScaledVector(up, half * (mobile ? -.41 : -.025))
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

  function trailPoint(offset) {
    const point = local(offset)
    if (ribbon) point.sub(ribbonOrigin).multiply(ribbon.scale).add(ribbon.position)
    return point
  }

  function updateArrival(data) {
    if (data.storyStep !== 'arrival' || !data.position) {
      route.visible = false
      waypoint.visible = false
      routeStart = null
      return
    }
    const start = local(data.position, true)
    start.y = .18
    if (routeStart?.equals(start)) return
    routeStart = start
    routeAt = performance.now()
    const points = [start, ...city.arrivalRoute.map(([x, z]) => vector(x, .18, z))]
    const curve = new THREE.CatmullRomCurve3(points)
    route.geometry.dispose()
    route.geometry = new THREE.TubeGeometry(curve, 60, .075, 6, false)
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
    const previousStep = current?.storyStep ?? null
    current = data
    if (mode === 'lab' && (data.storyStep ?? null) !== previousStep) playShot(data.storyStep)
    marker.actual.position.copy(local(data.actualOffset ?? [0, 0, 0]))
    updateArrival(data)
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
    const elapsed = motion.matches ? 1 : limit((now - ribbonChange) / 660, 0, 1)
    if (ribbon && ribbonClosing) {
      ribbon.scale.setScalar(Math.max(.0001, 1 - ease(elapsed)))
      ribbon.position.lerpVectors(ribbonOrigin, local(current.position), ease(elapsed))
      if (elapsed === 1) removeRibbon()
    } else if (ribbon) {
      ribbon.scale.setScalar(.06 + .94 * ease(elapsed))
    }
    if (marker.probe.visible) marker.probe.position.copy(trailPoint(current.sample.offset))
    marker.bookmarks.forEach((saved, index) => {
      const bookmark = current.bookmarks?.[index]
      saved.visible = hasTrail && !!bookmark
      if (saved.visible) saved.position.copy(trailPoint(bookmark.offset))
    })

    if (routeStart) {
      // The path is illustrative scenery, beginning at the solved position.
      const progress = motion.matches ? 1 : limit((now - routeAt - 240) / 980, 0, 1)
      route.visible = progress > 0
      route.geometry.setDrawRange(0, 36 * Math.ceil(60 * ease(progress)))
      waypoint.visible = progress >= .85
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
      const arrival = current.storyStep === 'arrival'
      const showInactive = !singleSignal && current.storyStep !== 'trail'
      const visible = !arrival && (active || (showInactive && i < 4))
      const [east, north, up] = satellite.position
      const length = Math.hypot(east, north, up)
      const position = vector(23 * east / length, 5.8 + 15 * up / length, -19 * north / length)
      unit.position.copy(position)
      unit.position.y += motion.matches ? 0 : .16 * Math.sin(seconds * .86 + i)
      unit.scale.setScalar(current.storyStep === 'listen' ? 1.75 : current.storyStep === 'range' ? 1.9 : 1)
      unit.visible = visible
      beam.visible = active && !arrival && current.storyStep !== 'listen'
      pulse.visible = active && !arrival
      if (pulse.visible) {
        beam.material.opacity = current.storyStep === 'trail' ? .28 : .55
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
      phone.tick(seconds, motion.matches || (isFlying && seconds < (phone.entryReadyAt ?? 0)))
      if (isFlying) {
        const point = phone.group.localToWorld(phoneMark.clone())
        const zoom = ease(Math.min(t / .42, 1))
        const near = point.clone().addScaledVector(vector(0, 0, 1).applyQuaternion(phone.group.quaternion), .47)
        const oldTarget = camera.getWorldDirection(vector(0, 0, 0)).multiplyScalar(20).add(camera.position)
        camera.position.lerp(near, zoom)
        camera.lookAt(oldTarget.lerp(point, zoom))
        canvas.style.opacity = String(Math.max(.08, 1 - Math.max(0, zoom - .72) * 3.4))
      } else if (motion.matches || seconds >= (phone.entryReadyAt ?? 0)) {
        placeTag(phoneEntry, phone.group.localToWorld(phoneMark.clone()), camera, width, height)
      } else {
        phoneEntry.hidden = true
      }
    } else if (isFlying) {
      const lift = ease(limit((t - .42) / .58, 0, 1))
      const view = viewFor(current?.storyStep)
      camera.fov = view.fov
      camera.updateProjectionMatrix()
      camera.position.lerpVectors(vector(8, 4, 18), view.eye, lift)
      camera.lookAt(vector(0, 1.5, 0).lerp(view.aim, lift))
      canvas.style.opacity = String(Math.min(1, .2 + lift * 3.6))
      if (t >= 1) {
        mode = 'lab'
        controller.enabled = true
        canvas.style.opacity = '1'
        resetView()
      }
    } else {
      moveCamera(now)
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
      const point = trailPoint(sample.offset).project(camera)
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
      shot = null
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
      shot = null
      controller.enabled = false
      canvas.style.opacity = '1'
    }
  }
}
