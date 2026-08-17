import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDiagramEditorContext } from './DiagramEditorContext'
import { computeArrowRoute } from './arrowRouting'
import { ERD_CARDINALITY_OPTIONS } from './erdCardinality'
import ErdCardinalityIcon from './ErdCardinalityIcon'

const MENU_WIDTH = 168

// One floating trigger chip per endpoint of a *selected* ERD-relationship
// arrow - clicking it opens a dropdown of all 6 cardinality glyphs
// (ERD_CARDINALITY_OPTIONS), same portal-to-<body> pattern as the ERD
// table's own row pickers in Shape.jsx (ErdRowKeyControl/ErdRowTypeControl)
// - the dropdown itself needs to stay a constant on-screen size and escape
// this canvas's own scale(zoom), but the *trigger* chip is a plain child of
// that scaled canvas (like ArrowLabels' own label div), so its left/top
// here are logical diagram coordinates - the ancestor's CSS transform
// handles the zoom conversion, same as every other floating per-arrow
// control in this app.
function CardinalityChip({ arrowId, end, value, x, y, dispatch }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event) => {
      if (panelRef.current?.contains(event.target)) return
      if (triggerRef.current?.contains(event.target)) return
      setOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const toggleOpen = (event) => {
    event.stopPropagation()
    if (!open) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPos({ left: rect.left + rect.width / 2 - MENU_WIDTH / 2, top: rect.bottom + 6 })
    }
    setOpen((prev) => !prev)
  }

  const optionLabel = ERD_CARDINALITY_OPTIONS.find((option) => option.value === value)?.label ?? 'Cardinality'

  return (
    <div
      // Selection-only editing chrome - diagramExport.js's capture filter
      // excludes anything flagged data-export-hidden (same flag
      // EditorCanvas.jsx's live cursor markers use) so exporting a diagram
      // mid-edit, with an ERD relationship still selected, doesn't bake
      // these trigger chips into the PNG/PDF. The dropdown menu itself
      // needs no such flag - it's portaled straight to document.body, so
      // it's never part of the captured canvas subtree in the first place.
      data-export-hidden
      className="absolute z-20"
      style={{ left: x, top: y, transform: 'translate(-50%, -100%) translateY(-8px)' }}
    >
      <button
        ref={triggerRef}
        type="button"
        data-no-drag
        onClick={toggleOpen}
        title={`${end === 'start' ? 'Start' : 'End'} cardinality: ${optionLabel}`}
        aria-label={`Set ${end === 'start' ? 'start' : 'end'} cardinality`}
        className="flex h-5 w-7 items-center justify-center rounded-md border border-line bg-white text-soft shadow-sm transition-colors hover:border-ink/40 hover:text-ink"
      >
        <ErdCardinalityIcon value={value} />
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              data-no-drag
              className="fixed z-30 rounded-lg border border-line bg-white p-1 shadow-lg"
              style={{ left: pos.left, top: pos.top, width: MENU_WIDTH }}
            >
              {ERD_CARDINALITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'SET_ARROW_CARDINALITY', id: arrowId, end, value: option.value })
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-surface-soft ${
                    value === option.value ? 'font-medium text-brand-blue' : 'text-soft'
                  }`}
                >
                  <ErdCardinalityIcon value={option.value} className="h-3.5 w-6 shrink-0" />
                  <span className="flex-1">{option.label}</span>
                  {value === option.value && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand-blue">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  )
}

// Only ever renders for a single *selected* ERD-relationship arrow (see
// EditorTopbar's own Format-tab precedent for "extra controls only for one
// selected thing at a time") - every other connector type has no editable
// cardinality, and showing two chips per arrow for every ERD relationship
// on the canvas at once (rather than just the selected one) would clutter
// diagrams with more than a couple of tables.
function ArrowCardinalityPickers() {
  const { state, dispatch } = useDiagramEditorContext()

  const selectedErdArrow = (() => {
    if (state.selection?.kind !== 'arrow') return null
    const arrow = state.arrows[state.selection.id]
    if (!arrow || arrow.connectorType !== 'erd') return null
    if (!state.shapes[arrow.fromId] || !state.shapes[arrow.toId]) return null
    return arrow
  })()

  if (!selectedErdArrow) return null

  const { start, end } = computeArrowRoute(
    state.shapes[selectedErdArrow.fromId],
    selectedErdArrow.fromSide,
    selectedErdArrow.fromT,
    state.shapes[selectedErdArrow.toId],
    selectedErdArrow.toSide,
    selectedErdArrow.toT,
    selectedErdArrow.routeMidOffset ?? 0,
    selectedErdArrow.connectorType ?? 'shape',
  )

  return (
    <>
      <CardinalityChip
        arrowId={selectedErdArrow.id}
        end="start"
        value={selectedErdArrow.startCardinality ?? 'one'}
        x={start.x}
        y={start.y}
        dispatch={dispatch}
      />
      <CardinalityChip
        arrowId={selectedErdArrow.id}
        end="end"
        value={selectedErdArrow.endCardinality ?? 'many'}
        x={end.x}
        y={end.y}
        dispatch={dispatch}
      />
    </>
  )
}

export default ArrowCardinalityPickers
