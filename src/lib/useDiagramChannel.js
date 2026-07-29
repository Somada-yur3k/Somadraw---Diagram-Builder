import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'

const STATE_EVENT = 'state'
const CURSOR_EVENT = 'cursor'
const CURSOR_THROTTLE_MS = 50

// Distinct, legible-on-white hues - picked from, not generated, so nobody
// ever gets an accidentally near-invisible or two people an accidentally
// identical color.
const CURSOR_COLORS = [
  '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6',
  '#f59e0b', '#ef4444', '#10b981', '#6366f1',
]

export function colorForEmail(email) {
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) | 0
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]
}

// The one Realtime channel for a shared diagram (private, per-diagram topic
// `diagram:<id>`, gated by the Realtime Authorization policies in
// schema.sql), carrying live content sync, live cursors, and presence.
//
// This used to be two separate hooks each calling `supabase.channel()` on
// the exact same topic string - but the SDK doesn't open two connections
// for that, it silently returns the *same* channel object to the second
// caller and discards that second call's own config and `.subscribe()`
// callback (see RealtimeClient.channel(): "If a channel with the same topic
// already exists it will be returned instead of creating a duplicate
// connection"). Whichever hook happened to mount second ended up attached
// to a channel that never actually ran its own join logic - so broadcasts
// and/or presence updates silently failed to deliver depending on mount
// order, which is exactly why shape moves weren't showing up live. One
// hook, one `supabase.channel()` call, is the fix - not a workaround.
//
// Cursor *position* rides Broadcast, not Presence, even though Presence was
// the simpler first cut - Presence is designed for infrequent identity/
// state changes (who joined, who left) and gets synced to everyone as a
// full state diff; Supabase's own guidance is to use Broadcast for anything
// as frequent as per-pointermove cursor updates, because a rapid stream of
// `track()` calls can get coalesced/rate-limited server-side in a way a
// steady stream of `send()` broadcasts isn't. That's what made a cursor
// go quiet specifically while its owner was actively dragging something -
// exactly the highest-frequency moment. Presence is kept, but now only for
// the thing it's actually good at: a one-time "I'm here" on join, which
// drives `activeUsers` (who's connected at all) and cleans up a stale
// cursor via the 'leave' event if someone's tab closes mid-drag.
export function useDiagramChannel(diagramId, email, name, picture, onRemoteState) {
  // `cursors` (position on canvas) vs `activeUsers` (present at all, whether
  // or not they've moved their mouse over the canvas yet) are deliberately
  // separate - EditorCanvas draws a pointer marker per `cursors` entry (no
  // x/y means nowhere sensible to draw one), but ActiveUsersStack wants
  // everyone who's actually here, including someone who joined seconds ago
  // and hasn't moved their mouse yet.
  const [cursorsByClientId, setCursorsByClientId] = useState({})
  const [activeUsers, setActiveUsers] = useState([])
  const [clientId] = useState(() => Math.random().toString(36).slice(2))
  const channelRef = useRef(null)
  const lastCursorSentAtRef = useRef(0)
  const onRemoteStateRef = useRef(onRemoteState)
  useEffect(() => {
    onRemoteStateRef.current = onRemoteState
  })

  // A tab that sits backgrounded for a while (browser switched away, or
  // just unfocused) gets its timers throttled - including this WebSocket's
  // own heartbeat, which is how the server tells a genuinely-dead
  // connection apart from an idle one. A throttled heartbeat can get the
  // connection dropped server-side without the client ever cleanly
  // detecting it, so the channel object looks fine locally while no longer
  // actually receiving anything - previously only a full page reload (a
  // fresh connection) fixed that. Bumping this on every return to the tab
  // forces the effect below to tear down whatever channel it has and open a
  // new one, which is what a reload was really accomplishing anyway.
  const [reconnectGeneration, setReconnectGeneration] = useState(0)
  useEffect(() => {
    const reconnect = () => {
      if (document.visibilityState === 'visible') setReconnectGeneration((n) => n + 1)
    }
    document.addEventListener('visibilitychange', reconnect)
    window.addEventListener('focus', reconnect)
    return () => {
      document.removeEventListener('visibilitychange', reconnect)
      window.removeEventListener('focus', reconnect)
    }
  }, [])

  useEffect(() => {
    if (!diagramId || !email) return
    const color = colorForEmail(email)
    const channel = supabase.channel(`diagram:${diagramId}`, {
      config: { private: true, presence: { key: clientId } },
    })

    channel
      .on('broadcast', { event: STATE_EVENT }, ({ payload }) => {
        onRemoteStateRef.current(payload)
      })
      .on('broadcast', { event: CURSOR_EVENT }, ({ payload }) => {
        // Presence auto-excludes your own entry (see the 'sync' handler's
        // `key !== clientId` filter below) - Broadcast doesn't do that for
        // free, so without this check your own cursor updates would loop
        // straight back into your own `cursors` list and render your own
        // pointer on your own screen.
        if (payload.clientId === clientId) return
        setCursorsByClientId((current) => {
          // x/y omitted means "pointer left the canvas" (see clearCursor) -
          // drop the entry entirely rather than storing a stale position.
          if (payload.x == null || payload.y == null) {
            if (!(payload.clientId in current)) return current
            const next = { ...current }
            delete next[payload.clientId]
            return next
          }
          return { ...current, [payload.clientId]: payload }
        })
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const others = Object.entries(state)
          .filter(([key]) => key !== clientId)
          .map(([key, entries]) => entries[0] && { clientId: key, ...entries[0] })
          .filter(Boolean)
        setActiveUsers(others)
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setCursorsByClientId((current) => {
          if (!(key in current)) return current
          const next = { ...current }
          delete next[key]
          return next
        })
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') channel.track({ email, name, picture, color })
      })

    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
      setCursorsByClientId({})
      setActiveUsers([])
    }
  }, [diagramId, email, name, picture, clientId, reconnectGeneration])

  const broadcastState = useCallback((patch) => {
    channelRef.current?.send({ type: 'broadcast', event: STATE_EVENT, payload: patch })
  }, [])

  const updateCursor = useCallback(
    (x, y) => {
      const now = Date.now()
      if (now - lastCursorSentAtRef.current < CURSOR_THROTTLE_MS) return
      lastCursorSentAtRef.current = now
      channelRef.current?.send({
        type: 'broadcast',
        event: CURSOR_EVENT,
        payload: { clientId, email, name, picture, color: colorForEmail(email), x, y },
      })
    },
    [clientId, email, name, picture],
  )

  // Pointer left the canvas entirely - re-send with x/y omitted so other
  // clients' handler above drops this cursor instead of leaving it stuck at
  // its last position.
  const clearCursor = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast',
      event: CURSOR_EVENT,
      payload: { clientId, email, name, picture, color: colorForEmail(email) },
    })
  }, [clientId, email, name, picture])

  return {
    broadcastState,
    cursors: Object.values(cursorsByClientId),
    activeUsers,
    updateCursor,
    clearCursor,
  }
}
