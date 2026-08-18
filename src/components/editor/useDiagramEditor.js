import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { createHistoryReducer, initHistory } from './historyReducer'
import { facingSide, isMidSegmentEligible, pickSpacedT } from './arrowRouting'
import { clampFontSize, patchDiffers } from './textFormat'
import {
  DEFAULT_CORNER_RADIUS_BY_TYPE,
  clampCornerRadius,
  DEFAULT_FILL_COLOR_BY_TYPE,
  clampOpacity,
} from './shapeStyle'
import {
  containerShapeTypes,
  systemArchOwnShapeKeys,
  systemArchNoBorderKeys,
  systemArchShapes,
  networkOwnShapeKeys,
  networkNoBorderKeys,
  networkShapes,
} from './shapeCatalog'
import { supabase } from '../../lib/supabaseClient'
import { useDiagramChannel } from '../../lib/useDiagramChannel'

// An ERD table's height isn't just a static default - it grows/shrinks by
// exactly one row's worth every time a row is added/removed (see
// ADD_ERD_ROW/REMOVE_ERD_ROW below), so unlike every other type's fixed
// DEFAULT_SHAPE_SIZE entry, these two constants are the actual unit that
// math is built from, not just documentation of a starting size.
export const ERD_HEADER_HEIGHT = 34
export const ERD_ROW_HEIGHT = 26
// Column count a freshly-placed table starts with - built with fresh ids at
// ADD_SHAPE time (not a static array reused across every table instance),
// same as every other per-shape id in this file.
const ERD_STARTER_ROW_COUNT = 3

const SAVE_DEBOUNCE_MS = 500
// Pixel offset applied to each pasted shape, relative to what was copied -
// keeps a paste from landing exactly on top of its source, indistinguishable
// until moved.
const PASTE_OFFSET = 24
// localStorage (not the reducer's own state) is the actual clipboard - it's
// shared across every tab/diagram in this browser, which is what lets
// Ctrl+C in one diagram and Ctrl+V in a completely different one (open in
// another tab, or the same tab after switching diagrams) work at all. A
// diagram's own `state.clipboard` still exists purely so this key gets
// written on copy (see the effect below) and so repeated Ctrl+V without a
// fresh copy re-baselines off the just-pasted shapes instead of restacking -
// it's never read directly for pasting.
export const CLIPBOARD_STORAGE_KEY = 'somadraw:clipboard'

