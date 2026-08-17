import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePopoverState } from '../../lib/usePopoverState'
import { readRecentColors, addRecentColor } from './recentColors'

// Shown in the floating panel's grid only when there's no recent-colors
// history yet (a fresh browser profile) - the app's own existing brand
// colors plus a handful of common accents, so the grid is never just empty.
const DEFAULT_SWATCHES = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#14b8a6', '#64748b',
]

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

// A swatch button that opens a floating panel: a recent-colors grid (shared
// across every color control in the app - see recentColors.js) plus a
// "Custom color" tile that hands off to the browser's own native picker for
// anything not already in that list. Picking a color, from either the grid
// or the native picker, both applies it (onCommit) and pushes it to the
// shared recents, so the next control opened anywhere else in the app
// already has it too.
//
// Callers should give this a `key` tied to whatever it's editing (e.g. the
// selected shape/arrow's id) - every effect below intentionally uses an
// empty dependency array (see their own comments), which only stays correct
// because switching targets remounts this fresh instead of reusing the same
// instance across two different things it could be committing to.
function ColorPickerButton({ value, onCommit, title, icon, swatchClassName = 'h-8 w-8' }) {
  const [recents, setRecents] = useState(() => readRecentColors())
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const nativeInputRef = useRef(null)
  const popover = usePopoverState(triggerRef, panelRef)

  const openPanel = (event) => {
    setRecents(readRecentColors())
    popover.toggle(event)
  }

  const commit = (color) => {
    onCommit(color)
    setRecents(addRecentColor(color))
    popover.close()
  }

  // Same native-`change`-only commit reasoning as this app's other color
  // inputs (EditorTopbar.jsx): React's onChange fires continuously while
  // the OS picker's own UI is being dragged inside, which would turn one
  // color pick into a dozen-plus recent-color entries/undo checkpoints
  // instead of the one the user actually settled on. Empty deps - see this
  // component's own top comment on why that's safe here.
  useEffect(() => {
    const input = nativeInputRef.current
    if (!input) return
    const handleChange = (event) => commit(event.target.value)
    input.addEventListener('change', handleChange)
    return () => input.removeEventListener('change', handleChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keeps the hidden native input's own starting point in sync with the
  // live value (undo/redo, a collaborator's edit) - it's deliberately
  // uncontrolled (no `value` prop) for the same reason the other color
  // inputs in this app are, see their own comment on that fight with
  // React's input tracking.
  useEffect(() => {
    const input = nativeInputRef.current
    if (!input) return
    input.value = value || '#000000'
  }, [value])

  const palette = recents.length > 0 ? recents : DEFAULT_SWATCHES

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPanel}
        aria-haspopup="true"
        aria-expanded={popover.open}
        title={title}
        aria-label={title}
        className={`relative shrink-0 cursor-pointer overflow-hidden rounded-md border transition-shadow ${swatchClassName} ${
          popover.open ? 'border-ink/50 ring-2 ring-ink/20' : 'border-line'
        }`}
        style={{ backgroundColor: value || undefined }}
      >
        {icon}
      </button>

      <input
        ref={nativeInputRef}
        type="color"
        defaultValue={value || '#000000'}
        title={title}
        aria-label={title}
        tabIndex={-1}
        className="sr-only"
      />

      {popover.open &&
        popover.pos &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-30 w-56 rounded-2xl border border-line bg-white p-3 shadow-xl"
            style={popover.pos}
          >
            <span className="text-[12px] font-semibold text-ink">
              {recents.length > 0 ? 'Recent colors' : 'Colors'}
            </span>
            <div className="mt-2.5 grid grid-cols-6 gap-2">
              {palette.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => commit(color)}
                  title={color}
                  aria-label={color}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-line/60 shadow-sm transition-transform hover:scale-110"
                  style={{ backgroundColor: color }}
                >
                  {value && value.toLowerCase() === color.toLowerCase() && <CheckIcon />}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                popover.close()
                nativeInputRef.current?.click()
              }}
              className="mt-3 flex w-full items-center gap-2.5 rounded-xl border border-dashed border-line px-2.5 py-2 text-left text-[12.5px] font-medium text-body transition-colors hover:border-ink/40 hover:bg-surface-soft hover:text-ink"
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-white"
                style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
              >
                <PlusIcon />
              </span>
              Custom color…
            </button>
          </div>,
          document.body,
        )}
    </>
  )
}

export default ColorPickerButton
