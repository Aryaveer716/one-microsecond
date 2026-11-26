const canvasWidth = 448
const canvasHeight = 880
const screenWidth = 3.37
const screenHeight = 6.77
const screenZ = 0.140
const destination = 'Gardens by the Bay'
const location = [153, 574]
const waterfront = [99, 626]
const bridge = [location, [159, 550], [174, 524], [196, 497], [212, 467], [225, 445],
  [249, 422], [263, 401], [275, 372], [312, 359]]
const route = [
  ...bridge, [341, 331]
]
const bridgePath = 'M136 591 ' + bridge.map(point => point.join(' ')).join(' ')
const routeLength = route.slice(1).reduce(
  (length, point, index) => length + Math.hypot(point[0] - route[index][0], point[1] - route[index][1]), 0
)
const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']
const chatExit = 1.74
const chatFade = 0.30
const typingStart = 1.98
const typingStep = 0.090
const typingEnd = typingStart + typingStep * destination.length
const keyboardEnd = typingEnd + 0.24
const routeStart = 3.58
const entryReadyAt = 4.25
const routeEnd = 4.64
const pulseEnd = 11

const limit = a => Math.max(0, Math.min(a, 1))
const ease = a => {
  const progress = limit(a)
  return progress * progress * (3 - 2 * progress)
}

function screenPosition(x, y, z = screenZ) {
  return [(x / canvasWidth - 0.5) * screenWidth, (0.5 - y / canvasHeight) * screenHeight, z]
}

function createCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  return canvas
}

function box(ctx, x, y, w, h, radius, fill, stroke) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

function circle(ctx, x, y, radius, fill, stroke) {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, 2 * Math.PI)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}

function trace(ctx, path, fill, stroke, width) {
  const line = new Path2D(path)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill(line)
  }
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = width
    ctx.stroke(line)
  }
}

function label(ctx, value, x, y, size, color, weight = 500, mono = false) {
  ctx.font = `${weight} ${size}px ${mono ? 'ui-monospace, monospace' : 'system-ui, sans-serif'}`
  ctx.fillStyle = color
  ctx.fillText(value, x, y)
}

