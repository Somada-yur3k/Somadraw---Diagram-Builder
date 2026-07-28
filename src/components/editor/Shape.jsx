import { useRef } from 'react'
import { useDiagramEditorContext } from './DiagramEditorContext'
import EditableText from './EditableText'
import ShapeHandles from './ShapeHandles'
import { textFormatStyle } from './textFormat'
import { DEFAULT_CORNER_RADIUS_BY_TYPE } from './shapeStyle'

function DeleteButton({ onClick }) {
  return (
    <button
      type="button"
      data-no-drag
      onClick={onClick}
      title="Delete"
      className="pointer-events-auto absolute -right-4 -top-4 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-white text-[11px] leading-none text-soft shadow-sm hover:border-rose-300 hover:text-rose-500"
    >
      ×
    </button>
  )
}

function ShapeBody({ shape, dispatch, disableDblClick }) {
  const commitField = (field) => (value) =>
    dispatch({ type: 'RENAME_SHAPE', id: shape.id, field, value })
  const textStyle = textFormatStyle(shape)
  // undefined unless the shape's own corner radius has been customized, so an
  // untouched shape keeps rendering with its type's own Tailwind rounding
  // class (rounded-lg / rounded-xl / none) exactly as before this feature -
  // same "additive only, never fights the base class" approach as textStyle.
  const cornerStyle =
    shape.cornerRadius != null ? { borderRadius: `${shape.cornerRadius}px` } : undefined
  // Same additive-only approach as cornerStyle/textStyle: undefined pieces
  // leave the type's own Tailwind brand color (blue/purple/pink) showing
  // through untouched until the user actually picks a fill color.
  const fill = shape.fillColor
  const fillTint = fill ? `color-mix(in srgb, ${fill} 8%, white)` : undefined

  if (shape.type === 'entity') {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-lg border-2 border-brand-blue/50 bg-brand-blue/6 px-3"
        style={{ ...cornerStyle, borderColor: fill || undefined, backgroundColor: fillTint }}
      >
        <EditableText
          value={shape.text}
          onCommit={commitField('text')}
          placeholder="Entity"
          disableDblClick={disableDblClick}
          className="w-full text-center text-[13px] font-semibold uppercase tracking-wide text-ink"
          style={textStyle}
        />
      </div>
    )
  }

  if (shape.type === 'process') {
    return (
      <div
        className="flex h-full w-full flex-col overflow-hidden rounded-2xl border-2 border-brand-purple"
        style={{ ...cornerStyle, borderColor: fill || undefined }}
      >
        <div
          className="flex shrink-0 items-center gap-2 bg-brand-purple px-3 py-1.5"
          style={{ backgroundColor: fill || undefined }}
        >
          <EditableText
            value={shape.badge}
            onCommit={commitField('badge')}
            placeholder="#"
            disableDblClick={disableDblClick}
            className="min-w-3.5 text-[13px] font-extrabold leading-none text-white"
          />
          <span className="text-[11px] font-bold uppercase tracking-wide leading-none text-white">
            Process
          </span>
        </div>
        <div
          className="flex flex-1 items-center justify-center bg-brand-purple/6 px-3 py-2"
          style={{ backgroundColor: fillTint }}
        >
          <EditableText
            value={shape.text}
            onCommit={commitField('text')}
            placeholder="Process"
            disableDblClick={disableDblClick}
            className="w-full text-center text-[14px] font-medium leading-snug text-ink"
            style={textStyle}
          />
        </div>
      </div>
    )
  }

  if (shape.type === 'store') {
    return (
      <div
        className="flex h-full w-full items-center gap-2 border-y-2 border-brand-pink/50 bg-brand-pink/6 px-3"
        style={{ ...cornerStyle, borderColor: fill || undefined, backgroundColor: fillTint }}
      >
        <EditableText
          value={shape.badge}
          onCommit={commitField('badge')}
          placeholder="D#"
          disableDblClick={disableDblClick}
          className="shrink-0 text-[11px] font-bold text-brand-pink"
          style={{ color: fill || undefined }}
        />
        <EditableText
          value={shape.text}
          onCommit={commitField('text')}
          placeholder="Data store"
          disableDblClick={disableDblClick}
          className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-ink"
          style={textStyle}
        />
      </div>
    )
  }

  if (shape.type === 'flowProcess') {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-md border-2 border-teal-500/50 bg-teal-500/6 px-3"
        style={{ ...cornerStyle, borderColor: fill || undefined, backgroundColor: fillTint }}
      >
        <EditableText
          value={shape.text}
          onCommit={commitField('text')}
          placeholder="Process"
          disableDblClick={disableDblClick}
          className="w-full text-center text-[13px] font-medium text-ink"
          style={textStyle}
        />
      </div>
    )
  }

  // Diamond via clip-path (not a rotated square) so it fits any width/height
  // aspect ratio correctly - corner radius has no meaningful effect on a
  // clipped polygon, so cornerStyle is intentionally not applied here.
  if (shape.type === 'decision') {
    return (
      <div className="relative h-full w-full">
        <div
          className="absolute inset-0 border-2 border-amber-500/60 bg-amber-500/10"
          style={{
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            borderColor: fill || undefined,
            backgroundColor: fillTint,
          }}
        />
        <div className="relative flex h-full w-full items-center justify-center px-6">
          <EditableText
            value={shape.text}
            onCommit={commitField('text')}
            placeholder="Decision"
            disableDblClick={disableDblClick}
            className="w-full text-center text-[12.5px] font-medium leading-snug text-ink"
            style={textStyle}
          />
        </div>
      </div>
    )
  }

  if (shape.type === 'terminator') {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-full border-2 border-slate-500/50 bg-slate-500/6 px-4"
        style={{ ...cornerStyle, borderColor: fill || undefined, backgroundColor: fillTint }}
      >
        <EditableText
          value={shape.text}
          onCommit={commitField('text')}
          placeholder="Start"
          disableDblClick={disableDblClick}
          className="w-full text-center text-[13px] font-medium text-ink"
          style={textStyle}
        />
      </div>
    )
  }

  // Parallelogram via a skewed background layer behind an unskewed text
  // layer, same "two-layer" approach as the decision diamond, so the label
  // stays upright and readable instead of slanting with the shape.
  if (shape.type === 'inputOutput') {
    return (
      <div className="relative h-full w-full">
        <div
          className="absolute inset-0 border-2 border-cyan-500/60 bg-cyan-500/10"
          style={{
            ...cornerStyle,
            transform: 'skewX(-12deg)',
            borderColor: fill || undefined,
            backgroundColor: fillTint,
          }}
        />
        <div className="relative flex h-full w-full items-center justify-center px-4">
          <EditableText
            value={shape.text}
            onCommit={commitField('text')}
            placeholder="Input/Output"
            disableDblClick={disableDblClick}
            className="w-full text-center text-[12.5px] font-medium leading-snug text-ink"
            style={textStyle}
          />
        </div>
      </div>
    )
  }

  if (shape.type === 'circle') {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-full border-2 border-brand-blue/50 bg-brand-blue/6 px-3"
        style={{ borderColor: fill || undefined, backgroundColor: fillTint }}
      >
        <EditableText
          value={shape.text}
          onCommit={commitField('text')}
          placeholder="Circle"
          disableDblClick={disableDblClick}
          className="w-full text-center text-[13px] font-medium text-ink"
          style={textStyle}
        />
      </div>
    )
  }

  if (shape.type === 'square') {
    return (
      <div
        className="flex h-full w-full items-center justify-center border-2 border-brand-purple/50 bg-brand-purple/6 px-3"
        style={{ ...cornerStyle, borderColor: fill || undefined, backgroundColor: fillTint }}
      >
        <EditableText
          value={shape.text}
          onCommit={commitField('text')}
          placeholder="Square"
          disableDblClick={disableDblClick}
          className="w-full text-center text-[13px] font-medium text-ink"
          style={textStyle}
        />
      </div>
    )
  }

  if (shape.type === 'rectangle') {
    return (
      <div
        className="flex h-full w-full items-center justify-center border-2 border-teal-500/50 bg-teal-500/6 px-3"
        style={{ ...cornerStyle, borderColor: fill || undefined, backgroundColor: fillTint }}
      >
        <EditableText
          value={shape.text}
          onCommit={commitField('text')}
          placeholder="Rectangle"
          disableDblClick={disableDblClick}
          className="w-full text-center text-[13px] font-medium text-ink"
          style={textStyle}
        />
      </div>
    )
  }

  // Clip-path polygons (not rotated squares) so they fit any width/height
  // aspect ratio correctly - corner radius has no meaningful effect on a
  // clipped polygon, so cornerStyle is intentionally not applied to either.
  if (shape.type === 'triangle') {
    return (
      <div className="relative h-full w-full">
        <div
          className="absolute inset-0 border-2 border-amber-500/60 bg-amber-500/10"
          style={{
            clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
            borderColor: fill || undefined,
            backgroundColor: fillTint,
          }}
        />
        <div className="relative flex h-full w-full items-end justify-center px-6 pb-2">
          <EditableText
            value={shape.text}
            onCommit={commitField('text')}
            placeholder="Triangle"
            disableDblClick={disableDblClick}
            className="w-full text-center text-[12.5px] font-medium leading-snug text-ink"
            style={textStyle}
          />
        </div>
      </div>
    )
  }

  if (shape.type === 'diamond') {
    return (
      <div className="relative h-full w-full">
        <div
          className="absolute inset-0 border-2 border-slate-500/60 bg-slate-500/10"
          style={{
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            borderColor: fill || undefined,
            backgroundColor: fillTint,
          }}
        />
        <div className="relative flex h-full w-full items-center justify-center px-6">
          <EditableText
            value={shape.text}
            onCommit={commitField('text')}
            placeholder="Diamond"
            disableDblClick={disableDblClick}
            className="w-full text-center text-[12.5px] font-medium leading-snug text-ink"
            style={textStyle}
          />
        </div>
      </div>
    )
  }

  // UML actor - a fixed stick-figure glyph (not stretched to the shape's own
  // box, unlike every other shape body) with its name label beneath, same
  // convention real UML tools use since the figure itself has no meaningful
  // "aspect ratio" to preserve.
  if (shape.type === 'actor') {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-start gap-1 text-indigo-500"
        style={{ color: fill || undefined }}
      >
        <svg viewBox="0 0 34 52" className="h-[65%] w-auto shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="17" cy="8" r="7" />
          <line x1="17" y1="15" x2="17" y2="34" />
          <line x1="4" y1="22" x2="30" y2="22" />
          <line x1="17" y1="34" x2="6" y2="50" />
          <line x1="17" y1="34" x2="28" y2="50" />
        </svg>
        <EditableText
          value={shape.text}
          onCommit={commitField('text')}
          placeholder="Actor"
          disableDblClick={disableDblClick}
          className="w-full text-center text-[12.5px] font-medium text-ink"
          style={textStyle}
        />
      </div>
    )
  }

  // Ellipse via percentage (not fixed-px, unlike circle's rounded-full)
  // border-radius, so it stays a true oval at any width/height aspect ratio
  // instead of the "stadium" shape rounded-full would give a non-square box.
  if (shape.type === 'usecase') {
    return (
      <div
        className="flex h-full w-full items-center justify-center border-2 border-sky-500/50 bg-sky-500/6 px-4"
        style={{ borderRadius: '50%', borderColor: fill || undefined, backgroundColor: fillTint }}
      >
        <EditableText
          value={shape.text}
          onCommit={commitField('text')}
          placeholder="Use case"
          disableDblClick={disableDblClick}
          className="w-full text-center text-[13px] font-medium text-ink"
          style={textStyle}
        />
      </div>
    )
  }

  // System boundary - a plain frame with its label pinned to the top-left
  // corner (not centered, unlike every other shape body) since it's meant to
  // visually contain other shapes rather than hold its own centered text.
  if (shape.type === 'boundary') {
    return (
      <div
        className="relative h-full w-full border-2 border-slate-400/60 bg-slate-400/5"
        style={{ ...cornerStyle, borderColor: fill || undefined, backgroundColor: fillTint }}
      >
        {/* pointer-events-auto: the outer Shape wrapper below turns itself
            pointer-events-none for this type so shapes placed inside the
            frame stay reachable (see Shape's own comment) - the label still
            needs to opt back in to stay clickable for rename. */}
        <div className="pointer-events-auto absolute left-2.5 top-2">
          <EditableText
            value={shape.text}
            onCommit={commitField('text')}
            placeholder="System"
            disableDblClick={disableDblClick}
            className="text-[12px] font-semibold text-ink"
            style={textStyle}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full items-center px-1">
      <EditableText
        value={shape.text}
        onCommit={commitField('text')}
        placeholder="Text label"
        disableDblClick={disableDblClick}
        className="w-full text-[13px] font-medium text-ink"
        style={textStyle}
      />
    </div>
  )
}

