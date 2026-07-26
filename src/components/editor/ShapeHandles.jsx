import { useRef } from 'react'

const MIN_W = 48
const MIN_H = 28

// key: which edges/corner this handle owns. baseAngle: clockwise degrees
// from "up", same convention as shape.rotation - used to keep the resize
// cursor pointing the right way even when the shape is rotated.
const RESIZE_HANDLES = [
  { key: 'nw', top: '0%', left: '0%', baseAngle: 315 },
  { key: 'n', top: '0%', left: '50%', baseAngle: 0 },
  { key: 'ne', top: '0%', left: '100%', baseAngle: 45 },
  { key: 'e', top: '50%', left: '100%', baseAngle: 90 },
  { key: 'se', top: '100%', left: '100%', baseAngle: 135 },
  { key: 's', top: '100%', left: '50%', baseAngle: 180 },
  { key: 'sw', top: '100%', left: '0%', baseAngle: 225 },
  { key: 'w', top: '50%', left: '0%', baseAngle: 270 },
]

const CURSOR_BY_BUCKET = [
  'ns-resize',
  'nesw-resize',
  'ew-resize',
  'nwse-resize',
  'ns-resize',
  'nesw-resize',
  'ew-resize',
  'nwse-resize',
]

function cursorForAngle(angleDeg) {
  const normalized = ((angleDeg % 360) + 360) % 360
  const bucket = Math.round(normalized / 45) % 8
  return CURSOR_BY_BUCKET[bucket]
}

function clamp(value, min) {
  return Math.max(min, value)
}

function applyResize(handleKey, start, localDx, localDy) {
  const { startX, startY, startWidth, startHeight } = start
  let width = startWidth
  let height = startHeight
  let x = startX
  let y = startY

  if (handleKey.includes('e')) {
    width = clamp(startWidth + localDx, MIN_W)
  } else if (handleKey.includes('w')) {
    width = clamp(startWidth - localDx, MIN_W)
    x = startX + (startWidth - width)
  }

  if (handleKey.includes('s')) {
    height = clamp(startHeight + localDy, MIN_H)
  } else if (handleKey.includes('n')) {
    height = clamp(startHeight - localDy, MIN_H)
    y = startY + (startHeight - height)
  }

  return { x, y, width, height }
}

function ShapeHandles({ shape, dispatch, outerRef, zoom }) {
  const dragRef = useRef(null)

  const beginDrag = (kind, handleKey, event) => {
    event.stopPropagation()
    // No preventDefault here: if a shape's text is mid-edit, the native
    // blur triggered by this pointerdown should still commit it before the
    // resize/rotate gesture proceeds.
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      kind,
      handleKey,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: shape.x,
      startY: shape.y,
      startWidth: shape.width,
      startHeight: shape.height,
      rotation: shape.rotation ?? 0,
    }
  }

  const handleMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (drag.kind === 'resize') {
      const dx = (event.clientX - drag.startClientX) / zoom
      const dy = (event.clientY - drag.startClientY) / zoom
      const rad = (-drag.rotation * Math.PI) / 180
      const localDx = dx * Math.cos(rad) - dy * Math.sin(rad)
      const localDy = dx * Math.sin(rad) + dy * Math.cos(rad)
      const next = applyResize(drag.handleKey, drag, localDx, localDy)
      dispatch({ type: 'RESIZE_SHAPE', id: shape.id, ...next })
      return
    }

    const rect = outerRef.current?.getBoundingClientRect()
    if (!rect) return
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dx = event.clientX - centerX
    const dy = event.clientY - centerY
    const angleDeg = Math.round(Math.atan2(dx, -dy) * (180 / Math.PI))
    dispatch({ type: 'ROTATE_SHAPE', id: shape.id, rotation: angleDeg })
  }

  const endDrag = (event) => {
    if (!dragRef.current) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dispatch({ type: 'DRAG_END', id: shape.id })
  }

  return (
    <>
      {RESIZE_HANDLES.map((handle) => (
        <div
          key={handle.key}
          data-no-drag
          onPointerDown={(event) => beginDrag('resize', handle.key, event)}
          onPointerMove={handleMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="pointer-events-auto absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white bg-brand-purple shadow-sm"
          style={{
            top: handle.top,
            left: handle.left,
            cursor: cursorForAngle(handle.baseAngle + (shape.rotation ?? 0)),
          }}
        />
      ))}

      <div
        data-no-drag
        className="absolute left-1/2 top-0 w-px -translate-x-1/2 -translate-y-full bg-line"
        style={{ height: 20 }}
      />
      <div
        data-no-drag
        onPointerDown={(event) => beginDrag('rotate', 'rotate', event)}
        onPointerMove={handleMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        title="Drag to rotate"
        className="pointer-events-auto absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-[calc(100%+20px)] cursor-grab rounded-full border border-white bg-brand-purple shadow-sm active:cursor-grabbing"
      />
    </>
  )
}

export default ShapeHandles