function drawNightMap(ctx) {
  const water = ctx.createLinearGradient(0, 150, 448, 760)
  water.addColorStop(0, '#19284e')
  water.addColorStop(0.55, '#192544')
  water.addColorStop(1, '#101a35')
  ctx.fillStyle = water
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  const westernShore = 'M0 0H448V96L414 143 422 188C443 234 420 260 377 274L329 271 289 296 240 283 203 300 158 288 95 302 46 344 58 393 89 420 125 433 142 473 133 504 143 537 133 566 139 591 113 621 150 643 182 681 244 707 284 749 292 880H0Z'
  const easternShore = 'M448 286 409 284 373 293 337 280 310 299 291 325 286 352 271 375 282 397 299 406 299 447 334 466 373 482 394 517 396 545 376 574 335 599 332 628 356 652 389 654 416 683 448 691Z'
  trace(ctx, westernShore, '#282d43', '#495669', 2)
  trace(ctx, easternShore, '#29364b', '#536277', 2)

  ctx.save()
  ctx.clip(new Path2D(westernShore + easternShore))
  // Small blocks and the uneven waterfront give the map a different rhythm from a regular grid.
  for (let row = -1; row < 19; row++) {
    for (let column = -1; column < 13; column++) {
      const seed = Math.sin(row * 117.23 + column * 58.72) * 43218.32
      const noise = seed - Math.floor(seed)
      ctx.save()
      ctx.translate(column * 38 + row * 8, row * 42 + column * 7)
      ctx.rotate(0.18)
      ctx.fillStyle = noise > 0.76 ? '#394354' : noise > 0.36 ? '#31394d' : '#293348'
      ctx.fillRect(2 + 7 * noise, 2, 23 - noise * 5, 12 + noise * 11)
      if (noise > 0.36) ctx.fillRect(5, 18 + noise * 12, 15, 7 + noise * 3)
      ctx.restore()
    }
  }

  const roads = [
    'M-49 57 113 139 187 147 240 115 319 112 470 75',
    'M-28 133 107 186 162 209 237 198 310 161 442 170',
    'M-33 192 125 248 205 244 269 214 311 199 448 198',
    'M-16 249 78 287 125 284 179 267 240 263 295 248 412 246',
    'M8 723 99 651 119 599 110 556 118 510 100 469 73 457 32 414 20 373 38 326 78 287 107 186 109 155 130 72',
    'M-35 802 61 722 117 698 165 717 239 751 273 806 303 864',
    'M-39 588 40 565 110 556 156 546 168 522 196 497 212 467 225 445',
    'M-20 636 44 622 119 599 150 600 172 570 184 548',
    'M-20 689 44 668 99 651 138 658 184 680 234 698',
    'M-30 529 29 508 83 493 118 510 156 546',
    'M7 460 44 457 73 457 125 444 165 445',
    'M17 801 55 764 77 702 66 665 48 625 40 565 29 508 36 483',
    'M157 83 153 150 162 209 144 254 125 284 116 327',
    'M229 57 184 139 194 195 205 244 193 281 182 311',
    'M287 80 278 140 237 198 240 263 254 294',
    'M364 59 329 110 310 161 311 199 327 261 351 289',
    'M-23 862 72 840 148 799 194 793 271 824 342 869',
    'M447 315 419 348 375 390 346 409 326 443 349 462 389 472 453 454',
    'M463 384 419 421 393 464 414 504 461 531',
    'M467 575 415 554 385 572 343 609 335 649',
    'M422 681 415 638 430 593 415 554 416 522 389 472'
  ]
  ctx.lineJoin = 'round'
  for (const road of roads) trace(ctx, road, null, '#1b253c', 9)
  for (const road of roads) trace(ctx, road, null, '#465067', 4)

  const gardens = 'M286 344 313 315 352 298 380 303 373 337 348 363 316 371 293 393 281 385Z'
  trace(ctx, gardens, '#27474a', '#3a5b59', 2)
  trace(ctx, 'M338 581 377 567 397 539 411 547 402 574 381 602 350 622 333 615Z', '#274044', '#3a5556', 2)
  trace(ctx, 'M36 315 61 299 90 304 93 334 67 354 61 385 42 373 32 351Z', '#2b424a', '#38525a', 2)
  trace(ctx, 'M297 380 307 349 333 320 353 313M308 364 334 358 352 342 360 318M313 347 339 343 366 325', null, '#638074', 1.5)
  for (const [x, y, r] of [[314, 340, 5], [339, 324, 7], [352, 341, 6], [327, 347, 6], [337, 351, 4]]) {
    circle(ctx, x, y, r, '#416660', '#86a191')
  }
  ctx.restore()

  const contour = [
    'M34 393C42 441 112 447 118 484',
    'M167 320C207 320 229 303 270 311L296 322',
    'M193 612C210 586 190 556 237 529L243 491',
    'M208 639C234 623 266 633 285 605S302 579 334 566 375 537 361 507',
    'M223 658C256 649 287 658 315 638',
    'M236 679C275 675 286 684 315 670',
    'M265 704C307 702 348 706 370 720',
    'M304 774C342 777 366 799 409 802'
  ]
  for (const line of contour) trace(ctx, line, null, '#334668', 1.25)
  trace(ctx, bridgePath, null, '#121e37', 13)
  trace(ctx, bridgePath, null, '#72839f', 7)

  label(ctx, 'DOWNTOWN', 31, 395, 14, '#c0c9dc', 660, true)
  label(ctx, 'BAYFRONT', 240, 278, 13, '#9daec6', 620, true)
  label(ctx, 'MARINA BAY', 245, 510, 14, '#95b0d4', 530, true)
  label(ctx, 'PROMENADE', 31, 665, 12, '#a4afc7', 560, true)
  ctx.lineWidth = 1.5
  ctx.strokeStyle = '#96abc7'
  ctx.beginPath()
  ctx.moveTo(34, 704)
  ctx.lineTo(88, 704)
  ctx.moveTo(34, 699)
  ctx.lineTo(34, 704)
  ctx.moveTo(88, 699)
  ctx.lineTo(88, 704)
  ctx.stroke()
  label(ctx, '100 m', 34, 694, 12, '#bdc8d9', 520, true)
}

