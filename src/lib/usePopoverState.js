import { useEffect, useState } from 'react'

// Shared open/pos/toggle/close state machine for small trigger buttons that
// open a `position: fixed` panel of choices near them (editor toolbar
// controls, the workspace sidebar's Settings button, etc). Callers render
// the panel itself through a portal to document.body (each site's content
// differs, so that's left to the caller) - floating triggers like these
// often end up nested inside a scrolling or transformed ancestor (a
// collapsed mobile toolbar, a sidebar's own scroll area), and a `fixed`
// descendant of a transformed ancestor stops being viewport-relative per
// the CSS spec, so portalling sidesteps that permanently regardless of
// what ancestor styling exists now or gets added later.
//
// triggerRef/panelRef are passed in rather than created and returned here -
// two separate refs because the portalled panel isn't a DOM descendant of
// the trigger button even though it's a React one, so outside-click
// detection needs to recognize clicks inside either as "not outside." Kept
// out of this hook's own return value on purpose: each caller declares its
// own `useRef()` directly, since eslint's react-hooks/refs rule flags every
// property read off a value threaded back out through a custom hook's
// return once that hook returns a ref from anywhere in its body - including
// harmless reads of unrelated fields like `.open` - so refs and the state
// that merely coordinates them need to stay on separate paths back to the
// component.
//
// computePos is optional and defaults to centering the panel below the
// trigger (every current caller in the editor toolbar wants that) - a
// caller whose trigger sits somewhere a centered-below panel would run off
// the viewport (e.g. a sidebar button near the bottom-left corner) can pass
// its own placement function instead, taking the trigger's rect and
// returning whatever fixed-position style object it needs (left/top,
// left/bottom, clamped to the viewport, etc).
const DEFAULT_COMPUTE_POS = (rect) => ({ left: rect.left + rect.width / 2, top: rect.bottom + 8 })

export function usePopoverState(triggerRef, panelRef, computePos = DEFAULT_COMPUTE_POS) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)

  const close = () => setOpen(false)

  const toggle = (event) => {
    if (open) {
      close()
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    setPos(computePos(rect))
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event) => {
      if (triggerRef.current?.contains(event.target)) return
      if (panelRef.current?.contains(event.target)) return
      close()
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return { open, pos, toggle, close }
}
