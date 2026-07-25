export const CORNER_RADIUS = 8

// How close (as a fraction of the edge) a connection point is allowed to sit
// to a corner - keeps points off the rounded-corner geometry and gives the
// stub-push math in horizontalMidX/verticalMidY room to work with.
export const T_MARGIN = 0.1

// Extra distance pushed past the farther shape when two connection points
// share the same outward-facing side (see horizontalMidX/verticalMidY) - a
// naive midpoint bend in that configuration would cut back through a shape
// body instead of routing around it.
const STUB = 16

const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }
const HORIZONTAL_SIDES = new Set(['left', 'right'])
const SIDE_DIRECTION = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

// Whether two sides belong to the same 2-bend orthogonal family (both
// horizontal or both vertical) - a manual route offset only ever applies to
// that family's single middle leg. A mixed pairing (one horizontal, one
// vertical) is the 1-bend "L-shape" case, which has no middle leg at all.
export function isMidSegmentEligible(sideA, sideB) {
  return HORIZONTAL_SIDES.has(sideA) === HORIZONTAL_SIDES.has(sideB)
}

function rectOf(shape) {
  return {
    left: shape.x,
    right: shape.x + shape.width,
    top: shape.y,
    bottom: shape.y + shape.height,
    cx: shape.x + shape.width / 2,
    cy: shape.y + shape.height / 2,
  }
}

// Whether a canvas-logical point falls within a shape's (unrotated)
// bounding box - used for hover/drop-target detection instead of DOM hit-
// testing. Hit-testing is the wrong tool here: a connection-point handle
// sits exactly on its shape's border, so as the cursor approaches it, the
// handle itself becomes the hit-test winner and the shape stops being
// "topmost" right under the cursor - which, if hover were driven by the
// shape's own pointerenter/leave, would hide the very handle the cursor is
// trying to reach (and often oscillate, since hiding it exposes the shape
// again, re-triggering hover, showing it again, and so on). Plain
// geometric containment has no such feedback loop.
export function containsPoint(shape, point) {
  const rect = rectOf(shape)
  return (
    point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
  )
}

function cornerRadius(segLen) {
  if (!Number.isFinite(segLen) || Math.abs(segLen) < 0.01) return 0
  return Math.min(CORNER_RADIUS, Math.abs(segLen) / 2)
}

// Point on the given (unrotated) edge of a shape, t=0..1 along that edge.
// Rotation is deliberately ignored, consistent with this app's existing
// precedent that arrow routing and marquee hit-testing both already treat
// shapes as axis-aligned regardless of `shape.rotation`.
export function borderPoint(shape, side, t) {
  const rect = rectOf(shape)
  if (side === 'top') return { x: shape.x + t * shape.width, y: rect.top }
  if (side === 'bottom') return { x: shape.x + t * shape.width, y: rect.bottom }
  if (side === 'left') return { x: rect.left, y: shape.y + t * shape.height }
  return { x: rect.right, y: shape.y + t * shape.height }
}

// Which facing edge pair two shapes should default to, based on their
// centers - used once at arrow-creation time (previously this comparison
// ran on every render, since routing had no stored connection points yet).
export function facingSide(fromShape, toShape) {
  const from = rectOf(fromShape)
  const to = rectOf(toShape)
  const dx = to.cx - from.cx
  const dy = to.cy - from.cy

  if (Math.abs(dx) >= Math.abs(dy)) {
    const goingRight = dx >= 0
    return { fromSide: goingRight ? 'right' : 'left', toSide: goingRight ? 'left' : 'right' }
  }
  const goingDown = dy >= 0
  return { fromSide: goingDown ? 'bottom' : 'top', toSide: goingDown ? 'top' : 'bottom' }
}

