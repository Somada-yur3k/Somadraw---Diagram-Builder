import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDiagramEditorContext } from './DiagramEditorContext'
import { usePopoverState } from '../../lib/usePopoverState'

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

// Entity/Process/Data Store are the actual DFD notation shapes, shown in the
// collapsible "Data Flow Diagram" section below. Text Label isn't DFD
// notation - it lives with Select/Draw Arrow in "Tools" instead.
const dfdShapes = [
  { key: 'entity', label: 'Entity' },
  { key: 'process', label: 'Process' },
  { key: 'store', label: 'Data Store' },
]
// Standard flowchart notation, shown in its own collapsible "Flowchart"
// section below - separate key namespace from the DFD shapes above (e.g.
// 'flowProcess' vs 'process') since a flowchart process and a DFD process
// are visually and semantically different shapes.
const flowchartShapes = [
  { key: 'flowProcess', label: 'Process' },
  { key: 'decision', label: 'Decision' },
  { key: 'terminator', label: 'Start/End' },
  { key: 'inputOutput', label: 'Input/Output' },
]
// UML Use Case notation, shown in its own collapsible "Use Case Diagram"
// section below, same treatment as dfdShapes/flowchartShapes above - own key
// namespace since these are their own diagram type, not tied to either
// notation above.
const usecaseShapes = [
  { key: 'actor', label: 'Actor' },
  { key: 'usecase', label: 'Use Case' },
  { key: 'boundary', label: 'System Boundary' },
]
// Plain geometric shapes, reachable only from the Shapes button's dropdown
// (not the sidebar's own collapsible sections, unlike dfdShapes/
// flowchartShapes below) - own key namespace (not reusing e.g. 'process')
// since these are generic freeform shapes, not tied to either notation.
const basicShapes = [
  { key: 'circle', label: 'Circle' },
  { key: 'square', label: 'Square' },
  { key: 'rectangle', label: 'Rectangle' },
  { key: 'triangle', label: 'Triangle' },
  { key: 'diamond', label: 'Diamond' },
]
const textLabelTool = { key: 'label', label: 'Text Label' }
// Line styles offered from the Draw Arrow button's dropdown - 'shape' is the
// app's original (and still default) auto-routed orthogonal connector,
// listed last to match the order the user asked for these in.
const connectorTypes = [
  { key: 'straight', label: 'Straight Line' },
  { key: 'curved', label: 'Curved Line' },
  { key: 'shape', label: 'Shape Connector' },
]
// Mobile-only: which diagram type's shapes the sidebar's dropdown picker
// currently shows (see EditorSidebar's mobile-only block below) - desktop
// keeps all three permanently stacked, independently collapsible sections
// instead, so this array only ever feeds the mobile picker. `iconKey` picks
// one representative shape from each group as the picker's own icon.
const diagramTypeGroups = [
  { key: 'dfd', label: 'Data Flow Diagram', shapes: dfdShapes, iconKey: 'entity' },
  { key: 'flowchart', label: 'Flowchart', shapes: flowchartShapes, iconKey: 'decision' },
  { key: 'usecase', label: 'Use Case Diagram', shapes: usecaseShapes, iconKey: 'actor' },
]
// Every shape reachable from anywhere a shape can be picked - the toolbox
// dropdown (basicShapes only, see below) plus the sidebar's own DFD/
// Flowchart/Use Case sections - so the Shapes button still highlights as
// active no matter which group a placed shape's tool key belongs to.
const shapeToolKeys = new Set(
  [...dfdShapes, ...flowchartShapes, ...usecaseShapes, ...basicShapes].map((shape) => shape.key),
)

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

