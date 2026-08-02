import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabaseClient'
import { getDisplayUser } from '../lib/userDisplay'
import { usePopoverState } from '../lib/usePopoverState'

const MAX_LENGTH = 24

function EditIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </svg>
  )
}

// Left-aligned under the trigger rather than usePopoverState's own default
// centered-below placement - this trigger sits inside a narrow identity
// block near the left edge of the page, where a centered panel could run
// close to (or past) the left edge of the viewport.
function computePopoverPos(rect) {
  return { left: rect.left, top: rect.bottom + 8 }
}

function SettingsView({ user }) {
  const { name, email, picture, username } = getDisplayUser(user)
  const [value, setValue] = useState(username)
  const [status, setStatus] = useState('idle') // idle | saving | error

  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const popover = usePopoverState(triggerRef, panelRef, computePopoverPos)

  // Same updateUser shape as UsernamePrompt.jsx's one-time modal - this is
  // the "change it later" half of that feature (see userDisplay.js's own
  // comment on the priority chain both feed).
  const handleSave = async (event) => {
    event.preventDefault()
    const trimmed = value.trim().slice(0, MAX_LENGTH)
    if (!trimmed || trimmed === username) {
      popover.close()
      return
    }
    setStatus('saving')
    const { error } = await supabase.auth.updateUser({ data: { username: trimmed } })
    if (error) {
      // The on-screen message is deliberately generic - this is what
      // actually says why, since Supabase's own error text/status is
      // usually specific enough to act on (expired session, rate limit,
      // a project-side Auth setting blocking it, etc).
      console.error('Failed to save username:', error)
      setStatus('error')
      return
    }
    setStatus('idle')
    popover.close()
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-16">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="text-lg font-semibold tracking-tight text-ink">Account Info</h1>
        <p className="mt-1 text-[12.5px] text-soft">
          Manage your account details.
        </p>

        <div className="mt-6">
          <div className="flex items-center gap-3">
            {picture ? (
              <img
                src={picture}
                alt=""
                referrerPolicy="no-referrer"
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="gradient-bg flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold text-white">
                {name[0]?.toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-ink">{name}</p>
              <p className="truncate text-[12px] text-soft">{email}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <p className="truncate text-[12px] text-soft">
                  {username || 'No username set'}
                </p>
                <button
                  ref={triggerRef}
                  type="button"
                  onClick={(event) => {
                    // Discards any unsaved draft from a previous open -
                    // otherwise closing without saving, then reopening,
                    // would show stale typed text instead of the actual
                    // current username.
                    setValue(username)
                    setStatus('idle')
                    popover.toggle(event)
                  }}
                  title="Edit username"
                  aria-label="Edit username"
                  aria-haspopup="true"
                  aria-expanded={popover.open}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-soft transition-colors hover:bg-surface-soft hover:text-ink"
                >
                  <EditIcon />
                </button>
              </div>
            </div>
          </div>
        </div>

        {popover.open &&
          popover.pos &&
          createPortal(
            <form
              ref={panelRef}
              onSubmit={handleSave}
              className="fixed z-60 w-64 rounded-xl border border-line bg-white p-3 shadow-lg"
              style={popover.pos}
            >
              <p className="text-[11.5px] font-medium text-ink">Username</p>
              <p className="mt-0.5 text-[11px] text-soft">
                Shown to collaborators instead of your email.
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  autoFocus
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value)
                    if (status === 'error') setStatus('idle')
                  }}
                  maxLength={MAX_LENGTH}
                  placeholder="e.g. Eurika"
                  className="w-full rounded-lg border border-line bg-surface-soft px-2.5 py-1.5 text-[12.5px] text-ink outline-none placeholder:text-soft"
                />
                <button
                  type="submit"
                  disabled={!value.trim() || value.trim() === username || status === 'saving'}
                  className="shrink-0 rounded-lg bg-brand-purple px-2.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-brand-purple/90 disabled:opacity-50"
                >
                  {status === 'saving' ? '…' : 'Save'}
                </button>
              </div>
              {status === 'error' && (
                <p className="mt-1.5 text-[11px] font-medium text-rose-600">
                  Couldn't save that. Try again?
                </p>
              )}
            </form>,
            document.body,
          )}

        <p className="mt-6 text-[12px] text-soft">
          More settings are on the way.
        </p>
      </div>
    </div>
  )
}

export default SettingsView
