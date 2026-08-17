import { useState } from 'react'
import { Link } from 'react-router'
import { UPDATE_BADGE_LABEL, UPDATE_BADGE_STYLE, useAnnouncements } from '../lib/updates'

const STORAGE_KEY = 'somadraw-dismissed-update'

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

// useAnnouncements() returns newest-first, so [0] is always the latest -
// dismissing it is keyed on that entry's own title, not just "dismissed:
// true", so a NEWER update automatically reappears once one ships, without
// needing to touch this component or clear anything by hand.
function readDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

// Only the current latest "new diagram type" announcement gets a "Try it
// now" shortcut straight into the editor - matched by title since
// announcements has no diagram-type column of its own. Anything else (a
// fix, an improvement, or a future announcement not about a new diagram
// type) falls back to the plain "See what's new" link to /updates.
const TRY_IT_TITLE = 'System Architecture & Network diagrams'

function AnnouncementBanner({ onTryDiagramType }) {
  const { announcements } = useAnnouncements()
  const latest = announcements[0]
  const [dismissedTitle, setDismissedTitle] = useState(readDismissed)

  if (!latest || dismissedTitle === latest.title) return null

  const canTryIt = latest.title === TRY_IT_TITLE && Boolean(onTryDiagramType)

  const handleDismiss = () => {
    setDismissedTitle(latest.title)
    try {
      localStorage.setItem(STORAGE_KEY, latest.title)
    } catch {
      // Ignored - worst case this reappears next visit, same as never
      // having been dismissed at all.
    }
  }

  return (
    <div className="flex w-full max-w-lg items-center gap-3 rounded-xl border border-brand-blue/20 bg-brand-blue/5 px-4 py-3 text-left">
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${UPDATE_BADGE_STYLE[latest.type]}`}>
        {UPDATE_BADGE_LABEL[latest.type]}
      </span>
      <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{latest.title}</p>
      {canTryIt ? (
        <button
          type="button"
          onClick={onTryDiagramType}
          className="shrink-0 text-[13px] font-medium text-brand-blue hover:underline"
        >
          Try it now
        </button>
      ) : (
        <Link
          to="/updates"
          className="shrink-0 text-[13px] font-medium text-brand-blue hover:underline"
        >
          See what's new
        </Link>
      )}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-soft transition-colors hover:text-ink"
      >
        <CloseIcon />
      </button>
    </div>
  )
}

export default AnnouncementBanner
