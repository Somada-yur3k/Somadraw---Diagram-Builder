import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePopoverState } from '../../lib/usePopoverState'
import { useDiagramEditorContext } from './DiagramEditorContext'
import { MIN_ZOOM, MAX_ZOOM } from './useDiagramEditor'
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

function CornerRadiusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16V9a5 5 0 0 1 5-5h7" />
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

  // Corner rounding still only makes sense for the shape types that already
  // have their own visible border/box - a label's ShapeBody renders one
  // too, but only once it's actually been given a fill (see Shape.jsx), and
  // even then keeps a fixed rounding rather than a user-tunable one, to
  // keep this one scoped to what was actually asked for.
  const showCornerRadiusControl = Boolean(selectedShape) && selectedShape.type !== 'label'
  const currentCornerRadius = selectedShape
    ? (selectedShape.cornerRadius ?? DEFAULT_CORNER_RADIUS_BY_TYPE[selectedShape.type] ?? 0)
    : 0

  const updateCornerRadius = (radius) => {
    if (!selectedShape) return
    dispatch({ type: 'SET_SHAPE_CORNER_RADIUS', id: selectedShape.id, radius })
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

  const lineStyleTriggerRef = useRef(null)
  const lineStylePanelRef = useRef(null)
  const lineStylePopover = usePopoverState(lineStyleTriggerRef, lineStylePanelRef)

  // Two tabs, both genuinely functional (not placeholders): Home holds the
  // general canvas actions, Format holds the per-shape/arrow typography
  // controls - which only ever mean anything once something's selected, so
  // that tab is disabled without one.
  const [activeTab, setActiveTab] = useState('home')

  const cornerTriggerRef = useRef(null)
  const cornerPanelRef = useRef(null)
  const cornerPopover = usePopoverState(cornerTriggerRef, cornerPanelRef)

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
  const [lastFormatTargetId, setLastFormatTargetId] = useState(formatTarget?.id)
  if (formatTarget?.id !== lastFormatTargetId) {
    setLastFormatTargetId(formatTarget?.id)
    fontSizePopover.close()
    // Selecting something jumps straight to the Format tab; losing the
    // selection (Escape, Delete, clicking empty canvas) falls back to Home
    // rather than leaving a now-disabled Format tab showing as active. Keyed
    // off the same id transition as the popover-close above, so this only
    // fires on an actual selection *change* - once you're on Format you can
    // still switch back to Home yourself (to hit Undo, say) without every
    // unrelated render snapping you back.
    setActiveTab(formatTarget ? 'format' : 'home')
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

  const setArrowLineStyle = (lineStyle) => {
    if (!selectedArrow) return
    dispatch({ type: 'SET_ARROW_LINE_STYLE', id: selectedArrow.id, lineStyle })
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
          disabled={!formatTarget}
          aria-pressed={activeTab === 'format'}
          title={formatTarget ? undefined : 'Select a shape or arrow to format it'}
          className={`rounded-t-md border border-b-0 px-3 py-1.5 text-[12.5px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${
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

            <button
              ref={zoomTriggerRef}
              type="button"
              onClick={zoomPopover.toggle}
              aria-haspopup="true"
              aria-expanded={zoomPopover.open}
              title="Zoom level"
              aria-label="Zoom level"
              className={`flex h-8 shrink-0 items-center gap-1 self-center rounded-md border border-line px-2 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-soft ${
                zoomPopover.open ? 'bg-surface-soft' : ''
              }`}
            >
              {Math.round(zoom * 100)}%
              <ChevronDownIcon />
            </button>
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
          <div className="flex shrink-0 items-center gap-1.5 self-center">
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

            {/* Fill - one control shared by shapes (any type, including
                label - see Shape.jsx) and arrows, since formatTarget is
                always exactly one or the other and currentFillColor/the
                commit effect above already resolve to the right field
                either way. */}
            <input
              ref={fillColorInputRef}
              type="color"
              defaultValue={currentFillColor}
              title="Fill color"
              aria-label="Fill color"
              className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-line p-0.5"
            />

            {selectedArrow && (
              <>
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

                {lineStylePopover.open &&
                  lineStylePopover.pos &&
                  createPortal(
                    <div
                      ref={lineStylePanelRef}
                      className="fixed z-30 w-32 rounded-xl border border-line bg-white p-1 shadow-lg"
                      style={lineStylePopover.pos}
                    >
                      <button
                        type="button"
                        onClick={() => setArrowLineStyle('solid')}
                        className={`block w-full rounded-md px-2 py-1.5 text-left text-[12.5px] font-medium transition-colors hover:bg-surface-soft ${
                          selectedArrow.lineStyle !== 'dotted' ? 'bg-surface-soft text-ink' : 'text-body'
                        }`}
                      >
                        Solid
                      </button>
                      <button
                        type="button"
                        onClick={() => setArrowLineStyle('dotted')}
                        className={`block w-full rounded-md px-2 py-1.5 text-left text-[12.5px] font-medium transition-colors hover:bg-surface-soft ${
                          selectedArrow.lineStyle === 'dotted' ? 'bg-surface-soft text-ink' : 'text-body'
                        }`}
                      >
                        Dotted
                      </button>
                    </div>,
                    document.body,
                  )}
              </>
            )}

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
            </div>

            {showCornerRadiusControl && (
              <>
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

                {cornerPopover.open &&
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
              </>
            )}
          </div>
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
