import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePopoverState } from '../../lib/usePopoverState'
import { useDiagramEditorContext } from './DiagramEditorContext'
import { MIN_ZOOM, MAX_ZOOM } from './useDiagramEditor'
import { ZOOM_STEP } from './EditorCanvas'
import { MIN_W as MIN_SHAPE_WIDTH, MIN_H as MIN_SHAPE_HEIGHT } from './ShapeHandles'
import {
  FONT_OPTIONS,
  DEFAULT_FONT_ID,
  DEFAULT_SHAPE_FONT_SIZE,
  DEFAULT_ARROW_FONT_SIZE,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
} from './textFormat'
import {
  DEFAULT_CORNER_RADIUS_BY_TYPE,
  MIN_CORNER_RADIUS,
  MAX_CORNER_RADIUS,
  DEFAULT_FILL_COLOR_BY_TYPE,
  MIN_OPACITY,
  MAX_OPACITY,
} from './shapeStyle'
import { exportDiagramToPdf, exportDiagramToPng } from './diagramExport'
import LoadingScreen from '../LoadingScreen'

const CLEAR_LOADING_MS = 900
// Matches --color-soft (index.css) - the line color an arrow renders with
// until it's ever given its own via SET_ARROW_COLOR.
const DEFAULT_ARROW_COLOR = '#8f8ca3'

// Common editor-style font sizes (the kind of list Google Docs/Figma
// offer), filtered against the app's own clamp range so this list can
// never offer a size the rest of the app would immediately reject.
const FONT_SIZE_PRESETS = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 60, 72, 96].filter(
  (size) => size >= MIN_FONT_SIZE && size <= MAX_FONT_SIZE,
)
// Percent, not the 0..1 fraction the reducer stores internally - converted
// at the point of use (setZoom(percent / 100)) since every other zoom
// display in this file already works in percent on the user-facing side.
const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 175, 200].filter(
  (percent) => percent / 100 >= MIN_ZOOM && percent / 100 <= MAX_ZOOM,
)

// Same set/order/labels as EditorSidebar.jsx's own connectorTypes (the Draw
// Arrow dropdown) - this is that same choice, just editable after the fact
// on an arrow that already exists instead of only at draw time.
const ARROW_CONNECTOR_TYPES = [
  { key: 'straight', label: 'Straight Line' },
  { key: 'curved', label: 'Curved Line' },
  { key: 'shape', label: 'Shape Connector' },
  { key: 'erd', label: 'ERD Relationship' },
]

const EXPORT_PANEL_WIDTH = 208 // matches w-52 below
// Right-aligned under the trigger (not the shared default centered-below
// placement every other popover in this file uses) - the Export button
// sits at the far right of the bar (ml-auto), so a centered panel would run
// off the screen's own right edge. Same reasoning as ShareButton.jsx's
// computeSharePos.
function computeExportPos(rect) {
  return { left: Math.max(16, rect.right - EXPORT_PANEL_WIDTH), top: rect.bottom + 8 }
}

function UndoIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5A5.5 5.5 0 0 1 20 14.5v0A5.5 5.5 0 0 1 14.5 20H11" />
    </svg>
  )
}

function RedoIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    </svg>
  )
}

function ClearAllIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

// Text-align icons (paragraph lines of varying length/position) - distinct
// from AlignLeftIcon/etc above, which represent aligning whole *objects* to
// each other, not text *within* one. Different concept, different glyph
// convention (the classic word-processor one), so they're not reused.
function TextAlignLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="14" y2="12" />
      <line x1="4" y1="18" x2="17" y2="18" />
    </svg>
  )
}

function TextAlignCenterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="5.5" y1="18" x2="18.5" y2="18" />
    </svg>
  )
}

function TextAlignRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="10" y1="12" x2="20" y2="12" />
      <line x1="7" y1="18" x2="20" y2="18" />
    </svg>
  )
}

function CornerRadiusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16V9a5 5 0 0 1 5-5h7" />
    </svg>
  )
}

// Half-filled circle - the same "opacity/contrast" glyph most editors use,
// simple enough to draw with plain strokes/fill rather than needing an
// actual checkerboard pattern to read as "transparency."
function OpacityIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function LineStyleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="8" x2="20" y2="8" />
      <line x1="4" y1="16" x2="9" y2="16" strokeDasharray="3 3" />
      <line x1="12" y1="16" x2="16" y2="16" strokeDasharray="3 3" />
      <line x1="19" y1="16" x2="20" y2="16" strokeDasharray="3 3" />
    </svg>
  )
}

// Same three glyphs EditorSidebar.jsx's own ConnectorTypeIcon draws for its
// Draw Arrow dropdown (kept as a separate local copy, this file's own
// convention - see Group/Ungroup's comment below) - 'shape' and 'erd' share
// the bend glyph there too, since the only real difference between them is
// which marker ArrowLayer.jsx draws at each end, not the path geometry.
function ConnectorTypeIcon({ type }) {
  if (type === 'straight') {
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0">
        <line x1="4" y1="16" x2="16" y2="4" />
      </svg>
    )
  }
  if (type === 'curved') {
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0">
        <path d="M4 16C4 8 16 12 16 4" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M4 16H10V4H16" />
    </svg>
  )
}

// The three arrowhead presets SET_ARROW_HEADS offers - end-only (this app's
// original, only-ever behavior before this existed), both, or neither.
// Independent start/end checkboxes would cover one more real case
// (start-only), rare enough not to be worth a fourth control.
function ArrowHeadEndIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <line x1="3" y1="10" x2="16" y2="10" />
      <path d="M11 5.5 16 10l-5 4.5" />
    </svg>
  )
}

function ArrowHeadBothIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <line x1="4" y1="10" x2="16" y2="10" />
      <path d="M9 5.5 4 10l5 4.5" />
      <path d="M11 5.5 16 10l-5 4.5" />
    </svg>
  )
}

function ArrowHeadNoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0">
      <line x1="4" y1="10" x2="16" y2="10" />
    </svg>
  )
}

// Same glyphs EditorContextMenu.jsx's own Group/Ungroup entries use - kept
// as separate local components here (this file's own convention, every icon
// defined where it's used) rather than imported, but drawn identically so
// the toolbar button and the right-click menu item for the same action
// always look like the same action.
function GroupIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="10" height="10" rx="1.5" />
      <rect x="11" y="11" width="10" height="10" rx="1.5" />
    </svg>
  )
}

function UngroupIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="9" height="9" rx="1.5" />
      <rect x="13" y="13" width="9" height="9" rx="1.5" />
    </svg>
  )
}

// Same glyphs EditorContextMenu.jsx's own Bring to front/Send to back
// entries use, same "identical action, identical icon" reasoning as
// Group/Ungroup above.
function BringToFrontIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="12" height="12" rx="1.5" opacity="0.4" />
      <rect x="9" y="9" width="12" height="12" rx="1.5" fill="white" />
    </svg>
  )
}

function SendToBackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="12" height="12" rx="1.5" fill="white" />
      <rect x="9" y="9" width="12" height="12" rx="1.5" opacity="0.4" />
    </svg>
  )
}

function DuplicateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="12" height="12" rx="1.5" />
      <path d="M6 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V6" />
    </svg>
  )
}

function AlignLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="3" x2="4" y2="21" />
      <rect x="7" y="6" width="10" height="5" rx="1" />
      <rect x="7" y="13" width="6" height="5" rx="1" />
    </svg>
  )
}

function AlignCenterHIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="3" x2="12" y2="21" />
      <rect x="7" y="6" width="10" height="5" rx="1" />
      <rect x="9" y="13" width="6" height="5" rx="1" />
    </svg>
  )
}

function AlignRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="20" y1="3" x2="20" y2="21" />
      <rect x="7" y="6" width="10" height="5" rx="1" />
      <rect x="11" y="13" width="6" height="5" rx="1" />
    </svg>
  )
}

function AlignTopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="4" x2="21" y2="4" />
      <rect x="6" y="7" width="5" height="10" rx="1" />
      <rect x="13" y="7" width="5" height="6" rx="1" />
    </svg>
  )
}

function AlignMiddleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <rect x="6" y="7" width="5" height="10" rx="1" />
      <rect x="13" y="9" width="5" height="6" rx="1" />
    </svg>
  )
}

function AlignBottomIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="20" x2="21" y2="20" />
      <rect x="6" y="7" width="5" height="10" rx="1" />
      <rect x="13" y="11" width="5" height="6" rx="1" />
    </svg>
  )
}

function RotateLeftIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9a8 8 0 1 1 1.5 8.5" />
      <path d="M4 4v5h5" />
    </svg>
  )
}

function RotateRightIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 9a8 8 0 1 0-1.5 8.5" />
      <path d="M20 4v5h-5" />
    </svg>
  )
}

// Decorative only (see the Fill control's own comment below) - a paint-drop
// glyph pinned next to the color swatch so Fill reads as one labeled
// control alongside Group/Align/Rotate, the same "icon means something"
// language those three use, instead of a bare, unexplained color square.
function FillIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M12 2c4 5 7 8.5 7 12a7 7 0 0 1-14 0c0-3.5 3-7 7-12Z" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

// Small "this opens a dropdown" indicator - mirrors the caret every
// value/dropdown-style control in the reference image has next to it.
function ChevronDownIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

