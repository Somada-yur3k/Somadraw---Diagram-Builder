import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabaseClient'
import { getDisplayUser } from '../lib/userDisplay'
import { formatRemaining } from '../lib/timeFormat'
import { OWNER_EMAIL } from '../lib/ownerEmail'
import { SHORTCUT_GROUPS } from '../lib/shortcuts'

const MAX_USERNAME_LENGTH = 24
const COOLDOWN_MS = 60 * 60 * 1000
// Matches the errcode the feedback_rate_limit() Postgres trigger raises
// (see supabase/schema.sql) - a distinct SQLSTATE rather than matching
// exception text, so this stays correct even if the trigger's message
// wording changes later.
const RATE_LIMIT_ERRCODE = 'RL001'

// Same glyph DashboardSidebar.jsx's own (now-removed) settings menu used for
// this - kept as a local copy here, this codebase's own established
// convention for a shared glyph used in two unrelated files (see e.g.
// EditorTopbar.jsx/EditorContextMenu.jsx's duplicated Group/Ungroup icons).
function ProfileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  )
}

function MonitorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}

function ManageAccountIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3Z" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  )
}

function KeyboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 13h6" />
    </svg>
  )
}

function StarIcon({ filled }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="m12 2.5 2.9 6.34 6.85.72-5.1 4.86 1.4 6.98L12 17.9l-6.05 3.5 1.4-6.98-5.1-4.86 6.85-.72Z" />
    </svg>
  )
}

function NavItem({ active, onClick, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-left text-[13.5px] font-medium transition-colors sm:w-full ${
        active
          ? 'bg-brand-blue text-white'
          : 'text-body hover:bg-surface-soft hover:text-ink'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

// Optional (see rating's own column comment in schema.sql) - clicking the
// star already marking the current rating clears it back to "not rated"
// (0) rather than being stuck once set, same reasoning most star-rating
// widgets support a clear/undo gesture. Hover previews the value a click
// would commit without actually changing `value` until it does.
function StarRating({ value, onChange, disabled }) {
  const [hovered, setHovered] = useState(0)
  const display = hovered || value

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onMouseEnter={() => setHovered(star)}
          onClick={() => onChange(value === star ? 0 : star)}
          title={`${star} star${star === 1 ? '' : 's'}`}
          aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
          aria-pressed={value === star}
          className={`transition-transform hover:scale-110 disabled:pointer-events-none disabled:opacity-60 ${
            star <= display ? 'text-amber-400' : 'text-line'
          }`}
        >
          <StarIcon filled={star <= display} />
        </button>
      ))}
    </div>
  )
}

