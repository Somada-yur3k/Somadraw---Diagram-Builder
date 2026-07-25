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
import LoadingScreen from '../LoadingScreen'

const CLEAR_LOADING_MS = 900

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

function UndoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5A5.5 5.5 0 0 1 20 14.5v0A5.5 5.5 0 0 1 14.5 20H11" />
    </svg>
  )
}

function RedoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13" />
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

// left/right added alongside the original up/down - the mobile layout
// collapses this toolbar toward the left edge instead of the top, so its
// toggle needs a chevron pointing that way instead.
function ChevronIcon({ direction, className = '' }) {
  const paths = {
    up: 'm6 15 6-6 6 6',
    down: 'm6 9 6 6 6-6',
    left: 'm15 6-6 6 6 6',
    right: 'm9 6 6 6-6 6',
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={paths[direction]} />
    </svg>
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

function EditorTopbar() {
  const { state, dispatch, canUndo, canRedo, saveStatus } = useDiagramEditorContext()
  const zoom = state.viewport.zoom
  const colorInputRef = useRef(null)
  const [visible, setVisible] = useState(true)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [clearing, setClearing] = useState(false)

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

  // Corner rounding and fill color are both shape-body properties, not text
  // ones - arrows have no body, and a text label's body has no
  // border/background at all, so these controls only make sense (and only
  // show) for the other three shape types.
  const showShapeStyleControls = Boolean(selectedShape) && selectedShape.type !== 'label'
  const currentCornerRadius = selectedShape
    ? (selectedShape.cornerRadius ?? DEFAULT_CORNER_RADIUS_BY_TYPE[selectedShape.type] ?? 0)
    : 0

  const updateCornerRadius = (radius) => {
    if (!selectedShape) return
    dispatch({ type: 'SET_SHAPE_CORNER_RADIUS', id: selectedShape.id, radius })
  }

  const currentFillColor = selectedShape
    ? (selectedShape.fillColor ?? DEFAULT_FILL_COLOR_BY_TYPE[selectedShape.type] ?? '#8b5cf6')
    : '#8b5cf6'
  const fillColorInputRef = useRef(null)

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
  // own fill/border theme, not its text).
  useEffect(() => {
    const input = fillColorInputRef.current
    if (!input || !selectedShape) return
    const handleChange = (event) =>
      dispatch({ type: 'SET_SHAPE_FILL_COLOR', id: selectedShape.id, color: event.target.value })
    input.addEventListener('change', handleChange)
    return () => input.removeEventListener('change', handleChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShape?.id])

  useEffect(() => {
    const input = fillColorInputRef.current
    if (!input) return
    input.value = currentFillColor
  }, [currentFillColor])

  return (
    // ClearConfirmDialog/LoadingScreen are siblings of the positioned pill
    // below, not children of it - both rely on `fixed inset-0` covering the
    // whole viewport, but a `transform` on any ancestor makes that ancestor
    // the containing block for its `position: fixed` descendants instead of
    // the viewport (this is real CSS behavior, not a bug in those
    // components). The pill below carries `-translate-y-1/2` on mobile to
    // vertically center itself at the left edge, so nesting these two
    // inside it would squash both into that small translated box instead of
    // covering the screen - exactly the "confirm dialog broken on some
    // screen sizes" bug this fixes.
    <>
      {/* The toggle button and the pill are flex siblings sharing one
          centered group (matching the reference image, where the toggle
          sits right next to the pill rather than in a fixed unrelated
          corner) instead of two independently-positioned absolute elements
          - that guessing game (how much margin does the pill need to
          reserve for the toggle?) breaks the moment the pill's own content
          is wide enough to matter, e.g. once the format controls are
          showing alongside undo/redo/zoom/grid/delete/clear. Flex layout
          shares the available width correctly on its own: the toggle
          (shrink-0) always keeps its full size, and the pill (min-w-0 +
          overflow-x-auto) takes whatever's left, scrolling internally
          rather than ever being covered or silently overflowing the canvas
          edge.

          Below sm: this whole group moves to the left edge (vertically
          centered, like the export panel on the right) and stacks into a
          column instead - a horizontal pill this wide has nowhere to go on
          a narrow phone screen even with its own internal scrolling, so
          the toolbar reflows into a tall, scrollable column there instead.
          From sm: up it's the original top-center horizontal pill. */}
      <div className="absolute left-4 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center sm:inset-x-4 sm:left-auto sm:top-4 sm:flex-row sm:translate-y-0 sm:justify-center">
      <div className="flex flex-col items-center gap-2 sm:max-w-full sm:min-w-0 sm:flex-row">
        {visible && (
          <div className="flex max-h-[70vh] flex-col items-center gap-1.5 overflow-y-auto rounded-2xl border border-line bg-white px-2 py-2.5 shadow-lg sm:max-h-none sm:min-w-0 sm:flex-row sm:flex-nowrap sm:overflow-x-auto sm:overflow-y-visible sm:rounded-full sm:px-2.5 sm:py-2">
            {formatTarget && (
              <>
                <select
                  value={formatTarget.fontFamily ?? DEFAULT_FONT_ID}
                  onChange={(event) => updateFormat({ fontFamily: event.target.value })}
                  title="Font family"
                  aria-label="Font family"
                  className="h-8 shrink-0 rounded-lg border border-line bg-white px-2 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-soft"
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
                  className={`flex h-8 shrink-0 items-center justify-center rounded-lg border border-line px-2.5 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-soft ${
                    fontSizePopover.open ? 'bg-surface-soft' : ''
                  }`}
                >
                  {currentFontSize}
                </button>

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

                {showShapeStyleControls && (
                  <input
                    ref={fillColorInputRef}
                    type="color"
                    defaultValue={currentFillColor}
                    title="Fill color"
                    aria-label="Fill color"
                    className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-line p-0.5"
                  />
                )}

                <input
                  ref={colorInputRef}
                  type="color"
                  defaultValue={formatTarget.textColor ?? '#14121f'}
                  title="Text color"
                  aria-label="Text color"
                  className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-line p-0.5"
                />

                <button
                  type="button"
                  onClick={() => updateFormat({ bold: !formatTarget.bold })}
                  aria-pressed={Boolean(formatTarget.bold)}
                  title="Bold"
                  aria-label="Bold"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-[13px] font-bold transition-colors hover:bg-surface-soft ${
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
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-[13px] italic transition-colors hover:bg-surface-soft ${
                    formatTarget.italic ? 'bg-surface-soft text-ink' : 'text-body'
                  }`}
                >
                  I
                </button>

                {showShapeStyleControls && (
                  <>
                    <button
                      ref={cornerTriggerRef}
                      type="button"
                      onClick={cornerPopover.toggle}
                      aria-pressed={cornerPopover.open}
                      title="Corner radius"
                      aria-label="Corner radius"
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line transition-colors hover:bg-surface-soft ${
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
                          className="fixed z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-white p-2 shadow-lg"
                          style={{ left: cornerPopover.pos.left, top: cornerPopover.pos.top }}
                        >
                          <span className="pl-1 text-[12px] font-medium text-soft">Corner radius</span>
                          <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-line">
                            <button
                              type="button"
                              onClick={() => updateCornerRadius(currentCornerRadius - 1)}
                              disabled={currentCornerRadius <= MIN_CORNER_RADIUS}
                              title="Decrease corner radius"
                              aria-label="Decrease corner radius"
                              className="flex h-8 w-8 items-center justify-center text-ink transition-colors hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-40"
                            >
                              −
                            </button>
                            <span className="flex h-8 min-w-8 items-center justify-center border-x border-line px-1 text-[12.5px] font-medium text-ink">
                              {currentCornerRadius}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCornerRadius(currentCornerRadius + 1)}
                              disabled={currentCornerRadius >= MAX_CORNER_RADIUS}
                              title="Increase corner radius"
                              aria-label="Increase corner radius"
                              className="flex h-8 w-8 items-center justify-center text-ink transition-colors hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </div>,
                        document.body,
                      )}
                  </>
                )}

                <span className="my-1 h-px w-8 shrink-0 bg-line sm:mx-1 sm:my-0 sm:h-5 sm:w-px" />
              </>
            )}

            <button
              type="button"
              onClick={() => dispatch({ type: 'UNDO' })}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-ink transition-colors hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-40"
            >
              <UndoIcon />
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'REDO' })}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-ink transition-colors hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-40"
            >
              <RedoIcon />
            </button>

            <span className="my-1 h-px w-8 shrink-0 bg-line sm:mx-1 sm:my-0 sm:h-5 sm:w-px" />

            <button
              ref={zoomTriggerRef}
              type="button"
              onClick={zoomPopover.toggle}
              aria-haspopup="true"
              aria-expanded={zoomPopover.open}
              title="Zoom level"
              aria-label="Zoom level"
              className={`flex h-8 shrink-0 items-center justify-center rounded-lg border border-line px-2.5 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-soft ${
                zoomPopover.open ? 'bg-surface-soft' : ''
              }`}
            >
              {Math.round(zoom * 100)}%
            </button>

            {zoomPopover.open &&
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

            <button
              type="button"
              onClick={() => dispatch({ type: 'TOGGLE_GRID' })}
              title={state.showGrid ? 'Hide grid' : 'Show grid'}
              className="shrink-0 whitespace-nowrap rounded-lg border border-line px-2.5 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface-soft"
            >
              {state.showGrid ? 'Hide grid' : 'Show grid'}
            </button>

            <span className="my-1 h-px w-8 shrink-0 bg-line sm:mx-1 sm:my-0 sm:h-5 sm:w-px" />

            <button
              type="button"
              onClick={() => dispatch({ type: 'DELETE_SELECTED' })}
              disabled={!state.selection}
              title="Delete selected"
              className="shrink-0 whitespace-nowrap rounded-lg border border-line px-2.5 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-40"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={requestClear}
              title="Clear canvas"
              className="shrink-0 whitespace-nowrap rounded-lg border border-rose-200 px-2.5 py-1.5 text-[13px] font-medium text-rose-600 transition-colors hover:bg-rose-50"
            >
              Clear
            </button>

            <SaveStatus status={saveStatus} />
          </div>
        )}

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          title={visible ? 'Hide toolbar' : 'Show toolbar'}
          aria-label={visible ? 'Hide toolbar' : 'Show toolbar'}
          aria-pressed={visible}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink shadow-md transition-colors hover:bg-surface-soft"
        >
          <ChevronIcon direction={visible ? 'left' : 'right'} className="sm:hidden" />
          <ChevronIcon direction={visible ? 'up' : 'down'} className="hidden sm:block" />
        </button>
      </div>
      </div>

      {confirmingClear && (
        <ClearConfirmDialog onCancel={() => setConfirmingClear(false)} onConfirm={confirmClear} />
      )}
      {clearing && <LoadingScreen message="Clearing canvas…" />}
    </>
  )
}

export default EditorTopbar
