import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDiagramEditorContext } from './DiagramEditorContext'
import { usePopoverState } from '../../lib/usePopoverState'
import ShapeIcon from './ShapeIcon'
import DiagramTypePicker from './DiagramTypePicker'
import {
  basicShapes,
  textLabelTool,
  diagramTypeGroups,
  shapeToolKeys,
  groupShapesByCategory,
} from './shapeCatalog'

const EDITOR_TIPS = [
  'Double-click text to rename.',
  'Press Delete to remove the selected shape.',
  'Drag a shape to move it around the canvas.',
  "Drag a shape's corner handle to resize it.",
  'Click and drag between two shapes to draw a connector.',
  'Use Ctrl+Z and Ctrl+Y to undo and redo.',
]
const TIP_INTERVAL_MS = 5000
const TIP_FADE_MS = 300

// Line styles offered from the Draw Arrow button's dropdown - 'shape' is the
// app's original (and still default) auto-routed orthogonal connector,
// listed last to match the order the user asked for these in.
const connectorTypes = [
  { key: 'straight', label: 'Straight Line' },
  { key: 'curved', label: 'Curved Line' },
  { key: 'shape', label: 'Shape Connector' },
  // Routes identically to 'shape' (arrowRouting.js's own orthogonal
  // fallthrough already handles any connectorType it doesn't recognize by
  // name) - the only real difference is ArrowLayer.jsx swapping in
  // crow's-foot/one endpoint markers instead of the plain triangle
  // arrowhead, matching ERD relationship-line notation.
  { key: 'erd', label: 'ERD Relationship' },
]

// Shared by the Draw Arrow and Shapes dropdowns - opens to the right of the
// trigger button, top-aligned with it, so neither ever overflows off the
// left edge of the collapsed w-14 icon rail the way a centered-below
// popover half again as wide as the sidebar itself would.
function computeToolMenuPos(rect) {
  return { left: rect.right + 8, top: rect.top }
}

function SelectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="m4 4 7.07 17 2.51-7.39L21 11.07 4 4Z" />
    </svg>
  )
}

function ChevronIcon({ direction }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d={direction === 'up' ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
    </svg>
  )
}

function ArrowToolIcon() {
  return (
    <svg width="16" height="10" viewBox="0 0 24 16" className="shrink-0">
      <line x1="2" y1="13" x2="20" y2="4" stroke="currentColor" strokeWidth="2" />
      <polygon points="20,4 14,4 19,9" fill="currentColor" />
    </svg>
  )
}

function CommentToolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M4 4h16v12H8l-4 4V4Z" />
    </svg>
  )
}

function ShapesToolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="3" y="3" width="10" height="10" rx="1.5" />
      <circle cx="16.5" cy="16.5" r="5.5" />
    </svg>
  )
}

// `dotted` is a stroke modifier on top of any of the three geometries below,
// not its own geometry - mirrors how arrow.lineStyle layers onto
// arrow.connectorType (see useDiagramEditor's ARROW_TOOL_CLICK_SHAPE).
function ConnectorTypeIcon({ type, dotted }) {
  const dash = dotted ? '3 2.5' : undefined
  if (type === 'straight') {
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0">
        <line x1="4" y1="16" x2="16" y2="4" strokeDasharray={dash} />
      </svg>
    )
  }
  if (type === 'curved') {
    return (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0">
        <path d="M4 16C4 8 16 12 16 4" strokeDasharray={dash} />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M4 16H10V4H16" strokeDasharray={dash} />
    </svg>
  )
}

