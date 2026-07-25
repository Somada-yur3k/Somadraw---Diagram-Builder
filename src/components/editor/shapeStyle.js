// Each shape type ships with its own default rounding today (rounded-lg /
// rounded-2xl / none), expressed only as a Tailwind class on ShapeBody's outer
// div. These are that same look expressed as px, so the topbar stepper can
// show/adjust "how rounded is this shape" as one continuous number instead of
// the user losing their current look the moment they touch the control.
// Circle/triangle/diamond render via a hardcoded rounded-full/clip-path
// instead (see ShapeBody), so their own entries are 0 - same treatment as
// decision/inputOutput above.
export const DEFAULT_CORNER_RADIUS_BY_TYPE = {
  entity: 8,
  process: 16,
  store: 0,
  label: 0,
  flowProcess: 6,
  decision: 0,
  terminator: 48,
  inputOutput: 0,
  circle: 0,
  square: 8,
  rectangle: 8,
  triangle: 0,
  diamond: 0,
  actor: 0,
  usecase: 0,
  boundary: 8,
}

export const MIN_CORNER_RADIUS = 0
export const MAX_CORNER_RADIUS = 48

export function clampCornerRadius(radius) {
  return Math.min(MAX_CORNER_RADIUS, Math.max(MIN_CORNER_RADIUS, radius))
}

// Same idea as corner radius, for each type's current fill/border theme
// color (currently a fixed Tailwind brand color per type). Label has no
// border/background at all, so it has no entry - there's nothing for a fill
// color to visibly change.
export const DEFAULT_FILL_COLOR_BY_TYPE = {
  entity: '#3b82f6',
  process: '#8b5cf6',
  store: '#ec4899',
  flowProcess: '#14b8a6',
  decision: '#f59e0b',
  terminator: '#64748b',
  inputOutput: '#06b6d4',
  circle: '#3b82f6',
  square: '#8b5cf6',
  rectangle: '#14b8a6',
  triangle: '#f59e0b',
  diamond: '#64748b',
  actor: '#6366f1',
  usecase: '#0ea5e9',
  boundary: '#94a3b8',
}
