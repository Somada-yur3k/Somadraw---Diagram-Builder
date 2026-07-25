import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { createHistoryReducer, initHistory } from './historyReducer'
import { facingSide, isMidSegmentEligible, pickSpacedT } from './arrowRouting'
import { clampFontSize, patchDiffers } from './textFormat'
import { DEFAULT_CORNER_RADIUS_BY_TYPE, clampCornerRadius, DEFAULT_FILL_COLOR_BY_TYPE } from './shapeStyle'
import { supabase } from '../../lib/supabaseClient'

const SAVE_DEBOUNCE_MS = 500

// The exact shape a brand-new, empty diagram row's `data` column should have -
// shared with DashboardSidebar's "+ New diagram" insert so there's one source
// of truth for "what does a blank diagram look like."
export function createBlankDiagramData() {
  return {
    shapes: {},
    shapeOrder: [],
    arrows: {},
    arrowOrder: [],
    counters: { process: 0, store: 0 },
    showGrid: true,
  }
}

export const DEFAULT_SHAPE_SIZE = {
  entity: { width: 160, height: 64 },
  process: { width: 190, height: 112 },
  store: { width: 220, height: 56 },
  label: { width: 140, height: 32 },
  flowProcess: { width: 160, height: 64 },
  decision: { width: 170, height: 110 },
  terminator: { width: 160, height: 56 },
  inputOutput: { width: 170, height: 64 },
}

const DEFAULT_TEXT = {
  entity: 'Entity',
  process: 'Process',
  store: 'Data store',
  label: 'Text label',
  flowProcess: 'Process',
  decision: 'Decision',
  terminator: 'Start',
  inputOutput: 'Input/Output',
}

function createId() {
  return Math.random().toString(36).slice(2, 10)
}

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 2

function clampZoom(zoom) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

// `initialData` is the diagram row's `data` column, already fetched by
// DiagramWorkspace before Editor (and this hook) ever mounts - loading a
// diagram is an async network call now, not a synchronous sessionStorage
// read, so it can no longer happen inside useReducer's lazy-init the way the
// old single-diagram sessionStorage draft did. See DiagramWorkspace.jsx.
function initState(initialData) {
  const saved = initialData
  return {
    tool: 'select',
    shapes: saved?.shapes ?? {},
    shapeOrder: saved?.shapeOrder ?? [],
    arrows: saved?.arrows ?? {},
    arrowOrder: saved?.arrowOrder ?? [],
    selection: null,
    pendingArrowSourceId: null,
    // Which line style the next drawn arrow will use - chosen from the
    // sidebar's connector-type menu. Same treatment as `tool`: ephemeral UI
    // state, not persisted, not undo-tracked, always resets to the default
    // each session.
    arrowConnectorType: 'shape',
    // Shape currently hovered (idle mouseover) or under the cursor during an
    // arrow-endpoint reconnect drag - transient UI state, same treatment as
    // selection/pendingArrowSourceId below (not persisted, not undo-tracked).
    hoveredShapeId: null,
    counters: saved?.counters ?? { process: 0, store: 0 },
    // View preferences below are intentionally split on persistence/undo:
    // showGrid is a real user preference (persisted, not undo-tracked).
    // viewport.zoom is a momentary viewport position (neither persisted nor
    // undo-tracked - always resets to 1 on reload).
    showGrid: saved?.showGrid ?? true,
    viewport: { zoom: 1 },
  }
}

// Every t already occupying this (shapeId, side) pair, across both arrow
// endpoints - used to auto-space a newly created or reconnected point into
// the largest open gap instead of stacking it on an existing one.
function endpointTsOnSide(state, shapeId, side) {
  const ts = []
  for (const id of state.arrowOrder) {
    const arrow = state.arrows[id]
    if (arrow.fromId === shapeId && arrow.fromSide === side) ts.push(arrow.fromT)
    if (arrow.toId === shapeId && arrow.toSide === side) ts.push(arrow.toT)
  }
  return ts
}

