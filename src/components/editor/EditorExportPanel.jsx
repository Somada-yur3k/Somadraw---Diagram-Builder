import { useState } from 'react'
import { useDiagramEditorContext } from './DiagramEditorContext'
import { exportDiagramToPdf } from './pdfExport'

// Only one size for now (the whole reason this is a picker and not a fixed
// constant is so a second size - Letter, A3, whatever's asked for next -
// slots in as one more entry here, not a redesign).
const CANVAS_SIZES = [{ key: 'a4', label: 'A4' }]

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

// Same show/hide chevron affordance as EditorTopbar's own toggle button
// (up/down there, since that panel collapses toward the top edge) - this
// one points left/right, since this panel sits at the right edge and
// collapses that way instead.
function ChevronIcon({ direction }) {
  const paths = {
    up: 'm6 15 6-6 6 6',
    down: 'm6 9 6 6 6-6',
    left: 'm15 6-6 6 6 6',
    right: 'm9 6 6 6-6 6',
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d={paths[direction]} />
    </svg>
  )
}

function EditorExportPanel({ canvasRef }) {
  const { state, diagramName } = useDiagramEditorContext()
  const [canvasSize, setCanvasSize] = useState('a4')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [visible, setVisible] = useState(true)

  const hasContent = state.shapeOrder.length > 0

  const handleExport = async () => {
    if (!hasContent || exporting || !canvasRef.current) return
    setExporting(true)
    setExportError('')
    try {
      await exportDiagramToPdf({
        canvasNode: canvasRef.current,
        shapes: state.shapes,
        shapeOrder: state.shapeOrder,
        fileName: diagramName,
      })
    } catch (error) {
      console.error('PDF export failed:', error)
      setExportError('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    // right-2/gap-1.5 on mobile, widening back to the original right-4/gap-2
    // from sm: up - a narrow phone viewport has much less room to spare
    // than the sm+ layout this panel was originally sized for, so it stays
    // visible everywhere now instead of being cut off below sm entirely.
    <div className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 items-center gap-1.5 sm:right-4 sm:gap-2">
      {visible && (
        <div className="flex w-44 flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-lg sm:w-52 sm:gap-4 sm:p-4">
          <div>
            <h2 className="text-[13px] font-semibold text-ink">Export</h2>
            <p className="mt-0.5 text-[12px] leading-relaxed text-soft">
              Save this diagram as a print-ready PDF.
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-soft">
              Canvas Size
            </span>
            <select
              value={canvasSize}
              onChange={(event) => setCanvasSize(event.target.value)}
              className="h-9 rounded-lg border border-line bg-white px-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface-soft"
            >
              {CANVAS_SIZES.map((size) => (
                <option key={size.key} value={size.key}>
                  {size.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleExport}
            disabled={!hasContent || exporting}
            title={hasContent ? 'Export as PDF' : 'Add a shape before exporting'}
            className="flex items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-ink/90 disabled:pointer-events-none disabled:opacity-40"
          >
            <DownloadIcon />
            {exporting ? 'Exporting…' : 'Export PDF'}
          </button>

          {exportError && (
            <p className="text-[12px] font-medium text-rose-600">{exportError}</p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        title={visible ? 'Hide export panel' : 'Show export panel'}
        aria-label={visible ? 'Hide export panel' : 'Show export panel'}
        aria-pressed={visible}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink shadow-md transition-colors hover:bg-surface-soft"
      >
        <ChevronIcon direction={visible ? 'right' : 'left'} />
      </button>
    </div>
  )
}

export default EditorExportPanel
