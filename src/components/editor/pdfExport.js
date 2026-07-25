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
// Rendered at 2x the canvas's own CSS px so text and thin borders stay
// crisp once printed, rather than the fuzzy result of a 1:1 screen capture
// stretched up to fill an A4 page.
const CAPTURE_SCALE = 2
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

  const fullCanvas = await html2canvas(canvasNode, {
    backgroundColor: '#ffffff',
    scale: CAPTURE_SCALE,
    // Mutates html2canvas's own off-screen clone, never the live editor -
    // the real canvas never visibly flashes during export. Two things need
    // neutralizing here that are real for editing but wrong for a clean
    // printout: the current viewport zoom (a CSS transform on this same
    // node) and the dotted background grid, regardless of whether either
    // is currently on.
    onclone: (_doc, clonedEl) => {
      clonedEl.style.transform = 'none'
      clonedEl.style.backgroundImage = 'none'
    },
  })

  const captureScale = fullCanvas.width / CANVAS_WIDTH
  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = Math.round(contentWidth * captureScale)
  cropCanvas.height = Math.round(contentHeight * captureScale)
  const ctx = cropCanvas.getContext('2d')
  ctx.drawImage(
    fullCanvas,
    bounds.left * captureScale,
    bounds.top * captureScale,
    contentWidth * captureScale,
    contentHeight * captureScale,
    0,
    0,
    cropCanvas.width,
    cropCanvas.height,
  )

  const imgData = cropCanvas.toDataURL('image/png')
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
