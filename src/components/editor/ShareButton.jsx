import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePopoverState } from '../../lib/usePopoverState'
import { useDiagramEditorContext } from './DiagramEditorContext'
import { supabase } from '../../lib/supabaseClient'
import { colorForEmail } from '../../lib/useDiagramChannel'

const SHARE_PANEL_WIDTH = 288 // matches w-72 below

// Right-aligned above the trigger (not the shared default centered-below
// placement every other editor popover uses) - this trigger sits at the
// bottom-right corner of the screen, so a centered or downward panel would
// run off the edge.
function computeSharePos(rect) {
  return {
    left: Math.max(16, rect.right - SHARE_PANEL_WIDTH),
    bottom: window.innerHeight - rect.top + 8,
  }
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="10.6" x2="15.4" y2="6.4" />
      <line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
    </svg>
  )
}

function RemoveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// Owner-only. Link sharing on/off, a default role for new joiners, the live
// list of who has joined (each individually promotable/demotable and
// removable), and copy-link. No new schema needed here - stage 1 already
// created diagram_collaborators plus the owner-scoped RLS policies this
// relies on (view/update role/remove); this stage is purely wiring a UI onto
// what was already migrated.
// A collaborator who's currently online lends their live presence picture
// (if they have one) to their row here - the persisted collaborator list
// itself only ever stores an email (see schema.sql's diagram_collaborators),
// never a photo, so this is the only way this list can show a real one
// rather than falling back to an initial every time.
function CollaboratorAvatar({ email, activeUsers }) {
  const picture = activeUsers?.find((u) => u.email === email)?.picture
  return (
    <div
      className="h-5 w-5 shrink-0 overflow-hidden rounded-full"
      style={{ backgroundColor: picture ? undefined : colorForEmail(email) }}
    >
      {picture ? (
        <img src={picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-white">
          {email[0]?.toUpperCase()}
        </span>
      )}
    </div>
  )
}

function ShareButton() {
  const { diagramId, activeUsers } = useDiagramEditorContext()
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const popover = usePopoverState(triggerRef, panelRef, computeSharePos)
  // null = not fetched yet (only happens lazily, on first open - the owner
  // views their own diagram far more often than they open this panel, so
  // there's no reason to fetch this on every single page load).
  const [shareEnabled, setShareEnabled] = useState(null)
  const [shareRole, setShareRole] = useState('viewer')
  const [collaborators, setCollaborators] = useState(null)
  const [copied, setCopied] = useState(false)

  const openPopover = (event) => {
    popover.toggle(event)
    if (shareEnabled === null) {
      supabase
        .from('diagrams')
        .select('share_enabled, share_role')
        .eq('id', diagramId)
        .maybeSingle()
        .then(({ data }) => {
          setShareEnabled(Boolean(data?.share_enabled))
          setShareRole(data?.share_role ?? 'viewer')
        })
      supabase
        .from('diagram_collaborators')
        .select('id, user_email, role')
        .eq('diagram_id', diagramId)
        .order('created_at')
        .then(({ data }) => setCollaborators(data ?? []))
    }
  }

  const toggleSharing = async () => {
    const next = !shareEnabled
    // Optimistic - this checkbox is the only writer of this field, so
    // there's nothing else that could race it.
    setShareEnabled(next)
    await supabase.from('diagrams').update({ share_enabled: next }).eq('id', diagramId)
  }

  const changeDefaultRole = async (role) => {
    setShareRole(role)
    await supabase.from('diagrams').update({ share_role: role }).eq('id', diagramId)
  }

  const changeCollaboratorRole = async (collaboratorId, role) => {
    setCollaborators((current) =>
      current.map((c) => (c.id === collaboratorId ? { ...c, role } : c)),
    )
    await supabase.from('diagram_collaborators').update({ role }).eq('id', collaboratorId)
  }

  const removeCollaborator = async (collaboratorId) => {
    setCollaborators((current) => current.filter((c) => c.id !== collaboratorId))
    await supabase.from('diagram_collaborators').delete().eq('id', collaboratorId)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/workspace/${diagramId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPopover}
        aria-haspopup="true"
        aria-expanded={popover.open}
        className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[13px] font-medium text-ink shadow-md transition-colors hover:bg-surface-soft"
      >
        <ShareIcon />
        Share
      </button>

      {popover.open &&
        popover.pos &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-30 w-72 rounded-2xl border border-line bg-white p-4 shadow-lg"
            style={popover.pos}
          >
            <label className="flex items-center justify-between gap-3">
              <span className="text-[13.5px] font-medium text-ink">
                Anyone with the link can access
              </span>
              <input
                type="checkbox"
                checked={Boolean(shareEnabled)}
                onChange={toggleSharing}
                disabled={shareEnabled === null}
                className="h-4 w-4 shrink-0 accent-brand-purple"
              />
            </label>

            {shareEnabled && (
              <div className="mt-2.5 flex items-center justify-between gap-3">
                <span className="text-[12px] text-soft">New joiners get</span>
                <select
                  value={shareRole}
                  onChange={(event) => changeDefaultRole(event.target.value)}
                  className="rounded-md border border-line bg-white px-2 py-1 text-[12px] text-ink"
                >
                  <option value="viewer">View access</option>
                  <option value="editor">Edit access</option>
                </select>
              </div>
            )}

            <p className="mt-1.5 text-[12px] text-soft">
              Anyone signed in who opens the link joins with that access
              level.
            </p>

            {collaborators && collaborators.length > 0 && (
              <div className="mt-3 max-h-40 space-y-1 overflow-y-auto border-t border-line pt-2.5">
                {collaborators.map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5">
                    <CollaboratorAvatar email={c.user_email} activeUsers={activeUsers} />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-ink" title={c.user_email}>
                      {c.user_email}
                    </span>
                    <select
                      value={c.role}
                      onChange={(event) => changeCollaboratorRole(c.id, event.target.value)}
                      className="rounded-md border border-line bg-white px-1.5 py-0.5 text-[11px] text-ink"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeCollaborator(c.id)}
                      aria-label={`Remove ${c.user_email}`}
                      className="shrink-0 rounded p-1 text-soft transition-colors hover:bg-surface-soft hover:text-ink"
                    >
                      <RemoveIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={copyLink}
              disabled={!shareEnabled}
              className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-40"
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>,
          document.body,
        )}
    </>
  )
}

export default ShareButton