function FeedbackSection({ user }) {
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(0)
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  // Timestamp (ms) the user can next submit at, or null if unknown/clear.
  // Seeded from their last real submission (fetched on mount) so the
  // cooldown survives a reload, not just re-submits within one visit.
  const [cooldownUntil, setCooldownUntil] = useState(null)
  // "Current time," but only ever updated from the tick callback below,
  // never read directly from Date.now() during render - that's an impure
  // call React's own rules disallow in a component body. remainingMs is
  // derived from this plus cooldownUntil rather than being its own state,
  // so there's nothing to synchronously reset when cooldownUntil clears.
  const [now, setNow] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('feedback')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (cancelled || error || !data?.[0]) return
        const until = new Date(data[0].created_at).getTime() + COOLDOWN_MS
        if (until > Date.now()) setCooldownUntil(until)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!cooldownUntil) return
    // Recursive setTimeout (not setInterval) so the countdown naturally
    // stops rescheduling once it reaches zero, instead of a timer quietly
    // ticking forever in the background for as long as this modal stays
    // open. Cadence is coarse (15s) until the final minute, since
    // formatRemaining only has minute-level granularity until then - no
    // point re-rendering every second for an hour to produce ~60 visible
    // text changes.
    let timeoutId
    const tick = () => {
      const nowValue = Date.now()
      setNow(nowValue)
      const remaining = cooldownUntil - nowValue
      if (remaining <= 0) return
      timeoutId = setTimeout(tick, remaining > 60_000 ? 15_000 : 1000)
    }
    timeoutId = setTimeout(tick, 0)
    return () => clearTimeout(timeoutId)
  }, [cooldownUntil])

  const remainingMs = cooldownUntil ? Math.max(0, cooldownUntil - now) : 0
  const onCooldown = remainingMs > 0

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || !user || onCooldown) return

    setStatus('sending')
    // No `type` field sent - the column still exists (schema.sql) and
    // defaults to 'suggestion' on its own, now that there's no bug/
    // suggestion toggle here to actually choose one.
    const { error } = await supabase
      .from('feedback')
      .insert({ email: user.email, message: trimmed, rating: rating || null })

    if (error) {
      setStatus(error.code === RATE_LIMIT_ERRCODE ? 'idle' : 'error')
      if (error.code === RATE_LIMIT_ERRCODE) setCooldownUntil(Date.now() + COOLDOWN_MS)
      return
    }
    setMessage('')
    setRating(0)
    setStatus('sent')
    setCooldownUntil(Date.now() + COOLDOWN_MS)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 rounded-2xl bg-surface-soft/40 p-5">
      <h3 className="text-[14px] font-semibold text-ink">Feedback</h3>
      <p className="mt-1 text-[12px] text-soft">
        Share your thoughts - it goes straight to the developer. Limited to
        one message per hour.
      </p>

      <textarea
        value={message}
        onChange={(event) => {
          setMessage(event.target.value)
          if (status === 'sent' || status === 'error') setStatus('idle')
        }}
        disabled={onCooldown}
        placeholder="What should we improve in Somadraw?"
        rows={4}
        className="mt-3 w-full resize-none rounded-xl border border-line bg-white px-3.5 py-3 text-[12.5px] text-ink outline-none placeholder:text-soft disabled:opacity-60"
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <StarRating value={rating} onChange={setRating} disabled={onCooldown} />
        <button
          type="submit"
          disabled={!message.trim() || status === 'sending' || onCooldown}
          className="rounded-lg bg-brand-blue px-3.5 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending…' : 'Send feedback'}
        </button>
      </div>

      <div className="mt-2">
        {status === 'sent' ? (
          <span className="text-[12px] font-medium text-emerald-600">
            Thanks — your feedback was sent.
          </span>
        ) : onCooldown ? (
          <span className="text-[12px] font-medium text-soft">
            You can send again in {formatRemaining(remainingMs)}.
          </span>
        ) : (
          status === 'error' && (
            <span className="text-[12px] font-medium text-rose-600">
              Couldn't send that. Try again?
            </span>
          )
        )}
      </div>
    </form>
  )
}

