import jsPDF from 'jspdf'
// -pro fork, not the base html2canvas package: base html2canvas's CSS
// parser hard-crashes ("unsupported color function oklab") on Tailwind v4
// pages, since v4's entire default palette is defined in oklch and the
// browser reports several computed-style colors back as oklab regardless
// of how they were authored. -pro is a compatible drop-in that understands
// modern CSS color functions.
import html2canvas from 'html2canvas-pro'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './EditorCanvas'

// Canvas-logical px of breathing room kept around the shapes' own bounding
// box - without this the crop would clip right against the outermost
// shape's edge/border.
const CONTENT_PADDING = 40
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
function contentBounds(shapes, shapeOrder) {
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
  return {
    left: Math.max(0, minX - CONTENT_PADDING),
    top: Math.max(0, minY - CONTENT_PADDING),
    right: Math.min(CANVAS_WIDTH, maxX + CONTENT_PADDING),
    bottom: Math.min(CANVAS_HEIGHT, maxY + CONTENT_PADDING),
  }
}

function safeFileName(name) {
  const trimmed = (name || '').trim().replace(/[\\/:*?"<>|]+/g, '-')
  return trimmed || 'diagram'
}

// Renders canvasNode (the live editor canvas DOM node) to a PDF sized to
// fit one A4 page, cropped to just the diagram's own content and centered
// with a small margin - meant for printing/submitting the diagram, not a
// pixel-perfect screenshot of the whole editing surface.
export async function exportDiagramToPdf({ canvasNode, shapes, shapeOrder, fileName }) {
  const bounds = contentBounds(shapes, shapeOrder)
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

  // Captured directly at the content's own bounding box (via x/y/width/height,
  // in the same canvas-logical px as contentBounds) rather than rasterizing
  // the full fixed 2400x1400 canvas and cropping afterward - the full canvas
  // at CAPTURE_SCALE is ~13.4 megapixels regardless of how small the actual
  // diagram is, which is exactly the kind of oversized capture MAX_CAPTURE_PIXELS
  // above is guarding against.
  const canvas = await html2canvas(canvasNode, {
    backgroundColor: '#ffffff',
    scale,
    x: bounds.left,
    y: bounds.top,
    width: contentWidth,
    height: contentHeight,
    // Mutates html2canvas's own off-screen clone, never the live editor -
    // the real canvas never visibly flashes during export. Three things
    // need neutralizing here that are real for editing but wrong for a
    // clean printout: the current viewport zoom (a CSS transform on this
    // same node), the dotted background grid regardless of whether either
    // is currently on, and every shape's mount-in entrance animation
    // (animate-shape-enter, see Shape.jsx/index.css) - html2canvas paints
    // its clone as a fresh DOM insertion, which restarts a CSS `animation`
    // from its 0% keyframe (opacity: 0) rather than reusing wherever the
    // real, already-settled element's animation actually finished. Left
    // alone, every shape got captured invisible while arrows (plain SVG,
    // no animation) rendered fine - "only the arrows show up" in the
    // exported PDF.
    onclone: (_doc, clonedEl) => {
      clonedEl.style.transform = 'none'
      clonedEl.style.backgroundImage = 'none'
      for (const el of clonedEl.querySelectorAll('.animate-shape-enter')) {
        el.style.animation = 'none'
        el.style.opacity = '1'
      }
    },
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
