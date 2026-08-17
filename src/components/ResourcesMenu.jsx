import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router'
import { usePopoverState } from '../lib/usePopoverState'

function ChevronDownIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

// Documentation (/docs), Help center (/help), and Updates (/updates) are
// all real now. Shared by Navbar.jsx (landing page) and SiteHeader.jsx
// (every other page) so all of them can't drift out of sync with each
// other.
function ResourcesMenu() {
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const { open, pos, toggle, close } = usePopoverState(triggerRef, panelRef, (rect) => ({
    left: rect.left,
    top: rect.bottom + 8,
  }))
  const pathname = useLocation().pathname
  const isOnResourcesPage =
    pathname.startsWith('/docs') || pathname.startsWith('/help') || pathname.startsWith('/updates')

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={`flex items-center gap-1 text-[14.5px] font-medium transition-colors ${
          isOnResourcesPage ? 'text-brand-blue' : 'text-body hover:text-ink'
        }`}
      >
        Resources
        <ChevronDownIcon />
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-60 w-48 rounded-xl border border-line bg-white p-1.5 shadow-lg"
            style={pos}
          >
            <Link
              to="/docs"
              onClick={close}
              className="block rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink transition-colors hover:bg-surface-soft"
            >
              Documentation
            </Link>
            <Link
              to="/help"
              onClick={close}
              className="block rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink transition-colors hover:bg-surface-soft"
            >
              Help center
            </Link>
            <Link
              to="/updates"
              onClick={close}
              className="block rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink transition-colors hover:bg-surface-soft"
            >
              Updates
            </Link>
          </div>,
          document.body,
        )}
    </>
  )
}

export default ResourcesMenu
