import { useEffect, useState } from 'react'
import somadrawLogo from '../assets/SomadrawLogo.png'
import { supabase } from '../lib/supabaseClient'
import { OWNER_EMAIL } from '../lib/ownerEmail'
import { formatElapsed } from '../lib/timeFormat'
import { useOnlineUsers } from '../lib/usePresence'
import LoadingScreen from './LoadingScreen'

// This page is deliberately its own standalone HTML entry (monitor.html /
// src/monitor-main.jsx), not a route inside App.jsx's own <Routes> - so
// unlike the old MonitorUsersView it used to be, it can't lean on
// Dashboard's session-check/Outlet context for `user`/`onlineUsers`. It
// does that work itself instead (same supabase.auth.getSession()/
// onAuthStateChange pattern App.jsx uses, and useOnlineUsers directly
// rather than reading it back out of a context nobody here provides).

function PageHeader() {
  return (
    <header className="flex items-center justify-between border-b border-line px-6 py-4">
      <a href="/" className="flex items-center gap-2">
        <img src={somadrawLogo} alt="Somadraw" className="h-7 w-7 object-contain" />
        <span className="text-[14px] font-semibold tracking-tight text-ink">Somadraw · Monitor</span>
      </a>
      <a href="/workspace" className="text-[12.5px] font-medium text-brand-purple hover:underline">
        Back to app
      </a>
    </header>
  )
}

function SignedOutState({ onSignIn, isSigningIn }) {
  return (
    <div className="min-h-screen bg-white">
      <PageHeader />
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <p className="text-[14px] text-soft">Sign in as the site owner to view this page.</p>
        <button
          type="button"
          onClick={onSignIn}
          disabled={isSigningIn}
          className="rounded-full bg-brand-purple px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-purple/90 disabled:opacity-60"
        >
          {isSigningIn ? 'Signing in…' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  )
}

function NotOwnerState({ email }) {
  return (
    <div className="min-h-screen bg-white">
      <PageHeader />
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-24 text-center">
        <p className="text-[14px] font-medium text-ink">Not authorized</p>
        <p className="max-w-sm text-[12.5px] text-soft">
          {email} isn't the site owner - this page is restricted to Somadraw's own admin account.
        </p>
      </div>
    </div>
  )
}

function FeedbackTypeBadge({ type }) {
  const isBug = type === 'bug'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        isBug ? 'bg-rose-50 text-rose-700' : 'bg-brand-purple/10 text-brand-purple'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isBug ? 'bg-rose-500' : 'bg-brand-purple'}`} />
      {isBug ? 'Bug' : 'Suggestion'}
    </span>
  )
}

// Status colors, not categorical ones - these describe a state's severity,
// not a rotating identity, so the same amber/rose the rest of the app
// already reserves for warning/danger applies here too rather than a new
// pair. An unauthorized admin call is the more severe of the two (a real
// auth-bypass attempt, however unlikely to succeed) - a rate-limit hit is
// far more likely to just be an eager double-submit.
function SecurityEventBadge({ type }) {
  const isUnauthorized = type === 'unauthorized_admin_call'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        isUnauthorized ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isUnauthorized ? 'bg-rose-500' : 'bg-amber-500'}`} />
      {isUnauthorized ? 'Unauthorized attempt' : 'Rate limit hit'}
    </span>
  )
}

