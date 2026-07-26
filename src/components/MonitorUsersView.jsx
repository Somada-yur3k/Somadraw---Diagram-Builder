import { useEffect, useState } from 'react'
import { Navigate, useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { OWNER_EMAIL } from '../lib/ownerEmail'
import { formatElapsed } from '../lib/timeFormat'

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

// Guarded twice: DashboardSidebar only shows the menu entry to OWNER_EMAIL,
// and this component re-checks the same thing directly - so navigating here
// by URL doesn't bypass anything. RLS backs this up independently - the
// feedback table's own "owner can view all feedback" policy means a
// non-owner's select would come back empty regardless of this check.
function MonitorUsersView() {
  const { user, onlineUsers } = useOutletContext()
  const [feedback, setFeedback] = useState([])
  const [feedbackLoading, setFeedbackLoading] = useState(true)
  const isOwner = user?.email === OWNER_EMAIL

  useEffect(() => {
    if (!isOwner) return
    let cancelled = false
    supabase
      .from('feedback')
      .select('id, email, type, message, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        // Same "just show empty" fallback on error as onlineUsers already
        // gets from its own hook - no separate error UI, but critically
        // this must still clear the loading flag either way, or a failed
        // fetch (e.g. the feedback table migration hasn't been run yet)
        // would leave "Loading…" showing forever instead of degrading to
        // the empty state.
        setFeedback(error ? [] : (data ?? []))
        setFeedbackLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOwner])

  if (!isOwner) {
    return <Navigate to="/workspace" replace />
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-16">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-lg font-semibold tracking-tight text-ink">Active Users</h1>
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

        <h2 className="mt-10 text-lg font-semibold tracking-tight text-ink">Feedback</h2>
        <p className="mt-1 text-[12.5px] text-soft">
          Suggestions and bug reports sent from the Developer settings page.
        </p>

        <div className="mt-6">
          {feedbackLoading ? (
            <p className="py-6 text-[12.5px] text-soft">Loading…</p>
          ) : feedback.length === 0 ? (
            <p className="py-6 text-[12.5px] text-soft">No feedback submitted yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {feedback.map((entry) => (
                <li key={entry.id} className="py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <FeedbackTypeBadge type={entry.type} />
                      <span className="text-[12.5px] font-medium text-ink">{entry.email}</span>
                    </div>
                    <span className="text-[11.5px] text-soft">
                      {formatElapsed(entry.created_at)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-body">{entry.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default MonitorUsersView