// Full Name/Email/Password/Danger Zone + large avatar - a heavier layout
// than this used to have, matching a reference image the actual request
// asked to copy the style of. A few fields there don't map onto anything
// real this app has, so each got an honest call instead of a fake control
// that would look functional but silently do nothing:
//  - "Full Name" -> this app only ever had a self-chosen display name
//    (shown to collaborators, not your legal/Google name), so that's what's
//    actually editable here, labeled for what it is.
//  - Email's "Change" link -> dropped, not just disabled. Auth is
//    Google-OAuth-only, so the email is always whatever Google account you
//    signed in with - there's nothing to independently change, now or
//    later, unless this app grows other auth providers entirely.
//  - Photo upload -> not offered at all (not even disabled) - there's no
//    photo storage backend, and the avatar shown is always whatever
//    picture the linked Google account already has, same reasoning email
//    has no "Change" link.
//  - "Delete Account" -> real, self-service deletion via the
//    delete_own_account() RPC (see supabase/schema.sql) - security
//    definer lets a plain client call reach auth.users without this
//    client-side app ever needing the service-role key that would
//    otherwise require.
// The old Developer page's "about the creator" blurb + feedback form still
// live here too, further down - see SettingsModal's own comment on why
// they were folded in rather than kept on a separate nav slot.
function ProfileTab({ user }) {
  const { name, email, picture, username } = getDisplayUser(user)
  const [value, setValue] = useState(username)
  const [status, setStatus] = useState('idle') // idle | saving | error | saved

  // Same updateUser shape as UsernamePrompt.jsx's one-time modal - this is
  // the "change it later" half of that feature (see userDisplay.js's own
  // comment on the priority chain both feed).
  const handleSave = async (event) => {
    event.preventDefault()
    const trimmed = value.trim().slice(0, MAX_USERNAME_LENGTH)
    if (!trimmed || trimmed === username) return
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
    setStatus('saved')
  }

  return (
    <div className="grid gap-6 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="max-w-md">
        <h2 className="sr-only">Profile</h2>

        <form onSubmit={handleSave}>
          <label htmlFor="settings-display-name" className="block text-[13px] font-medium text-ink">
            Display name
          </label>
          <p className="mt-0.5 text-[11.5px] text-soft">
            Shown to collaborators instead of your email, e.g. {name || 'there'}.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="settings-display-name"
              value={value}
              onChange={(event) => {
                setValue(event.target.value)
                if (status !== 'idle') setStatus('idle')
              }}
              maxLength={MAX_USERNAME_LENGTH}
              placeholder="e.g. Eurika"
              className="w-full rounded-lg border border-line bg-surface-soft px-3 py-2 text-[13.5px] text-ink outline-none placeholder:text-soft focus:border-brand-blue/40"
            />
            <button
              type="submit"
              disabled={!value.trim() || value.trim() === username || status === 'saving'}
              className="shrink-0 rounded-lg bg-brand-blue px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {status === 'saving' ? '…' : 'Save'}
            </button>
          </div>
          {status === 'error' && (
            <p className="mt-1.5 text-[12px] font-medium text-rose-600">Couldn't save that. Try again?</p>
          )}
          {status === 'saved' && <p className="mt-1.5 text-[12px] font-medium text-emerald-600">Saved.</p>}
        </form>

        <div className="mt-6">
          <p className="text-[13px] font-medium text-ink">Email</p>
          <p className="mt-1.5 text-[13.5px] text-ink">{email}</p>
          <p className="mt-0.5 text-[11.5px] text-soft">Synced from your Google account.</p>
        </div>

        <div className="mt-6">
          <p className="text-[13px] font-medium text-ink">Password</p>
          <p className="mt-1.5 text-[13.5px] text-soft">Managed by Google</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        {picture ? (
          <img
            src={picture}
            alt=""
            referrerPolicy="no-referrer"
            className="h-32 w-32 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-32 w-32 items-center justify-center rounded-full bg-brand-blue text-[32px] font-semibold text-white">
            {name[0]?.toUpperCase()}
          </span>
        )}
        <p className="text-[11.5px] text-soft">Synced from your Google account.</p>
      </div>
    </div>
  )
}