function drawStatus(ctx) {
  label(ctx, '9:41', 36, 47, 22, '#f1f5ff', 660)
  for (let i = 0; i < 4; i++) box(ctx, 348 + i * 6, 47 - (6 + i * 3), 4, 6 + i * 3, 1, '#e0eaff')

  trace(ctx, 'M378 39Q386 32 394 39M381 42Q386 37 391 42M384 45Q386 43 388 45', null, '#e0eaff', 1.8)
  box(ctx, 400, 34, 24, 13, 3, null, '#c9d4ed')
  box(ctx, 403, 37, 17, 7, 1, '#e0eaff')
  box(ctx, 425, 38, 2, 5, 1, '#c9d4ed')
}

function drawChat(ctx, time, opacity) {
  ctx.save()
  ctx.globalAlpha = opacity
  const background = ctx.createLinearGradient(0, 0, 430, 880)
  background.addColorStop(0, '#15233a')
  background.addColorStop(0.55, '#111b31')
  background.addColorStop(1, '#0d1526')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  drawStatus(ctx)

  circle(ctx, 60, 127, 28, '#eac4a0')
  label(ctx, 'M', 47, 137, 27, '#2b2234', 750)
  label(ctx, 'Maya', 101, 138, 39, '#f4f7ff', 690)
  trace(ctx, 'M28 179H420', null, '#394964', 1.5)

  box(ctx, 27, 217, 324, 119, [22, 22, 22, 5], '#283c5b', '#4c6590')
  label(ctx, 'I’m under the', 47, 264, 33, '#eef5ff', 610)
  label(ctx, 'Supertrees.', 47, 304, 33, '#eef5ff', 610)
  box(ctx, 27, 350, 375, 71, [22, 22, 22, 5], '#283c5b', '#4c6590')
  label(ctx, 'Are you on the bridge?', 47, 396, 31, '#eef5ff', 610)

  const reply = ease((time - .43) / .20)
  if (reply > 0) {
    ctx.globalAlpha = opacity * reply
    box(ctx, 110, 452, 311, 70, [22, 22, 5, 22], '#a9c9fa')
    label(ctx, 'Still by the water.', 130, 497, 30, '#182f53', 670)
  }

  ctx.globalAlpha = opacity
  box(ctx, 26, 670, 396, 119, 19, '#1d2a43', '#4e688d')
  box(ctx, 43, 693, 70, 70, 14, '#314968')
  trace(ctx, 'M60 743 87 712 95 731 80 733 76 749Z', '#bee0ff')
  label(ctx, 'WALKING ROUTE', 129, 725, 17, '#a9bdda', 640, true)
  label(ctx, destination, 129, 751, 24, '#f0f5ff', 650)
  box(ctx, 173, 852, 102, 5, 2.5, '#d9e4f9')
  ctx.restore()
}

function drawMayaQuestion(ctx) {
  box(ctx, 25, 178, 398, 66, 15, '#202e47', '#536c90')
  circle(ctx, 59, 211, 17, '#eac4a0')
  label(ctx, 'M', 51, 218, 18, '#2b2234', 750)
  label(ctx, 'Maya', 87, 205, 15, '#dbc6ac', 700)
  label(ctx, 'Are you on the bridge?', 87, 228, 23, '#edf4ff', 640)
}

function drawSearch(ctx, text, isTyping, isReady, time) {
  const top = ctx.createLinearGradient(0, 0, 0, 196)
  top.addColorStop(0, 'rgba(10, 16, 31, .96)')
  top.addColorStop(0.7, 'rgba(15, 22, 42, .92)')
  top.addColorStop(1, 'rgba(15, 22, 42, 0)')
  ctx.fillStyle = top
  ctx.fillRect(0, 0, canvasWidth, 196)
  drawStatus(ctx)

  label(ctx, 'ROUTE PLANNER', 27, 88, 14, '#9aaccd', 650, true)
  box(ctx, 23, 105, 402, 55, 16, '#202940', isTyping ? '#789bcc' : '#495773')
  circle(ctx, 50, 131, 8, null, '#a6bee3')
  trace(ctx, 'M56 137 62 143', null, '#a6bee3', 1.5)
  const prompt = text || (isTyping ? '' : 'Search for a place')
  label(ctx, prompt, 75, 141, 24, text ? '#f7f9ff' : '#b0bbd1', 630)
  if (isTyping && Math.floor(time * 5) % 2 === 0) {
    const x = 77 + ctx.measureText(prompt).width
    ctx.fillStyle = '#a8cbff'
    ctx.fillRect(x, 119, 2, 25)
  }
  if (isReady) {
    circle(ctx, 396, 131, 13, '#385d7a')
    trace(ctx, 'M390 131 394 135 402 126', null, '#d6f3ff', 2)
  } else {
    trace(ctx, 'M389 131H401M396 126 401 131 396 136', null, '#a6bee3', 1.7)
  }
}

