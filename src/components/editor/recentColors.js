// localStorage (not any diagram's own state) - shared across every color
// control in the app and every diagram/tab, the same "shared cross-tab
// slot" approach useDiagramEditor.js's own CLIPBOARD_STORAGE_KEY already
// uses, for the same reason: picking a color while formatting an arrow in
// one diagram should make that color available immediately in a totally
// different diagram's Fill swatch too, not just this one's.
const RECENT_COLORS_KEY = 'somadraw:recentColors'
const MAX_RECENT_COLORS = 12

export function readRecentColors() {
  try {
    const raw = localStorage.getItem(RECENT_COLORS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Moves `color` to the front (deduping a re-pick of something already in
// the list rather than showing it twice), capped at MAX_RECENT_COLORS so
// this can't grow forever. Returns the new list so callers can update their
// own on-screen copy immediately instead of reading localStorage straight
// back out again.
export function addRecentColor(color) {
  if (!color) return readRecentColors()
  const current = readRecentColors().filter((c) => c.toLowerCase() !== color.toLowerCase())
  const next = [color, ...current].slice(0, MAX_RECENT_COLORS)
  try {
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(next))
  } catch {
    // Ignored, same as CLIPBOARD_STORAGE_KEY's own precedent - worst case
    // recents just don't persist this session (private browsing, full
    // storage quota, etc.), never a reason to break color picking itself.
  }
  return next
}
