import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Reads live from the `announcements` table (see supabase/schema.sql) -
// shared by UpdatesPage.jsx (the public /updates page) and
// AnnouncementBanner (the workspace's own "what's new" banner) so the two
// can't drift out of sync with each other or with what the owner actually
// posted from the Monitor Dashboard. Read-only on purpose - the
// add/remove side lives in MonitorPage.jsx, which is the only place that
// needs it.
export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('announcements')
      .select('id, type, title, description, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        setAnnouncements(error ? [] : (data ?? []))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { announcements, loading }
}

export const UPDATE_BADGE_STYLE = {
  new: 'bg-brand-blue/10 text-brand-blue',
  improved: 'bg-emerald-100 text-emerald-700',
  fix: 'bg-rose-100 text-rose-700',
}

export const UPDATE_BADGE_LABEL = {
  new: 'New',
  improved: 'Improved',
  fix: 'Fix',
}