function drawRoute(ctx, progress, time, reducedMotion) {
  const [x, y] = location
  ctx.save()
  if (progress > 0) {
    ctx.beginPath()
    ctx.moveTo(x, y)
    let remaining = progress * routeLength
    for (let index = 1; index < route.length; index++) {
      const [fromX, fromY] = route[index - 1]
      const [toX, toY] = route[index]
      const length = Math.hypot(toX - fromX, toY - fromY)
      const fraction = Math.min(remaining / length, 1)
      ctx.lineTo(fromX + (toX - fromX) * fraction, fromY + (toY - fromY) * fraction)
      remaining -= length
      if (remaining <= 0) break
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 19
    ctx.strokeStyle = '#142544'
    ctx.stroke()
    ctx.lineWidth = 12
    ctx.strokeStyle = '#497fdd'
    ctx.stroke()
    ctx.lineWidth = 5
    ctx.strokeStyle = '#b0e6ff'
    ctx.stroke()
  }

  const [endX, endY] = route.at(-1)
  if (progress === 1) {
    box(ctx, endX - 121, endY - 59, 165, 34, 9, '#18283d', '#657c93')
    label(ctx, 'Gardens by the Bay', endX - 109, endY - 37, 16, '#ebf5ff', 620)
    trace(ctx, `M${endX} ${endY + 4}q-13 -12 -13 -22a13 13 0 0 1 26 0q0 10 -13 22Z`, '#e9f9ff', '#101b31', 2)
    circle(ctx, endX, endY - 18, 4.7, '#4a77b9')
  }
  if (time >= entryReadyAt) drawDiscrepancy(ctx)
  const pulse = ((time - entryReadyAt) / 1.4) % 1
  ctx.lineWidth = 1.5
  if (!reducedMotion && time >= entryReadyAt && time < pulseEnd) {
    circle(ctx, x, y, 19 + pulse * 34, `rgba(103, 169, 255, ${(1 - pulse) * 0.21})`, `rgba(156, 204, 255, ${(1 - pulse) * 0.64})`)
  }
  circle(ctx, x, y, 22, 'rgba(99, 168, 255, .21)', 'rgba(154, 201, 255, .42)')
  ctx.lineWidth = 2.35
  circle(ctx, x, y, 13, '#507fff', '#eff9ff')
  circle(ctx, x, y, 4, '#a5d5ff')
  ctx.restore()
}

function drawDiscrepancy(ctx) {
  const [x, y] = location
  const [groundX, groundY] = waterfront
  ctx.setLineDash([3, 5])
  trace(ctx, `M${groundX} ${groundY} ${x} ${y}`, null, '#a6d7d9', 2)
  ctx.setLineDash([])
  circle(ctx, groundX, groundY, 12, '#243c46', '#acf3d9')
  circle(ctx, groundX, groundY, 4.5, '#bcffe5')
  trace(ctx, `M${x + 19} ${y}h19`, null, '#75aaff', 1.5)
  box(ctx, x + 38, y - 17, 152, 34, 7, '#182b4c', '#5d8cd3')
  label(ctx, 'GPS · BRIDGE', x + 50, y + 6, 17, '#c2deff', 720, true)
  box(ctx, groundX + 18, groundY - 17, 207, 34, 7, '#192f3e', '#628b91')
  label(ctx, 'YOU · WATERFRONT', groundX + 29, groundY + 6, 17, '#c5f4e7', 720, true)
}

function drawTrip(ctx, time, progress) {
  const fade = ctx.createLinearGradient(0, 710, 0, 880)
  fade.addColorStop(0, 'rgba(12, 20, 38, 0)')
  fade.addColorStop(1, '#0a1023')
  ctx.fillStyle = fade
  ctx.fillRect(0, 710, canvasWidth, 170)
  const canInspect = time >= entryReadyAt
  box(ctx, 23, 732, 402, 96, 20, canInspect ? '#24385d' : '#171f36', canInspect ? '#8cb4f2' : '#4b5e7c')
  if (canInspect) {
    label(ctx, 'Your location looks off.', 43, 772, 27, '#f1f6ff', 700)
    label(ctx, 'Inspect the blue dot', 43, 803, 23, '#b6d6ff', 650)
    trace(ctx, 'M363 781h26m-10 -10 10 10 -10 10', null, '#c9e5ff', 3)
  } else if (progress > 0) {
    label(ctx, 'Finding route…', 44, 777, 26, '#edf5ff', 690)
    label(ctx, 'WALKING DIRECTIONS', 44, 803, 13, '#aabcda', 570, true)
    circle(ctx, 382, 781, 23, '#344462')
    trace(ctx, 'M369 781 390 770 387 792 381 782Z', '#a6bbd8')
  } else {
    label(ctx, 'Marina Bay', 44, 777, 25, '#edf5ff', 690)
    label(ctx, 'SINGAPORE', 44, 803, 13, '#aabcda', 570, true)
  }
  box(ctx, 173, 852, 102, 5, 2.5, '#d9e4f9')
}

function keyCenter(key) {
  if (key === ' ') return [204, 803]
  for (const [rowIndex, row] of rows.entries()) {
    const index = row.indexOf(key.toUpperCase())
    if (index !== -1) return [224 - (row.length - 1) * 20.5 + index * 41, 647 + 49 * rowIndex]
  }
  return [370, 803]
}

function drawKeyboard(ctx, key, opacity) {
  ctx.save()
  ctx.globalAlpha = opacity
  box(ctx, 9, 610, 430, 239, 23, '#151d31', '#41506a')
  ctx.textAlign = 'center'
  for (const char of rows.join('')) {
    const [x, y] = keyCenter(char)
    const active = key?.toUpperCase() === char
    box(ctx, x - 18, y - 19, 36, 39, 7, active ? '#a6ccff' : '#2b3650')
    label(ctx, char, x, y + 7, 17, active ? '#12294c' : '#dce7fe', 650)
  }
  box(ctx, 34, 783, 57, 40, 8, '#273147')
  label(ctx, '123', 62, 809, 15, '#c6d5ed', 600)
  box(ctx, 98, 783, 211, 40, 8, key === ' ' ? '#a6ccff' : '#2b3650')
  label(ctx, 'space', 204, 809, 16, key === ' ' ? '#12294c' : '#dce7fe', 550)
  box(ctx, 316, 783, 98, 40, 8, '#8cb6ee')
  label(ctx, 'Route', 365, 809, 17, '#15294b', 700)
  ctx.restore()
}

function makeRoundedShape(THREE, width, height, radius) {
  const shape = new THREE.Shape()
  const x = width / 2
  const y = height / 2
  shape.moveTo(-x + radius, -y)
  shape.lineTo(x - radius, -y)
  shape.quadraticCurveTo(x, -y, x, -y + radius)
  shape.lineTo(x, y - radius)
  shape.quadraticCurveTo(x, y, x - radius, y)
  shape.lineTo(-x + radius, y)
  shape.quadraticCurveTo(-x, y, -x, y - radius)
  shape.lineTo(-x, -y + radius)
  shape.quadraticCurveTo(-x, -y, -x + radius, -y)
  return shape
}

function roundedSolid(THREE, width, height, depth, radius, bevel) {
  const shape = makeRoundedShape(THREE, width - 2 * bevel, height - 2 * bevel, radius - bevel)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth - 2 * bevel,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments: 12,
    steps: 1
  })
  geometry.translate(0, 0, -depth / 2 + bevel)
  return geometry
}