// Nearest point on a shape's (unrotated) border to an arbitrary canvas-
// logical point - used while dragging an arrow endpoint to decide where it
// would land if dropped on this shape right now.
export function nearestBorderPoint(shape, point) {
  const rect = rectOf(shape)
  const clampT = (value) => Math.min(1 - T_MARGIN, Math.max(T_MARGIN, value))
  const tAlongWidth = clampT((point.x - shape.x) / shape.width)
  const tAlongHeight = clampT((point.y - shape.y) / shape.height)

  const candidates = [
    { side: 'top', dist: Math.abs(point.y - rect.top), t: tAlongWidth },
    { side: 'bottom', dist: Math.abs(point.y - rect.bottom), t: tAlongWidth },
    { side: 'left', dist: Math.abs(point.x - rect.left), t: tAlongHeight },
    { side: 'right', dist: Math.abs(point.x - rect.right), t: tAlongHeight },
  ]

  return candidates.reduce((best, candidate) => (candidate.dist < best.dist ? candidate : best))
}

// Places a new connection point in the largest open gap among the ts
// already occupying the same (shape, side), rather than a monotonic
// formula that would bunch every new point toward one corner over time.
export function pickSpacedT(existingTs) {
  const bounds = [T_MARGIN, ...existingTs.slice().sort((a, b) => a - b), 1 - T_MARGIN]
  let gapStart = bounds[0]
  let gapEnd = bounds[1]
  for (let i = 0; i < bounds.length - 1; i++) {
    if (bounds[i + 1] - bounds[i] > gapEnd - gapStart) {
      gapStart = bounds[i]
      gapEnd = bounds[i + 1]
    }
  }
  return (gapStart + gapEnd) / 2
}

// Builds a rounded-corner SVG path through a sequence of points, where each
// consecutive pair forms a purely horizontal or purely vertical leg. Each
// leg's own length determines the corner-radius clipping at both its ends
// (a short middle leg gets clipped hard from both sides so its curve can't
// overlap itself), generalizing what this file used to hand-write per-case.
function orthoPathThrough(points) {
  const legs = []
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const len = a.x === b.x ? b.y - a.y : b.x - a.x
    legs.push({
      a,
      b,
      r: cornerRadius(len),
      ux: a.x === b.x ? 0 : Math.sign(b.x - a.x),
      uy: a.y === b.y ? 0 : Math.sign(b.y - a.y),
    })
  }

  const parts = [`M ${points[0].x} ${points[0].y}`]
  legs.forEach((leg, i) => {
    const from = i === 0 ? leg.a : { x: leg.a.x + leg.ux * leg.r, y: leg.a.y + leg.uy * leg.r }
    const to = i === legs.length - 1 ? leg.b : { x: leg.b.x - leg.ux * leg.r, y: leg.b.y - leg.uy * leg.r }
    if (i > 0) parts.push(`Q ${leg.a.x} ${leg.a.y} ${from.x} ${from.y}`)
    parts.push(`L ${to.x} ${to.y}`)
  })
  return parts.join(' ')
}

function horizontalMidX(fromSide, toSide, start, end) {
  if (toSide === OPPOSITE[fromSide]) return (start.x + end.x) / 2
  // Same-side family (e.g. both 'right') - the naive midpoint would route
  // back through a shape body, since both stubs point the same way. Push
  // the bend beyond the farther point in that shared direction instead.
  return fromSide === 'right'
    ? Math.max(start.x, end.x) + STUB
    : Math.min(start.x, end.x) - STUB
}

function verticalMidY(fromSide, toSide, start, end) {
  if (toSide === OPPOSITE[fromSide]) return (start.y + end.y) / 2
  return fromSide === 'bottom'
    ? Math.max(start.y, end.y) + STUB
    : Math.min(start.y, end.y) - STUB
}

// Point at parameter t (0..1) along a cubic bezier - used to anchor a curved
// arrow's label at the curve's actual midpoint, not the straight-line
// midpoint between its endpoints (which would sit visibly off the curve for
// anything but a symmetric one).
function cubicPointAt(p0, p1, p2, p3, t) {
  const mt = 1 - t
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  }
}