function UsersIcon({ className = '' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function ShieldIcon({ className = '' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <path d="M12 2 4 5v6c0 5.25 3.4 9.74 8 11 4.6-1.26 8-5.75 8-11V5Z" />
    </svg>
  )
}

function FeedbackIcon({ className = '' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    </svg>
  )
}

// The category this section lives under - shown once per section (not
// repeated per nav item, see MonitorNav below) so the active tab's own
// page still reads clearly if the sidebar nav is ever out of view (e.g.
// scrolled past on the horizontal mobile layout).
function CategoryHeader({ icon, title, subtitle }) {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        {icon}
        <h1 className="text-[20px] font-bold tracking-tight text-ink">{title}</h1>
      </div>
      <p className="mt-1 text-[12.5px] text-soft">{subtitle}</p>
    </div>
  )
}

// The sidebar's own nav item - same active/hover treatment as
// DashboardSidebar's `itemClass` (bg-surface-soft when active, a hover
// tint otherwise), reused here for visual consistency between the two
// admin-ish surfaces even though this page never imports that one
// (MonitorPage is a deliberately separate bundle - see this file's own
// top comment).
function MonitorNavItem({ icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors md:w-full ${
        active ? 'bg-surface-soft text-ink' : 'text-body hover:bg-surface-soft hover:text-ink'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

// Horizontal scrollable row on mobile, vertical fixed sidebar from md up -
// one set of markup for both rather than DashboardSidebar's separate
// desktop/mobile-drawer components, since there's only 3 items here.
function MonitorNav({ active, onChange }) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line px-4 py-3 md:w-56 md:shrink-0 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-3 md:py-6">
      <MonitorNavItem
        icon={<UsersIcon />}
        label="User Activity"
        active={active === 'users'}
        onClick={() => onChange('users')}
      />
      <MonitorNavItem
        icon={<FeedbackIcon />}
        label="Feedback"
        active={active === 'feedback'}
        onClick={() => onChange('feedback')}
      />
      <MonitorNavItem
        icon={<ShieldIcon />}
        label="Security"
        active={active === 'security'}
        onClick={() => onChange('security')}
      />
    </nav>
  )
}

function StarIcon({ filled }) {
  return (
    <svg
      width="13"
      height="13"
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

// Read-only mirror of DeveloperInfoView's own StarRating - a submitter's
// optional 1-5 rating (schema.sql's feedback.rating column), shown here so
// collecting it is actually worth something. Nothing to show for a row
// submitted before this column existed, or where the submitter just skipped
// it - null and 0 both render as "not rated" rather than as a 0-star row.
function StarDisplay({ value }) {
  if (!value) return <span className="text-[11px] text-soft">Not rated</span>
  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon key={star} filled={star <= value} />
      ))}
    </span>
  )
}

// label/value only - no delta or trend (see marks-and-anatomy.md's stat
// tile contract) since there's no prior-period figure to compare against
// yet. `accent` is reserved for a status meaning (e.g. "this metric is
// live right now"), never just a rotating decoration - only Online Now
// uses one, matching the same emerald this page's own Online/Offline
// badges already use elsewhere, rather than inventing a second color for
// the same status.
function StatTile({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-soft">{label}</p>
      <p className={`mt-1.5 text-[26px] font-semibold ${accent || 'text-ink'}`}>{value}</p>
    </div>
  )
}

