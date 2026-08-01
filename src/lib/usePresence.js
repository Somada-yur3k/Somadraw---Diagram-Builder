import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const PRESENCE_CHANNEL = 'online-users'

// Tracks the signed-in user as present on a shared Realtime presence
// channel for as long as this hook stays mounted, and returns the live,
// deduplicated list of everyone currently on that same channel - including
// this user. The only caller today is MonitorPage.jsx (its own standalone
// page/bundle, monitor.html - see that file's own comment on why), so this
// connection is only ever opened by whoever is actively viewing that
// owner-only page, not by every signed-in visitor's whole /workspace
// session the way it used to be when Dashboard.jsx called this itself and
// passed the result down via Outlet context.
//
// Presence is ephemeral - Supabase drops a client's entry the instant it
// disconnects or the tab closes - so there's no database row to clean up.
// Note this channel isn't gated by Realtime Authorization, so any
// signed-in client that knew the channel name could technically subscribe
// to it too; what's actually restricted is the Monitor *page* (to
// OWNER_EMAIL, see MonitorPage.jsx). Fine for a single-owner tool - add a
// Realtime Authorization policy on this channel if that tradeoff changes.
export function useOnlineUsers(user) {
  const [onlineUsers, setOnlineUsers] = useState([])
  // Depend on the primitive id/email, not the `user` object itself - a
  // caller that doesn't memoize its user object (a fresh `{...}` literal
  // each render, say) would otherwise retrigger this effect - tearing down
  // and resubscribing the channel - on every single render.
  const userId = user?.id
  const userEmail = user?.email

  useEffect(() => {
    if (!userId) return

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = Object.values(state)
          .map((entries) => entries[0])
          .filter(Boolean)
          .sort((a, b) => a.online_at.localeCompare(b.online_at))
        setOnlineUsers(users)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ email: userEmail, online_at: new Date().toISOString() })
        }
      })

    return () => {
      supabase.removeChannel(channel)
      setOnlineUsers([])
    }
  }, [userId, userEmail])

  return onlineUsers
}