// Shared by every place that pastes (EditorCanvas's Ctrl+V, the right-click
// menu's Paste item) so the "read fresh from localStorage, tolerate it being
// missing/corrupt" logic only lives once.
export function readClipboard() {
  try {
    const raw = localStorage.getItem(CLIPBOARD_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

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
    gridStyle: 'dots',
    commentThreads: {},
    commentThreadOrder: [],
  }
}

// Which visual pattern the grid background renders as when state.showGrid
// is on - see EditorCanvas.jsx's own gridBackgroundStyle for what each one
// actually draws.
export const GRID_STYLES = ['dots', 'lines', 'graphPaper']

export const DEFAULT_SHAPE_SIZE = {
  entity: { width: 160, height: 64 },
  process: { width: 190, height: 112 },
  store: { width: 220, height: 56 },
  label: { width: 140, height: 32 },
  flowProcess: { width: 160, height: 64 },
  decision: { width: 170, height: 110 },
  terminator: { width: 160, height: 56 },
  inputOutput: { width: 170, height: 64 },
  circle: { width: 100, height: 100 },
  square: { width: 100, height: 100 },
  rectangle: { width: 180, height: 100 },
  triangle: { width: 150, height: 130 },
  diamond: { width: 150, height: 130 },
  actor: { width: 90, height: 120 },
  usecase: { width: 170, height: 90 },
  boundary: { width: 280, height: 200 },
  sysClientLayer: { width: 280, height: 200 },
  sysApplicationLayer: { width: 280, height: 200 },
  sysDataLayer: { width: 280, height: 200 },
  sysExternalLayer: { width: 280, height: 200 },
  umlClass: { width: 200, height: 140 },
  activity: { width: 170, height: 64 },
  umlDecision: { width: 170, height: 110 },
  state: { width: 170, height: 84 },
  initial: { width: 28, height: 28 },
  final: { width: 32, height: 32 },
  forkJoinH: { width: 140, height: 10 },
  forkJoinV: { width: 10, height: 140 },
  swimlaneV1: { width: 220, height: 300 },
  swimlaneV3: { width: 480, height: 300 },
  swimlaneH1: { width: 400, height: 160 },
  swimlaneH2: { width: 400, height: 260 },
  erdTable: { width: 230, height: ERD_HEADER_HEIGHT + ERD_ROW_HEIGHT * ERD_STARTER_ROW_COUNT },
  // System Architecture's ~55 shapes are all the same "icon + label" layout
  // (see Shape.jsx's SystemArchNodeBody) - one shared size per look instead
  // of hand-tuning each individually, the same way every other type above
  // got its own bespoke dimensions for its own bespoke layout. The
  // no-border look (a person/cylinder/cloud/... icon with nothing framing
  // it - systemArchNoBorderKeys) gets a smaller box than the bordered-card
  // look: without a border to visually fill that edge space, the same
  // 148x96 box left a lot of empty margin floating around a small centered
  // icon - shrinking the box is what actually closes that gap, since there
  // was never any real padding value making it happen in the first place.
  ...Object.fromEntries(
    [...systemArchOwnShapeKeys].map((key) => [
      key,
      systemArchNoBorderKeys.has(key) ? { width: 104, height: 76 } : { width: 148, height: 96 },
    ]),
  ),
  // Same "no-border look gets a smaller box" reasoning as System
  // Architecture above, applied to Network Diagram's own shapes.
  ...Object.fromEntries(
    [...networkOwnShapeKeys].map((key) => [
      key,
      networkNoBorderKeys.has(key) ? { width: 104, height: 76 } : { width: 148, height: 96 },
    ]),
  ),
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
  circle: 'Circle',
  square: 'Square',
  rectangle: 'Rectangle',
  triangle: 'Triangle',
  diamond: 'Diamond',
  actor: 'Actor',
  usecase: 'Use case',
  boundary: 'System',
  sysClientLayer: 'Client Layer',
  sysApplicationLayer: 'Application Layer',
  sysDataLayer: 'Data Layer',
  sysExternalLayer: 'External Services',
  umlClass: 'ClassName',
  activity: 'Activity',
  umlDecision: 'Decision',
  state: 'State',
  erdTable: 'table_name',
  // Same label shown in the picker doubles as the shape's own starting
  // text - unlike e.g. umlClass (deliberately blank), there's no more
  // useful default for "Firewall" or "Load Balancer" than its own name.
  ...Object.fromEntries(
    systemArchShapes
      .filter((shape) => systemArchOwnShapeKeys.has(shape.key))
      .map((shape) => [shape.key, shape.label]),
  ),
  ...Object.fromEntries(networkShapes.map((shape) => [shape.key, shape.label])),
}

// Swimlane lane headers (shape.lane1, lane2, ...) aren't a single `text`
// field like every other shape, so they can't go through DEFAULT_TEXT above
// - unlike umlClass's attributes/methods (deliberately blank until the user
// types something), a swimlane's lane label should start pre-filled with a
// real value the way Entity/Process/every other shape's own DEFAULT_TEXT
// does, since that's what actually shows up as content, not just an
// editing-time hint (see EditableText's placeholderOnlyWhileEditing).
function defaultLaneFields(shapeType) {
  if (!shapeType.startsWith('swimlane')) return {}
  const laneCount = Number(shapeType.slice(-1))
  const fields = {}
  for (let i = 1; i <= laneCount; i += 1) fields[`lane${i}`] = 'Person / Group'
  return fields
}

// A fresh table starts with an id/int/pk row already filled in (the one
// column virtually every real table has) plus a couple of blank ones ready
// to name - same "starts pre-filled with a real, useful default" idea as
// every other type's own DEFAULT_TEXT, just structured as a list instead of
// a single field.
function defaultErdRows(shapeType) {
  if (shapeType !== 'erdTable') return {}
  const rows = [{ id: createId(), name: 'id', type: 'int', key: 'pk' }]
  for (let i = 1; i < ERD_STARTER_ROW_COUNT; i += 1) {
    rows.push({ id: createId(), name: '', type: '', key: null })
  }
  return { rows }
}

function createId() {
  return Math.random().toString(36).slice(2, 10)
}

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 2

function clampZoom(zoom) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

// A shape's position is clamped to non-negative, not just left unbounded -
// the canvas lives inside a plain scrollable div, and a browser can never
// scroll a container to a negative offset. A shape dragged past (0, 0)
// wasn't just "off past an edge" the way positive-direction overflow is
// (that's still reachable by scrolling further, see EditorCanvas's dynamic
// grid sizing) - it became permanently invisible and unreachable, with no
// way to scroll back to it, verify it, or drag it back. Exporting still
// correctly found and rendered it (diagramExport.js's own clone-normalization
// doesn't care about this), which is exactly what made the exported PDF
// look like a different diagram than whatever was actually visible on
// screen - not a rendering bug, but two different definitions of "where
// content can be." This keeps them the same definition.
//
// The positive direction also needs its own ceiling, for a different reason:
// every arrow shares one <svg> sized to bound *every* shape at once
// (ArrowLayer's computeSvgBounds), sitting inside this canvas's own
// transform: scale(zoom) ancestor (EditorCanvas). Drag just one shape far
// enough out and that shared element balloons to tens of thousands of
// pixels - browsers reliably fail to composite something that large/far
// from a transformed ancestor's origin, so the whole arrow layer goes blank
// at once, taking every *other* arrow down with it, not just the moved
// shape's own. MAX_SHAPE_POSITION stays well clear of that failure range
// while still far past anything a real diagram's content needs.
const MAX_SHAPE_POSITION = 20000

function clampShapePosition(x, y) {
  return {
    x: Math.min(MAX_SHAPE_POSITION, Math.max(0, x)),
    y: Math.min(MAX_SHAPE_POSITION, Math.max(0, y)),
  }
}

// A manually dragged route bend (SET_ARROW_ROUTE_OFFSET, from ArrowLayer's
// route handle) is a plain unbounded canvas-coordinate nudge with no
// relation to any shape - same runaway-growth risk MAX_SHAPE_POSITION
// exists for above, just reached by dragging a bend instead of a shape.
// ArrowLayer's computeSvgBounds now grows to fit wherever a route actually
// goes (so an offset like this no longer gets silently clipped out of the
// svg), but an unbounded drag could still balloon that shared element past
// what a browser can composite, same failure as before. This keeps a
// dragged bend far past anything a real diagram needs while staying well
// clear of that failure range.
const MAX_ROUTE_OFFSET = 4000

function clampRouteOffset(offset) {
  return Math.min(MAX_ROUTE_OFFSET, Math.max(-MAX_ROUTE_OFFSET, offset))
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
    // Which geometry/stroke the next drawn arrow will use - chosen from the
    // sidebar's connector-type menu. Same treatment as `tool`: ephemeral UI
    // state, not persisted, not undo-tracked, always resets to the default
    // each session. `arrowLineStyle` ('solid'/'dotted') layers independently
    // on top of `arrowConnectorType` (straight/curved/shape) - the sidebar's
    // "Dotted Line" submenu picks both at once, but a plain Straight/Curved/
    // Shape click always resets it back to 'solid'.
    arrowConnectorType: 'shape',
    arrowLineStyle: 'solid',
    // Shape currently hovered (idle mouseover) or under the cursor during an
    // arrow-endpoint reconnect drag - transient UI state, same treatment as
    // selection/pendingArrowSourceId below (not persisted, not undo-tracked).
    hoveredShapeId: null,
    // Last Ctrl+C'd shapes (plus any arrows fully contained within that
    // selection), ready for Ctrl+V - session-only clipboard, same treatment
    // as selection/hoveredShapeId (not persisted, not undo-tracked, and
    // resets to empty each session rather than surviving a reload).
    clipboard: null,
    counters: saved?.counters ?? { process: 0, store: 0 },
    // View preferences below are intentionally split on persistence/undo:
    // showGrid/gridStyle are real user preferences (persisted, not
    // undo-tracked). viewport.zoom is a momentary viewport position (neither
    // persisted nor undo-tracked - always resets to 1 on reload).
    showGrid: saved?.showGrid ?? true,
    gridStyle: saved?.gridStyle ?? 'dots',
    viewport: { zoom: 1 },
    // Smart alignment guides shown while dragging a shape - same treatment
    // as hoveredShapeId above (transient UI state, not persisted, not
    // undo-tracked). Shape.jsx sets this on every drag tick and clears it on
    // drop; { vertical, horizontal } are each either null or a single
    // { x, y1, y2 } / { y, x1, x2 } line descriptor (see alignmentSnap.js).
    alignmentGuides: { vertical: null, horizontal: null },
    // Pinned discussion threads (Figma-style) - persisted and undo-*exempt*
    // (see historyReducer.js's contentChanged, which deliberately doesn't
    // look at these two fields): resolving or deleting a thread isn't
    // something a canvas Ctrl+Z should be able to revert, any more than it
    // reverts someone else's chat message elsewhere. activeCommentThreadId
    // (which thread's card is open) is transient UI state, same treatment
    // as `selection` - not persisted, not undo-tracked, always starts
    // closed each session.
    commentThreads: saved?.commentThreads ?? {},
    commentThreadOrder: saved?.commentThreadOrder ?? [],
    activeCommentThreadId: null,
    // A counter, not a boolean - EditorCanvas's own effect (which owns the
    // wrapper DOM ref this needs to measure) watches this value change to
    // know a fit was requested, and increments-not-toggles is what lets a
    // second "Zoom to fit" click while nothing else changed still fire the
    // effect again (a boolean flipped true->false->true across two renders
    // could get batched into a single change, or miss firing if the effect
    // hasn't re-subscribed yet). Transient view state, same treatment as
    // viewport.zoom above - not persisted, not undo-tracked.
    zoomFitRequestId: 0,
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

// Grouping is flat (a shape's own `groupId`, no nesting) - selecting *any*
// member of a group is always meant to select the whole thing, so this is
// the one place that expansion happens, called from every path that can
// produce a shape selection (a plain click, marquee-select, shift-click's
// own toggle below) rather than duplicated at each call site. Preserves
// shapeOrder's own paint order in the result, same as every other id list
// already derived from it elsewhere in this file.
function expandToGroups(state, ids) {
  const groupIds = new Set()
  for (const id of ids) {
    const groupId = state.shapes[id]?.groupId
    if (groupId) groupIds.add(groupId)
  }
  if (groupIds.size === 0) return ids
  const expanded = new Set(ids)
  for (const id of state.shapeOrder) {
    if (groupIds.has(state.shapes[id]?.groupId)) expanded.add(id)
  }
  return state.shapeOrder.filter((id) => expanded.has(id))
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
        arrowLineStyle: action.lineStyle ?? 'solid',
        selection: null,
      }

    case 'SET_ZOOM': {
      const zoom = clampZoom(action.zoom)
      if (state.viewport.zoom === zoom) return state
      return { ...state, viewport: { ...state.viewport, zoom } }
    }

    // Just a signal - see zoomFitRequestId's own comment in initState for
    // why this is a counter, and EditorCanvas's own effect for what
    // actually happens when it changes (that's the one place with a DOM
    // ref to measure the visible viewport against).
    case 'REQUEST_ZOOM_TO_FIT':
      return { ...state, zoomFitRequestId: state.zoomFitRequestId + 1 }

    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid }

    case 'SET_GRID_STYLE':
      return { ...state, gridStyle: action.style }

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
        ...clampShapePosition(action.x - size.width / 2, action.y - size.height / 2),
        width: size.width,
        height: size.height,
        rotation: 0,
        text: DEFAULT_TEXT[action.shapeType],
        badge,
        ...defaultLaneFields(action.shapeType),
        ...defaultErdRows(action.shapeType),
      }

      // A container (system boundary, any swimlane variant) is meant to
      // contain other shapes, not sit on top of them - unshifting it to the
      // back of the paint order (instead of the front, like every other
      // shape) means anything dropped inside it later, and anything already
      // on the canvas, both stay visually and interactively on top of it by
      // default (see Shape.jsx for the pointer-events handling this pairs
      // with).
      const shapeOrder = containerShapeTypes.has(action.shapeType)
        ? [id, ...state.shapeOrder]
        : [...state.shapeOrder, id]

      return {
        ...state,
        tool: 'select',
        shapes: { ...state.shapes, [id]: shape },
        shapeOrder,
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
      return { ...state, selection: { kind: 'shape', ids: expandToGroups(state, action.ids) } }
    }

    case 'TOGGLE_SHAPE_SELECTION': {
      const current =
        state.selection?.kind === 'shape' ? state.selection.ids : []
      // Shift-clicking one shape in a group toggles the whole group in or
      // out together, not just that one shape - same "any member stands in
      // for the whole group" rule SELECT applies above.
      const toggled = expandToGroups(state, [action.id])
      const currentSet = new Set(current)
      const allIn = toggled.every((id) => currentSet.has(id))
      const next = allIn
        ? current.filter((id) => !toggled.includes(id))
        : [...current, ...toggled.filter((id) => !currentSet.has(id))]
      return {
        ...state,
        selection: next.length === 0 ? null : { kind: 'shape', ids: next },
      }
    }

    case 'DESELECT':
      return state.selection === null ? state : { ...state, selection: null }

    case 'MOVE_SHAPE': {
      const shape = state.shapes[action.id]
      if (!shape || shape.locked) return state
      const { x, y } = clampShapePosition(action.x, action.y)
      if (shape.x === x && shape.y === y) return state
      return {
        ...state,
        shapes: {
          ...state.shapes,
          [action.id]: { ...shape, x, y },
        },
      }
    }

    case 'RESIZE_SHAPE': {
      const shape = state.shapes[action.id]
      if (!shape || shape.locked) return state
      const { x, y } = clampShapePosition(action.x, action.y)
      if (
        shape.x === x &&
        shape.y === y &&
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
            x,
            y,
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
      if (!shape || shape.locked) return state
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
        lineStyle: state.arrowLineStyle,
        // "One" source feeding "many" target is the common default reading
        // of a freshly-drawn relationship (matches the plain crow's-foot
        // look this connector type already had before per-end cardinality
        // was editable at all) - only meaningful for connectorType 'erd',
        // but set unconditionally since an unused field on every other
        // connector type is harmless and one fewer branch to maintain.
        startCardinality: 'one',
        endCardinality: 'many',
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
      const offset = clampRouteOffset(action.offset)
      if ((arrow.routeMidOffset ?? 0) === offset) return state
      return {
        ...state,
        arrows: { ...state.arrows, [action.id]: { ...arrow, routeMidOffset: offset } },
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

    // action.end is 'start' or 'end' (which endpoint's cardinality glyph is
    // being changed), action.value is one of ERD_CARDINALITY_OPTIONS'
    // values (erdCardinality.jsx) - only meaningful for connectorType
    // 'erd', but this stays a plain generic field patch like every other
    // single-field arrow update here, same reasoning as startCardinality's
    // own comment above.
    case 'SET_ARROW_CARDINALITY': {
      const arrow = state.arrows[action.id]
      if (!arrow) return state
      const field = action.end === 'start' ? 'startCardinality' : 'endCardinality'
      if (arrow[field] === action.value) return state
      return {
        ...state,
        arrows: { ...state.arrows, [action.id]: { ...arrow, [field]: action.value } },
      }
    }

    // labelOffsetX/Y are relative to the arrow's live-recomputed labelAnchor
    // (not an absolute position), so a manually-dragged label stays with the
    // arrow - glides right along as it moves/reroutes (shapes moved,
    // endpoint reconnected, etc.) instead of visually detaching from it.
    // This is unaffected by labelLocked (see TOGGLE_ARROW_LABEL_LOCK below) -
    // ArrowLabels.jsx itself refuses to start a drag gesture while locked,
    // so this case just never fires for a locked label in practice.
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

    // Locks the label's *offset* in place (stops it being dragged to a new
    // spot), not its position - it still tracks the arrow's live anchor +
    // that now-frozen offset every render exactly like an unlocked label
    // does (see MOVE_ARROW_LABEL above), so it keeps gliding smoothly along
    // with the arrow as it moves/reroutes instead of getting left behind.
    // ArrowLabels.jsx enforces the "can't drag while locked" half of this;
    // the reducer's own part is just this one boolean flip.
    case 'TOGGLE_ARROW_LABEL_LOCK': {
      const arrow = state.arrows[action.id]
      if (!arrow) return state
      return {
        ...state,
        arrows: { ...state.arrows, [action.id]: { ...arrow, labelLocked: !arrow.labelLocked } },
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

    // A shape's own border - separate from SET_ARROW_LINE_STYLE, which only
    // ever applies to an arrow's connector line, and independent of fill
    // color (a shape can have a dotted border with no fill, a solid filled
    // border, or any other combination).
    case 'SET_SHAPE_BORDER_STYLE': {
      const shape = state.shapes[action.id]
      if (!shape) return state
      if ((shape.borderStyle ?? 'solid') === action.borderStyle) return state
      return {
        ...state,
        shapes: { ...state.shapes, [action.id]: { ...shape, borderStyle: action.borderStyle } },
      }
    }

    // An ERD table's height is derived from its own row count (see
    // ERD_HEADER_HEIGHT/ERD_ROW_HEIGHT) rather than something the user
    // resizes freely the way every other shape's box is - adding a column
    // grows the box by exactly one row's worth so the new row always has
    // somewhere to render, instead of overflowing a box the user would
    // otherwise have to remember to stretch by hand.
    case 'ADD_ERD_ROW': {
      const shape = state.shapes[action.id]
      if (!shape || shape.type !== 'erdTable') return state
      const rows = [...shape.rows, { id: createId(), name: '', type: '', key: null }]
      return {
        ...state,
        shapes: { ...state.shapes, [action.id]: { ...shape, rows, height: shape.height + ERD_ROW_HEIGHT } },
      }
    }

    // Never lets a table shrink past one remaining column - a table with no
    // rows at all has nothing left to click "+" back onto, and this app has
    // no other way to add the very first row back.
    case 'REMOVE_ERD_ROW': {
      const shape = state.shapes[action.id]
      if (!shape || shape.type !== 'erdTable' || shape.rows.length <= 1) return state
      const rows = shape.rows.filter((row) => row.id !== action.rowId)
      if (rows.length === shape.rows.length) return state
      return {
        ...state,
        shapes: { ...state.shapes, [action.id]: { ...shape, rows, height: shape.height - ERD_ROW_HEIGHT } },
      }
    }

    case 'UPDATE_ERD_ROW': {
      const shape = state.shapes[action.id]
      if (!shape || shape.type !== 'erdTable') return state
      const rows = shape.rows.map((row) =>
        row.id === action.rowId ? { ...row, [action.field]: action.value } : row,
      )
      return { ...state, shapes: { ...state.shapes, [action.id]: { ...shape, rows } } }
    }

    // Drag-to-reorder (Shape.jsx's ErdTableBody) - action.toIndex is always
    // the row's *final* destination, not a step, so this stays correct no
    // matter how the drag got there: re-dispatched on every row-height
    // crossing during a single gesture, each call independently looks up
    // the row's own *current* index (not whatever it was at drag-start) and
    // moves it from there, rather than assuming the caller is tracking
    // position itself.
    case 'REORDER_ERD_ROW': {
      const shape = state.shapes[action.id]
      if (!shape || shape.type !== 'erdTable') return state
      const fromIndex = shape.rows.findIndex((row) => row.id === action.rowId)
      if (fromIndex === -1) return state
      const toIndex = Math.max(0, Math.min(shape.rows.length - 1, action.toIndex))
      if (fromIndex === toIndex) return state
      const rows = [...shape.rows]
      const [moved] = rows.splice(fromIndex, 1)
      rows.splice(toIndex, 0, moved)
      return { ...state, shapes: { ...state.shapes, [action.id]: { ...shape, rows } } }
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

    // Whether the shape renders its fill (light body tint, and any solid
    // header bar - Process's badge, a swimlane's own lane headers, an ERD
    // table's header) at all, independent of its border - which stays
    // exactly as-is either way (see Shape.jsx's own showBackground/
    // headerFill comment). Defaults true (background shown) when unset, so
    // every shape saved before this field existed keeps looking exactly as
    // it already did. Same field name/default convention as arrows'
    // labelBackground (TOGGLE_ARROW_LABEL_BACKGROUND above).
    case 'TOGGLE_SHAPE_BACKGROUND': {
      const shape = state.shapes[action.id]
      if (!shape) return state
      return {
        ...state,
        shapes: {
          ...state.shapes,
          [action.id]: { ...shape, backgroundVisible: !(shape.backgroundVisible ?? true) },
        },
      }
    }

    // The arrow's own line/stroke color - separate from SET_ARROW_TEXT_FORMAT's
    // textColor, which only ever colors the label text, never the line itself.
    case 'SET_ARROW_COLOR': {
      const arrow = state.arrows[action.id]
      if (!arrow) return state
      if ((arrow.color ?? null) === action.color) return state
      return {
        ...state,
        arrows: { ...state.arrows, [action.id]: { ...arrow, color: action.color } },
      }
    }

    // Changes an *existing* arrow's dash pattern - distinct from
    // arrowLineStyle (top of this file), which only sets what style the
    // *next newly-drawn* arrow starts with.
    case 'SET_ARROW_LINE_STYLE': {
      const arrow = state.arrows[action.id]
      if (!arrow) return state
      if (arrow.lineStyle === action.lineStyle) return state
      return {
        ...state,
        arrows: { ...state.arrows, [action.id]: { ...arrow, lineStyle: action.lineStyle } },
      }
    }

    // Whether the arrow's label renders on its usual filled pill (the
    // arrow's own color, see ArrowLabels.jsx's labelBg) or as bare text with
    // no background at all. Defaults true (background shown) when unset, so
    // every arrow saved before this field existed keeps looking exactly as
    // it already did.
    case 'TOGGLE_ARROW_LABEL_BACKGROUND': {
      const arrow = state.arrows[action.id]
      if (!arrow) return state
      return {
        ...state,
        arrows: {
          ...state.arrows,
          [action.id]: { ...arrow, labelBackground: !(arrow.labelBackground ?? true) },
        },
      }
    }

    // Changes an *existing* arrow's geometry - distinct from
    // SET_ARROW_CONNECTOR_TYPE (top of this file), which only sets what
    // geometry the *next newly-drawn* arrow starts with. Until now the only
    // way to change this after drawing was to delete the arrow and redraw
    // it from scratch. routeMidOffset always resets: 'straight'/'curved'
    // ignore it entirely (see arrowRouting.js), so a value left over from
    // 'shape'/'erd' would otherwise go dormant and silently reappear if the
    // user ever switches back - same "no stale surprise" reasoning
    // RECONNECT_ARROW_ENDPOINT's own family-change clearing already uses,
    // just unconditional here since a deliberate type switch (not an
    // incidental endpoint drag) is already the explicit action being taken.
    // startCardinality/endCardinality need no equivalent handling - every
    // arrow already carries both from creation regardless of connectorType
    // (see ARROW_TOOL_CLICK_SHAPE), so switching to 'erd' has valid values
    // to show immediately.
    case 'SET_ARROW_CONNECTOR': {
      const arrow = state.arrows[action.id]
      if (!arrow) return state
      if ((arrow.connectorType ?? 'shape') === action.connectorType) return state
      return {
        ...state,
        arrows: {
          ...state.arrows,
          [action.id]: { ...arrow, connectorType: action.connectorType, routeMidOffset: null },
        },
      }
    }

    // Which end(s) of a non-ERD arrow show a triangle head at all - ERD
    // arrows keep using their own startCardinality/endCardinality glyph
    // system instead (see SET_ARROW_CARDINALITY above), so this only ever
    // applies when connectorType !== 'erd' (EditorTopbar gates its own UI
    // for this the same way). Both fields set together, from one of three
    // presets in the topbar (end-only/both/neither) rather than two
    // independent toggles - a start-only arrow is a real but rare enough
    // case that offering it wasn't worth the extra button.
    case 'SET_ARROW_HEADS': {
      const arrow = state.arrows[action.id]
      if (!arrow) return state
      if ((arrow.startArrow ?? false) === action.startArrow && (arrow.endArrow ?? true) === action.endArrow) {
        return state
      }
      return {
        ...state,
        arrows: {
          ...state.arrows,
          [action.id]: { ...arrow, startArrow: action.startArrow, endArrow: action.endArrow },
        },
      }
    }

    // opacity is 0..100 (matching the topbar's slider display), converted to
    // a 0..1 CSS value only at render time (Shape.jsx/ArrowLayer.jsx) - same
    // "store the user-facing unit, convert at the edge" approach fontSize
    // already uses (clampFontSize stores px, textFormatStyle appends 'px').
    case 'SET_SHAPE_OPACITY': {
      const shape = state.shapes[action.id]
      if (!shape) return state
      const opacity = clampOpacity(action.opacity)
      if ((shape.opacity ?? 100) === opacity) return state
      return { ...state, shapes: { ...state.shapes, [action.id]: { ...shape, opacity } } }
    }

    case 'SET_ARROW_OPACITY': {
      const arrow = state.arrows[action.id]
      if (!arrow) return state
      const opacity = clampOpacity(action.opacity)
      if ((arrow.opacity ?? 100) === opacity) return state
      return { ...state, arrows: { ...state.arrows, [action.id]: { ...arrow, opacity } } }
    }

    case 'SET_HOVERED_SHAPE': {
      if (state.hoveredShapeId === action.shapeId) return state
      return { ...state, hoveredShapeId: action.shapeId }
    }

    // Dispatched by Shape.jsx on every drag tick (computed via
    // alignmentSnap.js) and cleared (both fields null) on drop - purely
    // transient/visual, see alignmentGuides' own comment in initState above.
    case 'SET_ALIGNMENT_GUIDES':
      return { ...state, alignmentGuides: action.guides }

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

      // Locked shapes sit out of the delete, same as they sit out of
      // move/resize/rotate - selecting a mix of locked and unlocked shapes
      // and pressing Delete removes only the unlocked ones, leaving the
      // locked ones (still) selected rather than silently blocking the
      // whole delete or unlocking anything on the user's behalf.
      const deletableIds = new Set(
        [...state.selection.ids].filter((id) => !state.shapes[id]?.locked),
      )
      if (deletableIds.size === 0) return state
      const remainingShapes = { ...state.shapes }
      for (const id of deletableIds) delete remainingShapes[id]
      const { arrows, arrowOrder } = removeArrowsForShapes(state, deletableIds)
      const remainingSelectedIds = state.selection.ids.filter((id) => !deletableIds.has(id))
      return {
        ...state,
        shapes: remainingShapes,
        shapeOrder: state.shapeOrder.filter((shapeId) => !deletableIds.has(shapeId)),
        arrows,
        arrowOrder,
        selection: remainingSelectedIds.length > 0 ? { kind: 'shape', ids: remainingSelectedIds } : null,
        pendingArrowSourceId: deletableIds.has(state.pendingArrowSourceId)
          ? null
          : state.pendingArrowSourceId,
      }
    }

    // Grouping is flat and always a fresh regroup - assigning one new shared
    // groupId to every selected shape, regardless of whatever group(s) any
    // of them already belonged to, rather than trying to merge/nest existing
    // groups. Matches the common "select shapes spanning two groups, group
    // them again" case: they all end up in one new group, no nesting.
    case 'GROUP_SELECTED': {
      if (state.selection?.kind !== 'shape' || state.selection.ids.length < 2) return state
      const groupId = createId()
      const shapes = { ...state.shapes }
      for (const id of state.selection.ids) {
        shapes[id] = { ...shapes[id], groupId }
      }
      return { ...state, shapes }
    }

    // Selection always expands to a group's full membership (see
    // expandToGroups) - clearing groupId off every currently-selected shape
    // is therefore always "ungroup whatever group(s) are selected," never a
    // partial ungroup, even if the selection happens to span more than one
    // group at once.
    case 'UNGROUP_SELECTED': {
      if (state.selection?.kind !== 'shape') return state
      const shapes = { ...state.shapes }
      let changed = false
      for (const id of state.selection.ids) {
        if (shapes[id]?.groupId) {
          shapes[id] = { ...shapes[id], groupId: null }
          changed = true
        }
      }
      return changed ? { ...state, shapes } : state
    }

    // Aligns every selected shape to one edge/center of the selection's own
    // combined bounding box (not the canvas, and not a fixed reference
    // shape) - the same "align to selection" convention Figma/PowerPoint
    // use, so a lone shape already sitting on that edge is a no-op and
    // there's never a "first shape stays put, the rest move to it" special
    // case to reason about.
    case 'ALIGN_SELECTED': {
      if (state.selection?.kind !== 'shape' || state.selection.ids.length < 2) return state
      const ids = state.selection.ids
      const selected = ids.map((id) => state.shapes[id])
      const minX = Math.min(...selected.map((s) => s.x))
      const maxX = Math.max(...selected.map((s) => s.x + s.width))
      const minY = Math.min(...selected.map((s) => s.y))
      const maxY = Math.max(...selected.map((s) => s.y + s.height))
      const shapes = { ...state.shapes }
      for (const shape of selected) {
        let { x, y } = shape
        if (action.edge === 'left') x = minX
        else if (action.edge === 'center') x = minX + (maxX - minX - shape.width) / 2
        else if (action.edge === 'right') x = maxX - shape.width
        else if (action.edge === 'top') y = minY
        else if (action.edge === 'middle') y = minY + (maxY - minY - shape.height) / 2
        else if (action.edge === 'bottom') y = maxY - shape.height
        shapes[shape.id] = { ...shape, ...clampShapePosition(x, y) }
      }
      return { ...state, shapes }
    }

    // A discrete +/-90deg step per click, applied to every selected shape at
    // once as one atomic action (one undo step per click) - distinct from
    // ROTATE_SHAPE (the free-angle drag-handle gesture, coalesced via
    // CONTINUOUS_TYPES in historyReducer.js) since a button click isn't a
    // drag gesture and each selected shape keeps rotating around its own
    // center, not the selection's combined one.
    case 'ROTATE_SELECTED': {
      if (state.selection?.kind !== 'shape' || state.selection.ids.length === 0) return state
      const shapes = { ...state.shapes }
      for (const id of state.selection.ids) {
        const shape = shapes[id]
        shapes[id] = { ...shape, rotation: ((shape.rotation ?? 0) + action.delta + 360) % 360 }
      }
      return { ...state, shapes }
    }

    // shapeOrder is paint order (first = bottom, last = top - see ADD_SHAPE's
    // own boundary-unshift comment) - moving the selected ids to one end
    // moves everything else up/down relative to them in one step, same as
    // any other "bring to front / send to back" tool.
    case 'BRING_TO_FRONT': {
      if (state.selection?.kind !== 'shape') return state
      // A container (system boundary, swimlane, Layer Container) must stay
      // behind every other shape, same invariant ADD_SHAPE enforces at
      // creation - bringing one to the front would paint its own frame/tint
      // over whatever's placed inside it instead of framing it. Any
      // container id in the selection is silently left in place rather than
      // blocking the whole action; non-container ids in the same (possibly
      // mixed) selection still move normally.
      const ids = new Set(
        [...state.selection.ids].filter((id) => !containerShapeTypes.has(state.shapes[id]?.type)),
      )
      if (ids.size === 0) return state
      const rest = state.shapeOrder.filter((id) => !ids.has(id))
      const moved = state.shapeOrder.filter((id) => ids.has(id))
      return { ...state, shapeOrder: [...rest, ...moved] }
    }

    case 'SEND_TO_BACK': {
      if (state.selection?.kind !== 'shape') return state
      const ids = new Set(state.selection.ids)
      const rest = state.shapeOrder.filter((id) => !ids.has(id))
      const moved = state.shapeOrder.filter((id) => ids.has(id))
      return { ...state, shapeOrder: [...moved, ...rest] }
    }

    // Single-step reorder, unlike BRING_TO_FRONT/SEND_TO_BACK's jump to
    // either end - each selected id swaps with its immediate non-selected
    // neighbor in that direction, one position at a time. Walking the array
    // back-to-front (forward) / front-to-back (backward) is what lets two
    // adjacent selected shapes both move together, preserving their
    // relative order, instead of the first swap immediately blocking the
    // second (see the trace-through in this session's own design notes: an
    // ordinary single forward pass over the array would let a selected id
    // swap into a position another selected id already vacated on this
    // same call, double-moving it).
    case 'BRING_FORWARD': {
      if (state.selection?.kind !== 'shape') return state
      // Same container-stays-behind reasoning as BRING_TO_FRONT above -
      // a container id never swaps forward past a neighbor, so it can't
      // creep in front of its own children one step at a time either.
      const ids = new Set(
        [...state.selection.ids].filter((id) => !containerShapeTypes.has(state.shapes[id]?.type)),
      )
      if (ids.size === 0) return state
      const order = [...state.shapeOrder]
      for (let i = order.length - 2; i >= 0; i--) {
        if (ids.has(order[i]) && !ids.has(order[i + 1])) {
          ;[order[i], order[i + 1]] = [order[i + 1], order[i]]
        }
      }
      return { ...state, shapeOrder: order }
    }

    case 'SEND_BACKWARD': {
      if (state.selection?.kind !== 'shape') return state
      const ids = new Set(state.selection.ids)
      const order = [...state.shapeOrder]
      for (let i = 1; i < order.length; i++) {
        if (ids.has(order[i]) && !ids.has(order[i - 1])) {
          ;[order[i], order[i - 1]] = [order[i - 1], order[i]]
        }
      }
      return { ...state, shapeOrder: order }
    }

    // Equalizes the *gaps* between consecutive shapes along one axis (not
    // their centers) - first and last shape (by position) stay put, only
    // the ones between them move, same "distribute spacing" convention
    // Figma uses. Needs 3+ selected shapes: with exactly 2, there's only
    // one gap already, nothing to equalize.
    case 'DISTRIBUTE_SELECTED': {
      if (state.selection?.kind !== 'shape' || state.selection.ids.length < 3) return state
      const selected = state.selection.ids.map((id) => state.shapes[id])
      const shapes = { ...state.shapes }
      const isHorizontal = action.axis === 'horizontal'
      const sorted = [...selected].sort((a, b) => (isHorizontal ? a.x - b.x : a.y - b.y))
      const first = sorted[0]
      const last = sorted[sorted.length - 1]
      const sizeOf = (s) => (isHorizontal ? s.width : s.height)
      const startOf = (s) => (isHorizontal ? s.x : s.y)
      const span = startOf(last) + sizeOf(last) - startOf(first)
      const totalSize = sorted.reduce((sum, s) => sum + sizeOf(s), 0)
      const gap = (span - totalSize) / (sorted.length - 1)
      let cursor = startOf(first) + sizeOf(first)
      for (let i = 1; i < sorted.length - 1; i++) {
        cursor += gap
        const shape = sorted[i]
        shapes[shape.id] = {
          ...shape,
          ...clampShapePosition(isHorizontal ? cursor : shape.x, isHorizontal ? shape.y : cursor),
        }
        cursor += sizeOf(shape)
      }
      return { ...state, shapes }
    }

    // Prevents accidental edits (drag/resize/rotate/delete) on a shape
    // without hiding or otherwise removing it - see MOVE_SHAPE/
    // RESIZE_SHAPE/ROTATE_SHAPE/DELETE_SELECTED below, each of which now
    // skips a locked shape rather than applying the gesture to it.
    // Toggling always flips *every* selected shape to the same next state
    // (locking whichever aren't already locked) rather than each following
    // its own previous value independently - same "one predictable
    // outcome for the whole selection" reasoning TOGGLE_ARROW_LABEL_BACKGROUND
    // and every other bulk toggle in this file already follows.
    case 'TOGGLE_SHAPE_LOCK': {
      if (state.selection?.kind !== 'shape' || state.selection.ids.length === 0) return state
      const shouldLock = state.selection.ids.some((id) => !state.shapes[id]?.locked)
      const shapes = { ...state.shapes }
      for (const id of state.selection.ids) {
        shapes[id] = { ...shapes[id], locked: shouldLock }
      }
      return { ...state, shapes }
    }

    // Works for every shape type (DFD/flowchart/use-case/basic/label alike) -
    // it clones whatever's selected generically by value, with no per-type
    // branching. Arrow selection is a no-op: a lone arrow copied without its
    // endpoint shapes would have nothing valid to reconnect to on paste.
    case 'COPY_SELECTED': {
      if (state.selection?.kind !== 'shape' || state.selection.ids.length === 0) return state
      const ids = new Set(state.selection.ids)
      const shapes = state.selection.ids.map((id) => state.shapes[id])
      // Only arrows with both ends inside the copied set come along - one
      // reaching outside the selection would dangle with no copied shape to
      // reconnect to.
      const arrows = state.arrowOrder
        .map((id) => state.arrows[id])
        .filter((arrow) => ids.has(arrow.fromId) && ids.has(arrow.toId))
      return { ...state, clipboard: { shapes, arrows } }
    }

    // One-step "copy, then paste right here" - kept fully independent of
    // COPY_SELECTED/PASTE rather than composed from them, since PASTE's own
    // repeated-paste fan-out behavior depends on round-tripping through the
    // cross-tab clipboard (see its own comment below), which two dispatches
    // fired back-to-back in the same gesture can't reliably do (the effect
    // that publishes state.clipboard to localStorage hasn't run yet by the
    // time a second dispatch would read it back). Same id/groupId remapping
    // logic as PASTE, just sourced from this diagram's own current
    // selection instead of action.clip.
    case 'DUPLICATE_SELECTED': {
      if (state.selection?.kind !== 'shape' || state.selection.ids.length === 0) return state
      const ids = new Set(state.selection.ids)
      const containedArrows = state.arrowOrder
        .map((id) => state.arrows[id])
        .filter((arrow) => ids.has(arrow.fromId) && ids.has(arrow.toId))

      const idMap = new Map()
      const groupIdMap = new Map()
      const shapes = { ...state.shapes }
      const shapeIds = []
      for (const shapeId of state.selection.ids) {
        const shape = state.shapes[shapeId]
        const id = createId()
        idMap.set(shapeId, id)
        const { x, y } = clampShapePosition(shape.x + PASTE_OFFSET, shape.y + PASTE_OFFSET)
        let groupId = shape.groupId ?? null
        if (groupId) {
          if (!groupIdMap.has(groupId)) groupIdMap.set(groupId, createId())
          groupId = groupIdMap.get(groupId)
        }
        shapes[id] = { ...shape, id, x, y, groupId }
        shapeIds.push(id)
      }

      const arrows = { ...state.arrows }
      const arrowIds = []
      for (const arrow of containedArrows) {
        const id = createId()
        arrows[id] = { ...arrow, id, fromId: idMap.get(arrow.fromId), toId: idMap.get(arrow.toId) }
        arrowIds.push(id)
      }

      return {
        ...state,
        shapes,
        shapeOrder: [...state.shapeOrder, ...shapeIds],
        arrows,
        arrowOrder: [...state.arrowOrder, ...arrowIds],
        selection: { kind: 'shape', ids: shapeIds },
      }
    }

    case 'PASTE': {
      // Read fresh from localStorage at dispatch time (see action.clip in
      // EditorCanvas's Ctrl+V handler), not this diagram's own
      // state.clipboard - the whole point is pasting whatever was most
      // recently copied anywhere, including a different diagram/tab whose
      // own reducer state this one has no access to.
      const clip = action.clip
      if (!clip || clip.shapes.length === 0) return state

      const idMap = new Map()
      // A copied group's shapes still carry their *original* groupId - left
      // untouched, pasting would silently re-join the newly-pasted copies to
      // the original group still sitting right next to them, instead of
      // forming their own new group. Remapped the same way idMap remaps the
      // shape ids themselves, one fresh groupId per distinct original one.
      const groupIdMap = new Map()
      const shapes = { ...state.shapes }
      const shapeIds = []
      // Re-offset positions (not the clipboard's own, possibly stale ones)
      // so pasted shapes land visibly apart from their source instead of
      // exactly on top of it.
      const pastedShapes = []
      for (const shape of clip.shapes) {
        const id = createId()
        idMap.set(shape.id, id)
        // clampShapePosition here too, not just MOVE_SHAPE/RESIZE_SHAPE/
        // ADD_SHAPE - the clipboard can carry a shape copied from a
        // different diagram (see the comment above on action.clip), whose
        // own data could predate this clamp existing at all.
        const { x, y } = clampShapePosition(shape.x + PASTE_OFFSET, shape.y + PASTE_OFFSET)
        let groupId = shape.groupId ?? null
        if (groupId) {
          if (!groupIdMap.has(groupId)) groupIdMap.set(groupId, createId())
          groupId = groupIdMap.get(groupId)
        }
        shapes[id] = { ...shape, id, x, y, groupId }
        pastedShapes.push(shapes[id])
        shapeIds.push(id)
      }

      const arrows = { ...state.arrows }
      const arrowIds = []
      for (const arrow of clip.arrows) {
        const id = createId()
        arrows[id] = { ...arrow, id, fromId: idMap.get(arrow.fromId), toId: idMap.get(arrow.toId) }
        arrowIds.push(id)
      }

      return {
        ...state,
        shapes,
        shapeOrder: [...state.shapeOrder, ...shapeIds],
        arrows,
        arrowOrder: [...state.arrowOrder, ...arrowIds],
        selection: { kind: 'shape', ids: shapeIds },
        // Re-baselined to the just-pasted positions (arrows carry over
        // unchanged - remapping their endpoints again next paste would only
        // ever produce the same relative shape, ids aside) so repeated
        // Ctrl+V without a fresh copy fans out diagonally instead of
        // restacking every paste in the exact same spot.
        clipboard: { shapes: pastedShapes, arrows: clip.arrows },
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

    // Clicking the canvas with the Comment tool active (see EditorCanvas's
    // handleCanvasPointerDown) opens a local, undispatched composer first -
    // this only fires once that composer is actually submitted with real
    // content, same "no empty shape ever gets created" shape ADD_SHAPE
    // itself doesn't need to worry about (a shape always has a default
    // text, a comment has nothing worth keeping until someone types
    // something). Switches back to the select tool on success, same
    // "placing one thing uses up the tool" convention ADD_SHAPE already
    // follows.
    case 'ADD_COMMENT_THREAD': {
      const content = action.content.trim()
      if (!content) return state
      const threadId = createId()
      const message = {
        id: createId(),
        userId: action.userId,
        email: action.email,
        name: action.name,
        picture: action.picture,
        content,
        createdAt: new Date().toISOString(),
        editedAt: null,
      }
      return {
        ...state,
        tool: 'select',
        commentThreads: {
          ...state.commentThreads,
          [threadId]: { id: threadId, x: action.x, y: action.y, resolved: false, messages: [message] },
        },
        commentThreadOrder: [...state.commentThreadOrder, threadId],
        activeCommentThreadId: threadId,
      }
    }

    case 'ADD_COMMENT_REPLY': {
      const content = action.content.trim()
      const thread = state.commentThreads[action.threadId]
      if (!content || !thread) return state
      const message = {
        id: createId(),
        userId: action.userId,
        email: action.email,
        name: action.name,
        picture: action.picture,
        content,
        createdAt: new Date().toISOString(),
        editedAt: null,
      }
      return {
        ...state,
        commentThreads: {
          ...state.commentThreads,
          [action.threadId]: { ...thread, messages: [...thread.messages, message] },
        },
      }
    }

    case 'EDIT_COMMENT_MESSAGE': {
      const content = action.content.trim()
      const thread = state.commentThreads[action.threadId]
      if (!content || !thread) return state
      const messages = thread.messages.map((message) =>
        message.id === action.messageId
          ? { ...message, content, editedAt: new Date().toISOString() }
          : message,
      )
      return {
        ...state,
        commentThreads: { ...state.commentThreads, [action.threadId]: { ...thread, messages } },
      }
    }

    // Toggle, not one-way - a resolved thread can still be reopened later
    // (CommentThreadCard flips the menu label between "Resolve"/"Reopen"
    // based on the thread's own current state), so nothing ever gets
    // permanently stuck.
    case 'TOGGLE_COMMENT_THREAD_RESOLVED': {
      const thread = state.commentThreads[action.threadId]
      if (!thread) return state
      return {
        ...state,
        commentThreads: {
          ...state.commentThreads,
          [action.threadId]: { ...thread, resolved: !thread.resolved },
        },
      }
    }

    case 'DELETE_COMMENT_THREAD': {
      if (!state.commentThreads[action.threadId]) return state
      const commentThreads = { ...state.commentThreads }
      delete commentThreads[action.threadId]
      return {
        ...state,
        commentThreads,
        commentThreadOrder: state.commentThreadOrder.filter((id) => id !== action.threadId),
        activeCommentThreadId:
          state.activeCommentThreadId === action.threadId ? null : state.activeCommentThreadId,
      }
    }

    // Which single thread's card is expanded - opening one implicitly
    // closes whatever else was open, same as this editor never shows two
    // popovers at once elsewhere.
    case 'SET_ACTIVE_COMMENT_THREAD':
      if (state.activeCommentThreadId === action.threadId) return state
      return { ...state, activeCommentThreadId: action.threadId }

    // No-op today — marks the point Phase 4's undo/redo history will snapshot on.
    case 'DRAG_END':
      return state

    default:
      return state
  }
}

const historyReducer = createHistoryReducer(reducer)

// Action types a read-only (viewer-role) collaborator may still dispatch -
// pure navigation/selection/local-view state, never diagram content. Every
// other action type is silently dropped for a viewer, regardless of where
// the dispatch call originated - this is the single enforcement point (see
// guardedDispatch below), deliberately not scattered as per-button
// `disabled` checks across the sidebar/topbar/canvas, since e.g.
// EditorCanvas's global keydown listener (Delete, Ctrl+V) dispatches
// mutating actions too and would bypass button-level-only gating.
const READ_ONLY_ALLOWED_ACTIONS = new Set([
  'SET_TOOL',
  'SELECT',
  'TOGGLE_SHAPE_SELECTION',
  'DESELECT',
  'SET_ZOOM',
  'REQUEST_ZOOM_TO_FIT',
  'SET_HOVERED_SHAPE',
  'SET_ALIGNMENT_GUIDES',
  'CANCEL_PENDING_ARROW',
  'TOGGLE_GRID',
  'SET_GRID_STYLE',
  'UNDO',
  'REDO',
  'DRAG_END',
  // Opening/closing a thread's card is read-only navigation, same tier as
  // SELECT above - a viewer can read every comment, just can't add, edit,
  // resolve, or delete one (those all persist through the same diagrams.data
  // column a viewer has no update policy for - see schema.sql - so letting
  // the dispatch through here would just draft into a UI that silently
  // never saves, worse than not allowing it).
  'SET_ACTIVE_COMMENT_THREAD',
])

function extractPersisted(state) {
  return {
    shapes: state.shapes,
    shapeOrder: state.shapeOrder,
    arrows: state.arrows,
    arrowOrder: state.arrowOrder,
    counters: state.counters,
    showGrid: state.showGrid,
    gridStyle: state.gridStyle,
    commentThreads: state.commentThreads,
    commentThreadOrder: state.commentThreadOrder,
  }
}

// Reference inequality (not a deep compare) is enough here - `baseline` and
// `current` are always two `extractPersisted()` snapshots taken from this
// same client's own reducer, which always gives a changed entry a new
// object reference (immutable-update convention followed throughout
// historyReducer.js) and leaves an untouched one's reference alone. Content
// could theoretically differ despite a matching reference never happening,
// or match despite a *different* reference in some rare no-op-edit case -
// worst case that costs one redundant id in the diff, not a correctness bug.
function diffIdMap(baseline, current) {
  const changed = {}
  let hasChanged = false
  for (const id in current) {
    if (baseline[id] !== current[id]) {
      changed[id] = current[id]
      hasChanged = true
    }
  }
  const removed = []
  for (const id in baseline) {
    if (!(id in current)) removed.push(id)
  }
  return [hasChanged ? changed : {}, removed]
}

// What actually goes out over the realtime channel now - only the
// shapes/arrows/comment-threads that changed since the last thing THIS
// client broadcast, plus an explicit removed-ids list for each (an id
// simply missing from `shapes` is ambiguous - untouched, or deleted? - so
// deletions need their own signal). shapeOrder/arrowOrder/
// commentThreadOrder/counters/showGrid/gridStyle are cheap (just id lists /
// small values) and always sent whole, no need to diff those.
//
// `removedShapeIds`/`removedArrowIds`/`removedCommentThreadIds` being
// *present* (even as `[]`) is what tells historyReducer.js's
// mergeRemotePatch this is a diff, not a full snapshot - see its own
// comment on why that distinction matters (a full DB row, applied on tab
// refocus, has no such field and means something different: "this IS the
// complete set, anything else is a deletion").
function buildBroadcastDiff(baseline, current) {
  const [shapes, removedShapeIds] = diffIdMap(baseline.shapes, current.shapes)
  const [arrows, removedArrowIds] = diffIdMap(baseline.arrows, current.arrows)
  const [commentThreads, removedCommentThreadIds] = diffIdMap(
    baseline.commentThreads,
    current.commentThreads,
  )
  return {
    shapes,
    removedShapeIds,
    arrows,
    removedArrowIds,
    commentThreads,
    removedCommentThreadIds,
    shapeOrder: current.shapeOrder,
    arrowOrder: current.arrowOrder,
    commentThreadOrder: current.commentThreadOrder,
    counters: current.counters,
    showGrid: current.showGrid,
    gridStyle: current.gridStyle,
  }
}

// Nothing actually changed content-wise - nothing worth sending. Comes up
// whenever this tick's only "change" was absorbing a remote patch that just
// got applied (see the suppressed branch below), which already brought
// this client's own baseline up to date without this client itself having
// anything new to report.
function isEmptyBroadcastDiff(diff) {
  return (
    Object.keys(diff.shapes).length === 0 &&
    diff.removedShapeIds.length === 0 &&
    Object.keys(diff.arrows).length === 0 &&
    diff.removedArrowIds.length === 0 &&
    Object.keys(diff.commentThreads).length === 0 &&
    diff.removedCommentThreadIds.length === 0
  )
}

export function useDiagramEditor(diagramId, initialData, role = 'owner', email, name, picture) {
  const readOnly = role === 'viewer'
  const [history, rawDispatch] = useReducer(historyReducer, undefined, () =>
    initHistory(initState(initialData)),
  )
  const state = history.present
  // True for exactly as long as this tab is mid a local continuous gesture
  // (drag/resize/rotate) - see historyReducer's CONTINUOUS_TYPES. Used below
  // to hold off the DB save until the shape is actually dropped, and by
  // Shape.jsx to tell "I'm moving this right now" apart from a remote
  // update.
  const isDragging = history.isDragging
  const [saveStatus, setSaveStatus] = useState('saved')

  // Flips to 'saving' the instant a persisted field actually changes
  // reference - adjusting state during render (React's own documented
  // pattern for exactly this: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes),
  // not inside an effect, which this project's stricter lint rule flags as
  // risking a cascading extra render for no benefit over doing it here
  // directly. Two things depend on this firing immediately rather than only
  // once runSave's own network call starts SAVE_DEBOUNCE_MS later (see the
  // debounced-save effect further down, which still owns actually
  // scheduling and running that save): the topbar's "Saving…" indicator now
  // reflects unsaved work the instant it exists instead of seeming to lag
  // behind every edit, and the tab-refocus refetch further down treats
  // anything other than 'saved' as "the DB row is stale, don't apply it
  // over this" for that same window - without it, switching tabs (or even
  // briefly losing/regaining window focus) within that window could
  // silently revert whatever was just changed back to its pre-edit state.
  const [lastPersisted, setLastPersisted] = useState(() => extractPersisted(state))
  const persistedNow = extractPersisted(state)
  const persistedChanged =
    persistedNow.shapes !== lastPersisted.shapes ||
    persistedNow.shapeOrder !== lastPersisted.shapeOrder ||
    persistedNow.arrows !== lastPersisted.arrows ||
    persistedNow.arrowOrder !== lastPersisted.arrowOrder ||
    persistedNow.counters !== lastPersisted.counters ||
    persistedNow.showGrid !== lastPersisted.showGrid ||
    persistedNow.gridStyle !== lastPersisted.gridStyle ||
    persistedNow.commentThreads !== lastPersisted.commentThreads ||
    persistedNow.commentThreadOrder !== lastPersisted.commentThreadOrder
  if (persistedChanged) {
    setLastPersisted(persistedNow)
    // A viewer's own dispatch can never actually change these fields (see
    // READ_ONLY_ALLOWED_ACTIONS below), but APPLY_REMOTE_STATE bypasses
    // that guard (it goes through rawDispatch directly) - so this can still
    // fire for a viewer on an incoming collaborator edit. They never save
    // anything themselves (the debounced-save effect's own `if (readOnly)
    // return` already skips them entirely), so this stays silent for them.
    if (!readOnly) setSaveStatus('saving')
  }

  // The actual permission boundary - see READ_ONLY_ALLOWED_ACTIONS above.
  // Wrapping here (rather than exporting rawDispatch) means every caller
  // downstream keeps calling a value named `dispatch` exactly as before;
  // no call site elsewhere needs to know a viewer even exists.
  const dispatch = useCallback(
    (action) => {
      if (readOnly && !READ_ONLY_ALLOWED_ACTIONS.has(action.type)) return
      rawDispatch(action)
    },
    [readOnly],
  )

  // Publishes every local copy to the shared cross-diagram/cross-tab
  // clipboard slot (see CLIPBOARD_STORAGE_KEY above) - this is the only
  // thing that makes Ctrl+C here and Ctrl+V somewhere else work. Wrapped in
  // try/catch since localStorage can throw (private-browsing quota,
  // storage disabled) - worst case, copy/paste just stays this-tab-only for
  // that session, same as before this existed.
  useEffect(() => {
    if (!state.clipboard) return
    try {
      localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(state.clipboard))
    } catch {
      // Ignored - see comment above.
    }
  }, [state.clipboard])

  // Mirrors the latest state into a ref so the debounce timer/unmount-flush
  // below always save the most current content, not whatever was captured
  // when the effect last ran. Written from an effect (not during render)
  // since refs are only safe to mutate outside the render phase.
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  // Set right before applying an incoming remote patch so the broadcast
  // effect below can tell "this content change is an echo of what a
  // collaborator just sent us" apart from "this is a genuinely new local
  // edit" - without it, applying a remote patch would itself change
  // state.shapes/etc, which would trigger the same effect to broadcast that
  // same content straight back out, and a two-person session would ping-pong
  // the same snapshot back and forth forever.
  const suppressNextBroadcastRef = useRef(false)
  const applyRemoteState = useCallback((patch) => {
    suppressNextBroadcastRef.current = true
    rawDispatch({ type: 'APPLY_REMOTE_STATE', patch })
  }, [])
  const { broadcastState, cursors, activeUsers, updateCursor, clearCursor } = useDiagramChannel(
    diagramId,
    email,
    name,
    picture,
    applyRemoteState,
  )

  // Belt-and-suspenders alongside useDiagramChannel's own reconnect-on-
  // return: whatever the exact reason a backgrounded tab's live view drifts
  // (a dropped realtime connection being the likely one - see
  // useDiagramChannel), this re-syncs straight from the DB row - the
  // durable source of truth regardless of what the realtime channel did or
  // didn't deliver while this tab wasn't in front. Cheap (one row, only on
  // return-to-tab, not polled), and makes correctness independent of
  // getting the realtime diagnosis exactly right.
  useEffect(() => {
    if (!diagramId) return
    const refetch = () => {
      if (document.visibilityState !== 'visible') return
      // Skip while a local edit is still unsaved - saveStatus flips to
      // 'saving' the moment the debounce timer below is *scheduled* (not
      // just once the network call actually starts - see that effect's own
      // comment), so this covers the debounce window, the save itself, and
      // an error still waiting to be retried by the next edit. The DB row
      // this would read is guaranteed stale in any of those, and applying
      // it (via applyRemoteState below) would silently revert whatever was
      // just changed back to its pre-edit state - which is exactly what
      // made a shape moved right before switching tabs (or even briefly
      // losing/regaining window focus) snap back the moment focus
      // returned. The debounced save still lands on its own regardless -
      // this only skips *this* particular read racing ahead of it.
      if (saveStatus !== 'saved') return
      supabase
        .from('diagrams')
        .select('data')
        .eq('id', diagramId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.data) applyRemoteState(data.data)
        })
    }
    document.addEventListener('visibilitychange', refetch)
    window.addEventListener('focus', refetch)
    return () => {
      document.removeEventListener('visibilitychange', refetch)
      window.removeEventListener('focus', refetch)
    }
  }, [diagramId, applyRemoteState, saveStatus])

  // What THIS client last actually put on the wire (not just "the last state
  // it had") - every diff broadcast below is computed against this, and it
  // only ever advances at the moment content actually goes out (or, for a
  // just-applied remote patch, at the moment it's absorbed - see the
  // suppressed branch, which counts as "peers already know this" too even
  // though this client didn't send it). Starts empty so the very first
  // broadcast this client ever sends is naturally "everything is new,"
  // equivalent to the old full-snapshot behavior for that one case.
  const lastBroadcastPersistedRef = useRef({ shapes: {}, arrows: {}, commentThreads: {} })

  // A drag dispatches MOVE_SHAPE on every single pointermove - without this,
  // that meant one full-document broadcast per pointermove tick (30-60/sec
  // during a fast drag). Throttled here to leading-edge-immediate (so the
  // very first move of a gesture shows up instantly) plus a trailing timer
  // that always flushes the *latest* queued payload once the window closes -
  // never just dropped, or the shape's true final position could sit un-sent
  // until the next unrelated edit.
  //
  // The diff itself is computed here, at actual send time - not up where
  // scheduleBroadcast is called - deliberately. `throttle.pending` always
  // holds the latest *full* persisted snapshot (overwriting an older one
  // queued in the same window is safe, since the newer one is a complete
  // superset). Diffing that against lastBroadcastPersistedRef only at the
  // moment it's about to go out means a throttle window with several rapid
  // local edits still produces exactly one diff covering everything since
  // the last real send - computing the diff earlier (e.g. per-tick, against
  // a baseline advanced on every tick) would let an edit from the middle of
  // the window get silently dropped whenever a later one in the same window
  // overwrote it.
  const BROADCAST_THROTTLE_MS = 50
  const broadcastThrottleRef = useRef({ lastSentAt: 0, timer: null, pending: null })
  const flushBroadcast = useCallback(
    (persistedNow) => {
      const diff = buildBroadcastDiff(lastBroadcastPersistedRef.current, persistedNow)
      lastBroadcastPersistedRef.current = persistedNow
      if (!isEmptyBroadcastDiff(diff)) broadcastState(diff)
    },
    [broadcastState],
  )
  const scheduleBroadcast = useCallback(
    (persistedNow) => {
      const throttle = broadcastThrottleRef.current
      const elapsed = Date.now() - throttle.lastSentAt
      if (elapsed >= BROADCAST_THROTTLE_MS) {
        throttle.lastSentAt = Date.now()
        flushBroadcast(persistedNow)
        return
      }
      throttle.pending = persistedNow
      if (throttle.timer) return
      throttle.timer = setTimeout(() => {
        throttle.timer = null
        throttle.lastSentAt = Date.now()
        flushBroadcast(throttle.pending)
        throttle.pending = null
      }, BROADCAST_THROTTLE_MS - elapsed)
    },
    [flushBroadcast],
  )
  useEffect(() => {
    const throttle = broadcastThrottleRef.current
    return () => {
      if (throttle.timer) clearTimeout(throttle.timer)
    }
  }, [])

  // Live view sync - unlike the debounced DB save below, this fires
  // immediately (well, throttled - see scheduleBroadcast) on every content
  // change so collaborators see edits as they happen, not up to 500ms later.
  // Viewers never reach here in practice (their dispatch already drops every
  // action that could change these fields), so `readOnly` is just a
  // belt-and-suspenders skip, matching the save effect's own guard.
  //
  // useLayoutEffect, not useEffect - a MOVE_SHAPE dispatch from a drag still
  // has to go through the reducer (it's the one place shape mutation logic
  // lives; duplicating "how MOVE_SHAPE updates a shape" into the pointer
  // handler just to broadcast a step early would mean two places that have
  // to stay in sync). But nothing says *this* effect has to wait for
  // useEffect's post-paint passive-effect scheduling, which is the real
  // avoidable delay - useLayoutEffect fires synchronously right after React
  // commits the DOM update, before the browser paints, shaving that wait
  // off every broadcast without touching where the mutation itself happens.
  useLayoutEffect(() => {
    if (suppressNextBroadcastRef.current) {
      suppressNextBroadcastRef.current = false
      // This tick's only "change" was absorbing a remote patch, not a local
      // edit - nothing of this client's own to send, but peers now
      // effectively know this content (whoever sent it does, at least), so
      // the next real diff this client sends shouldn't re-include it. Also
      // brings a still-pending throttled send up to date, so if it does
      // still fire, it correctly resolves to an empty (skipped) diff instead
      // of re-sending a since-superseded local edit against a baseline
      // that's already moved past it.
      lastBroadcastPersistedRef.current = persistedNow
      if (broadcastThrottleRef.current.timer) broadcastThrottleRef.current.pending = persistedNow
      return
    }
    if (readOnly) return
    scheduleBroadcast(persistedNow)
    // Deliberately keyed on the individual persisted fields (like the save
    // effect below), not `state` itself - `state` also changes reference on
    // purely transient updates (selection, tool, hover), which would
    // otherwise rebroadcast identical content on every click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    readOnly,
    state.shapes,
    state.shapeOrder,
    state.arrows,
    state.arrowOrder,
    state.counters,
    state.showGrid,
    state.gridStyle,
    state.commentThreads,
    state.commentThreadOrder,
    scheduleBroadcast,
  ])

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
    // A viewer's dispatch is already fully blocked from ever changing these
    // fields (see READ_ONLY_ALLOWED_ACTIONS), so this effect would never
    // actually have new content to save - skipping it outright also means a
    // viewer's client never attempts an update Postgres would reject anyway
    // (RLS has no update policy for a viewer-role collaborator), which would
    // otherwise surface as a confusing `saveStatus: 'error'` for someone who
    // was never supposed to be able to save in the first place.
    if (readOnly) return

    // Hold off entirely while a drag/resize/rotate is in flight - a long or
    // fast gesture dispatches MOVE_SHAPE dozens of times, and none of those
    // intermediate positions are worth writing to the DB, only the one the
    // user actually drops on. `isDragging` flipping back to false (DRAG_END)
    // is itself what re-fires this effect and schedules the real save below,
    // even though the content fields didn't change on that exact dispatch.
    if (isDragging) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      return
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      scheduleSave(extractPersisted(stateRef.current))
    }, SAVE_DEBOUNCE_MS)
    return () => clearTimeout(saveTimerRef.current)
  }, [
    readOnly,
    isDragging,
    state.shapes,
    state.shapeOrder,
    state.arrows,
    state.arrowOrder,
    state.counters,
    state.showGrid,
    state.gridStyle,
    state.commentThreads,
    state.commentThreadOrder,
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
    readOnly,
    // Shape.jsx uses this, combined with its own selection membership, to
    // tell "I'm moving this right now, keep it 1:1 with my mouse" apart from
    // "this position change just arrived from a collaborator, animate it."
    isDragging,
    cursors,
    activeUsers,
    updateCursor,
    clearCursor,
  }
}
