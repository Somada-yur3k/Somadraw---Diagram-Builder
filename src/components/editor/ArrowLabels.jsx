import { useRef } from 'react'
import { useDiagramEditorContext } from './DiagramEditorContext'
import EditableText from './EditableText'
import { computeArrowRoute } from './arrowRouting'
import { textFormatStyle } from './textFormat'

function ArrowLabel({ arrow, isSelected, labelAnchor, zoom, dispatch }) {
  const dragRef = useRef(null)
  const rotateRef = useRef(null)
  const labelRef = useRef(null)

  const x = labelAnchor.x + (arrow.labelOffsetX ?? 0)
  const y = labelAnchor.y + (arrow.labelOffsetY ?? 0)
  const rotation = arrow.labelRotation ?? 0

  const handlePointerDown = (event) => {
    if (event.target.closest('[data-no-drag]')) return
    event.stopPropagation()
    dispatch({ type: 'SELECT', kind: 'arrow', id: arrow.id })
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: arrow.labelOffsetX ?? 0,
      startOffsetY: arrow.labelOffsetY ?? 0,
    }
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = (event.clientX - drag.startClientX) / zoom
    const dy = (event.clientY - drag.startClientY) / zoom
    dispatch({
      type: 'MOVE_ARROW_LABEL',
      id: arrow.id,
      offsetX: drag.startOffsetX + dx,
      offsetY: drag.startOffsetY + dy,
    })
  }

  const endDrag = (event) => {
    if (!dragRef.current) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dispatch({ type: 'DRAG_END', id: arrow.id })
  }

  // Same angle math as ShapeHandles' rotate handle: live bounding-rect
  // center (not the stored x/y), so it stays correct regardless of the
  // label's current offset/size.
  const beginRotate = (event) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    rotateRef.current = { pointerId: event.pointerId }
  }

  const handleRotateMove = (event) => {
    if (!rotateRef.current || rotateRef.current.pointerId !== event.pointerId) return
    const rect = labelRef.current?.getBoundingClientRect()
    if (!rect) return
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dx = event.clientX - centerX
    const dy = event.clientY - centerY
    const angleDeg = Math.round(Math.atan2(dx, -dy) * (180 / Math.PI))
    dispatch({ type: 'ROTATE_ARROW_LABEL', id: arrow.id, rotation: angleDeg })
  }

  const endRotate = (event) => {
    if (!rotateRef.current) return
    rotateRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dispatch({ type: 'DRAG_END', id: arrow.id })
  }

  return (
    <div
      className="absolute z-20 select-none cursor-grab active:cursor-grabbing"
      style={{ left: x, top: y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div
        ref={labelRef}
        className="relative"
        style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
      >
        <EditableText
          value={arrow.label}
          onCommit={(value) => dispatch({ type: 'RENAME_ARROW_LABEL', id: arrow.id, value })}
          placeholder="Add label"
          className={`block whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium shadow-sm ${
            isSelected
              ? 'border-brand-purple/40 bg-white text-ink'
              : 'border-line bg-white text-body'
          }`}
          style={textFormatStyle(arrow)}
        />

        {isSelected && (
          <>
            <div
              data-no-drag
              className="pointer-events-none absolute left-1/2 top-0 w-px -translate-x-1/2 -translate-y-full bg-line"
              style={{ height: 16 }}
            />
            <div
              data-no-drag
              onPointerDown={beginRotate}
              onPointerMove={handleRotateMove}
              onPointerUp={endRotate}
              onPointerCancel={endRotate}
              title="Drag to rotate"
              className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-[calc(100%+16px)] cursor-grab rounded-full border border-white bg-brand-purple shadow-sm active:cursor-grabbing"
            />
          </>
        )}
        {isSelected && arrow.label && (
          <button
            type="button"
            data-no-drag
            onClick={(event) => {
              event.stopPropagation()
              dispatch({ type: 'RENAME_ARROW_LABEL', id: arrow.id, value: '' })
            }}
            title="Remove label"
            className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border border-line bg-white text-[10px] leading-none text-soft shadow-sm hover:border-rose-300 hover:text-rose-500"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

function ArrowLabels() {
  const { state, dispatch } = useDiagramEditorContext()
  const zoom = state.viewport.zoom

  const visibleArrows = state.arrowOrder
    .map((id) => state.arrows[id])
    .filter((arrow) => arrow && state.shapes[arrow.fromId] && state.shapes[arrow.toId])

  return (
    <>
      {visibleArrows.map((arrow) => {
        const isSelected = state.selection?.kind === 'arrow' && state.selection.id === arrow.id
        // An unselected arrow with no label text renders nothing here (no
        // permanent "Add label" placeholder cluttering every connector) -
        // selecting the arrow (via its own line, still always clickable)
        // reveals the placeholder again so a label can be added or, once
        // present, removed with the delete button below.
        if (!isSelected && !arrow.label) return null
        const { labelAnchor } = computeArrowRoute(
          state.shapes[arrow.fromId],
          arrow.fromSide,
          arrow.fromT,
          state.shapes[arrow.toId],
          arrow.toSide,
          arrow.toT,
          arrow.routeMidOffset ?? 0,
          arrow.connectorType ?? 'shape',
        )

        return (
          <ArrowLabel
            key={arrow.id}
            arrow={arrow}
            isSelected={isSelected}
            labelAnchor={labelAnchor}
            zoom={zoom}
            dispatch={dispatch}
          />
        )
      })}
    </>
  )
}

export default ArrowLabels
