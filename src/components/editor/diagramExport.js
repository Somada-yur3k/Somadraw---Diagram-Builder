import jsPDF from 'jspdf'
// Not html2canvas - that library works by walking the DOM and manually
// reimplementing CSS layout/paint logic in a <canvas> 2D context, which
// turned out to have a whole category of subtle mismatches with what's
// actually on screen (a mount-in CSS animation restarting instead of
// showing its finished state, content past the canvas's own nominal CSS
// box needing to be manually re-normalized, Tailwind v4's oklch colors
// needing a "-pro" fork just to not crash, web fonts racing against the
// capture). html-to-image instead serializes the DOM into an SVG
// <foreignObject> and lets the *browser's own real rendering engine* paint
// it - the same engine that already renders the live canvas correctly - so
// none of those categories of bug can happen in the first place: it copies
// each element's already-computed style (getComputedStyle, i.e. whatever
// the browser already resolved that element to, including a finished
// animation's settled opacity/transform and oklch colors as real color
// values) rather than re-deriving how to paint it.
import { toCanvas } from 'html-to-image'
import { computeArrowRoute } from './arrowRouting'

// Canvas-logical px of breathing room kept around the shapes' own bounding
// box - without this the crop would clip right against the outermost
// shape's edge/border. Kept at least as large as ArrowLayer.jsx's own
// SVG_PADDING (arrow routing bends/handles can sit a little outside their
// shape's edge) - a smaller value here would let the arrow layer's own
// content peek outside the box this export normalizes everything into
// below, clipping it right back off again.
const CONTENT_PADDING = 200
// Rendered at up to 2x the canvas's own CSS px so text and thin borders stay
// crisp once printed, rather than the fuzzy result of a 1:1 screen capture
// stretched up to fill an A4 page.
const CAPTURE_SCALE = 2
// Safari on iOS silently rasterizes an oversized <canvas> as blank instead
// of erroring, past a ceiling of roughly 3-5 megapixels depending on device
// RAM - this is a conservative cap comfortably under that across devices.
const MAX_CAPTURE_PIXELS = 4_000_000
const PAGE_MARGIN_MM = 10

// Bounding box of the actual placed shapes (not the full fixed 2400x1400
// canvas, which is mostly empty for a typical diagram) - exporting the
// whole canvas would print a tiny diagram lost in a sea of white space.
// Deliberately not clamped to [0, CANVAS_WIDTH] / [0, CANVAS_HEIGHT] -
// shape positions are clamped to non-negative at the source (see
// clampShapePosition in useDiagramEditor.js) but not to any upper bound, so
// a diagram dragged well past the nominal box in the positive direction is
// still legitimate content this needs to fully include.
//
// Also folds in each arrow's actual routed points (start/end/mid-bend) and
// label position - same reasoning as ArrowLayer's own computeSvgBounds. A
// manually dragged route bend (routeMidOffset) or label (labelOffsetX/Y) is
// an unbounded nudge with no relation to any shape's box, so a big enough
// drag lands outside a shapes-only bounding box - CONTENT_PADDING's flat
// 200px was only ever sized for auto-routing's small STUB push-back, not a
// manual drag. Without this, an export could silently crop out exactly the
// part of the diagram someone just finished adjusting.
function contentBounds(shapes, shapeOrder, arrows, arrowOrder) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const id of shapeOrder) {
    const shape = shapes[id]
    minX = Math.min(minX, shape.x)
    minY = Math.min(minY, shape.y)
    maxX = Math.max(maxX, shape.x + shape.width)
    maxY = Math.max(maxY, shape.y + shape.height)
  }
  for (const id of arrowOrder) {
    const arrow = arrows[id]
    const fromShape = arrow && shapes[arrow.fromId]
    const toShape = arrow && shapes[arrow.toId]
    if (!fromShape || !toShape) continue
    const { start, end, midSegment, labelAnchor } = computeArrowRoute(
      fromShape,
      arrow.fromSide,
      arrow.fromT,
      toShape,
      arrow.toSide,
      arrow.toT,
      arrow.routeMidOffset ?? 0,
      arrow.connectorType ?? 'shape',
    )
    const labelX = labelAnchor.x + (arrow.labelOffsetX ?? 0)
    const labelY = labelAnchor.y + (arrow.labelOffsetY ?? 0)
    const xs = [start.x, end.x, labelX]
    const ys = [start.y, end.y, labelY]
    if (midSegment) {
      xs.push(midSegment.x1, midSegment.x2)
      ys.push(midSegment.y1, midSegment.y2)
    }
    minX = Math.min(minX, ...xs)
    minY = Math.min(minY, ...ys)
    maxX = Math.max(maxX, ...xs)
    maxY = Math.max(maxY, ...ys)
  }
  return {
    left: minX - CONTENT_PADDING,
    top: minY - CONTENT_PADDING,
    right: maxX + CONTENT_PADDING,
    bottom: maxY + CONTENT_PADDING,
  }
}

