import { Navigate, useOutletContext } from 'react-router-dom'
import { OWNER_EMAIL } from '../lib/ownerEmail'

function formatOnlineSince(isoString) {
  const seconds = Math.max(0, (Date.now() - new Date(isoString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

// Guarded twice: DashboardSidebar only shows the menu entry to OWNER_EMAIL,
// and this component re-checks the same thing directly - so navigating here
// by URL doesn't bypass anything.
function MonitorUsersView() {
  const { user, onlineUsers } = useOutletContext()

  if (user?.email !== OWNER_EMAIL) {
    return <Navigate to="/workspace" replace />
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-16">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Active Users</h1>
        <p className="mt-1.5 text-[14.5px] text-soft">
          Everyone currently signed in and using Somadraw, live.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          {onlineUsers.length === 0 ? (
            <p className="px-6 py-8 text-center text-[13.5px] text-soft">
              No one else is online right now.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-surface-soft">
                    <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wide text-soft">
                      Status
                    </th>
                    <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wide text-soft">
                      Email
                    </th>
                    <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wide text-soft">
                      Online since
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {onlineUsers.map((entry) => (
                    <tr key={entry.email}>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11.5px] font-medium text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Online
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[14px] font-medium text-ink">
                        {entry.email}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-soft">
                        {formatOnlineSince(entry.online_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-6 text-[13px] text-soft">
          {onlineUsers.length} {onlineUsers.length === 1 ? 'person' : 'people'} online now.
        </p>
      </div>
    </div>
  )
}

export default MonitorUsersView