// Stroke gradient needs its own <linearGradient>, not the CSS gradient-*
// utilities (those rely on background-clip: text, which only paints glyphs,
// not an SVG stroke) - useId keeps the gradient's id collision-free even
// with several CheckIcon instances mounted at once (different menus can
// each have their own selected row checked simultaneously).
function CheckIcon() {
  const gradientId = useId()
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={`url(#${gradientId})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto shrink-0">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

// Icon-only variant for the Tools row - horizontal (side-by-side, menu-bar
// style) once the sidebar is wide enough to fit 3 buttons across; the
// collapsed w-14 icon rail has no room for that, so it stays a vertical
// column there, matching the rest of the sidebar's own narrow-width fallback.
function horizontalToolButtonClass(active) {
  return `flex w-10 items-center justify-center rounded-lg py-2.5 transition-colors md:w-auto md:flex-1 ${
    active ? 'bg-brand-blue/10 text-brand-blue' : 'text-body hover:bg-surface-soft hover:text-ink'
  }`
}

function iconTileClass(active) {
  return `flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
    active ? 'bg-brand-blue/10 text-brand-blue' : 'text-body hover:bg-surface-soft hover:text-ink'
  }`
}

// A shape's own icon-only tile - the DFD/Flowchart/Use Case sections used to
// render each shape as a full-width row (icon + its name sitting inline,
// permanently visible) - this instead matches the Tools row's own icon-only
// style, with the name only surfacing as a small floating label while
// actively hovered (or focused, for keyboard/screen-reader users, since
// hover alone would otherwise leave them with no accessible name shown at
// all - aria-label on the button itself still covers that regardless).
// Positioned from the tile's own live rect on each hover/focus rather than
// computed once, so it stays correctly placed if the sidebar scrolls or
// resizes between hovers.
function IconTile({ toolKey, label, active, onClick }) {
  const buttonRef = useRef(null)
  const [tooltipPos, setTooltipPos] = useState(null)

  const showTooltip = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    // Anchored to the tile's own left edge (not centered) - the sidebar
    // itself sits flush against the left edge of the screen in both its
    // collapsed (w-14) and expanded (w-64) widths, so a centered tooltip
    // for a longer label ("System Boundary", "Input/Output") would often
    // run past the viewport's own left edge, especially on the narrower
    // rail. Growing rightward instead always has open space to expand into.
    setTooltipPos({ left: rect.left, top: rect.bottom + 6 })
  }
  const hideTooltip = () => setTooltipPos(null)

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        aria-label={label}
        className={iconTileClass(active)}
      >
        <ShapeIcon toolKey={toolKey} />
      </button>
      {tooltipPos &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-40 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white shadow-lg"
            style={{ left: tooltipPos.left, top: tooltipPos.top }}
          >
            {label}
          </div>,
          document.body,
        )}
    </>
  )
}

// Shared by the Draw Arrow and Shapes dropdown menus - one row option in
// either list.
function menuItemClass(active) {
  return `flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
    active ? 'bg-brand-blue/10 text-brand-blue' : 'text-body hover:bg-surface-soft hover:text-ink'
  }`
}

function GroupLabel({ children }) {
  return (
    <div className="mt-5 hidden text-[11px] font-semibold uppercase tracking-wide text-soft md:block">
      {children}
    </div>
  )
}

// Cycles through EDITOR_TIPS on a timer, cross-fading between them - pinned
// to the bottom of the sidebar (mt-auto) rather than following the tool
// list, so it reads as a persistent help panel, not another section.
function RotatingTip() {
  const [index, setIndex] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setIndex((current) => (current + 1) % EDITOR_TIPS.length)
        setFading(false)
      }, TIP_FADE_MS)
    }, TIP_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  return (
    <p
      className="mt-auto hidden rounded-lg bg-surface-soft p-3 text-[11.5px] leading-relaxed text-soft transition-opacity duration-300 md:block"
      style={{ opacity: fading ? 0 : 1 }}
    >
      <strong className="text-ink">Tip:</strong> {EDITOR_TIPS[index]}
    </p>
  )
}

function EditorSidebar() {
  const { state, dispatch } = useDiagramEditorContext()
  const selectTool = (key) => dispatch({ type: 'SET_TOOL', tool: key })
  const [showDottedOptions, setShowDottedOptions] = useState(false)

  // Which single diagram type's tools are showing - starts unset (no
  // diagram type chosen at all, the empty state) rather than defaulting to
  // DFD, so a brand-new canvas doesn't silently pre-decide the notation for
  // the user. Shared by the compact icon-rail trigger (mobile/collapsed)
  // and the full "Select/Change Diagram" trigger (desktop) below - both
  // just open the same full-screen DiagramTypePicker modal rather than each
  // needing their own positioned popover.
  const [activeDiagramType, setActiveDiagramType] = useState(null)
  const activeDiagramTypeGroup = diagramTypeGroups.find((group) => group.key === activeDiagramType) ?? null
  const [diagramPickerOpen, setDiagramPickerOpen] = useState(false)

  // toolKey is optional - DiagramTypePicker passes one when the user clicked
  // a specific element tile (not just the category), pre-selecting that
  // tool instead of falling back to 'select'.
  const chooseDiagramType = (key, toolKey) => {
    setActiveDiagramType(key)
    setDiagramPickerOpen(false)

    // Each notation draws connections its own conventional way (ERD's
    // crow's-foot, UML's plain straight association, DFD/Flowchart/System
    // Architecture's orthogonal routing, Network's plain wired line) - see
    // diagramTypeGroups' own arrowDefaults. Applied on every switch, not
    // just the first time a type is picked, so going DFD -> ERD -> DFD
    // lands back on orthogonal routing rather than leaving ERD's
    // crow's-foot style armed for a notation that doesn't use it.
    const newGroup = diagramTypeGroups.find((group) => group.key === key)
    if (newGroup?.arrowDefaults) {
      dispatch({
        type: 'SET_ARROW_CONNECTOR_TYPE',
        connectorType: newGroup.arrowDefaults.connectorType,
        lineStyle: newGroup.arrowDefaults.lineStyle,
      })
    }

    if (toolKey) {
      dispatch({ type: 'SET_TOOL', tool: toolKey })
      return
    }
    // A tool left over from the previous diagram type (e.g. 'erdTable'
    // still selected after switching to Data Flow Diagram) would be
    // harmless to dispatch but confusing to look at - nothing in the new
    // group's tile grid would show as active, yet clicking the canvas
    // would still place a shape from a notation that's no longer even
    // visible. Falling back to 'select' keeps the visible tool state and
    // the visible tile grid honest with each other.
    if (newGroup && !newGroup.shapes.some((shape) => shape.key === state.tool)) {
      dispatch({ type: 'SET_TOOL', tool: 'select' })
    }
  }

  const currentConnectorType = state.arrowConnectorType ?? 'shape'
  const currentLineStyle = state.arrowLineStyle ?? 'solid'
  const connectorTriggerRef = useRef(null)
  const connectorPanelRef = useRef(null)
  const connectorMenu = usePopoverState(connectorTriggerRef, connectorPanelRef, computeToolMenuPos)

  const chooseConnectorType = (connectorType, lineStyle = 'solid') => {
    dispatch({ type: 'SET_ARROW_CONNECTOR_TYPE', connectorType, lineStyle })
    connectorMenu.close()
  }

  const shapesTriggerRef = useRef(null)
  const shapesPanelRef = useRef(null)
  const shapesMenu = usePopoverState(shapesTriggerRef, shapesPanelRef, computeToolMenuPos)

  const chooseShape = (key) => {
    selectTool(key)
    shapesMenu.close()
  }

  return (
    <aside className="flex w-14 shrink-0 flex-col items-center overflow-y-auto border-r border-line bg-white py-3 md:w-64 md:items-stretch md:px-4">
      <GroupLabel>Tools</GroupLabel>
      <div className="mt-2 flex w-full flex-col items-center gap-1 rounded-xl border border-line p-1 md:flex-row">
        <button
          type="button"
          onClick={() => selectTool('select')}
          title="Select & Move"
          aria-label="Select & Move"
          className={horizontalToolButtonClass(state.tool === 'select')}
        >
          <SelectIcon />
        </button>
        <button
          ref={connectorTriggerRef}
          type="button"
          onClick={connectorMenu.toggle}
          title="Draw Arrow"
          aria-label="Draw Arrow"
          aria-haspopup="true"
          aria-expanded={connectorMenu.open}
          className={horizontalToolButtonClass(state.tool === 'arrow')}
        >
          <ArrowToolIcon />
        </button>

        {connectorMenu.open &&
          connectorMenu.pos &&
          createPortal(
            <div
              ref={connectorPanelRef}
              className="fixed z-30 w-52 rounded-xl border border-line bg-white p-1.5 shadow-lg"
              style={connectorMenu.pos}
            >
              {connectorTypes.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => chooseConnectorType(c.key, 'solid')}
                  className={menuItemClass(currentConnectorType === c.key && currentLineStyle === 'solid')}
                >
                  <ConnectorTypeIcon type={c.key} />
                  <span>{c.label}</span>
                  {currentConnectorType === c.key && currentLineStyle === 'solid' && <CheckIcon />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowDottedOptions((visible) => !visible)}
                aria-expanded={showDottedOptions}
                className={menuItemClass(false)}
              >
                <ConnectorTypeIcon type="straight" dotted />
                <span>Dotted Line</span>
                <span className="ml-auto">
                  <ChevronIcon direction={showDottedOptions ? 'up' : 'down'} />
                </span>
              </button>
              {showDottedOptions &&
                connectorTypes.map((c) => (
                  <button
                    key={`dotted-${c.key}`}
                    type="button"
                    onClick={() => chooseConnectorType(c.key, 'dotted')}
                    className={`pl-6 ${menuItemClass(currentConnectorType === c.key && currentLineStyle === 'dotted')}`}
                  >
                    <ConnectorTypeIcon type={c.key} dotted />
                    <span>{c.label}</span>
                    {currentConnectorType === c.key && currentLineStyle === 'dotted' && <CheckIcon />}
                  </button>
                ))}
            </div>,
            document.body,
          )}

        <button
          ref={shapesTriggerRef}
          type="button"
          onClick={shapesMenu.toggle}
          title="Shapes"
          aria-label="Shapes"
          aria-haspopup="true"
          aria-expanded={shapesMenu.open}
          className={horizontalToolButtonClass(shapeToolKeys.has(state.tool))}
        >
          <ShapesToolIcon />
        </button>

        {shapesMenu.open &&
          shapesMenu.pos &&
          createPortal(
            <div
              ref={shapesPanelRef}
              className="fixed z-30 w-52 rounded-xl border border-line bg-white p-1.5 shadow-lg"
              style={shapesMenu.pos}
            >
              {basicShapes.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => chooseShape(t.key)}
                  className={menuItemClass(state.tool === t.key)}
                >
                  <ShapeIcon toolKey={t.key} />
                  <span>{t.label}</span>
                  {state.tool === t.key && <CheckIcon />}
                </button>
              ))}
            </div>,
            document.body,
          )}

        <button
          type="button"
          onClick={() => selectTool(textLabelTool.key)}
          title={textLabelTool.label}
          aria-label={textLabelTool.label}
          className={horizontalToolButtonClass(state.tool === textLabelTool.key)}
        >
          <ShapeIcon toolKey={textLabelTool.key} />
        </button>
        <button
          type="button"
          onClick={() => selectTool('comment')}
          title="Comment"
          aria-label="Comment"
          className={horizontalToolButtonClass(state.tool === 'comment')}
        >
          <CommentToolIcon />
        </button>
      </div>

      {/* Desktop: exactly one diagram type's tools show at a time, chosen
          from the full DiagramTypePicker modal below - not every category
          stacked and expanded at once (that used to mean five
          permanently-visible sections regardless of what was actually
          being worked on). Empty until a type is chosen
          (activeDiagramTypeGroup starts null), so a brand-new canvas
          doesn't presume DFD or anything else. */}
      <div className="hidden w-full md:block">
        <GroupLabel>Diagram</GroupLabel>

        {activeDiagramTypeGroup ? (
          <div className="mt-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-soft">
              Current diagram
            </p>
            <p className="mt-0.5 truncate text-[14px] font-semibold text-ink">
              {activeDiagramTypeGroup.label}
            </p>
            <button
              type="button"
              onClick={() => setDiagramPickerOpen(true)}
              aria-haspopup="dialog"
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-medium text-body transition-colors hover:bg-surface-soft hover:text-ink"
            >
              Change Diagram
            </button>
          </div>
        ) : (
          <div className="mt-2 rounded-xl border border-dashed border-line p-3 text-center">
            <p className="text-[12.5px] font-medium text-ink">No diagram selected</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-soft">
              Select a diagram type to begin.
            </p>
            <button
              type="button"
              onClick={() => setDiagramPickerOpen(true)}
              aria-haspopup="dialog"
              className="gradient-bg mt-3 w-full rounded-lg px-3 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Select Diagram
            </button>
          </div>
        )}

        {activeDiagramTypeGroup &&
          groupShapesByCategory(activeDiagramTypeGroup.shapes).map((group) => (
            <div key={group.category ?? 'ungrouped'} className="mt-3">
              {group.category && (
                <p className="text-[10px] font-semibold uppercase tracking-wide text-soft">
                  {group.category}
                </p>
              )}
              <div className={`grid grid-cols-4 gap-1.5 rounded-xl border border-line p-1.5 ${group.category ? 'mt-1.5' : ''}`}>
                {group.shapes.map((t) => (
                  <IconTile
                    key={t.key}
                    toolKey={t.key}
                    label={t.label}
                    active={state.tool === t.key}
                    onClick={() => selectTool(t.key)}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Mobile/collapsed: the narrow icon rail has no room for the
          expanded "Current diagram" block above - same activeDiagramType
          selection and same DiagramTypePicker modal, just a compact
          icon+chevron trigger instead. */}
      <div className="mt-5 flex w-full flex-col items-center md:hidden">
        <button
          type="button"
          onClick={() => setDiagramPickerOpen(true)}
          title={activeDiagramTypeGroup ? activeDiagramTypeGroup.label : 'Select Diagram'}
          aria-label={activeDiagramTypeGroup ? `Diagram: ${activeDiagramTypeGroup.label}` : 'Select Diagram'}
          aria-haspopup="dialog"
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-line text-body transition-colors hover:bg-surface-soft"
        >
          {activeDiagramTypeGroup ? <ShapeIcon toolKey={activeDiagramTypeGroup.iconKey} /> : <ShapesToolIcon />}
        </button>

        {/* Single column, not a grid like the desktop section above - this
            block only ever renders below the md breakpoint, where the
            sidebar itself is the collapsed w-14 rail (md:px-4 doesn't apply
            yet either), leaving no room for more than one 40px tile across. */}
        {activeDiagramTypeGroup &&
          groupShapesByCategory(activeDiagramTypeGroup.shapes).map((group) => (
            <div key={group.category ?? 'ungrouped'} className="mt-2 flex w-full flex-col items-center">
              {group.category && (
                <p className="mb-1 w-full truncate px-1 text-center text-[9px] font-semibold uppercase tracking-wide text-soft">
                  {group.category}
                </p>
              )}
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-line p-1.5">
                {group.shapes.map((t) => (
                  <IconTile
                    key={t.key}
                    toolKey={t.key}
                    label={t.label}
                    active={state.tool === t.key}
                    onClick={() => selectTool(t.key)}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>

      {diagramPickerOpen && (
        <DiagramTypePicker
          activeDiagramType={activeDiagramType}
          onSelect={chooseDiagramType}
          onClose={() => setDiagramPickerOpen(false)}
        />
      )}

      <RotatingTip />
    </aside>
  )
}

export default EditorSidebar
