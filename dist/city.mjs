export function createCity(THREE) {
  const group = new THREE.Group()
  group.name = 'Blue-hour waterfront'

  let seed = 721153
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const choose = values => values[Math.floor(random() * values.length)]

  const concrete = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
  const luminous = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const cube = new THREE.BoxGeometry(1, 1, 1)
  const trunk = new THREE.CylinderGeometry(0.35, 0.5, 1, 7)
  const canopy = new THREE.IcosahedronGeometry(0.5, 1)
  const solidBoxes = []
  const luminousBoxes = []
  const stems = []
  const leaves = []
  const rings = []

  function batch(name, geometry, material, instances) {
    const mesh = new THREE.InstancedMesh(geometry, material, instances.length)
    const pose = new THREE.Object3D()
    const shade = new THREE.Color()
    instances.forEach(([x, y, z, w, h, d, color, yaw = 0], index) => {
      pose.position.set(x, y, z)
      pose.rotation.set(0, yaw, 0)
      pose.scale.set(w, h, d)
      pose.updateMatrix()
      mesh.setMatrixAt(index, pose.matrix)
      mesh.setColorAt(index, shade.set(color))
    })
    mesh.name = name
    mesh.computeBoundingSphere()
    group.add(mesh)
  }

  function box(x, y, z, w, h, d, color, yaw) {
    solidBoxes.push([x, y, z, w, h, d, color, yaw])
  }
  function light(x, y, z, w, h, d, color, yaw) {
    luminousBoxes.push([x, y, z, w, h, d, color, yaw])
  }
  function addMesh(name, geometry, color, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color,
      roughness: 0.83,
      metalness: 0.08
    }))
    mesh.name = name
    mesh.position.set(x, y, z)
    group.add(mesh)
    return mesh
  }
  function pavement(name, points, color, elevation, depth = 0) {
    const outline = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)))
    const geometry = depth
      ? new THREE.ExtrudeGeometry(outline, { depth, bevelEnabled: false })
      : new THREE.ShapeGeometry(outline)
    const mesh = addMesh(name, geometry, color, 0, elevation - depth)
    mesh.rotation.x = -Math.PI / 2
    return mesh
  }
  function strip(a, b, width, y, color, glow = false) {
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    const place = glow ? light : box
    place((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2,
      width, 0.015, Math.hypot(dx, dz), color, Math.atan2(dx, dz))
  }

  // The promenade follows the southern quays and opens up at the hotel grounds.
  const shoreline = [[8.5, 52], [8.5, 5], [9.2, -2], [11.2, -5], [16.8, -5],
    [19, -8], [19, -15], [15.8, -18], [15.8, -24], [20, -27], [26, -31],
    [26, -43], [21, -48], [21, -74]]
  pavement('Mainland and seawall', [[-76, 52], ...shoreline, [-76, -74]], 0x333d50, 0, 1.05)
  const promenade = shoreline.map(([x, z]) => [x - 2.05, z])
  pavement('Waterfront promenade', [...shoreline, ...promenade.slice().reverse()], 0x627586, 0.056)
  for (let i = 1; i < promenade.length; i++) {
    strip(promenade[i - 1], promenade[i], 0.045, 0.063, 0x86b9c8)
    const a = shoreline[i - 1]
    const b = shoreline[i]
    strip([a[0] - 0.22, a[1]], [b[0] - 0.22, b[1]], 0.052, 0.066, 0x5790a2, true)
  }

  box(-0.6, 0.019, -11, 7.4, 0.037, 126, 0x242d3c)
  box(-31, 0.026, 2, 63.4, 0.028, 4.6, 0x242d3c)
  box(-32.1, 0.026, -14.65, 62.3, 0.028, 3.6, 0x283241)
  box(-35, 0.026, -30.6, 56.3, 0.028, 3.1, 0x283241)
  box(-4.65, 0.043, -11, 0.65, 0.084, 126, 0x4a5669)
  box(3.6, 0.043, -11, 0.93, 0.084, 126, 0x4a5669)
  for (let z = -70; z < 51; z += 2.25) {
    if (Math.abs(z) > 4) box(-0.58, 0.047, z, 0.065, 0.014, 0.83, 0x68788d)
  }
  for (const z of [-4.65, 4.75]) {
    for (let x = -3.8; x < 2.7; x += 0.37) {
      box(x, 0.055, z, 0.16, 0.013, 0.61, 0x7c8da1)
    }
  }
  for (const z of [-30.6, -14.65, 2]) {
    for (let x = -61; x < -5.4; x += 2.25) box(x, 0.049, z, 0.9, 0.011, 0.064, 0x617185)
  }

  // A concrete plaza gives the receiver a recognizable, uncluttered foreground.
  pavement('Receiver plaza', [[-4.32, -3.65], [3.58, -3.65], [3.58, 3.65], [-4.32, 3.65]],
    0x435264, 0.067)
  for (let offset = -3; offset <= 3; offset++) {
    box(offset, 0.068, 0, 0.013, 0.006, 7.21, 0x303f53)
    box(-0.38, 0.068, offset, 7.83, 0.006, 0.013, 0x303f53)
  }
  for (const x of [-4.25, 3.53]) {
    for (const z of [-3.6, 3.6]) {
      light(x, 0.073, z, 0.4, 0.012, 0.06, 0x8ac0d2)
      light(x, 0.073, z + (z < 0 ? 0.17 : -0.17), 0.06, 0.012, 0.39, 0x8ac0d2)
    }
  }

  function tree(x, z, scale = 1) {
    const green = choose([0x3b645c, 0x31565a, 0x476d61, 0x304f56])
    stems.push([x, 0.29 * scale, z, 0.12 * scale, 0.58 * scale, 0.12 * scale, 0x614f57])
    leaves.push([x, 0.77 * scale, z, 0.91 * scale, 0.88 * scale, 0.78 * scale, green, random()])
    leaves.push([x + 0.2 * scale, 0.62 * scale, z + 0.1 * scale,
      0.62 * scale, 0.58 * scale, 0.66 * scale, green, random()])
  }

  function lamp(x, z, dir = 1) {
    box(x, 0.55, z, 0.043, 1.1, 0.043, 0x646f85)
    box(x + dir * 0.1, 1.11, z, 0.24, 0.055, 0.073, 0x646f85)
    light(x + dir * 0.17, 1.08, z, 0.11, 0.037, 0.072, 0xffca87)
  }

  pavement('Quayside garden', [[5.1, -2.25], [8.0, -2.25], [10.9, -5.8], [15.85, -5.85],
    [17, -8.7], [17, -14.2], [14.5, -17], [7.2, -16.4], [5.1, -12.5]], 0x384f55, 0.102, 0.09)
  pavement('Terraced park', [[4.8, 8], [6.4, 8], [6.4, 23], [4.8, 23]], 0x354956, 0.075, 0.075)
  for (const [x, z] of [[6.1, -3.6], [7.2, -5.2], [6.2, -11.8], [8.3, -14.4], [12, -15.1],
    [14.5, -14.1], [16.2, -11.8], [15.9, -8.2], [8, -7.4], [6.3, -7.2], [5.6, 12],
    [5.7, 15.3], [5.7, 18.5], [5.7, 22.2], [-6, 5.1], [-6, -5.3], [-7.2, -8.6], [-7.1, 9.1]]) {
    tree(x, z, 0.85 + random() * 0.43)
  }
  for (const z of [-50, -41, -32, -22, -12.7, -5.6, 6, 12.3, 19, 26, 34, 42]) {
    lamp(-4.7, z)
    lamp(z < -26 ? 18 : z < -5 ? 8.2 : 6.65, z, -1)
  }

  const gardenPath = [[6.05, -2.45], [7.8, -5.7], [9.8, -7.1], [13.3, -7.7],
    [15.1, -9.75], [14.8, -12.8], [12.2, -13.6], [10.1, -14.9], [8.8, -16.5]]
  for (let i = 1; i < gardenPath.length; i++) {
    strip(gardenPath[i - 1], gardenPath[i], 0.65, 0.119, 0x577884)
    const a = gardenPath[i - 1]
    const b = gardenPath[i]
    strip([a[0] + 0.1, a[1]], [b[0] + 0.1, b[1]], 0.032, 0.132, 0x6eb3c8, true)
  }

  const ribs = new THREE.BufferGeometry()
  const ribVertices = []
  function supertree(x, z, height, phase) {
    stems.push([x, height * 0.43, z, 0.7, height * 0.86, 0.7, 0x644c71])
    stems.push([x, height * 0.24, z, 0.95, height * 0.48, 0.95, 0x3c5163])
    const radius = height * 0.365
    for (let step = 0; step < 13; step++) {
      const angle = (step / 13) * Math.PI * 2 + phase
      const dx = Math.cos(angle)
      const dz = Math.sin(angle)
      const points = [[0.22, height * 0.30], [radius * 0.27, height * 0.69],
        [radius * 0.62, height * 0.88], [radius, height]]
      for (let i = 1; i < points.length; i++) {
        for (const [r, y] of [points[i - 1], points[i]]) ribVertices.push(x + dx * r, y, z + dz * r)
      }
      const color = step % 3 === 0 ? 0x92cfde : 0xb07dad
      light(x + dx * radius, height, z + dz * radius, 0.075, 0.075, 0.075, color)
      leaves.push([x + dx * radius * 0.62, height * 0.93, z + dz * radius * 0.62,
        0.64, 0.23, 0.43, 0x505174, angle])
    }
    rings.push([x, height, z, radius, 1, radius, 0x7583a5])
    rings.push([x, height * 0.87, z, radius * 0.55, 1, radius * 0.55, 0x856486])
    rings.push([x, height * 0.69, z, radius * 0.27, 1, radius * 0.27, 0x976e8a])
  }
  supertree(13.55, -10.25, 5.15, 0.07)
  supertree(9.75, -12.25, 3.45, 0.35)
  ribs.setAttribute('position', new THREE.Float32BufferAttribute(ribVertices, 3))
  group.add(new THREE.LineSegments(ribs, new THREE.LineBasicMaterial({ color: 0x9c7098 })))

  // The three harbor hotel towers share a continuous curved roof deck.
  const hotel = { x: 4.25, z: -22.25 }
  const windowColors = [0xffb780, 0xffcc92, 0xd5a9a2, 0x91aac8, 0x6b88a5, 0x4e678a]
  function hotelTower(x, z, height) {
    const rows = 32
    const sides = 44
    const footprint = (t, a) => {
      const c = Math.cos(a)
      const s = Math.sin(a)
      return new THREE.Vector3(
        x + Math.sign(c) * Math.pow(Math.abs(c), 0.38) * (1.12 - 0.19 * t),
        0.26 + t * height,
        z + Math.sign(s) * Math.pow(Math.abs(s), 0.64) * (1.1 + 0.33 * (1 - t) ** 3) - 0.67 * t
      )
    }
    const vertices = []
    const faces = []
    for (let row = 0; row <= rows; row++) {
      for (let side = 0; side <= sides; side++) {
        const point = footprint(row / rows, side * 2 * Math.PI / sides)
        vertices.push(point.x, point.y, point.z)
        if (row > 0 && side > 0) {
          const n = row * (sides + 1) + side
          faces.push(n, n - sides - 1, n - 1, n - 1, n - sides - 1, n - sides - 2)
        }
      }
    }
    const shell = new THREE.BufferGeometry()
    shell.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    shell.setIndex(faces)
    shell.computeVertexNormals()
    addMesh('Harbor hotel tower', shell, 0x56688d)
    for (let floor = 1; floor < rows; floor++) {
      for (const angle of [0, 0.055, 0.22, 0.57, 1.08, 1.55, 2.0, 2.55, 2.9,
        3.14, 3.32, 3.56, 4.16, 4.7, 5.28, 5.82, 6.13]) {
        const point = footprint(floor / rows, angle)
        const tangent = footprint(floor / rows, angle + 0.032).sub(footprint(floor / rows, angle - 0.032))
        const length = Math.hypot(tangent.x, tangent.z)
        const nx = tangent.z / length
        const nz = -tangent.x / length
        light(point.x + nx * 0.03, point.y, point.z + nz * 0.03,
          0.205, 0.103, 0.024, choose(windowColors), Math.atan2(nx, nz))
      }
    }
  }

  pavement('Hotel terraces', [[-3.25, -18.5], [10.65, -18.5], [13.6, -20.4],
    [13.6, -25.8], [10.4, -27], [-3.25, -27]], 0x4e5c78, 0.25, 0.25)
  for (const x of [hotel.x - 4, hotel.x, hotel.x + 4]) hotelTower(x, hotel.z, 11.0)
  for (const [height, width, depth, color] of [[11.15, 13.5, 1.4, 0x384961],
    [11.43, 15.25, 1.92, 0x657a96], [11.58, 14.84, 1.79, 0x4b5f79]]) {
    const points = []
    for (const [end, start] of [[hotel.x + width / 2 - depth / 2, -Math.PI / 2],
      [hotel.x - width / 2 + depth / 2, Math.PI / 2]]) {
      for (let i = 0; i <= 12; i++) {
        const angle = start + Math.PI * i / 12
        points.push([end + Math.cos(angle) * depth / 2, hotel.z - 0.67 + Math.sin(angle) * depth / 2])
      }
    }
    pavement('Sky deck', points, color, height, 0.28)
  }
  box(hotel.x, 11.6, hotel.z - 0.95, 7.4, 0.045, 0.53, 0x396978)
  light(hotel.x + 0.14, 11.63, hotel.z - 0.69, 7.8, 0.02, 0.026, 0x86d4e0)
  for (let i = 0; i < 29; i++) {
    light(hotel.x - 6.7 + i * 0.46, 11.46, hotel.z + 0.29, 0.12, 0.07, 0.027, 0xf1bf95)
  }
  for (const x of [hotel.x - 5.2, hotel.x + 4.9, hotel.x + 5.5]) {
    leaves.push([x, 11.79, hotel.z - 1.02, 0.53, 0.39, 0.27, 0x526a78, random()])
  }

  const facade = [0x445572, 0x4c5c7d, 0x4b546e, 0x566480, 0x414d6b, 0x5a607c]
  function building(x, z, width, depth, height, style = 0) {
    const color = choose(facade)
    const pane = choose([0x405572, 0x50657d, 0x566281, 0x405271])
    box(x, 0.18, z, width + 0.8, 0.36, depth + 0.9, 0x424d64)
    box(x, height / 2 + 0.23, z, width, height, depth, color)
    box(x, height + 0.25, z, width + 0.09, 0.14, depth + 0.09, pane)
    const edge = style === 1 ? 0.39 : 0.65
    const cap = style === 1 ? 1.22 : 0.38
    box(x + width * 0.1, height + 0.32 + cap / 2, z - depth * 0.08, width * edge, cap, depth * edge, color)
    if (style === 1) {
      box(x + width * 0.1, height + 1.84, z - depth * 0.08, 0.045, 0.64, 0.045, 0x8795ab)
      light(x + width * 0.1, height + 2.17, z - depth * 0.08, 0.076, 0.08, 0.076, 0xfba599)
    }
    if (style === 2) {
      light(x, height + 0.24, z + depth / 2 + 0.052, width - 0.12, 0.04, 0.029, 0x91b7d6)
      light(x + width / 2 + 0.054, height + 0.24, z, depth - 0.12, 0.04, 0.029, 0x91b7d6, Math.PI / 2)
    }
    const floorSpace = style === 2 ? 0.43 : 0.51
    for (const [span, faceX, faceZ, yaw] of [[width, x, z + depth / 2 + 0.022, 0],
      [depth, x + width / 2 + 0.022, z, Math.PI / 2]]) {
      const cols = Math.max(2, Math.floor(span / (style === 2 ? 0.47 : 0.63)))
      const pitch = span / cols
      for (let col = 0; col < cols; col++) {
        const offset = (col + 0.5) * pitch - span / 2
        const wx = faceX + offset * Math.cos(yaw)
        const wz = faceZ - offset * Math.sin(yaw)
        for (let y = 0.8; y < height; y += floorSpace) {
          const lit = random() > (y < 1.3 ? 0.42 : 0.78)
          if (lit) light(wx, y, wz, pitch * 0.51, 0.159, 0.027, choose(windowColors), yaw)
          else if (style === 2) box(wx, y, wz, pitch * 0.81, 0.25, 0.018, pane, yaw)
        }
      }
    }
  }

  const blocks = [
    [-10.55, 15.2, 5.9, 5.3, 3.3, 0], [-17.1, 15.15, 4.5, 5.5, 5.1, 2],
    [-11.2, 7.05, 5.6, 3.7, 2.1, 0], [-17.5, 7.1, 4.3, 4, 3.7, 0],
    [-10.55, -5.1, 5.3, 5.5, 4.4, 2], [-17.4, -5.7, 4.55, 6.2, 7.4, 0],
    [-24.9, -4.35, 5.7, 5.6, 9.8, 2], [-31.5, -6.0, 4.0, 6.25, 11.3, 0],
    [-11.9, -10.3, 5.25, 2.4, 2.4, 0], [-21, -10.7, 4.4, 3.8, 4.7, 0],
    [-9, -20.05, 4.35, 4.75, 6.1, 2], [-16.1, -20.9, 6, 6.5, 11.95, 1],
    [-24.4, -19.6, 5.6, 4.5, 13.1, 2], [-31.7, -21.1, 5.15, 6.7, 15.8, 1],
    [-38.4, -20.1, 4.2, 4.4, 11.6, 0], [-11.45, -26.25, 6.1, 3.1, 3.0, 0],
    [-19.6, -26.8, 5.2, 3.9, 6.4, 0], [-28.2, -27.1, 5.4, 3.1, 8.8, 0],
    [2.45, -34.75, 4.2, 4.1, 5.9, 2], [9.4, -34.65, 5.7, 5.5, 7.1, 0],
    [16.9, -36.25, 4.55, 5.55, 8.5, 2], [19.2, -41.6, 4.1, 3.5, 5.2, 0]
  ]
  blocks.forEach(parameters => building(...parameters))

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 9; col++) {
      const x = -11 - col * 6.2 + (random() - 0.5) * 1.1
      const z = -35.7 - row * 8.4 + (random() - 0.5) * 1.7
      const height = 5.8 + random() * (row === 0 ? 14 : 11) + (col < 3 ? 2 : 0)
      building(x, z, 2.6 + random() * 2.9, 3.1 + random() * 2.5, height, col % 5 === 1 ? 1 : 0)
    }
  }

  // Low-profile boat traffic and quay lighting clarify the waterline at a glance.
  for (let i = 0; i < 8; i++) {
    const z = -3 + i * 2.54
    light(8.4, -0.12, z, 0.09, 0.07, 0.48, i % 2 ? 0x8db9d2 : 0x6da3b8)
  }
  for (const [x, z, yaw] of [[17.6, 11.4, -0.34], [23.1, -10.3, 0.91], [31.2, -20.3, 0.43]]) {
    box(x, -0.45, z, 0.66, 0.19, 2.18, 0x566578, yaw)
    box(x, -0.29, z, 0.49, 0.18, 1.38, 0x91a2ad, yaw)
    light(x, -0.21, z, 0.31, 0.08, 0.83, 0xe4bb90, yaw)
  }

  batch('Buildings, street furniture, and pavement markings', cube, concrete, solidBoxes)
  batch('Windows and street lighting', cube, luminous, luminousBoxes)
  batch('Tree trunks', trunk, concrete, stems)
  batch('Tree canopies', canopy, concrete, leaves)
  const ring = new THREE.TorusGeometry(1, 0.013, 6, 64)
  ring.rotateX(Math.PI / 2)
  batch('Garden tower rims', ring, luminous, rings)

  const waterUniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    clock: { value: 0 },
    deepColor: { value: new THREE.Color(0x0e243d) },
    shoalColor: { value: new THREE.Color(0x19415a) },
    shoreGlow: { value: new THREE.Color(0x5391ad) },
    windowGlow: { value: new THREE.Color(0xd29168) }
  }])
  const water = new THREE.Mesh(new THREE.PlaneGeometry(177, 162), new THREE.ShaderMaterial({
    fog: true,
    uniforms: waterUniforms,
    vertexShader: `
      varying vec2 surface;
      #include <fog_pars_vertex>
      void main() {
        surface = (modelMatrix * vec4(position, 1.0)).xz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float clock;
      uniform vec3 deepColor;
      uniform vec3 shoalColor;
      uniform vec3 shoreGlow;
      uniform vec3 windowGlow;
      varying vec2 surface;
      #include <fog_pars_fragment>

      float reflection(vec2 origin, float reach, float width) {
        float distanceFromQuay = surface.x - origin.x;
        float wake = sin(surface.x * 7.4 + surface.y * 3.2 + clock * 0.72);
        wake *= sin(surface.x * 3.9 - surface.y * 2.7 - clock * 0.44);
        float ribbon = exp(-abs(surface.y - origin.y + wake * width * 0.78) / width);
        return ribbon * exp(-distanceFromQuay / reach)
          * smoothstep(-0.15, 0.55, distanceFromQuay) * mix(0.17, 1.0, smoothstep(-0.2, 0.8, wake));
      }

      void main() {
        vec2 p = surface;
        float bank = 8.5 + 7.4 * (1.0 - smoothstep(-6.0, -2.0, p.y));
        float ripple = sin(p.x * 4.5 + p.y * 0.72 - clock * 0.67);
        ripple += 0.55 * sin(p.x * 8.15 - p.y * 1.41 + clock * 0.48);
        ripple += 0.39 * sin(p.x * 1.72 + p.y * 3.15 + clock * 0.35);
        float foam = smoothstep(0.7, 1.97, ripple);
        float inlet = exp(-max(0.0, p.x - bank) * 0.062);
        vec3 color = mix(deepColor, shoalColor, 0.22 + inlet * 0.41 + foam * 0.19);
        float lamps = reflection(vec2(8.45, 7.0), 11.0, 0.55);
        lamps += reflection(vec2(8.45, 1.8), 14.0, 0.35);
        lamps += reflection(vec2(19.0, -9.7), 15.0, 1.07);
        lamps += reflection(vec2(8.45, 17.3), 9.0, 0.36);
        color += shoreGlow * lamps * 0.57;
        float hotel = reflection(vec2(15.75, -22.1), 19.0, 1.63);
        hotel += reflection(vec2(16.7, -25.0), 15.0, 0.83);
        hotel += reflection(vec2(17.75, 11.4), 4.5, 0.34);
        hotel += reflection(vec2(23.2, -10.3), 5.7, 0.45);
        color += windowGlow * hotel * 0.54;
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`
  }))
  water.name = 'Bay with animated light reflections'
  water.rotation.x = -Math.PI / 2
  water.position.set(9, -0.58, -7)
  group.add(water)

  return {
    group,
    tick(seconds) {
      waterUniforms.clock.value = seconds
    }
  }
}
