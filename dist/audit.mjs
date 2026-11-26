import { metersPerMicrosecond, solve } from './gps.mjs'

export function auditSignals(observations) {
  // A four-unknown fit needs at least one spare reading after each omission.
  if (observations.length < 6) return { status: 'insufficient', baselineRms: null, options: [] }

  const baseline = solve(observations, true)
  if (baseline.status !== 'fixed' || !Number.isFinite(baseline.rms)) {
    return { status: 'unavailable', baselineRms: null, options: [] }
  }

  const baselineRms = baseline.rms
  const options = []
  for (const [index, omitted] of observations.entries()) {
    const retained = observations.filter((_, candidateIndex) => candidateIndex !== index)
    const fit = solve(retained, true)
    if (fit.status !== 'fixed' || !Number.isFinite(fit.rms)) {
      return { status: 'unavailable', baselineRms, options: [] }
    }

    const { position, clockUs, rms } = fit
    // Predict the held-out reading from the candidate fit, including its own clock bias.
    const distance = Math.hypot(...position.map((value, axis) => value - omitted.position[axis]))
    const predicted = distance + clockUs * metersPerMicrosecond
    options.push({ id: omitted.id, rms, omittedResidual: omitted.range - predicted, position, clockUs })
  }

  // Lower retained RMS is evidence under a single-fault, equal-weight model.
  // Clean readings can give nearly identical fits for several omissions.
  options.sort((a, b) => a.rms - b.rms)
  return { status: 'ready', baselineRms, options }
}