function roundedScreen(THREE, width, height, radius) {
  const geometry = new THREE.ShapeGeometry(makeRoundedShape(THREE, width, height, radius), 16)
  const { position, uv } = geometry.attributes
  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, position.getX(i) / width + 0.5, position.getY(i) / height + 0.5)
  }
  return geometry
}

function createTypingHand(THREE, group) {
  const hand = new THREE.Group()
  group.add(hand)
  const skin = new THREE.MeshStandardMaterial({ color: 0x967476, roughness: 0.77, metalness: 0.04 })
  const nail = new THREE.MeshStandardMaterial({ color: 0xc99a94, roughness: 0.57 })
  const sphere = new THREE.SphereGeometry(1, 20, 16)
  const palm = new THREE.Mesh(sphere, skin)
  const indexBase = new THREE.Mesh(sphere, skin)
  const indexTip = new THREE.Mesh(sphere, skin)
  const thumb = new THREE.Mesh(sphere, skin)
  const fingernail = new THREE.Mesh(sphere, nail)
  hand.add(palm, indexBase, indexTip, thumb, fingernail)
  const up = new THREE.Vector3(0, 1, 0)
  const axis = new THREE.Vector3()

  function joint(mesh, start, end, width, depth) {
    mesh.position.copy(start).lerp(end, 0.5)
    axis.copy(end).sub(start)
    mesh.scale.set(width, axis.length() * 0.5 + width * 0.75, depth)
    mesh.quaternion.setFromUnitVectors(up, axis.normalize())
  }

  const tip = new THREE.Vector3()
  const knuckle = new THREE.Vector3()
  const base = new THREE.Vector3()
  const wrist = new THREE.Vector3()
  const thumbEnd = new THREE.Vector3()

  function pose(time, keyIndex, reducedMotion) {
    const visibility = ease((time - typingStart + .18) / .23) * (1 - ease((time - typingEnd + .10) / .32))
    hand.visible = !reducedMotion && visibility > 0
    if (!hand.visible) return

    const from = keyCenter(destination[Math.max(0, keyIndex - 1)] || ' ')
    const to = keyCenter(destination[keyIndex] ?? 'Route')
    const phase = limit((time - typingStart) / typingStep - keyIndex)
    const move = ease(phase * 2.1)
    const tap = Math.sin(Math.PI * phase) ** 2
    const px = from[0] + (to[0] - from[0]) * move
    const py = from[1] + (to[1] - from[1]) * move
    tip.set(...screenPosition(px, py, 0.34 - 0.10 * tap))
    tip.x += (1 - visibility) * 2
    tip.y -= (1 - visibility) * 1.1
    knuckle.set(tip.x + 0.48, tip.y - 0.45, 0.54)
    base.set(1.18 + tip.x * 0.42, -3.18 + (tip.y + 2.3) * 0.35, 0.54)
    wrist.set(base.x + 0.69, base.y - 0.56, 0.18)
    thumbEnd.set(base.x + 0.15, base.y + 0.4, 0.30)

    joint(palm, wrist, base, 0.35, 0.22)
    joint(indexBase, base, knuckle, 0.165, 0.137)
    joint(indexTip, knuckle, tip, 0.132, 0.106)
    joint(thumb, wrist, thumbEnd, 0.137, 0.117)
    fingernail.position.copy(tip).lerp(knuckle, 0.13)
    fingernail.position.z += 0.08
    fingernail.quaternion.copy(indexTip.quaternion)
    fingernail.scale.set(0.085, 0.122, 0.025)
  }
  return pose
}