// Icon-over-label button, stacked - the ribbon-toolbar look (Undo/Redo/
// Delete/Clear/Grid/Export), matching the ask to look like the reference
// image's general button style without adopting the specific buttons this
// app doesn't have (Paste/Copy/Cut/Insert/Styles/Themes/Effects).
function RibbonButton({
  icon,
  label,
  onClick,
  disabled,
  title,
  tone = 'default',
  className = '',
  triggerRef,
  ...rest
}) {
  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex w-14 shrink-0 flex-col items-center gap-0.5 rounded-md px-1 py-1 text-[11px] font-medium transition-colors hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-40 ${
        tone === 'danger' ? 'text-rose-600' : 'text-ink'
      } ${className}`}
      {...rest}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

// Format tab layout: instead of one undifferentiated row of controls with a
// bare divider between every unrelated cluster, each related cluster of
// controls gets a small caption underneath it (Font/Text/Style/Opacity/
// Arrange) - the same ribbon-toolbar language RibbonButton's icon-over-label
// buttons already use on the Home tab, just applied to a *group* of controls
// instead of one button. Reads as organized sections at a glance instead of
// a wall of icons, and (as a side effect) brings the Format tab's own row
// height in line with Home's, which used to visibly jump shorter/taller
// when switching tabs since Format's controls used to have no second line.
function FormatGroup({ label, children }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1 px-1">
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
      <span className="text-[10px] font-medium uppercase tracking-wide text-soft/70">{label}</span>
    </div>
  )
}

function ClearConfirmDialog({ onCancel, onConfirm }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="text-[16px] font-semibold text-ink">Clear the entire canvas?</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-soft">
          This will permanently delete every shape and connection on this diagram. This
          cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line px-3.5 py-2 text-[13.5px] font-medium text-ink transition-colors hover:bg-surface-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-rose-600 px-3.5 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-rose-700"
          >
            Clear canvas
          </button>
        </div>
      </div>
    </div>
  )
}

function SaveStatus({ status }) {
  if (status === 'saving') {
    return <span className="shrink-0 whitespace-nowrap px-1.5 text-[12px] font-medium text-soft">Saving…</span>
  }
  if (status === 'error') {
    return <span className="shrink-0 whitespace-nowrap px-1.5 text-[12px] font-medium text-rose-600">Save failed</span>
  }
  // Deliberately silent for 'saved' - a permanent "Saved" label is just
  // noise once autosave is the norm; only surface state that needs
  // attention (in progress, or failed).
  return null
}

function EditorTopbar({ canvasNodeRef }) {
  const { state, dispatch, diagramName, canUndo, canRedo, saveStatus, readOnly } = useDiagramEditorContext()
  const zoom = state.viewport.zoom
  const colorInputRef = useRef(null)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(false)

  const requestClear = () => {
    if (state.shapeOrder.length === 0) return
    setConfirmingClear(true)
  }

  const confirmClear = () => {
    setConfirmingClear(false)
    dispatch({ type: 'CLEAR_CANVAS' })
    setClearing(true)
  }

  // Purely a brief visual transition (matches the post-sign-in LoadingScreen
  // pattern in App.jsx) - CLEAR_CANVAS itself is synchronous, there's
  // nothing real to wait for.
  useEffect(() => {
    if (!clearing) return
    const timer = setTimeout(() => setClearing(false), CLEAR_LOADING_MS)
    return () => clearTimeout(timer)
  }, [clearing])

  const hasContent = state.shapeOrder.length > 0
  const exportTriggerRef = useRef(null)
  const exportPanelRef = useRef(null)
  const exportPopover = usePopoverState(exportTriggerRef, exportPanelRef, computeExportPos)

  // PNG is the exact raster diagramExport.js's capture step produced - no
  // further processing. PDF re-embeds that same raster onto a fixed A4
  // page, which a PDF viewer then resamples again to whatever zoom it's
  // showing - one more transformation than PNG goes through, and one more
  // place thin strokes (arrows) can pick up resampling artifacts. PNG is
  // the more accurate/faithful one; PDF exists for when a print-ready,
  // fixed-page-size document is actually what's needed.
  const EXPORTERS = { png: exportDiagramToPng, pdf: exportDiagramToPdf }

  const handleExport = async (format) => {
    if (!hasContent || exporting || !canvasNodeRef?.current) return
    exportPopover.close()
    setExporting(true)
    setExportError(false)
    try {
      await EXPORTERS[format]({
        canvasNode: canvasNodeRef.current,
        shapes: state.shapes,
        shapeOrder: state.shapeOrder,
        arrows: state.arrows,
        arrowOrder: state.arrowOrder,
        fileName: diagramName,
      })
    } catch (error) {
      console.error(`${format.toUpperCase()} export failed:`, error)
      setExportError(true)
    } finally {
      setExporting(false)
    }
  }

  const setZoom = (next) => dispatch({ type: 'SET_ZOOM', zoom: next })

  // Format controls only make sense for exactly one selected shape, or an
  // arrow (its label) - multi-select has no single Bold/Italic/etc. state
  // worth showing, so the whole group hides rather than disables, unlike
  // Delete selected which stays coherent for any selection.
  const selectedShape =
    state.selection?.kind === 'shape' && state.selection.ids.length === 1
      ? state.shapes[state.selection.ids[0]]
      : null
  const selectedArrow = state.selection?.kind === 'arrow' ? state.arrows[state.selection.id] : null
  const formatTarget = selectedShape ?? selectedArrow
  const formatActionType = selectedShape ? 'SET_SHAPE_TEXT_FORMAT' : 'SET_ARROW_TEXT_FORMAT'
  const defaultFontSize = selectedArrow ? DEFAULT_ARROW_FONT_SIZE : DEFAULT_SHAPE_FONT_SIZE
  const currentFontSize = formatTarget?.fontSize ?? defaultFontSize

  const updateFormat = (patch) => {
    if (!formatTarget) return
    dispatch({ type: formatActionType, id: formatTarget.id, patch })
  }

  // Group/Align/Rotate live outside formatTarget's own gating above (unlike
  // Font/Fill/Bold/etc, which only ever mean anything for exactly one
  // target) - Align and Group both require *more than one* shape selected,
  // which is exactly when formatTarget is null (selectedShape only resolves
  // for a single shape), and Rotate is meant to work on either a single
  // shape or a whole multi-selection at once. hasShapeSelectionAny covers
  // both counts; canGroup/canUngroup mirror EditorContextMenu.jsx's own
  // identical logic so the toolbar button and the right-click menu item
  // never disagree about when either is available.
  const hasShapeSelectionAny = state.selection?.kind === 'shape' && state.selection.ids.length > 0
  const hasMultiShapeSelection = hasShapeSelectionAny && state.selection.ids.length > 1
  const canUngroup = hasShapeSelectionAny && Boolean(state.shapes[state.selection.ids[0]]?.groupId)

  const alignSelected = (edge) => {
    dispatch({ type: 'ALIGN_SELECTED', edge })
    alignPopover.close()
  }

  const rotateSelected = (delta) => dispatch({ type: 'ROTATE_SELECTED', delta })

  // Corner rounding and border style both only make sense for the shape
  // types that already have their own visible border/box - a label's
  // ShapeBody renders one too, but only once it's actually been given a
  // fill (see Shape.jsx), and even then keeps a fixed rounding/solid border
  // rather than user-tunable ones, to keep this scoped to what was asked
  // for. Shared by both controls below rather than one flag each, since
  // they're gated identically.
  const showShapeBorderControls = Boolean(selectedShape) && selectedShape.type !== 'label'
  const currentCornerRadius = selectedShape
    ? (selectedShape.cornerRadius ?? DEFAULT_CORNER_RADIUS_BY_TYPE[selectedShape.type] ?? 0)
    : 0

  const updateCornerRadius = (radius) => {
    if (!selectedShape) return
    dispatch({ type: 'SET_SHAPE_CORNER_RADIUS', id: selectedShape.id, radius })
  }

  // Width/Height - typed exact values alongside the existing drag-to-resize
  // handles (ShapeHandles.jsx), not a replacement for them. erdTable is
  // excluded: its height isn't a free-form box, it's derived from its own
  // row count (ERD_HEADER_HEIGHT + rows.length * ERD_ROW_HEIGHT, see
  // Shape.jsx's ErdTableBody) - typing an arbitrary height here would just
  // fight that on the next row add/remove.
  const showSizeControl = Boolean(selectedShape) && selectedShape.type !== 'erdTable'
  // RESIZE_SHAPE is a CONTINUOUS_TYPES entry (historyReducer.js) - a drag
  // dispatches it many times per gesture and relies on a matching DRAG_END
  // to close it back out into one undo step. This is a single one-shot
  // commit (on blur/Enter, not a drag), but still has to pair its own
  // dispatch with a DRAG_END right after for the exact same reason the
  // corner radius slider's onPointerUp/onKeyUp/onBlur do - otherwise
  // isDragging gets stuck true and silently breaks every undo checkpoint
  // after it (see historyReducer.js's own comment on this failure mode).
  const commitSize = (field, rawValue) => {
    if (!selectedShape) return
    const parsed = Math.round(Number(rawValue))
    if (!Number.isFinite(parsed)) return
    const min = field === 'width' ? MIN_SHAPE_WIDTH : MIN_SHAPE_HEIGHT
    const clamped = Math.max(min, parsed)
    const current = field === 'width' ? selectedShape.width : selectedShape.height
    if (clamped === current) return
    dispatch({
      type: 'RESIZE_SHAPE',
      id: selectedShape.id,
      x: selectedShape.x,
      y: selectedShape.y,
      width: field === 'width' ? clamped : selectedShape.width,
      height: field === 'height' ? clamped : selectedShape.height,
    })
    dispatch({ type: 'DRAG_END' })
  }

  // One Fill control, shared by shapes and arrows rather than two separate
  // inputs - a shape's fillColor and an arrow's color are different fields
  // (SET_SHAPE_FILL_COLOR vs SET_ARROW_COLOR below), but never both
  // relevant at once, since a selection is always exactly one kind or the
  // other.
  const currentFillColor = selectedShape
    ? (selectedShape.fillColor ?? DEFAULT_FILL_COLOR_BY_TYPE[selectedShape.type] ?? '#8b5cf6')
    : selectedArrow
      ? selectedArrow.color || DEFAULT_ARROW_COLOR
      : '#8b5cf6'
  const fillColorInputRef = useRef(null)

  // One Line style control, shared by shapes and arrows the same way Fill
  // is above - a shape's borderStyle and an arrow's lineStyle are different
  // fields (SET_SHAPE_BORDER_STYLE vs SET_ARROW_LINE_STYLE below), but never
  // both relevant at once. Gated on showShapeBorderControls for a shape (see
  // that flag's own comment - label excluded) and unconditionally for an
  // arrow, matching Fill's own gating.
  const currentLineStyle = selectedShape
    ? (selectedShape.borderStyle ?? 'solid')
    : (selectedArrow?.lineStyle ?? 'solid')
  const showLineStyleControl = Boolean(selectedArrow) || (Boolean(selectedShape) && showShapeBorderControls)
  const lineStyleTriggerRef = useRef(null)
  const lineStylePanelRef = useRef(null)
  const lineStylePopover = usePopoverState(lineStyleTriggerRef, lineStylePanelRef)

  // Arrow-only (a shape has no equivalent concept of "connector type" or
  // "which end has a head") - geometry and heads are two separate controls
  // since they're two separate fields (connectorType vs startArrow/endArrow),
  // but both only ever apply to selectedArrow.
  const currentConnectorType = selectedArrow?.connectorType ?? 'shape'
  const setConnectorType = (connectorType) => {
    if (!selectedArrow) return
    dispatch({ type: 'SET_ARROW_CONNECTOR', id: selectedArrow.id, connectorType })
    connectorTypePopover.close()
  }
  const connectorTypeTriggerRef = useRef(null)
  const connectorTypePanelRef = useRef(null)
  const connectorTypePopover = usePopoverState(connectorTypeTriggerRef, connectorTypePanelRef)

  // Heads only make sense for the plain triangle marker - an ERD arrow's
  // ends are already independently configurable via its own cardinality
  // pickers (ArrowCardinalityPickers.jsx), a different, richer glyph system
  // this app already has, not a fit for a generic "arrowhead on/off" toggle.
  const showArrowHeadControl = Boolean(selectedArrow) && currentConnectorType !== 'erd'
  const currentStartArrow = Boolean(selectedArrow?.startArrow)
  const currentEndArrow = selectedArrow?.endArrow ?? true
  const setArrowHeads = (startArrow, endArrow) => {
    if (!selectedArrow) return
    dispatch({ type: 'SET_ARROW_HEADS', id: selectedArrow.id, startArrow, endArrow })
  }

  // One Opacity control, shared by shapes and arrows the same way Fill/Line
  // style are above - SET_SHAPE_OPACITY vs SET_ARROW_OPACITY are different
  // actions, but currentOpacity/updateOpacity already resolve to the right
  // one from formatTarget the same way currentFillColor does.
  const currentOpacity = formatTarget?.opacity ?? 100
  const updateOpacity = (opacity) => {
    if (selectedShape) {
      dispatch({ type: 'SET_SHAPE_OPACITY', id: selectedShape.id, opacity })
    } else if (selectedArrow) {
      dispatch({ type: 'SET_ARROW_OPACITY', id: selectedArrow.id, opacity })
    }
  }
  const opacityTriggerRef = useRef(null)
  const opacityPanelRef = useRef(null)
  const opacityPopover = usePopoverState(opacityTriggerRef, opacityPanelRef)

  // Two tabs, both genuinely functional (not placeholders): Home holds the
  // general canvas actions, Format holds the per-shape/arrow typography
  // controls. Format is always clickable (not disabled without a selection)
  // so a user can open it to see what's there - the actual controls still
  // only render once formatTarget exists (see below), since there's
  // nothing to apply a font/color/etc to otherwise.
  const [activeTab, setActiveTab] = useState('home')

  const cornerTriggerRef = useRef(null)
  const cornerPanelRef = useRef(null)
  const cornerPopover = usePopoverState(cornerTriggerRef, cornerPanelRef)

  const alignTriggerRef = useRef(null)
  const alignPanelRef = useRef(null)
  const alignPopover = usePopoverState(alignTriggerRef, alignPanelRef)

  const fontSizeTriggerRef = useRef(null)
  const fontSizePanelRef = useRef(null)
  const fontSizePopover = usePopoverState(fontSizeTriggerRef, fontSizePanelRef)

  const zoomTriggerRef = useRef(null)
  const zoomPanelRef = useRef(null)
  const zoomPopover = usePopoverState(zoomTriggerRef, zoomPanelRef)

  // Switching the selection (a different shape/arrow, or none) while a
  // format popover is open would otherwise leave it open and silently
  // retargeted to whatever's newly selected - close it so it only ever
  // reflects what the user opened it for. Adjusting state during render
  // (React's own documented pattern for "reset state when a prop changes")
  // instead of an effect, so this doesn't cost an extra commit-then-render
  // cascade. Corner radius only ever applies to a selected shape (never an
  // arrow), so it tracks selectedShape specifically rather than
  // formatTarget - otherwise switching between two arrows (formatTarget
  // changes, selectedShape stays null throughout) wouldn't close it. Zoom
  // isn't tied to any selection at all, so it gets no such effect.
  const [lastCornerShapeId, setLastCornerShapeId] = useState(selectedShape?.id)
  if (selectedShape?.id !== lastCornerShapeId) {
    setLastCornerShapeId(selectedShape?.id)
    cornerPopover.close()
  }
  // formatTarget alone can't key this anymore now that Group/Align/Rotate
  // also live on this tab (see their own comment above) - it stays null
  // through a marquee-select-from-nothing gesture (nothing selected -> a
  // multi-shape selection), which is exactly the main way a user reaches
  // Group/Align in the first place, so formatKey folds hasMultiShapeSelection
  // in too: nothing selected and a multi-selection both look like "no single
  // target," but only one of them should actually be treated as "no format
  // key transition happened."
  const formatKey = formatTarget?.id ?? (hasMultiShapeSelection ? 'multi' : null)
  const [lastFormatKey, setLastFormatKey] = useState(formatKey)
  if (formatKey !== lastFormatKey) {
    setLastFormatKey(formatKey)
    fontSizePopover.close()
    // Line style/Opacity are shared by shapes and arrows (see
    // currentLineStyle/currentOpacity above), so they close on *any*
    // format-target change - switching between two arrows, or an arrow and
    // a shape - not just a shape-to-shape one the way corner radius's own
    // close (above) only needs to.
    lineStylePopover.close()
    opacityPopover.close()
    // Connector type is arrow-only, but closing it unconditionally here
    // (rather than tracking a separate selectedArrow-keyed id) is simpler
    // and harmless - it's already closed on every shape selection, since
    // formatKey changing to a shape's id is itself a "different target" the
    // same as switching arrows would be.
    connectorTypePopover.close()
    alignPopover.close()
    // Selecting something jumps straight to the Format tab; losing the
    // selection (Escape, Delete, clicking empty canvas) falls back to Home
    // rather than leaving a now-disabled Format tab showing as active. Keyed
    // off the same id transition as the popover-close above, so this only
    // fires on an actual selection *change* - once you're on Format you can
    // still switch back to Home yourself (to hit Undo, say) without every
    // unrelated render snapping you back.
    setActiveTab(formatKey ? 'format' : 'home')
  }

  // input[type=color]'s React onChange fires on every native `input` event,
  // which Chromium's in-page picker emits continuously while the user drags
  // inside it - wiring dispatch straight to onChange would turn one color
  // pick into a dozen-plus undo checkpoints. Commit only on the native
  // `change` event (fires once, on close/commit) instead, matching this
  // editor's existing precedent for the same class of problem (the wheel
  // listener in EditorCanvas.jsx is also attached natively rather than via
  // JSX, for the same "React's synthetic event doesn't give enough
  // granularity" reason).
  //
  // The input itself is deliberately UNCONTROLLED (no `value` prop) - a
  // controlled input paired with a no-op onChange fights React's own input
  // value tracking the moment the native picker commits a value, which can
  // silently revert the swatch back to its old value right as the `change`
  // event fires. Syncing `.value` imperatively below, only when the actual
  // underlying color changes, avoids that fight entirely while still keeping
  // the swatch in sync with undo/redo or switching the selection.
  useEffect(() => {
    const input = colorInputRef.current
    if (!input || !formatTarget) return
    const handleChange = (event) => updateFormat({ textColor: event.target.value })
    input.addEventListener('change', handleChange)
    return () => input.removeEventListener('change', handleChange)
    // Deliberately narrower than "everything referenced inside": re-attaching
    // only needs to happen when the target's id (or shape/arrow kind)
    // changes - updateFormat/formatTarget change on every unrelated field
    // edit (new object reference each dispatch) but always resolve to the
    // same id/action type in between, so the handler stays correct without
    // needing to reattach then too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatTarget?.id, formatActionType])

  useEffect(() => {
    const input = colorInputRef.current
    if (!input) return
    input.value = formatTarget?.textColor ?? '#14121f'
  }, [formatTarget?.textColor])

  // Same native-`change`-only commit reasoning as the text color input above,
  // wired to its own ref since it's a separate input/property (the shape's
  // own fill/border theme, not its text). One handler covers both a shape's
  // fillColor and an arrow's own line color - whichever of the two is
  // currently selected - since currentFillColor above already unifies which
  // one this input represents.
  useEffect(() => {
    const input = fillColorInputRef.current
    if (!input || !formatTarget) return
    const handleChange = (event) => {
      if (selectedShape) {
        dispatch({ type: 'SET_SHAPE_FILL_COLOR', id: selectedShape.id, color: event.target.value })
      } else if (selectedArrow) {
        dispatch({ type: 'SET_ARROW_COLOR', id: selectedArrow.id, color: event.target.value })
      }
    }
    input.addEventListener('change', handleChange)
    return () => input.removeEventListener('change', handleChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formatTarget?.id])

  useEffect(() => {
    const input = fillColorInputRef.current
    if (!input) return
    input.value = currentFillColor
  }, [currentFillColor])

  const setLineStyle = (lineStyle) => {
    if (selectedShape) {
      dispatch({ type: 'SET_SHAPE_BORDER_STYLE', id: selectedShape.id, borderStyle: lineStyle })
    } else if (selectedArrow) {
      dispatch({ type: 'SET_ARROW_LINE_STYLE', id: selectedArrow.id, lineStyle })
    }
    lineStylePopover.close()
  }

  const divider = <span className="mx-0.5 h-9 w-px shrink-0 self-center bg-line" />

  return (
    // A docked top navigation bar, not a floating pill - full-width, sits in
    // normal document flow as its own row above the canvas (see Editor.jsx,
    // which renders this before EditorCanvas rather than layering it on top
    // via absolute positioning), with a Home/Format tab row above the
    // toolbar row itself (see the tab buttons just below).
    <>
      {/* Category tabs, ribbon-style - Home is the general canvas actions,
          Format is the per-shape/arrow typography controls (disabled until
          something's selected, since there's nothing to format otherwise).
          Both are genuinely functional groupings of this app's own existing
          controls, not placeholders standing in for tabs the reference image
          had that this system doesn't (Design/Page/Table/etc). */}
      <div className="flex w-full shrink-0 items-center gap-1 border-b border-line bg-surface-soft/50 px-3 pt-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          aria-pressed={activeTab === 'home'}
          className={`rounded-t-md border border-b-0 px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
            activeTab === 'home'
              ? 'border-line bg-white text-ink'
              : 'border-transparent text-soft hover:text-ink'
          }`}
        >
          Home
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('format')}
          aria-pressed={activeTab === 'format'}
          className={`rounded-t-md border border-b-0 px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
            activeTab === 'format'
              ? 'border-line bg-white text-ink'
              : 'border-transparent text-soft hover:text-ink'
          }`}
        >
          Format
        </button>
      </div>

      <div className="flex w-full shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-white px-2 py-1.5">
        {activeTab === 'home' && (
          <>
            <RibbonButton
              icon={<UndoIcon />}
              label="Undo"
              onClick={() => dispatch({ type: 'UNDO' })}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            />
            <RibbonButton
              icon={<RedoIcon />}
              label="Redo"
              onClick={() => dispatch({ type: 'REDO' })}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
            />

            {divider}

            <RibbonButton
              icon={<GridIcon />}
              label="Grid"
              onClick={() => dispatch({ type: 'TOGGLE_GRID' })}
              title={state.showGrid ? 'Hide grid' : 'Show grid'}
            />

            {/* Zoom out/in flank the existing percent-and-presets trigger -
                that dropdown alone had no fine-grained step control, only
                jumps between fixed presets. Same ZOOM_STEP the canvas's own
                Ctrl+Wheel zoom already uses (EditorCanvas.jsx), so a button
                click and a scroll tick move the same amount. Merged into one
                bordered cluster rather than three freestanding controls -
                matches this toolbar's own convention for a tightly related
                set (Font family+size, B/I/U, align L/C/R, all do the same). */}
            <div className="flex shrink-0 items-center overflow-hidden rounded-md border border-line">
              <button
                type="button"
                onClick={() => setZoom(zoom - ZOOM_STEP)}
                disabled={zoom <= MIN_ZOOM}
                title="Zoom out"
                aria-label="Zoom out"
                className="flex h-8 w-7 items-center justify-center text-[15px] font-medium text-body transition-colors hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-40"
              >
                −
              </button>
              <button
                ref={zoomTriggerRef}
                type="button"
                onClick={zoomPopover.toggle}
                aria-haspopup="true"
                aria-expanded={zoomPopover.open}
                title="Zoom level"
                aria-label="Zoom level"
                className={`flex h-8 shrink-0 items-center gap-1 self-center border-x border-line px-2 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-soft ${
                  zoomPopover.open ? 'bg-surface-soft' : ''
                }`}
              >
                {Math.round(zoom * 100)}%
                <ChevronDownIcon />
              </button>
              <button
                type="button"
                onClick={() => setZoom(zoom + ZOOM_STEP)}
                disabled={zoom >= MAX_ZOOM}
                title="Zoom in"
                aria-label="Zoom in"
                className="flex h-8 w-7 items-center justify-center text-[15px] font-medium text-body transition-colors hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-40"
              >
                +
              </button>
            </div>
          </>
        )}

        {activeTab === 'home' &&
          zoomPopover.open &&
          zoomPopover.pos &&
          createPortal(
            <div
              ref={zoomPanelRef}
              className="fixed z-30 max-h-56 w-20 -translate-x-1/2 overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-lg"
              style={{ left: zoomPopover.pos.left, top: zoomPopover.pos.top }}
            >
              {ZOOM_PRESETS.map((percent) => (
                <button
                  key={percent}
                  type="button"
                  onClick={() => {
                    setZoom(percent / 100)
                    zoomPopover.close()
                  }}
                  className={`block w-full rounded-md px-2 py-1.5 text-left text-[12.5px] font-medium transition-colors hover:bg-surface-soft ${
                    percent === Math.round(zoom * 100) ? 'bg-surface-soft text-ink' : 'text-body'
                  }`}
                >
                  {percent}%
                </button>
              ))}
            </div>,
            document.body,
          )}

        {activeTab === 'home' && !readOnly && (
          <>
            {divider}

            <RibbonButton
              icon={<TrashIcon />}
              label="Delete"
              onClick={() => dispatch({ type: 'DELETE_SELECTED' })}
              disabled={!state.selection}
              title="Delete selected"
            />
            <RibbonButton
              icon={<ClearAllIcon />}
              label="Clear"
              onClick={requestClear}
              title="Clear canvas"
              tone="danger"
            />
          </>
        )}

        {activeTab === 'home' && (
          // Not gated by readOnly - exporting is a read-only, non-mutating
          // action (just saves a snapshot), so a viewer can use it same as
          // an owner/editor can, matching this button's behavior from
          // before it lived in this toolbar.
          <>
            <RibbonButton
              triggerRef={exportTriggerRef}
              icon={<DownloadIcon />}
              label={exporting ? '…' : exportError ? 'Failed' : 'Export'}
              onClick={exportPopover.toggle}
              disabled={!hasContent || exporting}
              aria-haspopup="true"
              aria-expanded={exportPopover.open}
              title={
                exportError
                  ? 'Export failed - try again'
                  : hasContent
                    ? 'Export this diagram'
                    : 'Add a shape before exporting'
              }
              className="ml-auto"
            />

            {exportPopover.open &&
              exportPopover.pos &&
              createPortal(
                <div
                  ref={exportPanelRef}
                  className="fixed z-30 w-52 rounded-xl border border-line bg-white p-1.5 shadow-lg"
                  style={exportPopover.pos}
                >
                  <button
                    type="button"
                    onClick={() => handleExport('png')}
                    className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-soft"
                  >
                    <span className="text-[13px] font-medium text-ink">PNG image</span>
                    <span className="text-[11px] text-soft">
                      Exact pixel snapshot - most accurate
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('pdf')}
                    className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-soft"
                  >
                    <span className="text-[13px] font-medium text-ink">PDF document</span>
                    <span className="text-[11px] text-soft">Fixed A4 page, for printing</span>
                  </button>
                </div>,
                document.body,
              )}
          </>
        )}

        {activeTab === 'format' && formatTarget && !readOnly && (
          <>
            <FormatGroup label="Font">
              <div className="flex shrink-0 items-center overflow-hidden rounded-md border border-line">
                <select
                  value={formatTarget.fontFamily ?? DEFAULT_FONT_ID}
                  onChange={(event) => updateFormat({ fontFamily: event.target.value })}
                  title="Font family"
                  aria-label="Font family"
                  className="h-8 shrink-0 bg-white px-2 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-soft"
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.id} value={font.id}>
                      {font.label}
                    </option>
                  ))}
                </select>

                <button
                  ref={fontSizeTriggerRef}
                  type="button"
                  onClick={fontSizePopover.toggle}
                  aria-haspopup="true"
                  aria-expanded={fontSizePopover.open}
                  title="Font size"
                  aria-label="Font size"
                  className={`flex h-8 shrink-0 items-center gap-1 border-l border-line px-2 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-soft ${
                    fontSizePopover.open ? 'bg-surface-soft' : ''
                  }`}
                >
                  {currentFontSize}
                  <ChevronDownIcon />
                </button>
              </div>
            </FormatGroup>

            {fontSizePopover.open &&
              fontSizePopover.pos &&
              createPortal(
                <div
                  ref={fontSizePanelRef}
                  className="fixed z-30 max-h-56 w-16 -translate-x-1/2 overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-lg"
                  style={{ left: fontSizePopover.pos.left, top: fontSizePopover.pos.top }}
                >
                  {FONT_SIZE_PRESETS.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        updateFormat({ fontSize: size })
                        fontSizePopover.close()
                      }}
                      className={`block w-full rounded-md px-2 py-1.5 text-left text-[12.5px] font-medium transition-colors hover:bg-surface-soft ${
                        size === currentFontSize ? 'bg-surface-soft text-ink' : 'text-body'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>,
                document.body,
              )}

            {divider}

            <FormatGroup label="Text">
              <input
                ref={colorInputRef}
                type="color"
                defaultValue={formatTarget.textColor ?? '#14121f'}
                title="Text color"
                aria-label="Text color"
                className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-line p-0.5"
              />

              <div className="flex shrink-0 items-center overflow-hidden rounded-md border border-line">
                <button
                  type="button"
                  onClick={() => updateFormat({ bold: !formatTarget.bold })}
                  aria-pressed={Boolean(formatTarget.bold)}
                  title="Bold"
                  aria-label="Bold"
                  className={`flex h-8 w-8 items-center justify-center text-[13px] font-bold transition-colors hover:bg-surface-soft ${
                    formatTarget.bold ? 'bg-surface-soft text-ink' : 'text-body'
                  }`}
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => updateFormat({ italic: !formatTarget.italic })}
                  aria-pressed={Boolean(formatTarget.italic)}
                  title="Italic"
                  aria-label="Italic"
                  className={`flex h-8 w-8 items-center justify-center border-l border-line text-[13px] italic transition-colors hover:bg-surface-soft ${
                    formatTarget.italic ? 'bg-surface-soft text-ink' : 'text-body'
                  }`}
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => updateFormat({ underline: !formatTarget.underline })}
                  aria-pressed={Boolean(formatTarget.underline)}
                  title="Underline"
                  aria-label="Underline"
                  className={`flex h-8 w-8 items-center justify-center border-l border-line text-[13px] underline transition-colors hover:bg-surface-soft ${
                    formatTarget.underline ? 'bg-surface-soft text-ink' : 'text-body'
                  }`}
                >
                  U
                </button>
              </div>

              {/* Text align - left/center/right of the text *within*
                  formatTarget's own box, via the same generic textAlign patch
                  field textFormatStyle applies (see that file's own comment).
                  None of the three shows pressed when formatTarget.textAlign
                  is unset, rather than guessing 'left' - an untouched shape's
                  *actual* alignment varies by type (most center their text,
                  a few like label don't), and there's no single default here
                  that would be honest for all of them. */}
              <div className="flex shrink-0 items-center overflow-hidden rounded-md border border-line">
                <button
                  type="button"
                  onClick={() => updateFormat({ textAlign: 'left' })}
                  aria-pressed={formatTarget.textAlign === 'left'}
                  title="Align text left"
                  aria-label="Align text left"
                  className={`flex h-8 w-8 items-center justify-center transition-colors hover:bg-surface-soft ${
                    formatTarget.textAlign === 'left' ? 'bg-surface-soft text-ink' : 'text-body'
                  }`}
                >
                  <TextAlignLeftIcon />
                </button>
                <button
                  type="button"
                  onClick={() => updateFormat({ textAlign: 'center' })}
                  aria-pressed={formatTarget.textAlign === 'center'}
                  title="Align text center"
                  aria-label="Align text center"
                  className={`flex h-8 w-8 items-center justify-center border-l border-line transition-colors hover:bg-surface-soft ${
                    formatTarget.textAlign === 'center' ? 'bg-surface-soft text-ink' : 'text-body'
                  }`}
                >
                  <TextAlignCenterIcon />
                </button>
                <button
                  type="button"
                  onClick={() => updateFormat({ textAlign: 'right' })}
                  aria-pressed={formatTarget.textAlign === 'right'}
                  title="Align text right"
                  aria-label="Align text right"
                  className={`flex h-8 w-8 items-center justify-center border-l border-line transition-colors hover:bg-surface-soft ${
                    formatTarget.textAlign === 'right' ? 'bg-surface-soft text-ink' : 'text-body'
                  }`}
                >
                  <TextAlignRightIcon />
                </button>
              </div>
            </FormatGroup>

            {divider}

            <FormatGroup label="Style">
              {/* Fill - one control shared by shapes (any type, including
                  label - see Shape.jsx) and arrows, since formatTarget is
                  always exactly one or the other and currentFillColor/the
                  commit effect above already resolve to the right field
                  either way. FillIcon is purely decorative (the swatch itself
                  is still the real, only control) - it just labels the swatch
                  the same "icon means something" way Group/Align/Rotate's own
                  buttons read, instead of leaving it the one unlabeled color
                  square in the row. */}
              <span
                title="Fill color"
                className="flex h-8 shrink-0 items-center gap-1 rounded-md border border-line pl-1.5 pr-0.5 text-soft"
              >
                <FillIcon />
                <input
                  ref={fillColorInputRef}
                  type="color"
                  defaultValue={currentFillColor}
                  title="Fill color"
                  aria-label="Fill color"
                  className="h-6 w-6 shrink-0 cursor-pointer rounded p-0.5"
                />
              </span>

              {showLineStyleControl && (
                <button
                  ref={lineStyleTriggerRef}
                  type="button"
                  onClick={lineStylePopover.toggle}
                  aria-haspopup="true"
                  aria-expanded={lineStylePopover.open}
                  aria-pressed={lineStylePopover.open}
                  title="Line style"
                  aria-label="Line style"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line transition-colors hover:bg-surface-soft ${
                    lineStylePopover.open ? 'bg-surface-soft text-ink' : 'text-body'
                  }`}
                >
                  <LineStyleIcon />
                </button>
              )}

              {showShapeBorderControls && (
                <button
                  ref={cornerTriggerRef}
                  type="button"
                  onClick={cornerPopover.toggle}
                  aria-pressed={cornerPopover.open}
                  title="Corner radius"
                  aria-label="Corner radius"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line transition-colors hover:bg-surface-soft ${
                    cornerPopover.open ? 'bg-surface-soft text-ink' : 'text-body'
                  }`}
                >
                  <CornerRadiusIcon />
                </button>
              )}
            </FormatGroup>

            {showLineStyleControl &&
              lineStylePopover.open &&
              lineStylePopover.pos &&
              createPortal(
                <div
                  ref={lineStylePanelRef}
                  className="fixed z-30 w-32 rounded-xl border border-line bg-white p-1 shadow-lg"
                  style={lineStylePopover.pos}
                >
                  <button
                    type="button"
                    onClick={() => setLineStyle('solid')}
                    className={`block w-full rounded-md px-2 py-1.5 text-left text-[12.5px] font-medium transition-colors hover:bg-surface-soft ${
                      currentLineStyle === 'solid' ? 'bg-surface-soft text-ink' : 'text-body'
                    }`}
                  >
                    Solid
                  </button>
                  <button
                    type="button"
                    onClick={() => setLineStyle('dashed')}
                    className={`block w-full rounded-md px-2 py-1.5 text-left text-[12.5px] font-medium transition-colors hover:bg-surface-soft ${
                      currentLineStyle === 'dashed' ? 'bg-surface-soft text-ink' : 'text-body'
                    }`}
                  >
                    Dashed
                  </button>
                  <button
                    type="button"
                    onClick={() => setLineStyle('dotted')}
                    className={`block w-full rounded-md px-2 py-1.5 text-left text-[12.5px] font-medium transition-colors hover:bg-surface-soft ${
                      currentLineStyle === 'dotted' ? 'bg-surface-soft text-ink' : 'text-body'
                    }`}
                  >
                    Dotted
                  </button>
                </div>,
                document.body,
              )}

            {showShapeBorderControls &&
              cornerPopover.open &&
              cornerPopover.pos &&
              createPortal(
                <div
                  ref={cornerPanelRef}
                  className="fixed z-30 flex w-48 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-white p-3 shadow-lg"
                  style={{ left: cornerPopover.pos.left, top: cornerPopover.pos.top }}
                >
                  <span className="shrink-0 text-[12px] font-medium text-soft">Corner radius</span>
                  <input
                    type="range"
                    min={MIN_CORNER_RADIUS}
                    max={MAX_CORNER_RADIUS}
                    value={currentCornerRadius}
                    onChange={(event) => updateCornerRadius(Number(event.target.value))}
                    // Coalesced into one undo step per drag (see
                    // CONTINUOUS_TYPES in historyReducer.js) - these three
                    // close that gesture out, covering mouse release,
                    // releasing an arrow key, and losing focus entirely,
                    // so it can never get stuck open the way a drag
                    // lacking its matching DRAG_END would (see that
                    // file's own comment on exactly this failure mode).
                    onPointerUp={() => dispatch({ type: 'DRAG_END' })}
                    onKeyUp={() => dispatch({ type: 'DRAG_END' })}
                    onBlur={() => dispatch({ type: 'DRAG_END' })}
                    title="Corner radius"
                    aria-label="Corner radius"
                    className="h-1.5 min-w-0 flex-1 shrink-0 cursor-pointer accent-brand-purple"
                  />
                  <span className="w-6 shrink-0 text-right text-[12.5px] font-medium text-ink">
                    {currentCornerRadius}
                  </span>
                </div>,
                document.body,
              )}

            {showSizeControl && (
              <>
                {divider}

                <FormatGroup label="Size">
                  <div className="flex shrink-0 items-center overflow-hidden rounded-md border border-line">
                    <label className="flex h-8 shrink-0 items-center gap-1 pl-1.5 pr-1 text-[10px] font-semibold uppercase text-soft">
                      W
                      <input
                        key={`w-${selectedShape.id}`}
                        type="number"
                        min={MIN_SHAPE_WIDTH}
                        step={1}
                        defaultValue={Math.round(selectedShape.width)}
                        onBlur={(event) => commitSize('width', event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') event.currentTarget.blur()
                        }}
                        title="Width"
                        aria-label="Width"
                        className="w-11 shrink-0 bg-white text-[12.5px] font-medium normal-case text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </label>
                    <label className="flex h-8 shrink-0 items-center gap-1 border-l border-line pl-1.5 pr-1 text-[10px] font-semibold uppercase text-soft">
                      H
                      <input
                        key={`h-${selectedShape.id}`}
                        type="number"
                        min={MIN_SHAPE_HEIGHT}
                        step={1}
                        defaultValue={Math.round(selectedShape.height)}
                        onBlur={(event) => commitSize('height', event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') event.currentTarget.blur()
                        }}
                        title="Height"
                        aria-label="Height"
                        className="w-11 shrink-0 bg-white text-[12.5px] font-medium normal-case text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </label>
                  </div>
                </FormatGroup>
              </>
            )}

            {/* Arrow-only: connector geometry (straight/curved/orthogonal/
                ERD) and which end(s) show a triangle head - both previously
                only choosable at draw time (EditorSidebar's Draw Arrow
                dropdown), now editable on an arrow that already exists. */}
            {selectedArrow && (
              <>
                {divider}

                <FormatGroup label="Arrow">
                  <button
                    ref={connectorTypeTriggerRef}
                    type="button"
                    onClick={connectorTypePopover.toggle}
                    aria-haspopup="true"
                    aria-expanded={connectorTypePopover.open}
                    aria-pressed={connectorTypePopover.open}
                    title="Connector type"
                    aria-label="Connector type"
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line transition-colors hover:bg-surface-soft ${
                      connectorTypePopover.open ? 'bg-surface-soft text-ink' : 'text-body'
                    }`}
                  >
                    <ConnectorTypeIcon type={currentConnectorType} />
                  </button>

                  {showArrowHeadControl && (
                    <div className="flex shrink-0 items-center overflow-hidden rounded-md border border-line">
                      <button
                        type="button"
                        onClick={() => setArrowHeads(false, true)}
                        aria-pressed={!currentStartArrow && currentEndArrow}
                        title="Arrowhead at end"
                        aria-label="Arrowhead at end"
                        className={`flex h-8 w-8 items-center justify-center transition-colors hover:bg-surface-soft ${
                          !currentStartArrow && currentEndArrow ? 'bg-surface-soft text-ink' : 'text-body'
                        }`}
                      >
                        <ArrowHeadEndIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => setArrowHeads(true, true)}
                        aria-pressed={currentStartArrow && currentEndArrow}
                        title="Arrowhead at both ends"
                        aria-label="Arrowhead at both ends"
                        className={`flex h-8 w-8 items-center justify-center border-l border-line transition-colors hover:bg-surface-soft ${
                          currentStartArrow && currentEndArrow ? 'bg-surface-soft text-ink' : 'text-body'
                        }`}
                      >
                        <ArrowHeadBothIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => setArrowHeads(false, false)}
                        aria-pressed={!currentStartArrow && !currentEndArrow}
                        title="No arrowheads"
                        aria-label="No arrowheads"
                        className={`flex h-8 w-8 items-center justify-center border-l border-line transition-colors hover:bg-surface-soft ${
                          !currentStartArrow && !currentEndArrow ? 'bg-surface-soft text-ink' : 'text-body'
                        }`}
                      >
                        <ArrowHeadNoneIcon />
                      </button>
                    </div>
                  )}
                </FormatGroup>

                {connectorTypePopover.open &&
                  connectorTypePopover.pos &&
                  createPortal(
                    <div
                      ref={connectorTypePanelRef}
                      className="fixed z-30 w-40 rounded-xl border border-line bg-white p-1 shadow-lg"
                      style={connectorTypePopover.pos}
                    >
                      {ARROW_CONNECTOR_TYPES.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setConnectorType(c.key)}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] font-medium transition-colors hover:bg-surface-soft ${
                            currentConnectorType === c.key ? 'bg-surface-soft text-ink' : 'text-body'
                          }`}
                        >
                          <ConnectorTypeIcon type={c.key} />
                          {c.label}
                        </button>
                      ))}
                    </div>,
                    document.body,
                  )}
              </>
            )}

            {divider}

            <FormatGroup label="Opacity">
              <button
                ref={opacityTriggerRef}
                type="button"
                onClick={opacityPopover.toggle}
                aria-haspopup="true"
                aria-expanded={opacityPopover.open}
                aria-pressed={opacityPopover.open}
                title="Opacity"
                aria-label="Opacity"
                className={`flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-line px-2 text-[12.5px] font-medium transition-colors hover:bg-surface-soft ${
                  opacityPopover.open ? 'bg-surface-soft text-ink' : 'text-body'
                }`}
              >
                <OpacityIcon />
                {currentOpacity}%
              </button>
            </FormatGroup>

            {opacityPopover.open &&
              opacityPopover.pos &&
              createPortal(
                <div
                  ref={opacityPanelRef}
                  className="fixed z-30 flex w-48 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-white p-3 shadow-lg"
                  style={{ left: opacityPopover.pos.left, top: opacityPopover.pos.top }}
                >
                  <span className="shrink-0 text-[12px] font-medium text-soft">Opacity</span>
                  <input
                    type="range"
                    min={MIN_OPACITY}
                    max={MAX_OPACITY}
                    value={currentOpacity}
                    onChange={(event) => updateOpacity(Number(event.target.value))}
                    // Same coalesced-into-one-undo-step reasoning as the
                    // corner radius slider above.
                    onPointerUp={() => dispatch({ type: 'DRAG_END' })}
                    onKeyUp={() => dispatch({ type: 'DRAG_END' })}
                    onBlur={() => dispatch({ type: 'DRAG_END' })}
                    title="Opacity"
                    aria-label="Opacity"
                    className="h-1.5 min-w-0 flex-1 shrink-0 cursor-pointer accent-brand-purple"
                  />
                  <span className="w-9 shrink-0 text-right text-[12.5px] font-medium text-ink">
                    {currentOpacity}%
                  </span>
                </div>,
                document.body,
              )}
          </>
        )}

        {/* Arrange/Align/Group - outside formatTarget's own gating above (see
            hasShapeSelectionAny's own comment) since Align/Group only ever
            make sense for a multi-shape selection, which is exactly when
            formatTarget is null. Rotate/front-back/Duplicate alone work for
            either a single shape or a whole multi-selection. */}
        {activeTab === 'format' && hasShapeSelectionAny && !readOnly && (
          <>
            {formatTarget && divider}

            <FormatGroup label="Arrange">
              <div className="flex shrink-0 items-center overflow-hidden rounded-md border border-line">
                <button
                  type="button"
                  onClick={() => rotateSelected(-90)}
                  title="Rotate left 90°"
                  aria-label="Rotate left 90°"
                  className="flex h-8 w-8 items-center justify-center text-body transition-colors hover:bg-surface-soft hover:text-ink"
                >
                  <RotateLeftIcon />
                </button>
                <button
                  type="button"
                  onClick={() => rotateSelected(90)}
                  title="Rotate right 90°"
                  aria-label="Rotate right 90°"
                  className="flex h-8 w-8 items-center justify-center border-l border-line text-body transition-colors hover:bg-surface-soft hover:text-ink"
                >
                  <RotateRightIcon />
                </button>
              </div>

              <button
                type="button"
                onClick={() => dispatch({ type: 'BRING_TO_FRONT' })}
                title="Bring to front"
                aria-label="Bring to front"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line text-body transition-colors hover:bg-surface-soft hover:text-ink"
              >
                <BringToFrontIcon />
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'SEND_TO_BACK' })}
                title="Send to back"
                aria-label="Send to back"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line text-body transition-colors hover:bg-surface-soft hover:text-ink"
              >
                <SendToBackIcon />
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'DUPLICATE_SELECTED' })}
                title="Duplicate (Ctrl+D)"
                aria-label="Duplicate"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line text-body transition-colors hover:bg-surface-soft hover:text-ink"
              >
                <DuplicateIcon />
              </button>
            </FormatGroup>

            {hasMultiShapeSelection && (
              <>
                {divider}

                <FormatGroup label="Align">
                  <button
                    ref={alignTriggerRef}
                    type="button"
                    onClick={alignPopover.toggle}
                    aria-haspopup="true"
                    aria-expanded={alignPopover.open}
                    aria-pressed={alignPopover.open}
                    title="Align"
                    aria-label="Align"
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line transition-colors hover:bg-surface-soft ${
                      alignPopover.open ? 'bg-surface-soft text-ink' : 'text-body'
                    }`}
                  >
                    <AlignLeftIcon />
                  </button>
                </FormatGroup>

                {alignPopover.open &&
                  alignPopover.pos &&
                  createPortal(
                    <div
                      ref={alignPanelRef}
                      className="fixed z-30 grid w-40 grid-cols-3 gap-1 rounded-xl border border-line bg-white p-1.5 shadow-lg"
                      style={alignPopover.pos}
                    >
                      <button
                        type="button"
                        onClick={() => alignSelected('left')}
                        title="Align left"
                        aria-label="Align left"
                        className="flex h-9 items-center justify-center rounded-md text-body transition-colors hover:bg-surface-soft hover:text-ink"
                      >
                        <AlignLeftIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => alignSelected('center')}
                        title="Align center"
                        aria-label="Align center"
                        className="flex h-9 items-center justify-center rounded-md text-body transition-colors hover:bg-surface-soft hover:text-ink"
                      >
                        <AlignCenterHIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => alignSelected('right')}
                        title="Align right"
                        aria-label="Align right"
                        className="flex h-9 items-center justify-center rounded-md text-body transition-colors hover:bg-surface-soft hover:text-ink"
                      >
                        <AlignRightIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => alignSelected('top')}
                        title="Align top"
                        aria-label="Align top"
                        className="flex h-9 items-center justify-center rounded-md text-body transition-colors hover:bg-surface-soft hover:text-ink"
                      >
                        <AlignTopIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => alignSelected('middle')}
                        title="Align middle"
                        aria-label="Align middle"
                        className="flex h-9 items-center justify-center rounded-md text-body transition-colors hover:bg-surface-soft hover:text-ink"
                      >
                        <AlignMiddleIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => alignSelected('bottom')}
                        title="Align bottom"
                        aria-label="Align bottom"
                        className="flex h-9 items-center justify-center rounded-md text-body transition-colors hover:bg-surface-soft hover:text-ink"
                      >
                        <AlignBottomIcon />
                      </button>
                    </div>,
                    document.body,
                  )}

                <FormatGroup label="Group">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: canUngroup ? 'UNGROUP_SELECTED' : 'GROUP_SELECTED' })}
                    title={canUngroup ? 'Ungroup' : 'Group'}
                    aria-label={canUngroup ? 'Ungroup' : 'Group'}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line text-body transition-colors hover:bg-surface-soft hover:text-ink"
                  >
                    {canUngroup ? <UngroupIcon /> : <GroupIcon />}
                  </button>
                </FormatGroup>
              </>
            )}
          </>
        )}

        {/* The tab itself is always clickable now (see activeTab's own
            comment above) - this is what a user actually sees if they open
            it before selecting anything, instead of the tab just silently
            doing nothing the way disabling it used to. */}
        {activeTab === 'format' && !formatTarget && !hasShapeSelectionAny && !readOnly && (
          <p className="self-center text-[12.5px] text-soft">
            Select a shape or arrow to format it.
          </p>
        )}

        <SaveStatus status={saveStatus} />
      </div>

      {confirmingClear && (
        <ClearConfirmDialog onCancel={() => setConfirmingClear(false)} onConfirm={confirmClear} />
      )}
      {clearing && <LoadingScreen message="Clearing canvas…" />}
    </>
  )
}

export default EditorTopbar