// Builds an orthogonal path between two explicit connection points (each a
// shape + side + t), rather than always the two shapes' nearest facing
// edge-midpoints. side/t are stored per-arrow now, so unlike before this
// must handle any side combination, not just opposite-facing pairs.
//
// routeMidOffset is a manual, user-dragged nudge applied on top of whatever
// auto-routing already computed for the shared middle leg (including its
// same-side push-beyond-tip adjustment) - a plain canvas-coordinate offset,
// not fromSide-relative, so dragging right always moves the bend right
// regardless of which side produced it. Only meaningful for the two 2-bend
// families below; the 1-bend "L-shape" case has no middle leg to offset.
//
// connectorType picks the line geometry: 'straight' and 'curved' both ignore
// routeMidOffset entirely (neither has a draggable middle leg - midSegment
// comes back null, which ArrowLayer already treats as "no route handle" for
// the existing 1-bend case) and fall through to the default 'shape'
// (orthogonal) behavior below for any other/unrecognized value, so old
// arrows saved before this feature existed (no connectorType field) keep
// rendering exactly as they always have. Dashed/dotted rendering is a
// separate, independent property (arrow.lineStyle, see ArrowLayer) layered
// on top of whichever geometry this function returns - it has no effect
// here.
export function computeArrowRoute(
  fromShape,
  fromSide,
  fromT,
  toShape,
  toSide,
  toT,
  routeMidOffset = 0,
  connectorType = 'shape',
) {
  const start = borderPoint(fromShape, fromSide, fromT)
  const end = borderPoint(toShape, toSide, toT)

  if (connectorType === 'straight') {
    return {
      d: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
      labelAnchor: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
      start,
      end,
      midSegment: null,
    }
  }

  if (connectorType === 'curved') {
    // Control points pull straight out from each shape's connection side
    // (rather than e.g. toward each other) so the curve leaves each shape
    // perpendicular to its border, like a typical flowchart bezier
    // connector, instead of cutting across it at an angle.
    const pull = Math.max(40, Math.hypot(end.x - start.x, end.y - start.y) * 0.5)
    const dirFrom = SIDE_DIRECTION[fromSide]
    const dirTo = SIDE_DIRECTION[toSide]
    const c1 = { x: start.x + dirFrom.x * pull, y: start.y + dirFrom.y * pull }
    const c2 = { x: end.x + dirTo.x * pull, y: end.y + dirTo.y * pull }
    return {
      d: `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`,
      labelAnchor: cubicPointAt(start, c1, c2, end, 0.5),
      start,
      end,
      midSegment: null,
    }
  }

  const startIsHorizontal = HORIZONTAL_SIDES.has(fromSide)
  const endIsHorizontal = HORIZONTAL_SIDES.has(toSide)

  let points
  let midSegment = null
  if (startIsHorizontal && endIsHorizontal) {
    const midX = horizontalMidX(fromSide, toSide, start, end) + routeMidOffset
    points = [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end]
    midSegment = { x1: midX, y1: start.y, x2: midX, y2: end.y, orientation: 'vertical' }
  } else if (!startIsHorizontal && !endIsHorizontal) {
    const midY = verticalMidY(fromSide, toSide, start, end) + routeMidOffset
    points = [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end]
    midSegment = { x1: start.x, y1: midY, x2: end.x, y2: midY, orientation: 'horizontal' }
  } else if (startIsHorizontal) {
    points = [start, { x: end.x, y: start.y }, end]
  } else {
    points = [start, { x: start.x, y: end.y }, end]
  }

  const d = orthoPathThrough(points)
  const midA = points[Math.floor((points.length - 1) / 2)]
  const midB = points[Math.ceil((points.length - 1) / 2)]
  const labelAnchor = { x: (midA.x + midB.x) / 2, y: (midA.y + midB.y) / 2 }

  return { d, labelAnchor, start, end, midSegment }
}