function removeArrowsForShapes(state, shapeIds) {
  const arrowOrder = state.arrowOrder.filter((id) => {
    const arrow = state.arrows[id]
    return !shapeIds.has(arrow.fromId) && !shapeIds.has(arrow.toId)
  })
  const arrows = {}
  for (const id of arrowOrder) arrows[id] = state.arrows[id]
  return { arrows, arrowOrder }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TOOL': {
      const next = { ...state, tool: action.tool }
      if (action.tool !== 'arrow') next.pendingArrowSourceId = null
      else next.selection = null
      return next
    }

    // Dispatched from the sidebar's connector-type menu - picking a line
    // style both activates the arrow tool and sets which style the next
    // drawn arrow will use, in one step (mirrors SET_TOOL's own
    // switching-into-arrow behavior of clearing selection).
    case 'SET_ARROW_CONNECTOR_TYPE':
      return {
        ...state,
        tool: 'arrow',
        arrowConnectorType: action.connectorType,
        selection: null,
      }

    case 'SET_ZOOM': {
      const zoom = clampZoom(action.zoom)
      if (state.viewport.zoom === zoom) return state
      return { ...state, viewport: { ...state.viewport, zoom } }
    }

    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid }

    case 'ADD_SHAPE': {
      const size = DEFAULT_SHAPE_SIZE[action.shapeType]
      if (!size) return state

      const id = createId()
      let counters = state.counters
      let badge

      if (action.shapeType === 'process') {
        counters = { ...counters, process: counters.process + 1 }
        badge = String(counters.process)
      } else if (action.shapeType === 'store') {
        counters = { ...counters, store: counters.store + 1 }
        badge = `D${counters.store}`
      }

      const shape = {
        id,
        type: action.shapeType,
        x: action.x - size.width / 2,
        y: action.y - size.height / 2,
        width: size.width,
        height: size.height,
        rotation: 0,
        text: DEFAULT_TEXT[action.shapeType],
        badge,
      }

      return {
        ...state,
        tool: 'select',
        shapes: { ...state.shapes, [id]: shape },
        shapeOrder: [...state.shapeOrder, id],
        selection: { kind: 'shape', ids: [id] },
        counters,
      }
    }

    case 'SELECT': {
      if (action.kind === 'arrow') {
        return { ...state, selection: { kind: 'arrow', id: action.id } }
      }
      // Shape selection: normalize an empty ids array to no-selection here,
      // once, so callers (click, shift-click, marquee) never need their own
      // ids.length === 0 special-case.
      if (!action.ids || action.ids.length === 0) {
        return state.selection === null ? state : { ...state, selection: null }
      }
      return { ...state, selection: { kind: 'shape', ids: action.ids } }
    }

    case 'TOGGLE_SHAPE_SELECTION': {
      const current =
        state.selection?.kind === 'shape' ? state.selection.ids : []
      const next = current.includes(action.id)
        ? current.filter((id) => id !== action.id)
        : [...current, action.id]
      return {
        ...state,
        selection: next.length === 0 ? null : { kind: 'shape', ids: next },
      }
    }

    case 'DESELECT':
      return state.selection === null ? state : { ...state, selection: null }

    case 'MOVE_SHAPE': {
      const shape = state.shapes[action.id]
      if (!shape) return state
      if (shape.x === action.x && shape.y === action.y) return state
      return {
        ...state,
        shapes: {
          ...state.shapes,
          [action.id]: { ...shape, x: action.x, y: action.y },
        },
      }
    }

    case 'RESIZE_SHAPE': {
      const shape = state.shapes[action.id]
      if (!shape) return state
      if (
        shape.x === action.x &&
        shape.y === action.y &&
        shape.width === action.width &&
        shape.height === action.height
      ) {
        return state
      }
      return {
        ...state,
        shapes: {
          ...state.shapes,
          [action.id]: {
            ...shape,
            x: action.x,
            y: action.y,
            width: action.width,
            height: action.height,
          },
        },
      }
    }

    // rotation is degrees, CSS `rotate()` convention (0 = upright, clockwise
    // positive). Dispatched as an absolute value in (-180, 180] each drag
    // tick (see ShapeHandles) - not normalized to [0,360), so don't assume
    // non-negative degrees if this value is read elsewhere later.
    case 'ROTATE_SHAPE': {
      const shape = state.shapes[action.id]
      if (!shape) return state
      if (shape.rotation === action.rotation) return state
      return {
        ...state,
        shapes: {
          ...state.shapes,
          [action.id]: { ...shape, rotation: action.rotation },
        },
      }
    }

    case 'RENAME_SHAPE': {
      const shape = state.shapes[action.id]
      if (!shape) return state
      const field = action.field ?? 'text'
      if (shape[field] === action.value) return state
      return {
        ...state,
        shapes: {
          ...state.shapes,
          [action.id]: { ...shape, [field]: action.value },
        },
      }
    }

    case 'RENAME_ARROW_LABEL': {
      const arrow = state.arrows[action.id]
      if (!arrow) return state
      if (arrow.label === action.value) return state
      return {
        ...state,
        arrows: { ...state.arrows, [action.id]: { ...arrow, label: action.value } },
      }
    }

    case 'ARROW_TOOL_CLICK_SHAPE': {
      const { shapeId } = action

      if (!state.pendingArrowSourceId) {
        return { ...state, pendingArrowSourceId: shapeId }
      }

      if (state.pendingArrowSourceId === shapeId) {
        return { ...state, pendingArrowSourceId: null }
      }

      const id = createId()
      const fromShapeId = state.pendingArrowSourceId
      const { fromSide, toSide } = facingSide(state.shapes[fromShapeId], state.shapes[shapeId])
      const fromT = pickSpacedT(endpointTsOnSide(state, fromShapeId, fromSide))
      const toT = pickSpacedT(endpointTsOnSide(state, shapeId, toSide))
      const arrow = {
        id,
        fromId: fromShapeId,
        toId: shapeId,
        label: '',
        fromSide,
        fromT,
        toSide,
        toT,
        connectorType: state.arrowConnectorType,
      }
      return {
        ...state,
        arrows: { ...state.arrows, [id]: arrow },
        arrowOrder: [...state.arrowOrder, id],
        pendingArrowSourceId: null,
        selection: { kind: 'arrow', id },
      }
    }

    case 'RECONNECT_ARROW_ENDPOINT': {
      const arrow = state.arrows[action.id]
      if (!arrow) return state

      const otherShapeId = action.end === 'from' ? arrow.toId : arrow.fromId
      if (action.shapeId === otherShapeId) return state

      const idField = action.end === 'from' ? 'fromId' : 'toId'
      const sideField = action.end === 'from' ? 'fromSide' : 'toSide'
      const tField = action.end === 'from' ? 'fromT' : 'toT'
      if (
        arrow[idField] === action.shapeId &&
        arrow[sideField] === action.side &&
        arrow[tField] === action.t
      ) {
        return state
      }

      // A manual routeMidOffset goes fully dormant (stored, unused, no
      // handle shown) the moment the arrow's side pairing crosses into a
      // different orientation family - if left alone, reconnecting back
      // into a 2-bend family later would silently revive a possibly very
      // old offset with no visual explanation. Clear it whenever family
      // eligibility changes in either direction; leave it untouched (still
      // reapplying to the shifted geometry, like labelOffset already does)
      // for the common case of a same-family reconnect.
      const newFromSide = action.end === 'from' ? action.side : arrow.fromSide
      const newToSide = action.end === 'from' ? arrow.toSide : action.side
      const familyChanged =
        isMidSegmentEligible(arrow.fromSide, arrow.toSide) !==
        isMidSegmentEligible(newFromSide, newToSide)

      return {
        ...state,
        arrows: {
          ...state.arrows,
          [action.id]: {
            ...arrow,
            [idField]: action.shapeId,
            [sideField]: action.side,
            [tField]: action.t,
            ...(familyChanged ? { routeMidOffset: null } : null),
          },
        },
      }
    }

    case 'SET_ARROW_ROUTE_OFFSET': {
      const arrow = state.arrows[action.id]
      if (!arrow) return state
      if ((arrow.routeMidOffset ?? 0) === action.offset) return state
      return {
        ...state,
        arrows: { ...state.arrows, [action.id]: { ...arrow, routeMidOffset: action.offset } },
      }
    }

    case 'RESET_ARROW_ROUTE': {
      const arrow = state.arrows[action.id]
      if (!arrow || arrow.routeMidOffset == null) return state
      return {
        ...state,
        arrows: { ...state.arrows, [action.id]: { ...arrow, routeMidOffset: null } },
      }
    }

    // labelOffsetX/Y are relative to the arrow's live-recomputed labelAnchor
    // (not an absolute position), so a manually-dragged label stays roughly
    // near the arrow instead of visually detaching from it if the arrow's
    // route later changes (shapes moved, endpoint reconnected, etc.).
    case 'MOVE_ARROW_LABEL': {
      const arrow = state.arrows[action.id]
      if (!arrow) return state
      if (arrow.labelOffsetX === action.offsetX && arrow.labelOffsetY === action.offsetY) {
        return state
      }
      return {
        ...state,
        arrows: {
          ...state.arrows,
          [action.id]: { ...arrow, labelOffsetX: action.offsetX, labelOffsetY: action.offsetY },
        },
      }
    }

    case 'ROTATE_ARROW_LABEL': {
      const arrow = state.arrows[action.id]
      if (!arrow) return state
      if (arrow.labelRotation === action.rotation) return state
      return {
        ...state,
        arrows: { ...state.arrows, [action.id]: { ...arrow, labelRotation: action.rotation } },
      }
    }

    case 'SET_SHAPE_TEXT_FORMAT': {
      const shape = state.shapes[action.id]
      if (!shape) return state
      const patch = action.patch.fontSize
        ? { ...action.patch, fontSize: clampFontSize(action.patch.fontSize) }
        : action.patch
      if (!patchDiffers(shape, patch)) return state
      return {
        ...state,
        shapes: { ...state.shapes, [action.id]: { ...shape, ...patch } },
      }
    }

    case 'SET_ARROW_TEXT_FORMAT': {
      const arrow = state.arrows[action.id]
      if (!arrow) return state
      const patch = action.patch.fontSize
        ? { ...action.patch, fontSize: clampFontSize(action.patch.fontSize) }
        : action.patch
      if (!patchDiffers(arrow, patch)) return state
      return {
        ...state,
        arrows: { ...state.arrows, [action.id]: { ...arrow, ...patch } },
      }
    }

    case 'SET_SHAPE_CORNER_RADIUS': {
      const shape = state.shapes[action.id]
      if (!shape) return state
      const radius = clampCornerRadius(action.radius)
      const current = shape.cornerRadius ?? DEFAULT_CORNER_RADIUS_BY_TYPE[shape.type] ?? 0
      if (current === radius) return state
      return {
        ...state,
        shapes: { ...state.shapes, [action.id]: { ...shape, cornerRadius: radius } },
      }
    }

    case 'SET_SHAPE_FILL_COLOR': {
      const shape = state.shapes[action.id]
      if (!shape) return state
      const current = shape.fillColor ?? DEFAULT_FILL_COLOR_BY_TYPE[shape.type] ?? null
      if (current === action.color) return state
      return {
        ...state,
        shapes: { ...state.shapes, [action.id]: { ...shape, fillColor: action.color } },
      }
    }

    case 'SET_HOVERED_SHAPE': {
      if (state.hoveredShapeId === action.shapeId) return state
      return { ...state, hoveredShapeId: action.shapeId }
    }

    case 'CANCEL_PENDING_ARROW':
      if (state.pendingArrowSourceId === null) return state
      return { ...state, pendingArrowSourceId: null }

    case 'DELETE_SELECTED': {
      if (!state.selection) return state

      if (state.selection.kind === 'arrow') {
        const id = state.selection.id
        const arrowOrder = state.arrowOrder.filter((arrowId) => arrowId !== id)
        const { [id]: _removed, ...arrows } = state.arrows
        return { ...state, arrows, arrowOrder, selection: null }
      }

      const ids = new Set(state.selection.ids)
      const remainingShapes = { ...state.shapes }
      for (const id of ids) delete remainingShapes[id]
      const { arrows, arrowOrder } = removeArrowsForShapes(state, ids)
      return {
        ...state,
        shapes: remainingShapes,
        shapeOrder: state.shapeOrder.filter((shapeId) => !ids.has(shapeId)),
        arrows,
        arrowOrder,
        selection: null,
        pendingArrowSourceId: ids.has(state.pendingArrowSourceId)
          ? null
          : state.pendingArrowSourceId,
      }
    }

    case 'CLEAR_CANVAS':
      return {
        ...state,
        shapes: {},
        shapeOrder: [],
        arrows: {},
        arrowOrder: [],
        selection: null,
        pendingArrowSourceId: null,
        counters: { process: 0, store: 0 },
      }

    // No-op today — marks the point Phase 4's undo/redo history will snapshot on.
    case 'DRAG_END':
      return state

    default:
      return state
  }
}