function ShapeIcon({ toolKey }) {
  if (toolKey === 'entity') {
    return <span className="h-3.5 w-5 shrink-0 rounded border-2 border-brand-blue/60 bg-brand-blue/10" />
  }
  if (toolKey === 'process') {
    return <span className="h-3.5 w-5 shrink-0 rounded-[3px] border-2 border-brand-purple/60 bg-brand-purple/10" />
  }
  if (toolKey === 'store') {
    return <span className="h-3.5 w-5 shrink-0 border-y-2 border-brand-pink/60 bg-brand-pink/10" />
  }
  if (toolKey === 'flowProcess') {
    return <span className="h-3.5 w-5 shrink-0 rounded-[3px] border-2 border-teal-500/60 bg-teal-500/10" />
  }
  if (toolKey === 'decision') {
    return (
      <span className="relative flex h-4 w-5 shrink-0 items-center justify-center">
        <span className="absolute h-3 w-3 rotate-45 border-2 border-amber-500/60 bg-amber-500/10" />
      </span>
    )
  }
  if (toolKey === 'terminator') {
    return <span className="h-3.5 w-5 shrink-0 rounded-full border-2 border-slate-500/60 bg-slate-500/10" />
  }
  if (toolKey === 'inputOutput') {
    return (
      <span
        className="h-3.5 w-5 shrink-0 border-2 border-cyan-500/60 bg-cyan-500/10"
        style={{ transform: 'skewX(-12deg)' }}
      />
    )
  }
  if (toolKey === 'actor') {
    return (
      <svg width="14" height="16" viewBox="0 0 24 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-indigo-500">
        <circle cx="12" cy="5" r="4" />
        <line x1="12" y1="9" x2="12" y2="19" />
        <line x1="4" y1="13" x2="20" y2="13" />
        <line x1="12" y1="19" x2="5" y2="27" />
        <line x1="12" y1="19" x2="19" y2="27" />
      </svg>
    )
  }
  if (toolKey === 'usecase') {
    return <span className="h-3.5 w-5 shrink-0 rounded-full border-2 border-sky-500/60 bg-sky-500/10" />
  }
  if (toolKey === 'boundary') {
    return <span className="h-3.5 w-5 shrink-0 rounded-[3px] border-2 border-slate-400/60 bg-slate-400/10" />
  }
  if (toolKey === 'circle') {
    return <span className="h-4 w-4 shrink-0 rounded-full border-2 border-brand-blue/60 bg-brand-blue/10" />
  }
  if (toolKey === 'square') {
    return <span className="h-4 w-4 shrink-0 border-2 border-brand-purple/60 bg-brand-purple/10" />
  }
  if (toolKey === 'rectangle') {
    return <span className="h-3.5 w-5 shrink-0 border-2 border-teal-500/60 bg-teal-500/10" />
  }
  if (toolKey === 'triangle') {
    return (
      <span
        className="h-3.5 w-4 shrink-0 border-2 border-amber-500/60 bg-amber-500/10"
        style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}
      />
    )
  }
  if (toolKey === 'diamond') {
    return (
      <span
        className="h-4 w-4 shrink-0 border-2 border-slate-500/60 bg-slate-500/10"
        style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
      />
    )
  }
  return <span className="flex h-3.5 w-5 shrink-0 items-center justify-center text-[10px] font-bold text-body">T</span>
}

function toolButtonClass(active) {
  return `mt-1 flex w-10 items-center justify-center gap-2.5 rounded-lg py-2.5 text-[13.5px] font-medium transition-colors md:w-full md:justify-start md:px-3 ${
    active ? 'bg-surface-soft text-ink' : 'text-body hover:bg-surface-soft hover:text-ink'
  }`
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
        {showShapes &&
          dfdShapes.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => selectTool(t.key)}
              title={t.label}
              aria-label={t.label}
              className={toolButtonClass(state.tool === t.key)}
            >
              <ShapeIcon toolKey={t.key} />
              <span>{t.label}</span>
            </button>
          ))}

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
        {showFlowchart &&
          flowchartShapes.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => selectTool(t.key)}
              title={t.label}
              aria-label={t.label}
              className={toolButtonClass(state.tool === t.key)}
            >
              <ShapeIcon toolKey={t.key} />
              <span>{t.label}</span>
            </button>
          ))}

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
        {showUseCase &&
          usecaseShapes.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => selectTool(t.key)}
              title={t.label}
              aria-label={t.label}
              className={toolButtonClass(state.tool === t.key)}
            >
              <ShapeIcon toolKey={t.key} />
              <span>{t.label}</span>
            </button>
          ))}
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

        {activeDiagramTypeGroup.shapes.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => selectTool(t.key)}
            title={t.label}
            aria-label={t.label}
            className={toolButtonClass(state.tool === t.key)}
          >
            <ShapeIcon toolKey={t.key} />
            <span className="hidden md:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <RotatingTip />
    </aside>
  )
}

export default EditorSidebar
