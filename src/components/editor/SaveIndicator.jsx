// Floating autosave status, bottom-left of the canvas - mirrors
// ActiveUsersStack/ShareButton's own "fixed corner pill" placement
// (Editor.jsx renders those bottom-right, this one bottom-left) rather than
// sitting inline in EditorTopbar the way it used to, so it stays visible
// and in the same spot regardless of which topbar tab/tool is active.
// Deliberately silent for 'saved' and 'idle' - a permanent "Saved" label is
// just noise once autosave is the norm; only surface state that needs
// attention (in progress, or failed).
function SaveIndicator({ status }) {
  if (status !== 'saving' && status !== 'error') return null

  const isSaving = status === 'saving'

  return (
    <div
      className={`flex h-9 items-center gap-2 rounded-full border bg-white px-3.5 text-[13px] font-medium shadow-md ${
        isSaving ? 'border-line text-soft' : 'border-rose-200 text-rose-600'
      }`}
    >
      {isSaving ? (
        <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-brand-blue/25 border-t-brand-blue" />
      ) : (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600" />
      )}
      {isSaving ? 'Saving…' : 'Save failed'}
    </div>
  )
}

export default SaveIndicator
