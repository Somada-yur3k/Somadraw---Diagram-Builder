import { useEffect, useRef, useState } from 'react'
import { useDiagramEditorContext } from './DiagramEditorContext'

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

function connectorMenuItemClass(active) {
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

  const currentConnectorType = state.arrowConnectorType ?? 'shape'
  const connectorMenuRef = useRef(null)
  const [connectorMenuOpen, setConnectorMenuOpen] = useState(false)
  // Fixed (viewport-relative) coordinates, same reasoning as EditorTopbar's
  // corner-radius popover: opens to the right of the button rather than
  // centered below it, so it never overflows off the left edge of the
  // collapsed w-14 icon rail, where a centered popover half again as wide as
  // the whole sidebar would otherwise run off-screen.
  const [connectorMenuPos, setConnectorMenuPos] = useState(null)

  const toggleConnectorMenu = (event) => {
    if (connectorMenuOpen) {
      setConnectorMenuOpen(false)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    setConnectorMenuPos({ left: rect.right + 8, top: rect.top })
    setConnectorMenuOpen(true)
  }

  const chooseConnectorType = (connectorType) => {
    dispatch({ type: 'SET_ARROW_CONNECTOR_TYPE', connectorType })
    setConnectorMenuOpen(false)
  }

  useEffect(() => {
    if (!connectorMenuOpen) return
    const handlePointerDown = (event) => {
      if (connectorMenuRef.current && !connectorMenuRef.current.contains(event.target)) {
        setConnectorMenuOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setConnectorMenuOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [connectorMenuOpen])

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
        {/* display:contents keeps this wrapper (needed only so the
            outside-click handler can tell menu clicks apart from clicks
            elsewhere) from disturbing the flex row's equal-width button
            distribution - the button and popover behave as direct flex
            children of the row above, exactly as if the wrapper weren't
            there for layout purposes. */}
        <div ref={connectorMenuRef} className="contents">
          <button
            type="button"
            onClick={toggleConnectorMenu}
            title="Draw Arrow"
            aria-label="Draw Arrow"
            aria-haspopup="true"
            aria-expanded={connectorMenuOpen}
            className={horizontalToolButtonClass(state.tool === 'arrow')}
          >
            <ArrowToolIcon />
          </button>

          {connectorMenuOpen && connectorMenuPos && (
            <div
              className="fixed z-30 w-52 rounded-xl border border-line bg-white p-1.5 shadow-lg"
              style={{ left: connectorMenuPos.left, top: connectorMenuPos.top }}
            >
              {connectorTypes.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => chooseConnectorType(c.key)}
                  className={connectorMenuItemClass(currentConnectorType === c.key)}
                >
                  <ConnectorTypeIcon type={c.key} />
                  <span>{c.label}</span>
                  {currentConnectorType === c.key && <CheckIcon />}
                </button>
              ))}
            </div>
          )}
        </div>
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
