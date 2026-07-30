import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDiagramEditorContext } from './DiagramEditorContext'
import { usePopoverState } from '../../lib/usePopoverState'
import ShapeIcon from './ShapeIcon'
import {
  dfdShapes,
  flowchartShapes,
  usecaseShapes,
  umlShapes,
  basicShapes,
  textLabelTool,
  diagramTypeGroups,
  shapeToolKeys,
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

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto shrink-0 text-brand-purple">
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
    active ? 'bg-surface-soft text-ink' : 'text-body hover:bg-surface-soft hover:text-ink'
  }`
}

function iconTileClass(active) {
  return `flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
    active ? 'bg-surface-soft text-ink' : 'text-body hover:bg-surface-soft hover:text-ink'
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
    active ? 'bg-surface-soft text-ink' : 'text-body hover:bg-surface-soft hover:text-ink'
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
  const [showShapes, setShowShapes] = useState(true)
  const [showFlowchart, setShowFlowchart] = useState(true)
  const [showUseCase, setShowUseCase] = useState(true)
  const [showUml, setShowUml] = useState(true)
  const [showDottedOptions, setShowDottedOptions] = useState(false)
  // Mobile-only picker state - which single diagram type's shapes show
  // below it (see the mobile-only block near the end of this component).
  const [mobileDiagramType, setMobileDiagramType] = useState('dfd')
  const diagramTypeTriggerRef = useRef(null)
  const diagramTypePanelRef = useRef(null)
  const diagramTypeMenu = usePopoverState(diagramTypeTriggerRef, diagramTypePanelRef, computeToolMenuPos)
  const activeDiagramTypeGroup =
    diagramTypeGroups.find((group) => group.key === mobileDiagramType) ?? diagramTypeGroups[0]

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
      </div>

      {/* Desktop: all three diagram-type groups permanently stacked, each
          independently collapsible - unchanged from before this feature. */}
      <div className="hidden w-full md:block">
        <button
          type="button"
          onClick={() => setShowShapes((visible) => !visible)}
          aria-expanded={showShapes}
          aria-label={showShapes ? 'Hide shapes' : 'Show shapes'}
          className="mt-5 flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-soft"
        >
          <span>Data Flow Diagram</span>
          <ChevronIcon direction={showShapes ? 'up' : 'down'} />
        </button>
        {showShapes && (
          <div className="mt-2 grid grid-cols-4 gap-1.5 rounded-xl border border-line p-1.5">
            {dfdShapes.map((t) => (
              <IconTile
                key={t.key}
                toolKey={t.key}
                label={t.label}
                active={state.tool === t.key}
                onClick={() => selectTool(t.key)}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowFlowchart((visible) => !visible)}
          aria-expanded={showFlowchart}
          aria-label={showFlowchart ? 'Hide flowchart shapes' : 'Show flowchart shapes'}
          className="mt-5 flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-soft"
        >
          <span>Flowchart</span>
          <ChevronIcon direction={showFlowchart ? 'up' : 'down'} />
        </button>
        {showFlowchart && (
          <div className="mt-2 grid grid-cols-4 gap-1.5 rounded-xl border border-line p-1.5">
            {flowchartShapes.map((t) => (
              <IconTile
                key={t.key}
                toolKey={t.key}
                label={t.label}
                active={state.tool === t.key}
                onClick={() => selectTool(t.key)}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowUseCase((visible) => !visible)}
          aria-expanded={showUseCase}
          aria-label={showUseCase ? 'Hide use case shapes' : 'Show use case shapes'}
          className="mt-5 flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-soft"
        >
          <span>Use Case Diagram</span>
          <ChevronIcon direction={showUseCase ? 'up' : 'down'} />
        </button>
        {showUseCase && (
          <div className="mt-2 grid grid-cols-4 gap-1.5 rounded-xl border border-line p-1.5">
            {usecaseShapes.map((t) => (
              <IconTile
                key={t.key}
                toolKey={t.key}
                label={t.label}
                active={state.tool === t.key}
                onClick={() => selectTool(t.key)}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowUml((visible) => !visible)}
          aria-expanded={showUml}
          aria-label={showUml ? 'Hide UML shapes' : 'Show UML shapes'}
          className="mt-5 flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-soft"
        >
          <span>UML Diagram</span>
          <ChevronIcon direction={showUml ? 'up' : 'down'} />
        </button>
        {showUml && (
          <div className="mt-2 grid grid-cols-4 gap-1.5 rounded-xl border border-line p-1.5">
            {umlShapes.map((t) => (
              <IconTile
                key={t.key}
                toolKey={t.key}
                label={t.label}
                active={state.tool === t.key}
                onClick={() => selectTool(t.key)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile: the narrow icon rail has no room to show three
          independently-collapsible sections without their shapes blurring
          together into one long, unlabeled column (the problem this picker
          fixes) - so instead of all three at once, pick one diagram type
          from a dropdown and only that type's shapes render below it. */}
      <div className="mt-5 flex w-full flex-col items-center md:hidden">
        <button
          ref={diagramTypeTriggerRef}
          type="button"
          onClick={diagramTypeMenu.toggle}
          title={activeDiagramTypeGroup.label}
          aria-label="Diagram type"
          aria-haspopup="true"
          aria-expanded={diagramTypeMenu.open}
          className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-line transition-colors hover:bg-surface-soft ${
            diagramTypeMenu.open ? 'bg-surface-soft text-ink' : 'text-body'
          }`}
        >
          <ShapeIcon toolKey={activeDiagramTypeGroup.iconKey} />
          <ChevronIcon direction={diagramTypeMenu.open ? 'up' : 'down'} />
        </button>

        {diagramTypeMenu.open &&
          diagramTypeMenu.pos &&
          createPortal(
            <div
              ref={diagramTypePanelRef}
              className="fixed z-30 w-52 rounded-xl border border-line bg-white p-1.5 shadow-lg"
              style={diagramTypeMenu.pos}
            >
              {diagramTypeGroups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => {
                    setMobileDiagramType(group.key)
                    diagramTypeMenu.close()
                  }}
                  className={menuItemClass(mobileDiagramType === group.key)}
                >
                  <ShapeIcon toolKey={group.iconKey} />
                  <span>{group.label}</span>
                  {mobileDiagramType === group.key && <CheckIcon />}
                </button>
              ))}
            </div>,
            document.body,
          )}

        {/* Single column, not a grid like the desktop sections above - this
            block only ever renders below the md breakpoint, where the
            sidebar itself is the collapsed w-14 rail (md:px-4 doesn't apply
            yet either), leaving no room for more than one 40px tile across. */}
        <div className="mt-2 flex flex-col items-center gap-1.5 rounded-xl border border-line p-1.5">
          {activeDiagramTypeGroup.shapes.map((t) => (
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

      <RotatingTip />
    </aside>
  )
}

export default EditorSidebar
