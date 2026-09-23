// ─────────────────────────────────────────────────────────────
// Risk score → colour helpers (mirror of backend/risk.py)
// The 0-100 score maps onto a Google-Maps-traffic-style spectrum:
// green → yellow → orange → red.
// ─────────────────────────────────────────────────────────────

const COLOR_STOPS = [
  { at: 0,   hex: '#22C55E' },   // green   — clear
  { at: 25,  hex: '#84CC16' },   // green   → yellow-green
  { at: 50,  hex: '#FACC15' },   // yellow  — light
  { at: 75,  hex: '#F97316' },   // orange  — heavy
  { at: 100, hex: '#DC2626' },   // red     — severe
]

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

/** Map a 0-100 risk score onto the green→red spectrum. */
export function riskToColor(score) {
  const clamped = Math.max(0, Math.min(100, score || 0))
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const a = COLOR_STOPS[i]
    const b = COLOR_STOPS[i + 1]
    if (clamped >= a.at && clamped <= b.at) {
      const t = (clamped - a.at) / (b.at - a.at)
      const c = hexToRgb(a.hex).map((v, k) =>
        Math.round(v + (hexToRgb(b.hex)[k] - v) * t))
      return rgbToHex(c)
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1].hex
}

export function riskLevel(score) {
  if (score >= 80) return 'SEVERE'
  if (score >= 60) return 'HIGH'
  if (score >= 40) return 'MODERATE'
  if (score >= 20) return 'LOW'
  return 'MINIMAL'
}

export const RISK_LEGEND = [
  { score: 0,   color: '#22C55E', label: 'Low risk' },
  { score: 50,  color: '#FACC15', label: 'Moderate' },
  { score: 75,  color: '#F97316', label: 'High risk' },
  { score: 100, color: '#DC2626', label: 'Severe' },
]

/** Append an alpha channel to a '#rrggbb' colour (for street tinting). */
export function hexWithAlpha(hex, alpha = 0.85) {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16).padStart(2, '0')
  return hex + a
}

/** Weighted cumulative score computed client-side. */
export function cumulativeRisk(breedRisk, emotionRisk, postureRisk) {
  return Math.round(
    0.30 * (breedRisk ?? 50) +
    0.35 * (emotionRisk ?? 50) +
    0.35 * (postureRisk ?? 50)
  )
}

/** Map a reported behavior id onto an emotion-risk axis (0-100). */
const BEHAVIOR_RISK = {
  calm:       18,
  alert:      60,
  aggressive: 100,
  attacking:  100,
  pack:       55,
}

export function behaviorRisk(behaviorId) {
  return BEHAVIOR_RISK[behaviorId] ?? 50
}

/** Pack bonus — dogs in groups are riskier (+8 per extra dog, cap +15). */
function packBonus(dogCount) {
  if (!dogCount || dogCount <= 1) return 0
  return Math.min(15, (dogCount - 1) * 8)
}

/**
 * Local risk score from the manually reported behavior.
 * Breed/posture are unknown client-side, so only emotion is weighted.
 */
export function localRiskScore({ behavior, dogCount }) {
  const score = cumulativeRisk(50, behaviorRisk(behavior), 50)
  return Math.min(100, score + packBonus(dogCount))
}