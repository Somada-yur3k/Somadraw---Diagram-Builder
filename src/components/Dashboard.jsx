import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import DashboardSidebar from './DashboardSidebar'
import { useOnlineUsers } from '../lib/usePresence'

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function Dashboard({ user, onSignOut }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  // Tracked here (not in MonitorUsersView) so presence stays live for the
  // whole /workspace session regardless of which nested route is open, and
  // so there's exactly one Realtime subscription per tab - see usePresence.
  const onlineUsers = useOnlineUsers(user)

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <DashboardSidebar
        user={user}
        onSignOut={onSignOut}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink"
          >
            <MenuIcon />
          </button>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            Somadraw
          </span>
        </header>

        <Outlet context={{ user, onlineUsers }} />
      </div>
    </div>
  )
}

export default Dashboard