const historyReducer = createHistoryReducer(reducer)

function extractPersisted(state) {
  return {
    shapes: state.shapes,
    shapeOrder: state.shapeOrder,
    arrows: state.arrows,
    arrowOrder: state.arrowOrder,
    counters: state.counters,
    showGrid: state.showGrid,
  }
}

export function useDiagramEditor(diagramId, initialData) {
  const [history, dispatch] = useReducer(historyReducer, undefined, () =>
    initHistory(initState(initialData)),
  )
  const state = history.present
  const [saveStatus, setSaveStatus] = useState('saved')

  // Mirrors the latest state into a ref so the debounce timer/unmount-flush
  // below always save the most current content, not whatever was captured
  // when the effect last ran. Written from an effect (not during render)
  // since refs are only safe to mutate outside the render phase.
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  const saveTimerRef = useRef(null)
  const inFlightRef = useRef(false)
  // If a save request is still in flight when the next one would fire, queue
  // its payload here instead of firing a second overlapping request - a slow
  // first save finishing after a faster second one would otherwise silently
  // revert the diagram to older content ("last response wins" instead of
  // "last edit wins").
  const queuedPayloadRef = useRef(null)

  // A loop rather than self-recursion - referencing a useCallback-memoized
  // function from inside its own body is a lint-flagged forward reference,
  // and a loop reads more directly anyway: "keep saving whatever's queued
  // until nothing's left, or a save fails."
  const runSave = useCallback(
    async (initialPayload) => {
      inFlightRef.current = true
      let payload = initialPayload
      while (payload) {
        setSaveStatus('saving')
        const { error } = await supabase.from('diagrams').update({ data: payload }).eq('id', diagramId)
        if (error) {
          inFlightRef.current = false
          setSaveStatus('error')
          return
        }
        payload = queuedPayloadRef.current
        queuedPayloadRef.current = null
      }
      inFlightRef.current = false
      setSaveStatus('saved')
    },
    [diagramId],
  )

  const scheduleSave = useCallback(
    (payload) => {
      if (inFlightRef.current) {
        queuedPayloadRef.current = payload
        return
      }
      runSave(payload)
    },
    [runSave],
  )

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      scheduleSave(extractPersisted(stateRef.current))
    }, SAVE_DEBOUNCE_MS)
    return () => clearTimeout(saveTimerRef.current)
  }, [
    state.shapes,
    state.shapeOrder,
    state.arrows,
    state.arrowOrder,
    state.counters,
    state.showGrid,
    scheduleSave,
  ])

  // Flush any still-pending debounced save immediately on unmount, instead of
  // just cancelling it - otherwise the last <500ms of edits before switching
  // diagrams, signing out, or closing the tab would be silently lost. Safe to
  // run once (empty deps): DiagramWorkspace remounts Editor fresh per
  // diagramId (via a `key`), so this component's whole mounted lifetime is
  // exactly one diagram's lifetime, and `scheduleSave` only changes identity
  // if `diagramId` itself changes - which never happens without a remount.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        scheduleSave(extractPersisted(stateRef.current))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    state,
    dispatch,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    saveStatus,
  }
}
