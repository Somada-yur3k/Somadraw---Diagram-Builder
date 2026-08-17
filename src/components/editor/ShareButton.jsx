import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePopoverState } from '../../lib/usePopoverState'
import { useDiagramEditorContext } from './DiagramEditorContext'
import { supabase } from '../../lib/supabaseClient'
import { colorForEmail } from '../../lib/useDiagramChannel'

const SHARE_PANEL_WIDTH = 320 // matches w-80 below

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

// General access's own status icon - globe (public-ish: anyone with the
// link) vs lock (restricted to explicitly-added people), same visual
// language Google Drive/Notion's own share dialogs use for this exact
// on/off state.
function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
      <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8" />
    </svg>
  )
}

// A plain checkbox reads as a form field, not a live on/off preference -
// this is the same "pill with a sliding dot" convention Google Drive/
// Notion/Figma's own share dialogs all use for this exact setting, so it
// reads as an immediate, reversible toggle rather than something to submit.
function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-brand-blue' : 'bg-line'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// Shared by the default-role select (new joiners) and each collaborator's
// own row - same options, same look, so the two selects read as one
// consistent control language rather than two differently-styled dropdowns.
function RoleSelect({ value, onChange, compact }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`rounded-full border border-line bg-white font-medium text-ink transition-colors hover:bg-surface-soft ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]'
      }`}
    >
      <option value="viewer">{compact ? 'Viewer' : 'Can view'}</option>
      <option value="editor">{compact ? 'Editor' : 'Can edit'}</option>
    </select>
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
  const { diagramId, activeUsers, email, name } = useDiagramEditorContext()
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
            className="fixed z-30 w-80 rounded-2xl border border-line bg-white p-4 shadow-lg"
            style={popover.pos}
          >
            <h2 className="text-[14.5px] font-semibold text-ink">Share diagram</h2>

            {/* General access - link sharing on/off plus the default role a
                brand-new joiner gets, grouped in its own card so it reads as
                one setting (icon reflects which of the two states it's
                currently in) rather than a loose checkbox floating above
                everything else. */}
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-line p-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-soft text-soft">
                {shareEnabled ? <GlobeIcon /> : <LockIcon />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink">
                  {shareEnabled ? 'Anyone with the link' : 'Restricted'}
                </p>
                <p className="truncate text-[11px] text-soft">
                  {shareEnabled ? 'Anyone signed in can join' : 'Only people added below'}
                </p>
              </div>
              <ToggleSwitch
                checked={Boolean(shareEnabled)}
                onChange={toggleSharing}
                disabled={shareEnabled === null}
              />
            </div>

            {shareEnabled && (
              <div className="mt-2 flex items-center justify-between gap-3 pl-1">
                <span className="text-[12px] text-soft">New joiners get</span>
                <RoleSelect value={shareRole} onChange={changeDefaultRole} />
              </div>
            )}

            {/* People with access - the owner (this user) always shows first
                and isn't itself editable, then every collaborator who's
                joined so far. Rendered whether or not any have joined yet
                (unlike before, when the whole section - header included -
                only existed once collaborators was a non-empty array), so
                there's always somewhere to look and a real empty/loading
                state instead of the section just not being there. */}
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-soft">
                People with access
              </p>
              <div className="mt-2 max-h-48 space-y-0.5 overflow-y-auto">
                <div className="flex items-center gap-2 rounded-lg px-1 py-1.5">
                  <CollaboratorAvatar email={email} activeUsers={activeUsers} />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink" title={email}>
                    {name || email} <span className="text-soft">(you)</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-soft">Owner</span>
                </div>

                {collaborators === null && (
                  <p className="px-1 py-1.5 text-[12px] text-soft">Loading…</p>
                )}
                {collaborators?.length === 0 && (
                  <p className="px-1 py-1.5 text-[12px] text-soft">
                    No one else has access yet.
                  </p>
                )}
                {collaborators?.map((c) => (
                  <div key={c.id} className="group flex items-center gap-2 rounded-lg px-1 py-1.5">
                    <CollaboratorAvatar email={c.user_email} activeUsers={activeUsers} />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink" title={c.user_email}>
                      {c.user_email}
                    </span>
                    <RoleSelect
                      value={c.role}
                      onChange={(role) => changeCollaboratorRole(c.id, role)}
                      compact
                    />
                    <button
                      type="button"
                      onClick={() => removeCollaborator(c.id)}
                      title="Remove access"
                      aria-label={`Remove ${c.user_email}`}
                      className="shrink-0 rounded p-1 text-soft transition-colors hover:bg-rose-50 hover:text-rose-500"
                    >
                      <RemoveIcon />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={copyLink}
              disabled={!shareEnabled}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-40"
            >
              {copied ? 'Copied!' : (
                <>
                  <LinkIcon />
                  Copy link
                </>
              )}
            </button>
          </div>,
          document.body,
        )}
    </>
  )
}

export default ShareButton
