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
  store: 8,
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
  umlClass: 8,
  activity: 28,
  umlDecision: 0,
  state: 14,
  initial: 0,
  final: 0,
  forkJoinH: 2,
  forkJoinV: 2,
  swimlaneV1: 8,
  swimlaneV3: 8,
  swimlaneH1: 8,
  swimlaneH2: 8,
  erdTable: 8,
}

export const MIN_CORNER_RADIUS = 0
export const MAX_CORNER_RADIUS = 48

export function clampCornerRadius(radius) {
  return Math.min(MAX_CORNER_RADIUS, Math.max(MIN_CORNER_RADIUS, radius))
}

// Shared by both shapes and arrows (SET_SHAPE_OPACITY/SET_ARROW_OPACITY in
// useDiagramEditor.js) - one control, same as Fill/Line style already are.
// Floored at 10, not 0: this app has already had more than one bug report
// about elements silently going invisible (arrows clipped out of the SVG
// viewBox, a shape dragged off into unreachable space), so letting opacity
// itself become a fresh way to lose track of an element on canvas would be
// working against that same effort. 10% stays clearly visible while still
// reading as "faded" for whatever the user's dimming it for.
export const MIN_OPACITY = 10
export const MAX_OPACITY = 100
export const DEFAULT_OPACITY = 100

export function clampOpacity(opacity) {
  return Math.min(MAX_OPACITY, Math.max(MIN_OPACITY, opacity))
}

// Same idea as corner radius, for each type's current fill/border theme
// color (currently a fixed Tailwind brand color per type). Label has no
// *default* theme color (it renders with no border/background until a fill
// is actually chosen - see Shape.jsx), so it has no entry here; the topbar's
// currentFillColor falls back to a plain purple for it instead.
export const DEFAULT_FILL_COLOR_BY_TYPE = {
  entity: '#3b82f6',
  process: '#8b5cf6',
  store: '#3b82f6',
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
  umlClass: '#64748b',
  activity: '#10b981',
  umlDecision: '#f59e0b',
  state: '#d946ef',
  initial: '#14121f',
  final: '#14121f',
  forkJoinH: '#14121f',
  forkJoinV: '#14121f',
  swimlaneV1: '#0891b2',
  swimlaneV3: '#0891b2',
  swimlaneH1: '#0891b2',
  swimlaneH2: '#0891b2',
  // Same slate as umlClass - both are "structural/schema" container shapes
  // (header + compartments), so they share an accent by default. Only the
  // header itself is solid-filled with this color (see Shape.jsx's own
  // comment on erdTable) - the rest of the card stays the plain white/border
  // look every other container here already uses.
  erdTable: '#64748b',
}
