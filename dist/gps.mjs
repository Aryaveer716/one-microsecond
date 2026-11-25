// Local east, north and up coordinates, in metres. Clock bias is fitted in
// metres as well, so its column in the least-squares matrix has a useful scale.
export const metersPerMicrosecond = 299.792458
const earthRadius = 6_371_000
const orbitRadius = earthRadius + 20_200_000

const layouts = {
  open: [[292, 21], [57, 62], [168, 22], [230, 58], [239, 53], [103, 47]],
  cluster: [[324, 38], [343, 51], [17, 39], [3, 64], [25, 57], [354, 33]]
}

export function makeSky(layout) {
  return layouts[layout].map(([azimuth, elevation], index) => {
    const az = azimuth * Math.PI / 180
    const el = elevation * Math.PI / 180
    const direction = [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)]
    // Intersect the line of sight with a spherical GPS orbit shell.
    const up = earthRadius * direction[2]
    const range = Math.sqrt(up ** 2 + orbitRadius ** 2 - earthRadius ** 2) - up
    return { id: 's' + (index + 1), azimuth, elevation, position: direction.map(value => value * range) }
  })
}

const dot = (a, b) => a.reduce((sum, x, index) => sum + x * b[index], 0)
const fromSatellite = (position, satellite) => position.map((value, index) => value - satellite[index])

// This is the signal generator. Only satellite positions and measured ranges
// cross into solve(); the simulated phone position and clock stay here.
export function measure(sky, receiver, clockUs, rangeErrors = {}) {
  return sky.map(({ id, position }) => ({
    id,
    position,
    range: Math.hypot(...fromSatellite(receiver, position)) +
      clockUs * metersPerMicrosecond + (rangeErrors[id] ?? 0)
  }))
}

function linearize(observations, state, fitClock) {
  const receiver = state.slice(0, 3)
  const matrix = []
  const residuals = observations.map(({ position, range }) => {
    const displacement = fromSatellite(receiver, position)
    const predicted = Math.hypot(...displacement)
    const derivative = displacement.map(value => value / predicted)
    if (fitClock) derivative.push(1)
    matrix.push(derivative)
    return range - (predicted + (state[3] ?? 0))
  })
  return { matrix, residuals }
}

// Modified Gram-Schmidt QR. Orthogonalization avoids squaring the condition
// number (as forming HᵀH would). A near-zero column reveals missing geometry.
function factor(matrix) {
  const size = matrix[0].length
  const q = []
  const r = Array.from({ length: size }, () => Array(size).fill(0))
  for (let col = 0; col < size; col++) {
    let vector = matrix.map(row => row[col])
    for (let prev = 0; prev < col; prev++) {
      r[prev][col] = dot(q[prev], vector)
      vector = vector.map((value, row) => value - r[prev][col] * q[prev][row])
    }
    const length = Math.hypot(...vector)
    if (length < 1e-9) return null
    r[col][col] = length
    q.push(vector.map(value => value / length))
  }
  return { q, r }
}

function backSolve(r, rhs) {
  const output = [...rhs]
  for (let i = r.length - 1; i >= 0; i--) {
    for (let j = i + 1; j < r.length; j++) output[i] -= r[i][j] * output[j]
    output[i] /= r[i][i]
  }
  return output
}

function horizontalDop(r) {
  // Covariance for independent, equal-variance range errors is R⁻¹R⁻ᵀ.
  // Summing squares in the first two rows of R⁻¹ gives East + North variance.
  let variance = 0
  for (let col = 0; col < r.length; col++) {
    const unit = r.map((_, row) => Number(col === row))
    const inverseColumn = backSolve(r, unit)
    variance += inverseColumn[0] ** 2 + inverseColumn[1] ** 2
  }
  return Math.sqrt(variance)
}

export function solve(observations, fitClock) {
  const size = fitClock ? 4 : 3
  if (observations.length < size) return { status: 'insufficient', size }
  let state = Array(size).fill(0)
  const steps = []

  for (let i = 0; i < 20; i++) {
    const { matrix, residuals } = linearize(observations, state, fitClock)
    const decomposition = factor(matrix)
    if (!decomposition) return { status: 'geometry', size }
    const { q, r } = decomposition
    const move = backSolve(r, q.map(column => dot(column, residuals)))
    state = state.map((value, index) => value + move[index])
    steps.push({ position: state.slice(0, 3), clockUs: (state[3] ?? 0) / metersPerMicrosecond })
    if (Math.hypot(...move) > 1e-5) continue

    const final = linearize(observations, state, fitClock)
    return {
      status: 'fixed',
      size,
      ...steps.at(-1),
      hdop: horizontalDop(r),
      residuals: final.residuals,
      rms: Math.hypot(...final.residuals) / Math.sqrt(observations.length),
      steps
    }
  }
  return { status: 'unconverged', size }
}

// Subtract the guessed shared bias, then fit only the three position coordinates.
export function solveAtClock(observations, clockUs) {
  const bias = clockUs * metersPerMicrosecond
  const ranges = observations.map(reading => ({ ...reading, range: reading.range - bias }))
  return { ...solve(ranges, false), clockUs }
}

export function traceClockGuesses(observations, guesses) {
  if (observations.length !== 3) return []
  return guesses.map(clockUs => solveAtClock(observations, clockUs))
    .filter(fix => fix.status === 'fixed')
}
