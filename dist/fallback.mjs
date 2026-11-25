// An interactive projection of the same readings for browsers without WebGL.
export function createFallback(canvas) {
  const ctx = canvas.getContext('2d')
  let mode = 'opening'
  let data = null
  const palette = ['#98bafd', '#c3b4ff', '#a2ead8', '#ffca9f', '#bce4a6', '#ffb0cc']

  function stroke(points, color, width = 1) {
    ctx.beginPath()
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.stroke()
  }

  function dot([x, y], radius, color) {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }

  function text(str, [x, y], fill = '#eaf4ff', size = 12) {
    ctx.font = `600 ${size}px system-ui`
    ctx.fillStyle = fill
    ctx.fillText(str, x, y)
  }

  function opening(width, height) {
    const small = width < 620
    const h = height * (small ? .50 : .72)
    const w = h * .50
    ctx.save()
    ctx.translate(width * (small ? .63 : .74), height * (small ? .71 : .50))
    ctx.rotate(.12)
    ctx.fillStyle = '#6080b5'
    ctx.beginPath()
    ctx.roundRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, w * .13)
    ctx.fill()
    ctx.fillStyle = '#101e35'
    ctx.beginPath()
    ctx.roundRect(-w / 2, -h / 2, w, h, w * .12)
    ctx.fill()
    ctx.clip()
    const x = -w / 2
    const y = -h / 2
    ctx.fillStyle = '#162a43'
    ctx.fillRect(x, y + .12 * h, w, .72 * h)
    const water = [[.77, .14], [.61, .32], [.73, .46], [.53, .63], [.62, .82], [1, .82], [1, .14]]
    ctx.beginPath()
    water.forEach(([a, b], i) => i ? ctx.lineTo(x + a * w, y + b * h) : ctx.moveTo(x + a * w, y + b * h))
    ctx.fillStyle = '#1e3d61'
    ctx.fill()
    for (let i = 1; i < 8; i++) {
      stroke([[x, y + .11 * i * h], [x + w * .64, y + .08 * i * h]], '#426288', 1)
      stroke([[x + .1 * i * w, y + .15 * h], [x + .075 * i * w, y + .83 * h]], '#3b5679', 1)
    }
    const route = [[.28, .71], [.38, .58], [.48, .55], [.45, .45], [.60, .34]]
      .map(([a, b]) => [x + a * w, y + b * h])
    stroke(route, '#9bbbff', 4.5)
    dot(route[0], 10, '#8bb7ff70')
    dot(route[0], 5, '#e7f8ff')
    text('Gardens by the Bay', [x + .10 * w, y + .103 * h], '#c7daff', Math.max(11, w * .069))
    text('Walking directions', [x + .10 * w, y + .92 * h], '#e5eeff', Math.max(12, w * .071))
    ctx.restore()
  }

  function lab(width, height) {
    if (!data) return
    const extent = Math.max(450, ...data.trail.map(point => Math.hypot(point.offset[0], point.offset[1])), Math.hypot(data.position?.[0] ?? 0, data.position?.[1] ?? 0))
    const scale = Math.min(width * .45, height * .50) / extent
    const project = ([east, north, up], ground = false) => [
      width * .51 + (east - .40 * north) * scale,
      height * .71 - (.26 * east + .47 * north + (ground ? 0 : .29 * up)) * scale
    ]
    for (let m = -1000; m <= 1000; m += 65) {
      stroke([project([-1000, m, 0]), project([1000, m, 0])], '#2b3e60')
      stroke([project([m, -1000, 0]), project([m, 1000, 0])], '#293653')
    }
    const actual = project([0, 0, 0])
    data.sky.forEach((satellite, i) => {
      const singleSignal = data.storyStep === 'listen' || data.storyStep === 'range'
      if ((i >= 4 || singleSignal) && !data.enabled.has(satellite.id)) return
      const ratio = 1 / Math.hypot(...satellite.position)
      const [east, north, up] = satellite.position.map(value => value * ratio)
      const point = [width * (.49 + east * .37 - .14 * north), height * (.56 - up * .34 - .11 * north)]
      if (data.enabled.has(satellite.id)) stroke([actual, point], palette[i] + '9c')
      dot(point, 5, palette[i])
      text(satellite.id.toUpperCase(), [point[0] + 9, point[1] - 3], palette[i], 11)
    })
    dot(actual, 9, '#324e60')
    dot(actual, 4.5, '#a7f3d8')
    if (data.position) {
      const estimate = project(data.position, true)
      stroke([actual, estimate], '#ffb18b', 2)
      dot(estimate, 5, '#ffc295')
    }
    if (data.trail.length) {
      const points = data.trail.map(row => project(row.offset))
      stroke(points, '#788bef53', 9)
      stroke(points, '#a8c1ff', 3)
      dot(project(data.sample.offset), 5, '#fff')
    }
  }

  function render() {
    if (canvas.hidden) return
    const { width, height } = canvas.getBoundingClientRect()
    if (!width || !height) return
    const dpr = Math.min(window.devicePixelRatio, 1.65)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const bg = ctx.createRadialGradient(width * .68, height * .47, 1, width * .67, height * .48, width * .7)
    bg.addColorStop(0, '#273857')
    bg.addColorStop(1, '#080d19')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)
    if (mode === 'opening') opening(width, height)
    else lab(width, height)
  }

  new ResizeObserver(render).observe(canvas)
  render()
  return {
    update(next) { data = next; render() },
    setMode(next) { mode = next; render() },
    render
  }
}
