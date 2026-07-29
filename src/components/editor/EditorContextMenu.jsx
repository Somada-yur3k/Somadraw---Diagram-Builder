import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { readClipboard } from './useDiagramEditor'

// w-48 below - kept as a constant so clampPos can keep the panel from
// running off the right/bottom edge of the viewport for a right-click near
// either edge. MAX_HEIGHT_ESTIMATE is a generous upper bound (this menu's
// item count varies with what's selected - Group/Ungroup show
// conditionally) rather than a measured value, matching every other
// popover in this app (none of them measure-then-reposition either).
const MENU_WIDTH = 192
const MAX_HEIGHT_ESTIMATE = 320

function clampMenuPos(x, y) {
  return {
    left: Math.min(x, Math.max(8, window.innerWidth - MENU_WIDTH - 8)),
    top: Math.min(y, Math.max(8, window.innerHeight - MAX_HEIGHT_ESTIMATE - 8)),
  }
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="9" y="9" width="12" height="12" rx="1.5" />
      <path d="M6 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V6" />
    </svg>
  )
}

function PasteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="5" y="4" width="14" height="17" rx="1.5" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  )
}

function GroupIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="3" y="3" width="10" height="10" rx="1.5" />
      <rect x="11" y="11" width="10" height="10" rx="1.5" />
    </svg>
  )
}

function UngroupIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="2" y="2" width="9" height="9" rx="1.5" />
      <rect x="13" y="13" width="9" height="9" rx="1.5" />
    </svg>
  )
}

function BringToFrontIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="3" y="3" width="12" height="12" rx="1.5" opacity="0.4" />
      <rect x="9" y="9" width="12" height="12" rx="1.5" fill="white" />
    </svg>
  )
}

function SendToBackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="3" y="3" width="12" height="12" rx="1.5" fill="white" />
      <rect x="9" y="9" width="12" height="12" rx="1.5" opacity="0.4" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M4 7h16" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    </svg>
  )
}

function menuItemClass(danger = false) {
  return `flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${
    danger ? 'text-rose-600 hover:bg-rose-50' : 'text-body hover:bg-surface-soft hover:text-ink'
  }`
}

// aria-hidden - decorative keyboard-shortcut hint, not essential to the
// button's own meaning. Without this, a screen reader (and anything else
// that computes the button's accessible name by concatenating its text
// content, e.g. Playwright's getByRole) would read/match "GroupCtrl+G" as
// one run-on name instead of the button just being "Group".
function Hint({ children }) {
  return (
    <span aria-hidden="true" className="ml-auto text-[11px] text-soft">
      {children}
    </span>
  )
}

// The floating menu itself - EditorCanvas owns *when* this is open (and
// makes sure the right-clicked shape is selected first, see its own
// onContextMenu handler), this just renders the actions for whatever's
// selected right now and dispatches. Shape-only by design (matches what was
// asked for) - right-clicking an arrow or empty canvas doesn't open this.
function EditorContextMenu({ x, y, state, dispatch, onClose }) {
  const panelRef = useRef(null)

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (panelRef.current?.contains(event.target)) return
      onClose()
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    // Deliberately *not* also listening for 'contextmenu' here to close on a
    // second right-click elsewhere - pointerdown alone already covers that:
    // a native right-click always fires pointerdown before contextmenu, so
    // the new click's own pointerdown closes this menu first, and
    // EditorCanvas's handler is then free to open a fresh one at the new
    // spot right after. Listening for 'contextmenu' too actually broke this
    // menu entirely - the contextmenu event that *opens* it is still
    // bubbling past document (root, where React's own delegated listener
    // lives, sits below document in the tree) at the moment this effect's
    // listener gets attached, so it would immediately catch and close its
    // own opening event.
    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const hasShapeSelection = state.selection?.kind === 'shape' && state.selection.ids.length > 0
  const canGroup = hasShapeSelection && state.selection.ids.length > 1
  const canUngroup = hasShapeSelection && Boolean(state.shapes[state.selection.ids[0]]?.groupId)
  const hasClipboard = Boolean(readClipboard())

  const run = (type) => {
    dispatch({ type })
    onClose()
  }

  const pos = clampMenuPos(x, y)

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-30 w-48 rounded-xl border border-line bg-white p-1.5 shadow-lg"
      style={{ left: pos.left, top: pos.top }}
    >
      <button type="button" disabled={!hasShapeSelection} onClick={() => run('COPY_SELECTED')} className={menuItemClass()}>
        <CopyIcon />
        <span>Copy</span>
        <Hint>Ctrl+C</Hint>
      </button>
      <button
        type="button"
        disabled={!hasClipboard}
        onClick={() => {
          dispatch({ type: 'PASTE', clip: readClipboard() })
          onClose()
        }}
        className={menuItemClass()}
      >
        <PasteIcon />
        <span>Paste</span>
        <Hint>Ctrl+V</Hint>
      </button>

      {(canGroup || canUngroup) && <div className="my-1 h-px bg-line" />}

      {canGroup && (
        <button type="button" onClick={() => run('GROUP_SELECTED')} className={menuItemClass()}>
          <GroupIcon />
          <span>Group</span>
          <Hint>Ctrl+G</Hint>
        </button>
      )}
      {canUngroup && (
        <button type="button" onClick={() => run('UNGROUP_SELECTED')} className={menuItemClass()}>
          <UngroupIcon />
          <span>Ungroup</span>
          <Hint>Ctrl+⇧G</Hint>
        </button>
      )}

      <div className="my-1 h-px bg-line" />

      <button type="button" disabled={!hasShapeSelection} onClick={() => run('BRING_TO_FRONT')} className={menuItemClass()}>
        <BringToFrontIcon />
        <span>Bring to front</span>
      </button>
      <button type="button" disabled={!hasShapeSelection} onClick={() => run('SEND_TO_BACK')} className={menuItemClass()}>
        <SendToBackIcon />
        <span>Send to back</span>
      </button>

      <div className="my-1 h-px bg-line" />

      <button type="button" disabled={!hasShapeSelection} onClick={() => run('DELETE_SELECTED')} className={menuItemClass(true)}>
        <TrashIcon />
        <span>Delete</span>
        <Hint>Del</Hint>
      </button>
    </div>,
    document.body,
  )
}

export default EditorContextMenu