function safeFileName(name) {
  const trimmed = (name || '').trim().replace(/[\\/:*?"<>|]+/g, '-')
  return trimmed || 'diagram'
}

// Editing-only chrome that happens to live inside this same canvas node but
// has no business baked into an export - a collaborator's live cursor
// marker (EditorCanvas.jsx), or ArrowCardinalityPickers.jsx's floating
// start/end cardinality chips, which only render while their arrow is
// currently selected. Both are marked with the same data-export-hidden
// flag rather than each needing their own bespoke filter here. filter()
// walks every node in the tree, including plain text nodes (no .dataset on
// those), so this has to check that the property exists before checking
// what's in it.
function excludeExportHiddenNodes(node) {
  return !(node.dataset && 'exportHidden' in node.dataset)
}

// Shared by both export formats below - rasterizes canvasNode (the live
// editor canvas DOM node) to a <canvas> containing just the diagram's own
// content, cropped and padded, at up to CAPTURE_SCALE pixel density. PNG
// export uses this result directly; PDF export additionally embeds it onto
// a print page (see exportDiagramToPdf) - that extra step is exactly the
// difference between the two formats' accuracy. PNG is the more faithful
// one: it's this exact raster, byte for byte. PDF re-embeds the same raster
// into an A4 page at a computed print size, which a PDF viewer then
// resamples again to whatever zoom level it's displaying at - one more
// transformation, and one more place for thin strokes (arrows) to pick up
// resampling artifacts a PNG never goes through.
async function captureDiagramCanvas({ canvasNode, shapes, shapeOrder, arrows, arrowOrder }) {
  // Secondary safeguard alongside html-to-image's own font-embedding (which
  // fetches and inlines whatever @font-face rules are actually in use) -
  // cheap and already resolved almost instantly once fonts have loaded, so
  // there's no reason to skip it.
  await document.fonts.ready

  const bounds = contentBounds(shapes, shapeOrder, arrows, arrowOrder)
  const contentWidth = bounds.right - bounds.left
  const contentHeight = bounds.bottom - bounds.top

  // Scaled down (from CAPTURE_SCALE) only for diagrams whose content box is
  // itself already large enough that 2x would cross MAX_CAPTURE_PIXELS -
  // small/typical diagrams still render at a full, crisp 2x.
  const idealPixels = contentWidth * contentHeight * CAPTURE_SCALE * CAPTURE_SCALE
  const scale =
    idealPixels > MAX_CAPTURE_PIXELS
      ? Math.sqrt(MAX_CAPTURE_PIXELS / (contentWidth * contentHeight))
      : CAPTURE_SCALE

  const canvas = await toCanvas(canvasNode, {
    backgroundColor: '#ffffff',
    // Applied to the clone's own box before rendering - crops/pads it to
    // exactly the content's bounding box, same idea as before, but now via
    // one property on the single root node instead of walking and
    // resizing individual descendants.
    width: contentWidth,
    height: contentHeight,
    // Output pixel density - canvasWidth/Height (not pixelRatio, which
    // would multiply the *device's* ratio on top of this) is the actual
    // requested resolution, matching the old CAPTURE_SCALE behavior exactly
    // regardless of what device this runs on.
    canvasWidth: contentWidth * scale,
    canvasHeight: contentHeight * scale,
    pixelRatio: 1,
    style: {
      // Cancels the live editor's current viewport zoom (a CSS transform on
      // this same node) and re-anchors the whole diagram onto this box's
      // own (0, 0) origin in one step - shapes, the arrow layer, and arrow
      // labels are all positioned via left/top in the same canvas-logical
      // space relative to this shared parent, so translating the parent
      // moves all of them together without touching any of them
      // individually (they stay exactly as aligned to each other as they
      // were).
      transform: `translate(${-bounds.left}px, ${-bounds.top}px)`,
      // The dotted background grid is real for editing, wrong for a clean
      // export, regardless of whether it's currently toggled on.
      backgroundImage: 'none',
    },
    filter: excludeExportHiddenNodes,
  })

  return { canvas, contentWidth, contentHeight }
}

// Triggers a browser download for a data URL without needing an <a> already
// on the page - same "invisible, temporary, clicked once" pattern for both
// export formats below.
function downloadDataUrl(dataUrl, fileName) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
}

// The exact raster captureDiagramCanvas produced, saved directly - no
// further processing, so this is the most accurate representation of the
// diagram export can produce. Prefer this over PDF unless a print-ready,
// fixed-page-size document is specifically what's needed.
export async function exportDiagramToPng({ canvasNode, shapes, shapeOrder, arrows, arrowOrder, fileName }) {
  const { canvas } = await captureDiagramCanvas({ canvasNode, shapes, shapeOrder, arrows, arrowOrder })
  downloadDataUrl(canvas.toDataURL('image/png'), `${safeFileName(fileName)}.png`)
}

// Renders canvasNode (the live editor canvas DOM node) to a PDF sized to
// fit one A4 page, cropped to just the diagram's own content and centered
// with a small margin - meant for printing/submitting the diagram, not a
// pixel-perfect screenshot of the whole editing surface (see
// exportDiagramToPng for that).
export async function exportDiagramToPdf({ canvasNode, shapes, shapeOrder, arrows, arrowOrder, fileName }) {
  const { canvas, contentWidth, contentHeight } = await captureDiagramCanvas({
    canvasNode,
    shapes,
    shapeOrder,
    arrows,
    arrowOrder,
  })
  const imgData = canvas.toDataURL('image/png')

  // Landscape for a wider-than-tall diagram, portrait otherwise - a fixed
  // orientation would squeeze whichever shape doesn't match it down to a
  // sliver of the page.
  const orientation = contentWidth >= contentHeight ? 'landscape' : 'portrait'
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const maxDrawWidth = pageWidth - PAGE_MARGIN_MM * 2
  const maxDrawHeight = pageHeight - PAGE_MARGIN_MM * 2
  const contentRatio = contentWidth / contentHeight

  let drawWidth = maxDrawWidth
  let drawHeight = drawWidth / contentRatio
  if (drawHeight > maxDrawHeight) {
    drawHeight = maxDrawHeight
    drawWidth = drawHeight * contentRatio
  }

  pdf.addImage(
    imgData,
    'PNG',
    (pageWidth - drawWidth) / 2,
    (pageHeight - drawHeight) / 2,
    drawWidth,
    drawHeight,
  )
  pdf.save(`${safeFileName(fileName)}.pdf`)
}
