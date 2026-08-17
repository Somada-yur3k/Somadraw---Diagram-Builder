import { memo, useRef } from 'react'
import { useDiagramEditorContext } from './DiagramEditorContext'
import EditableText from './EditableText'
import { computeArrowRoute } from './arrowRouting'
import { textFormatStyle } from './textFormat'

// Memoized the same way ArrowLayer's ArrowPathVisual is - `arrow` is a
// stable reference unless that specific arrow changed, and labelAnchor is
// passed as two primitive numbers (not an {x, y} object, which would be a
// fresh reference every ArrowLabels render even when unchanged) so memo's
// default shallow comparison actually catches the common "nothing about
// this label changed" case instead of always seeing new props.
const ArrowLabel = memo(function ArrowLabel({
  arrow,
  isSelected,
  labelAnchorX,
  labelAnchorY,
  zoom,
  dispatch,
}) {
  const dragRef = useRef(null)
  const rotateRef = useRef(null)
  const labelRef = useRef(null)

  // Position is always the live labelAnchor computeArrowRoute just
  // recomputed from the connected shapes' current positions/sides, plus the
  // manual offset - locked (labelLocked, see TOGGLE_ARROW_LABEL_LOCK in
  // useDiagramEditor.js) or not. Locking only stops the offset itself from
  // being *changed* (handlePointerDown below refuses to start a drag while
  // locked) - the label still glides right along with the arrow as it
  // moves/reroutes either way, it just can't be manually repositioned
  // relative to it anymore.
  const isLocked = Boolean(arrow.labelLocked)
  const x = labelAnchorX + (arrow.labelOffsetX ?? 0)
  const y = labelAnchorY + (arrow.labelOffsetY ?? 0)
  const rotation = arrow.labelRotation ?? 0
  // Flat white, independent of the arrow's own color - readable against any
  // line color without needing to compute a contrasting text color per
  // arrow. Only actually used when labelBackground is on (default, unset
  // means on - see TOGGLE_ARROW_LABEL_BACKGROUND in useDiagramEditor.js);
  // off renders as bare text with no fill at all.
  const showLabelBackground = arrow.labelBackground ?? true
  const labelBg = showLabelBackground ? '#ffffff' : 'transparent'

  const handlePointerDown = (event) => {
    if (event.target.closest('[data-no-drag]')) return
    event.stopPropagation()
    dispatch({ type: 'SELECT', kind: 'arrow', id: arrow.id })
    // Selecting still works while locked (above) - only the drag gesture
    // itself is refused, by never capturing the pointer or arming dragRef,
    // so handlePointerMove below has nothing to act on.
    if (isLocked) return
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
      className={`absolute z-20 select-none ${isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
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
          // whitespace-pre-wrap (not nowrap): honors manual line breaks
          // (Shift+Enter in EditableText) so a label can span 2+ rows,
          // while a single-line label with no "\n" in it still renders
          // exactly as before (no width constraint here to force wrapping).
          // No border/outline - just the pill itself (background is
          // labelBg, flat white, set via style below since it's computed,
          // not expressible as a static Tailwind class). Text stays ink
          // either way now (white bg or none), so unlike labelBg this one
          // doesn't need to branch on showLabelBackground - only the shadow
          // does, since it only makes sense with something to cast it.
          className={`block whitespace-pre-wrap rounded-md px-1 py-px text-center text-[11px] font-medium text-ink ${
            showLabelBackground ? 'shadow-sm' : ''
          }`}
          // Opacity lives on the label pill itself (not the outer wrapper
          // this sits inside) so it fades the label's own border/background/
          // text without also fading the rotate handle/lock/remove buttons
          // that mount as its siblings while selected - same "content fades,
          // editing chrome doesn't" split ShapeBody's own opacity uses.
          style={{
            ...textFormatStyle(arrow),
            backgroundColor: labelBg,
            opacity: arrow.opacity != null ? arrow.opacity / 100 : undefined,
          }}
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
        {isSelected && arrow.label && (
          <button
            type="button"
            data-no-drag
            onClick={(event) => {
              event.stopPropagation()
              dispatch({ type: 'TOGGLE_ARROW_LABEL_LOCK', id: arrow.id })
            }}
            title={isLocked ? 'Unlock label position' : 'Lock label position'}
            className={`absolute -left-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border bg-white shadow-sm ${
              isLocked
                ? 'border-brand-purple/40 text-brand-purple hover:border-brand-purple'
                : 'border-line text-soft hover:border-brand-purple/40 hover:text-brand-purple'
            }`}
          >
            {isLocked ? (
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            ) : (
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 7.4-2" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
})

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
            labelAnchorX={labelAnchor.x}
            labelAnchorY={labelAnchor.y}
            zoom={zoom}
            dispatch={dispatch}
          />
        )
      })}
    </>
  )
}

export default ArrowLabels
