import { useState } from 'react'
import { Outlet } from 'react-router'
import DashboardSidebar from './DashboardSidebar'
import UsernamePrompt from './UsernamePrompt'
import { useOnlineUsers } from '../lib/usePresence'

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function Dashboard({ user, onSignOut }) {
  // Tracks this user as present on the shared 'online-users' Realtime
  // channel for as long as they're anywhere in the signed-in app (Dashboard
  // wraps every route under it) - the return value itself is MonitorPage.jsx's
  // concern, not this component's; Dashboard's own job is just making sure
  // the tracking side effect actually runs for every visitor, not only for
  // whoever happens to have the owner-only Monitor page open. Without this,
  // that page's "Active Users" list only ever shows the owner's own
  // presence (from viewing Monitor itself), never anyone actually using the
  // app - see usePresence.js's own comment on why this call belongs here.
  useOnlineUsers(user)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  // Local, not derived purely from `user.user_metadata` - closing this via
  // Save/Skip calls supabase.auth.updateUser(), whose own session-refresh
  // event isn't guaranteed to have already reached this component's props
  // by the exact tick UsernamePrompt's onDone fires, which would otherwise
  // risk a one-frame flicker of the modal reappearing before it does.
  const [usernamePromptDismissed, setUsernamePromptDismissed] = useState(false)

  const metadata = user?.user_metadata ?? {}
  const showUsernamePrompt =
    !usernamePromptDismissed && !metadata.username && !metadata.username_prompt_dismissed

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

        <Outlet context={{ user }} />
      </div>

      {showUsernamePrompt && (
        <UsernamePrompt onDone={() => setUsernamePromptDismissed(true)} />
      )}
    </div>
  )
}

export default Dashboard
