const mono = 'ui-monospace, SFMono-Regular, Consolas, monospace'
const green = '#addfb2'
const orange = '#ff9872'

function prepare(canvas) {
  const { width, height } = canvas.getBoundingClientRect()
  const ratio = window.devicePixelRatio || 1
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  return { ctx, width, height }
}

function path(ctx, coordinates) {
  ctx.beginPath()
  coordinates.forEach(([x, y], index) => index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))
}

function line(ctx, points, color, width = 1) {
  path(ctx, points)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.stroke()
}

function circle(ctx, x, y, radius, stroke, fill) {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
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

function label(ctx, text, x, y, color = '#abc4b0', size = 10, align = 'left') {
  ctx.font = `500 ${size}px ${mono}`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
}

export function drawSky(canvas, satellites, buttons, enabled) {
  const { ctx, width, height } = prepare(canvas)
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(cx, cy) - 19
  if (radius < 10) return

  for (const fraction of [1, 2 / 3, 1 / 3]) circle(ctx, cx, cy, radius * fraction, '#3a5949')
  line(ctx, [[cx - radius, cy], [cx + radius, cy]], '#355044')
  line(ctx, [[cx, cy - radius], [cx, cy + radius]], '#355044')
  label(ctx, 'N', cx, cy - radius - 9, '#dceac1', 11, 'center')
  label(ctx, 'S', cx, cy + radius + 10, undefined, 10, 'center')
  label(ctx, 'W', cx - radius - 9, cy, undefined, 10, 'center')
  label(ctx, 'E', cx + radius + 9, cy, undefined, 10, 'center')
  circle(ctx, cx, cy, 3, '#718f79')
  if (width > 235) label(ctx, 'ZENITH', cx + 9, cy + 12, '#92ab98', 9)

  const nodes = satellites.map(satellite => {
    const az = satellite.azimuth * Math.PI / 180
    const r = radius * (1 - satellite.elevation / 90)
    const ax = cx + Math.sin(az) * r
    const ay = cy - Math.cos(az) * r
    return { id: satellite.id, ax, ay, x: ax, y: ay }
  })

  // Keep labels clickable when the points crowd together. The small marks
  // underneath still show the exact sky positions.
  const separation = width < 190 ? 34 : 39
  for (let pass = 0; pass < 32; pass++) {
    nodes.forEach((a, i) => {
      nodes.slice(i + 1).forEach(b => {
        const dx = b.x - a.x
        const dy = b.y - a.y
        const distance = Math.hypot(dx, dy) || 1
        if (distance >= separation) return
        const correction = (separation - distance) / 2
        a.x -= correction * dx / distance
        a.y -= correction * dy / distance
        b.x += correction * dx / distance
        b.y += correction * dy / distance
      })
      a.x = Math.max(17, Math.min(width - 17, a.x))
      a.y = Math.max(17, Math.min(height - 17, a.y))
    })
  }

  nodes.forEach(node => {
    const active = enabled.has(node.id)
    if (Math.hypot(node.x - node.ax, node.y - node.ay) > 6) {
      line(ctx, [[node.ax, node.ay], [node.x, node.y]], active ? green : '#718f79')
      circle(ctx, node.ax, node.ay, 2.5, null, active ? green : '#718f79')
    }
    const button = buttons.get(node.id)
    button.style.left = node.x + 'px'
    button.style.top = node.y + 'px'
  })
}

function paintMap(ctx, width, height, project, halfEast, halfNorth, step) {
  ctx.fillStyle = '#243c32'
  ctx.fillRect(0, 0, width, height)
  // Draw an invented waterfront, parks and street blocks in local metres.
  const mapPath = points => points.map(([east, north]) => project(east, north))
  if (halfEast < 2800 && halfNorth < 2800) {
    for (let east = -Math.ceil(halfEast / 120) * 120; east <= halfEast; east += 120) {
      for (let north = -Math.ceil(halfNorth / 90) * 90; north <= halfNorth; north += 90) {
        const waterfront = 155 + .31 * north + 20 * Math.sin(north / 90)
        if (east + 105 > waterfront) continue
        const [x, y] = project(east + 7, north + 80)
        const [x2, y2] = project(east + 106, north + 9)
        ctx.fillStyle = (east / 120 + north / 90) % 3 === 0 ? '#334e3a' : '#2e493d'
        ctx.fillRect(x, y, x2 - x, y2 - y)
        ctx.strokeStyle = '#3a5549'
        ctx.strokeRect(x, y, x2 - x, y2 - y)
      }
    }
  }

  const shore = []
  const sample = Math.max(10, halfNorth / 80)
  for (let n = -halfNorth - sample; n <= halfNorth + 2 * sample; n += sample) {
    shore.push([155 + .31 * n + 20 * Math.sin(n / 90), n])
  }
  path(ctx, mapPath([...shore, [halfEast * 2 + 500, halfNorth + 2 * sample], [halfEast * 2 + 500, -halfNorth - sample]]))
  ctx.closePath()
  ctx.fillStyle = '#193a3d'
  ctx.fill()
  line(ctx, mapPath(shore), '#64887a', 1.2)

  for (let east = -Math.floor(halfEast / step) * step; east <= halfEast; east += step) {
    line(ctx, mapPath([[east, -halfNorth], [east, halfNorth]]), '#b9dbc01d')
  }
  for (let north = -Math.floor(halfNorth / step) * step; north <= halfNorth; north += step) {
    line(ctx, mapPath([[-halfEast, north], [halfEast, north]]), '#b9dbc01d')
  }
  const [x, y] = project(0, 0)
  line(ctx, [[x, 0], [x, height]], '#c1e5bf42')
  line(ctx, [[0, y], [width, y]], '#c1e5bf42')
}

export function drawGround(canvas, location, frameExtent) {
  const { ctx, width, height } = prepare(canvas)
  if (!width || !height) return
  const dx = location?.[0] ?? 0
  const dy = location?.[1] ?? 0
  const fit = frameExtent ?? [Math.abs(dx), Math.abs(dy)]
  const scale = Math.max(1.25, fit[0] / Math.max(15, width / 2 - 24), fit[1] / Math.max(15, height / 2 - 27))
  const step = [25, 50, 100, 200, 500, 1000, 2000, 5000, 10000].find(n => n / scale >= 29) ?? Math.ceil(scale * 35 / 10000) * 10000
  const project = (east, north) => [width / 2 + east / scale, height / 2 - north / scale]
  paintMap(ctx, width, height, project, width * scale / 2, height * scale / 2, step)

  const [cx, cy] = project(0, 0)
  const [x, y] = project(dx, dy)
  if (location && Math.hypot(cx - x, cy - y) > 14) {
    ctx.setLineDash([3, 4])
    line(ctx, [[cx, cy], [x, y]], orange, 1.5)
    ctx.setLineDash([])
  }
  circle(ctx, cx, cy, 15, '#addeb256')
  circle(ctx, cx, cy, 9, green, '#244439')
  line(ctx, [[cx - 4, cy], [cx + 4, cy]], green, 1.5)
  line(ctx, [[cx, cy - 4], [cx, cy + 4]], green, 1.5)
  if (location) {
    const marker = 5.8
    path(ctx, [[x, y - marker], [x + marker, y], [x, y + marker], [x - marker, y], [x, y - marker]])
    ctx.fillStyle = orange
    ctx.fill()
    ctx.strokeStyle = '#2b3328'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  label(ctx, 'N', width - 15, 14, '#e3edcb', 11, 'center')
  line(ctx, [[width - 19, 28], [width - 15, 22], [width - 11, 28]], '#e3edcb')
  line(ctx, [[width - 15, 22], [width - 15, 35]], '#e3edcb')
  const end = 12 + step / scale
  line(ctx, [[12, height - 27], [12, height - 23], [end, height - 23], [end, height - 27]], '#def0d4')
  label(ctx, step >= 1000 ? step / 1000 + ' km' : step + ' m', 12, height - 12, '#def0d4')
  if (width > 258) label(ctx, 'SCHEMATIC MAP', width - 12, height - 12, '#b8cbb9', 9, 'right')
}
