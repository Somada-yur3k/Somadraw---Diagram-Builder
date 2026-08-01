// Logical/diagram px, independent of zoom (every coordinate this file works
// with already is - the canvas's own scale(zoom) transform handles the
// screen-pixel side of things, see EditorCanvas.jsx).
export const SNAP_THRESHOLD = 6

function edgesX(rect) {
  return { left: rect.x, center: rect.x + rect.width / 2, right: rect.x + rect.width }
}
function edgesY(rect) {
  return { top: rect.y, center: rect.y + rect.height / 2, bottom: rect.y + rect.height }
}

// Finds the single best snap on each axis independently - `rect` (the shape
// actively being dragged) against every shape in `others` (every shape NOT
// currently being moved - see Shape.jsx's own filtering), comparing every
// edge/center pairing on both sides. X and Y snap independently of each
// other and can each land on a *different* other shape - the same "smart
// guides" convention Figma/PowerPoint/Sketch all use, rather than requiring
// one single reference shape to align to on both axes at once.
export function computeAlignmentSnap(rect, others) {
  const dragX = edgesX(rect)
  const dragY = edgesY(rect)

  let bestDx = 0
  let bestXDiff = SNAP_THRESHOLD + 1
  let verticalGuide = null

  let bestDy = 0
  let bestYDiff = SNAP_THRESHOLD + 1
  let horizontalGuide = null

  for (const other of others) {
    const otherX = edgesX(other)
    const otherY = edgesY(other)

    for (const dragKey of ['left', 'center', 'right']) {
      for (const otherKey of ['left', 'center', 'right']) {
        const diff = otherX[otherKey] - dragX[dragKey]
        if (Math.abs(diff) < bestXDiff) {
          bestXDiff = Math.abs(diff)
          bestDx = diff
          verticalGuide = {
            x: otherX[otherKey],
            y1: Math.min(rect.y, other.y),
            y2: Math.max(rect.y + rect.height, other.y + other.height),
          }
        }
      }
    }

    for (const dragKey of ['top', 'center', 'bottom']) {
      for (const otherKey of ['top', 'center', 'bottom']) {
        const diff = otherY[otherKey] - dragY[dragKey]
        if (Math.abs(diff) < bestYDiff) {
          bestYDiff = Math.abs(diff)
          bestDy = diff
          horizontalGuide = {
            y: otherY[otherKey],
            x1: Math.min(rect.x, other.x),
            x2: Math.max(rect.x + rect.width, other.x + other.width),
          }
        }
      }
    }
  }

  return {
    dx: bestXDiff <= SNAP_THRESHOLD ? bestDx : 0,
    dy: bestYDiff <= SNAP_THRESHOLD ? bestDy : 0,
    verticalGuide: bestXDiff <= SNAP_THRESHOLD ? verticalGuide : null,
    horizontalGuide: bestYDiff <= SNAP_THRESHOLD ? horizontalGuide : null,
  }
}