export function createPhone(THREE) {
  const group = new THREE.Group()
  group.name = 'Navigation phone'
  const chassis = new THREE.MeshStandardMaterial({
    color: 0x526584, roughness: 0.38, metalness: 0.64, emissive: 0x141b2c, emissiveIntensity: 0.42
  })
  const back = new THREE.MeshStandardMaterial({
    color: 0x24354a, roughness: 0.47, metalness: 0.42, emissive: 0x111723, emissiveIntensity: 0.33
  })
  const bezel = new THREE.MeshStandardMaterial({
    color: 0x141c29, roughness: 0.33, metalness: 0.44, emissive: 0x111723, emissiveIntensity: 0.22
  })
  const polished = new THREE.MeshStandardMaterial({
    color: 0x8496ac, roughness: 0.30, metalness: 0.64, emissive: 0x283247, emissiveIntensity: 0.38
  })
  function addSolid(width, height, depth, radius, bevel, material, x, y, z) {
    const mesh = new THREE.Mesh(roundedSolid(THREE, width, height, depth, radius, bevel), material)
    mesh.position.set(x, y, z)
    group.add(mesh)
    return mesh
  }

  addSolid(3.60, 7.00, 0.218, 0.48, 0.036, chassis, 0, 0, -0.01)
  addSolid(3.52, 6.92, 0.035, 0.458, 0.012, back, 0, 0, -0.113)
  addSolid(3.56, 6.96, 0.021, 0.47, 0.007, polished, 0, 0, 0.104)
  addSolid(3.49, 6.89, 0.038, 0.43, 0.012, bezel, 0, 0, 0.119)

  addSolid(0.052, 0.88, 0.100, 0.023, 0.005, polished, 1.806, 1.14, -0.006)
  addSolid(0.045, 0.49, 0.091, 0.020, 0.005, polished, -1.806, 1.45, -0.009)
  addSolid(0.045, 0.49, 0.091, 0.020, 0.005, polished, -1.806, 0.82, -0.009)
  addSolid(0.037, 0.26, 0.086, 0.016, 0.004, chassis, -1.801, 2.07, -0.009)
  const port = addSolid(0.46, 0.084, 0.020, 0.032, 0.006, bezel, 0, -3.505, -0.013)
  port.rotation.x = Math.PI / 2

  const map = createCanvas()
  drawNightMap(map.getContext('2d'))
  const canvas = createCanvas()
  const ctx = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  const screen = new THREE.Mesh(
    roundedScreen(THREE, screenWidth, screenHeight, 0.371),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
  )
  screen.position.z = screenZ
  group.add(screen)

  const cutout = new THREE.MeshBasicMaterial({ color: 0x080e19, toneMapped: false })
  addSolid(0.70, 0.195, 0.018, 0.096, 0.006, cutout, 0, 3.10, screenZ + 0.008)
  const cameraLens = new THREE.Mesh(
    new THREE.CircleGeometry(0.038, 24),
    new THREE.MeshBasicMaterial({ color: 0x405578, toneMapped: false })
  )
  cameraLens.position.set(0.224, 3.10, screenZ + 0.019)
  group.add(cameraLens)
  const cameraGlass = new THREE.Mesh(
    new THREE.CircleGeometry(0.018, 16),
    new THREE.MeshBasicMaterial({ color: 0x121d35, toneMapped: false })
  )
  cameraGlass.position.set(0.228, 3.105, screenZ + 0.020)
  group.add(cameraGlass)

  const poseHand = createTypingHand(THREE, group)
  let previousFrame = -1
  let previousReducedMotion

  function tick(seconds, reducedMotion = false) {
    const time = reducedMotion ? pulseEnd : Math.min(Math.max(seconds, 0), pulseEnd)
    const keyIndex = Math.max(0, Math.floor((time - typingStart) / typingStep))
    poseHand(time, keyIndex, reducedMotion)
    const frame = Math.floor(time * 20)
    if (frame === previousFrame && reducedMotion === previousReducedMotion) return
    previousFrame = frame
    previousReducedMotion = reducedMotion
    const typing = time >= typingStart - 0.17 && time < typingEnd
    const count = Math.floor((time - typingStart) / typingStep + .52)
    const query = destination.slice(0, Math.max(0, count))
    const progress = ease((time - routeStart) / (routeEnd - routeStart))
    if (time >= chatExit) {
      ctx.drawImage(map, 0, 0)
      drawRoute(ctx, progress, time, reducedMotion)
      drawSearch(ctx, query, typing, progress === 1, time)
      drawMayaQuestion(ctx)
      drawTrip(ctx, time, progress)
      const keyboard = ease((time - chatExit) / .24) * (1 - ease((time - typingEnd) / (keyboardEnd - typingEnd)))
      if (keyboard > 0) drawKeyboard(ctx, count > 0 ? destination[count - 1] : null, keyboard)
    }
    const chatOpacity = 1 - ease((time - chatExit) / chatFade)
    if (chatOpacity > 0) drawChat(ctx, time, chatOpacity)
    texture.needsUpdate = true
  }

  tick(0)
  return { group, tick, screenPoint: screenPosition(...location, screenZ + 0.002), entryReadyAt }
}
