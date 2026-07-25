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
const textLabelTool = { key: 'label', label: 'Text Label' }
// Line styles offered from the Draw Arrow button's dropdown - 'shape' is the
// app's original (and still default) auto-routed orthogonal connector,
// listed last to match the order the user asked for these in.
const connectorTypes = [
  { key: 'straight', label: 'Straight Line' },
  { key: 'curved', label: 'Curved Line' },
  { key: 'shape', label: 'Shape Connector' },
]
// Every shape reachable from the Shapes button's dropdown - a quick-access
// picker covering both notations at once, so placing any shape doesn't
// require first opening the matching collapsible section below. Kept as
// two grouped lists (not merged into one) so the dropdown can label each
// group, same split as the sidebar's own two sections.
const shapeToolKeys = new Set([...dfdShapes, ...flowchartShapes].map((shape) => shape.key))

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

function MenuGroupLabel({ children }) {
  return (
    <div className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-soft first:pt-1.5">
      {children}
    </div>
  )
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

  const currentConnectorType = state.arrowConnectorType ?? 'shape'
  const connectorTriggerRef = useRef(null)
  const connectorPanelRef = useRef(null)
  const connectorMenu = usePopoverState(connectorTriggerRef, connectorPanelRef, computeToolMenuPos)

  const chooseConnectorType = (connectorType) => {
    dispatch({ type: 'SET_ARROW_CONNECTOR_TYPE', connectorType })
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
                  onClick={() => chooseConnectorType(c.key)}
                  className={menuItemClass(currentConnectorType === c.key)}
                >
                  <ConnectorTypeIcon type={c.key} />
                  <span>{c.label}</span>
                  {currentConnectorType === c.key && <CheckIcon />}
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
              <MenuGroupLabel>Data Flow Diagram</MenuGroupLabel>
              {dfdShapes.map((t) => (
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
              <MenuGroupLabel>Flowchart</MenuGroupLabel>
              {flowchartShapes.map((t) => (
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

      <button
        type="button"
        onClick={() => setShowShapes((visible) => !visible)}
        aria-expanded={showShapes}
        aria-label={showShapes ? 'Hide shapes' : 'Show shapes'}
        className="mt-5 hidden w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-soft md:flex"
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
            <span className="hidden md:inline">{t.label}</span>
          </button>
        ))}

      <button
        type="button"
        onClick={() => setShowFlowchart((visible) => !visible)}
        aria-expanded={showFlowchart}
        aria-label={showFlowchart ? 'Hide flowchart shapes' : 'Show flowchart shapes'}
        className="mt-5 hidden w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-soft md:flex"
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
            <span className="hidden md:inline">{t.label}</span>
          </button>
        ))}

      <RotatingTip />
    </aside>
  )
}

export default EditorSidebar