// A remote patch replaces shape state wholesale (see APPLY_REMOTE_STATE in
// historyReducer.js), so a collaborator moving/resizing/rotating a shape
// otherwise makes it jump straight to its new position/size/angle each time
// a throttled broadcast arrives - visibly stepped rather than smooth. This
// animates those changes instead. It has to stay off while *this* shape is
// part of *this tab's* own active drag/resize/rotate gesture though, or
// local dragging would lag behind the mouse waiting for the transition to
// catch up - see isLocallyDragging below for how that's told apart.
const REMOTE_TRANSITION_MS = 120
const POSITION_TRANSITION = {
  transitionProperty: 'left, top, width, height',
  transitionDuration: `${REMOTE_TRANSITION_MS}ms`,
  transitionTimingFunction: 'linear',
}
const ROTATION_TRANSITION = {
  transitionProperty: 'transform',
  transitionDuration: `${REMOTE_TRANSITION_MS}ms`,
  transitionTimingFunction: 'linear',
}

function Shape({ shape, zoom }) {
  const { state, dispatch, readOnly, isDragging } = useDiagramEditorContext()
  const isSelected =
    state.selection?.kind === 'shape' && state.selection.ids.includes(shape.id)
  // A drag/resize/rotate gesture always operates on exactly the current
  // selection (see handlePointerDown below), so "selected while a local
  // gesture is in flight" is equivalent to "this specific shape is one of
  // the ones I'm moving right now" - no extra state needed to track it.
  const isLocallyDragging = isSelected && isDragging
  const isPendingArrowSource = state.pendingArrowSourceId === shape.id
  const isArrowTool = state.tool === 'arrow'
  const isConnectHover = state.hoveredShapeId === shape.id
  // A viewer can still select a shape (harmless, purely local) but never
  // drag/resize/rotate it - handles that would silently do nothing on drag
  // are worse than no handles at all, so they don't render rather than
  // rendering disabled.
  const showHandles =
    isSelected && state.tool === 'select' && state.selection.ids.length === 1 && !readOnly
  // Keeps the selection ring / connect-hover glow's own corners matching
  // ShapeBody's, whether the shape is still on its type's own default radius
  // or the user has customized it - otherwise a never-touched Process shape
  // (rounded-2xl body) would show a visibly boxier rounded-lg ring around it.
  const cornerRadius =
    shape.cornerRadius ?? DEFAULT_CORNER_RADIUS_BY_TYPE[shape.type] ?? 0
  const cornerStyle = { borderRadius: `${cornerRadius}px` }
  const dragRef = useRef(null)
  const outerRef = useRef(null)

  const handlePointerDown = (event) => {
    if (isArrowTool) {
      event.stopPropagation()
      event.preventDefault()
      dispatch({ type: 'ARROW_TOOL_CLICK_SHAPE', shapeId: shape.id })
      return
    }

    if (event.target.closest('[data-no-drag]')) return

    if (event.shiftKey) {
      event.stopPropagation()
      dispatch({ type: 'TOGGLE_SHAPE_SELECTION', id: shape.id })
      return
    }

    event.stopPropagation()

    // If this shape is already part of a multi-selection, drag the whole
    // group and skip the replacing SELECT below - dispatching a
    // single-shape SELECT first would destroy the multi-selection that
    // group-drag depends on.
    const isPartOfGroup =
      state.selection?.kind === 'shape' &&
      state.selection.ids.length > 1 &&
      state.selection.ids.includes(shape.id)

    if (!isPartOfGroup) {
      dispatch({ type: 'SELECT', kind: 'shape', ids: [shape.id] })
    }
    const idsToTrack = isPartOfGroup ? state.selection.ids : [shape.id]

    // Selection above still applies for a viewer - only the drag session
    // itself is skipped, so the shape doesn't visually "try to follow the
    // cursor" for a MOVE_SHAPE that guardedDispatch would silently drop
    // anyway (see useDiagramEditor.js).
    if (readOnly) return

    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      shapes: idsToTrack.map((id) => ({
        id,
        startX: state.shapes[id].x,
        startY: state.shapes[id].y,
      })),
    }
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = (event.clientX - drag.startClientX) / zoom
    const dy = (event.clientY - drag.startClientY) / zoom
    for (const trackedShape of drag.shapes) {
      dispatch({
        type: 'MOVE_SHAPE',
        id: trackedShape.id,
        x: trackedShape.startX + dx,
        y: trackedShape.startY + dy,
      })
    }
  }

  const endDrag = (event) => {
    if (!dragRef.current) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dispatch({ type: 'DRAG_END', id: shape.id })
  }

  // A system boundary is a frame meant to contain other shapes, not block
  // them - its own hit-box normally covers its whole width/height like any
  // other shape, which would otherwise sit on top of (and swallow every
  // click/drag/arrow-connect meant for) whatever's placed visually inside
  // it. pointer-events-none here opens that interior back up to whatever's
  // beneath - a shape placed inside, or the canvas itself - while the four
  // edge strips below opt back in so the frame itself stays selectable,
  // draggable, and deletable from its border.
  const isBoundary = shape.type === 'boundary'
  const BORDER_HIT_THICKNESS = 10
  // The drag handlers below call setPointerCapture on event.currentTarget -
  // for every other shape that's this outer div, but a boundary's outer div
  // is pointer-events-none (see above), and capturing a pointer on a
  // non-hit-testable element is inconsistent across browsers: mousedown
  // could still select it (that bubbles up fine from a strip), but the
  // captured move/up events meant to actually drag it wouldn't reliably
  // arrive. So for a boundary, these go on the (pointer-events-auto) edge
  // strips directly instead of the outer div, keeping capture anchored to
  // an element that's actually a valid hit-test target.
  const dragHandlers = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  }

  return (
    <div
      ref={outerRef}
      data-shape-id={shape.id}
      {...(isBoundary ? null : dragHandlers)}
      className={`absolute select-none animate-shape-enter ${isSelected ? 'z-10' : 'z-0'} ${isBoundary ? 'pointer-events-none' : ''}`}
      style={{
        left: shape.x,
        top: shape.y,
        width: shape.width,
        height: shape.height,
        ...(isLocallyDragging ? null : POSITION_TRANSITION),
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          transform: `rotate(${shape.rotation ?? 0}deg)`,
          ...(isLocallyDragging ? null : ROTATION_TRANSITION),
        }}
      >
        <div
          className={`h-full w-full transition-shadow ${
            isSelected ? 'ring-2 ring-brand-purple ring-offset-2' : ''
          } ${
            isPendingArrowSource
              ? 'outline-2 outline-dashed outline-brand-blue outline-offset-2'
              : ''
          }`}
          style={{
            ...cornerStyle,
            ...(isConnectHover
              ? {
                  boxShadow:
                    '0 0 0 1px var(--color-brand-purple), 0 0 18px 4px color-mix(in srgb, var(--color-brand-purple) 35%, transparent)',
                }
              : null),
          }}
        >
          <ShapeBody
            shape={shape}
            dispatch={dispatch}
            disableDblClick={state.tool !== 'select' || readOnly}
          />
        </div>
        {isBoundary && (
          <>
            <div
              {...dragHandlers}
              className="pointer-events-auto absolute inset-x-0 top-0"
              style={{ height: BORDER_HIT_THICKNESS }}
            />
            <div
              {...dragHandlers}
              className="pointer-events-auto absolute inset-x-0 bottom-0"
              style={{ height: BORDER_HIT_THICKNESS }}
            />
            <div
              {...dragHandlers}
              className="pointer-events-auto absolute inset-y-0 left-0"
              style={{ width: BORDER_HIT_THICKNESS }}
            />
            <div
              {...dragHandlers}
              className="pointer-events-auto absolute inset-y-0 right-0"
              style={{ width: BORDER_HIT_THICKNESS }}
            />
          </>
        )}
        {showHandles && (
          <DeleteButton onClick={() => dispatch({ type: 'DELETE_SELECTED' })} />
        )}
        {showHandles && (
          <ShapeHandles shape={shape} dispatch={dispatch} outerRef={outerRef} zoom={zoom} />
        )}
      </div>
    </div>
  )
}

export default Shape