// Same shape as DashboardSidebar's own SignOutConfirmDialog (identity chip
// + full-width stacked buttons), but styled as an actual danger action
// (rose primary button, not black) since unlike signing out, this really
// can't be undone - it wipes the account and everything owned by it.
function DeleteAccountConfirmDialog({ user, deleting, failed, onCancel, onConfirm }) {
  const { name, email, picture } = getDisplayUser(user)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !deleting) onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, deleting])

  return createPortal(
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-ink/30 px-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !deleting) onCancel()
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
        <div className="flex items-center gap-2.5">
          {picture ? (
            <img
              src={picture}
              alt=""
              referrerPolicy="no-referrer"
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-[12px] font-semibold text-white">
              {name[0]?.toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium text-ink">{name}</p>
            <p className="truncate text-[11.5px] text-soft">{email}</p>
          </div>
        </div>

        <h2 className="mt-4 text-[14px] font-semibold text-rose-600">Delete your account?</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-soft">
          This permanently deletes your account and every diagram you own. This can't be undone.
        </p>
        {failed && (
          <p className="mt-2 text-[12px] font-medium text-rose-600">Couldn't delete your account. Try again?</p>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="w-full rounded-lg bg-rose-600 px-3 py-2 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : 'Delete my account'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="w-full rounded-lg border border-line px-3 py-2 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-soft disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// Account-level actions, split out from ProfileTab (which is just identity
// fields now) so a red "this is dangerous" box doesn't sit directly under
// a routine name/email form - same reasoning most settings UIs (GitHub,
// Vercel) give destructive account actions their own section rather than
// tucking them under Profile.
function ManageAccountTab({ user }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [failed, setFailed] = useState(false)

  // delete_own_account() (see supabase/schema.sql) is scoped to auth.uid()
  // only, so this can never touch anyone but the caller. Its "on delete
  // cascade" FKs mean this one call already removes every diagram,
  // feedback row, and collaborator/star entry this account owns - nothing
  // left to separately clean up client-side.
  const handleConfirmDelete = async () => {
    setDeleting(true)
    setFailed(false)
    const { error } = await supabase.rpc('delete_own_account')
    if (error) {
      console.error('Failed to delete account:', error)
      setFailed(true)
      setDeleting(false)
      return
    }
    // App.jsx's own onAuthStateChange listener redirects away from here
    // the moment this resolves - nothing left to do locally.
    await supabase.auth.signOut()
  }

  return (
    <div className="max-w-md">
      <h2 className="text-[15px] font-semibold text-ink">Manage Account</h2>
      <p className="mt-1 text-[12.5px] text-soft">
        Account-level actions - proceed with caution.
      </p>

      <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
        <p className="text-[13px] font-semibold text-rose-600">Danger Zone</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-rose-600/80">
          Proceed with caution, once completed, these actions cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 rounded-lg border border-line bg-white px-3.5 py-2 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-soft"
        >
          Delete Account
        </button>
      </div>

      {confirming && (
        <DeleteAccountConfirmDialog
          user={user}
          deleting={deleting}
          failed={failed}
          onCancel={() => {
            setConfirming(false)
            setFailed(false)
          }}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  )
}

// Titles kept word-for-word from Features.jsx's own landing-page copy
// rather than re-describing them here, so this list can't quietly drift
// out of sync with what the marketing page actually says Somadraw does.
const FEATURES = [
  'Real-time collaboration',
  'Seven diagram types, one canvas',
  'Spacious pan & zoom canvas',
  'Full creative control',
  'Personal, autosaved workspace',
  'PDF export',
]

// Dark mode is genuinely on the roadmap, not an independent wishlist -
// account deletion used to be listed here too, until ManageAccountTab's
// delete_own_account() RPC made it real rather than a promise. Profile
// photo upload was dropped entirely rather than kept as a future promise,
// since avatars are and will stay synced from Google.
const UPCOMING_FEATURES = ['Dark mode']

function FeatureCheckIcon() {
  return (
    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  )
}

// The old Developer page's "about the creator" blurb + feedback form, kept
// as their own tab (rather than folded into Profile) now that Profile and
// Manage Account each need their own room to breathe.
function AboutTab({ user }) {
  return (
    <div>
      <div className="max-w-lg">
        <h2 className="text-[15px] font-semibold text-ink">About Somadraw</h2>
        <p className="mt-1 text-[12.5px] text-soft">
          A quick look at what's here today, and what's coming next.
        </p>

        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-soft">Features</p>
          <ul className="mt-2.5 space-y-2">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <FeatureCheckIcon />
                <span className="text-[13px] text-ink">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-soft">Upcoming features</p>
          <ul className="mt-2.5 space-y-2">
            {UPCOMING_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-line" />
                <span className="text-[13px] text-soft">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Not wrapped in the max-w-lg above - the feedback textarea reads
          better spanning the full content pane width, especially now that
          the modal itself is wider (see SettingsModal's own max-w-5xl). */}
      <FeedbackSection user={user} />

      <p className="mt-6 text-center text-[12px] italic text-soft">— Developed by Eurika Adamos</p>
    </div>
  )
}

function Kbd({ children }) {
  return (
    <kbd className="rounded-md border border-line bg-surface-soft px-1.5 py-0.5 text-[11px] font-medium text-ink">
      {children}
    </kbd>
  )
}

function ShortcutsTab() {
  return (
    <div>
      <h2 className="text-[15px] font-semibold text-ink">Keyboard Shortcuts</h2>
      <p className="mt-1 text-[12.5px] text-soft">Every shortcut available inside a diagram.</p>

      <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-2">
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-soft">{group.title}</p>
            <ul className="mt-2.5 space-y-2">
              {group.shortcuts.map((shortcut) => (
                <li key={shortcut.label} className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-ink">{shortcut.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {shortcut.keys.map((key, index) => (
                      <span key={key} className="flex items-center gap-1">
                        {index > 0 && <span className="text-[11px] text-soft">+</span>}
                        <Kbd>{key}</Kbd>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

// A floating container (not a page) - Escape/clicking the backdrop/the
// header's Close button all close it, same conventions
// DashboardSidebar.jsx's own Delete/Leave/Sign-out confirm dialogs already
// use. Replaces what used to be two separate routes (/workspace/settings,
// /workspace/developer) with two tabs of one modal instead - see
// ProfileTab's own comment on why their content is merged rather than each
// keeping a dedicated nav slot.
function SettingsModal({ user, onClose }) {
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-ink/30 p-3 sm:p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="flex h-[min(700px,88vh)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl sm:max-w-5xl">
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4 sm:px-8 sm:py-6">
          <h1 className="text-[19px] font-bold text-ink sm:text-[21px]">Settings</h1>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface-soft"
          >
            Close
            <span className="rounded border border-line bg-surface-soft px-1.5 py-0.5 text-[10.5px] font-medium text-soft">
              Esc
            </span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line p-3 sm:w-60 sm:flex-col sm:items-stretch sm:overflow-y-auto sm:overflow-x-visible sm:border-b-0 sm:border-r sm:p-5">
            <p className="hidden px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-soft sm:block">
              Personal
            </p>
            <NavItem active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<ProfileIcon />}>
              Profile
            </NavItem>
            <NavItem
              active={activeTab === 'manage-account'}
              onClick={() => setActiveTab('manage-account')}
              icon={<ManageAccountIcon />}
            >
              Manage Account
            </NavItem>
            <NavItem
              active={activeTab === 'shortcuts'}
              onClick={() => setActiveTab('shortcuts')}
              icon={<KeyboardIcon />}
            >
              Keyboard Shortcuts
            </NavItem>
            <NavItem active={activeTab === 'about'} onClick={() => setActiveTab('about')} icon={<InfoIcon />}>
              About Somadraw
            </NavItem>

            {user?.email === OWNER_EMAIL && (
              <>
                <p className="hidden px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-soft sm:mt-4 sm:block">
                  Admin
                </p>
                {/* A real cross-page link, not a tab - /monitor is its own
                    standalone page/bundle (monitor.html), not a route inside
                    this app's own <Routes>, so getting there needs an actual
                    page load. New tab so leaving it open doesn't lose
                    whatever diagram was open here. */}
                <a
                  href="/monitor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-left text-[13.5px] font-medium text-body transition-colors hover:bg-surface-soft hover:text-ink sm:w-full"
                >
                  <MonitorIcon />
                  Monitor Users
                </a>
              </>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10">
            {activeTab === 'profile' && <ProfileTab user={user} />}
            {activeTab === 'manage-account' && <ManageAccountTab user={user} />}
            {activeTab === 'shortcuts' && <ShortcutsTab />}
            {activeTab === 'about' && <AboutTab user={user} />}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default SettingsModal