function UserActivitySection({ allUsers, allUsersLoading, onlineUsers, onlineEmails }) {
  return (
    <>
      <CategoryHeader
        icon={<UsersIcon className="text-brand-purple" />}
        title="User Activity"
        subtitle="Who's using Somadraw - live presence and the full roster."
      />

      <div className="mt-6 grid grid-cols-2 gap-3">
        <StatTile
          label="Registered users"
          value={allUsersLoading ? '—' : allUsers.length.toLocaleString()}
        />
        <StatTile
          label="Online now"
          value={onlineUsers.length.toLocaleString()}
          accent="text-emerald-600"
        />
      </div>

      <h2 className="mt-12 text-lg font-semibold tracking-tight text-ink">Active Users</h2>
      <p className="mt-1 text-[12.5px] text-soft">
        Everyone currently signed in and using Somadraw, live.
      </p>

      <div className="mt-6">
        {onlineUsers.length === 0 ? (
          <p className="py-6 text-[12.5px] text-soft">No one else is online right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-2 pr-4 text-[10.5px] font-semibold uppercase tracking-wide text-soft">
                    Status
                  </th>
                  <th className="py-2 pr-4 text-[10.5px] font-semibold uppercase tracking-wide text-soft">
                    Email
                  </th>
                  <th className="py-2 text-[10.5px] font-semibold uppercase tracking-wide text-soft">
                    Online since
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {onlineUsers.map((entry) => (
                  <tr key={entry.email}>
                    <td className="whitespace-nowrap py-2.5 pr-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Online
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-[12.5px] font-medium text-ink">
                      {entry.email}
                    </td>
                    <td className="whitespace-nowrap py-2.5 text-[12px] text-soft">
                      {formatElapsed(entry.online_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-3 text-[12px] text-soft">
        {onlineUsers.length} {onlineUsers.length === 1 ? 'person' : 'people'} online now.
      </p>

      <h2 className="mt-10 text-lg font-semibold tracking-tight text-ink">All Users</h2>
      <p className="mt-1 text-[12.5px] text-soft">
        Every account that has ever signed in, not just who's online right now.
      </p>

      <div className="mt-6">
        {allUsersLoading ? (
          <p className="py-6 text-[12.5px] text-soft">Loading…</p>
        ) : allUsers.length === 0 ? (
          <p className="py-6 text-[12.5px] text-soft">No registered users yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-2 pr-4 text-[10.5px] font-semibold uppercase tracking-wide text-soft">
                    Status
                  </th>
                  <th className="py-2 pr-4 text-[10.5px] font-semibold uppercase tracking-wide text-soft">
                    Email
                  </th>
                  <th className="py-2 pr-4 text-[10.5px] font-semibold uppercase tracking-wide text-soft">
                    Joined
                  </th>
                  <th className="py-2 text-[10.5px] font-semibold uppercase tracking-wide text-soft">
                    Last seen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {allUsers.map((entry) => {
                  const isOnline = onlineEmails.has(entry.email)
                  return (
                    <tr key={entry.id}>
                      <td className="whitespace-nowrap py-2.5 pr-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-soft text-soft'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-line'}`} />
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-[12.5px] font-medium text-ink">
                        {entry.email}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-4 text-[12px] text-soft">
                        {formatElapsed(entry.created_at)}
                      </td>
                      <td className="whitespace-nowrap py-2.5 text-[12px] text-soft">
                        {entry.last_sign_in_at ? formatElapsed(entry.last_sign_in_at) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-3 text-[12px] text-soft">
        {allUsers.length} total {allUsers.length === 1 ? 'user' : 'users'}.
      </p>
    </>
  )
}

function FeedbackSection({
  feedback,
  feedbackLoading,
  averageRating,
  deletingFeedbackId,
  onDeleteFeedback,
}) {
  return (
    <>
      <CategoryHeader
        icon={<FeedbackIcon className="text-sky-500" />}
        title="Feedback"
        subtitle="Suggestions and bug reports sent from the Developer settings page."
      />

      <div className="mt-6 grid grid-cols-2 gap-3">
        <StatTile
          label="Feedback received"
          value={feedbackLoading ? '—' : feedback.length.toLocaleString()}
        />
        <StatTile label="Average rating" value={feedbackLoading ? '—' : averageRating} />
      </div>

      <div className="mt-10">
        {feedbackLoading ? (
          <p className="py-6 text-[12.5px] text-soft">Loading…</p>
        ) : feedback.length === 0 ? (
          <p className="py-6 text-[12.5px] text-soft">No feedback submitted yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {feedback.map((entry) => (
              <li key={entry.id} className="py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <FeedbackTypeBadge type={entry.type} />
                    <StarDisplay value={entry.rating} />
                    <span className="text-[12.5px] font-medium text-ink">{entry.email}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11.5px] text-soft">
                      {formatElapsed(entry.created_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteFeedback(entry.id)}
                      disabled={deletingFeedbackId === entry.id}
                      title="Delete feedback"
                      aria-label="Delete feedback"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-soft transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-body">{entry.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function SecuritySection({
  securityEvents,
  securityEventsLoading,
  rateLimitHitCount,
  unauthorizedAttemptCount,
}) {
  return (
    <>
      <CategoryHeader
        icon={<ShieldIcon className="text-rose-500" />}
        title="Security"
        subtitle="Attempts to abuse or bypass the app's own protections."
      />

      <div className="mt-6 grid grid-cols-2 gap-3">
        <StatTile
          label="Rate limit hits"
          value={securityEventsLoading ? '—' : rateLimitHitCount.toLocaleString()}
          accent="text-amber-600"
        />
        <StatTile
          label="Unauthorized attempts"
          value={securityEventsLoading ? '—' : unauthorizedAttemptCount.toLocaleString()}
          accent="text-rose-600"
        />
      </div>

      <h2 className="mt-12 text-lg font-semibold tracking-tight text-ink">Security Events</h2>
      <p className="mt-1 text-[12.5px] text-soft">
        Logged automatically whenever an existing safeguard (the feedback rate
        limit, or an owner-only function) is actually triggered.
      </p>

      <div className="mt-6">
        {securityEventsLoading ? (
          <p className="py-6 text-[12.5px] text-soft">Loading…</p>
        ) : securityEvents.length === 0 ? (
          <p className="py-6 text-[12.5px] text-soft">No security events yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {securityEvents.map((entry) => (
              <li key={entry.id} className="py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <SecurityEventBadge type={entry.event_type} />
                    <span className="text-[12.5px] font-medium text-ink">
                      {entry.email || 'Unknown'}
                    </span>
                  </div>
                  <span className="text-[11.5px] text-soft">
                    {formatElapsed(entry.created_at)}
                  </span>
                </div>
                {entry.detail && (
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-body">{entry.detail}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

// The actual monitoring content - only ever mounted once MonitorPage has
// already confirmed `user` is signed in as OWNER_EMAIL, so no further
// gating needed here (unlike the old MonitorUsersView, which had to check
// this itself since a stray URL visit could otherwise land here directly).
function MonitorContent({ user }) {
  const onlineUsers = useOnlineUsers(user)
  const [activeCategory, setActiveCategory] = useState('users')
  const [feedback, setFeedback] = useState([])
  const [feedbackLoading, setFeedbackLoading] = useState(true)
  const [allUsers, setAllUsers] = useState([])
  const [allUsersLoading, setAllUsersLoading] = useState(true)
  const [deletingFeedbackId, setDeletingFeedbackId] = useState(null)
  const [securityEvents, setSecurityEvents] = useState([])
  const [securityEventsLoading, setSecurityEventsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('feedback')
      .select('id, email, type, message, rating, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        setFeedback(error ? [] : (data ?? []))
        setFeedbackLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // The full registered roster (every account that ever signed up), not
  // just who happens to be online right now - admin_list_users (see
  // supabase/schema.sql) is a security-definer RPC that re-checks OWNER_EMAIL
  // server-side, so this table renders empty even if this client-side gate
  // were somehow bypassed.
  useEffect(() => {
    let cancelled = false
    supabase
      .rpc('admin_list_users')
      .then(({ data, error }) => {
        if (cancelled) return
        setAllUsers(error ? [] : (data ?? []))
        setAllUsersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Logged automatically by feedback_rate_limit()/admin_list_users()
  // (schema.sql) the moment either violation actually happens - see their
  // own comments there. "owner can view security events" RLS policy means
  // this comes back empty for anyone but the owner regardless of this
  // component's own gate.
  useEffect(() => {
    let cancelled = false
    supabase
      .from('security_events')
      .select('id, event_type, email, detail, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        setSecurityEvents(error ? [] : (data ?? []))
        setSecurityEventsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const onlineEmails = new Set(onlineUsers.map((entry) => entry.email))
  const rateLimitHitCount = securityEvents.filter((entry) => entry.event_type === 'rate_limit_hit').length
  const unauthorizedAttemptCount = securityEvents.filter(
    (entry) => entry.event_type === 'unauthorized_admin_call',
  ).length

  // Only averages entries that actually carry a rating (schema.sql's
  // feedback.rating is optional - see its own comment) - a submitter who
  // skipped the stars shouldn't silently drag this toward 0.
  const ratedFeedback = feedback.filter((entry) => entry.rating != null)
  const averageRating = ratedFeedback.length
    ? (ratedFeedback.reduce((sum, entry) => sum + entry.rating, 0) / ratedFeedback.length).toFixed(1)
    : '—'

  // Optimistic-on-success removal (not optimistic-before-the-call) - the
  // "owner can delete feedback" RLS policy (schema.sql) means this can only
  // ever fail here if that migration hasn't been run yet, in which case
  // leaving the row visible is more honest than silently dropping it from
  // the list while it's still sitting in the database.
  const handleDeleteFeedback = async (id) => {
    setDeletingFeedbackId(id)
    const { error } = await supabase.from('feedback').delete().eq('id', id)
    if (!error) {
      setFeedback((prev) => prev.filter((entry) => entry.id !== id))
    }
    setDeletingFeedbackId(null)
  }

  return (
    <div className="min-h-screen bg-white">
      <PageHeader />
      <div className="md:flex">
        <MonitorNav active={activeCategory} onChange={setActiveCategory} />
        <div className="min-w-0 flex-1 px-6 py-10 md:py-16">
          <div className="mx-auto w-full max-w-3xl">
            {activeCategory === 'users' && (
              <UserActivitySection
                allUsers={allUsers}
                allUsersLoading={allUsersLoading}
                onlineUsers={onlineUsers}
                onlineEmails={onlineEmails}
              />
            )}
            {activeCategory === 'feedback' && (
              <FeedbackSection
                feedback={feedback}
                feedbackLoading={feedbackLoading}
                averageRating={averageRating}
                deletingFeedbackId={deletingFeedbackId}
                onDeleteFeedback={handleDeleteFeedback}
              />
            )}
            {activeCategory === 'security' && (
              <SecuritySection
                securityEvents={securityEvents}
                securityEventsLoading={securityEventsLoading}
                rateLimitHitCount={rateLimitHitCount}
                unauthorizedAttemptCount={unauthorizedAttemptCount}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MonitorPage() {
  const [session, setSession] = useState(undefined)
  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = async () => {
    setIsSigningIn(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/monitor` },
    })
    if (error) setIsSigningIn(false)
  }

  if (session === undefined) return <LoadingScreen message="Loading…" />
  if (!session) return <SignedOutState onSignIn={signIn} isSigningIn={isSigningIn} />
  if (session.user.email !== OWNER_EMAIL) return <NotOwnerState email={session.user.email} />
  return <MonitorContent user={session.user} />
}

export default MonitorPage
