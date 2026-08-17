import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const MAX_LENGTH = 24

// Shown once, right after sign-in, for anyone who hasn't set a username or
// explicitly skipped this before (see Dashboard.jsx's own trigger
// condition) - a short, self-chosen name to show on live cursors and
// elsewhere instead of a long Gmail address (see userDisplay.js's own
// comment on the priority chain this feeds). Same modal shell as
// DashboardSidebar.jsx's DeleteDiagramDialog/SignOutConfirmDialog (fixed
// backdrop, click-outside + Escape both dismiss), same controlled-input +
// status-driven save flow as SettingsModal.jsx's FeedbackSection.
function UsernamePrompt({ onDone }) {
  const [value, setValue] = useState('')
  const [status, setStatus] = useState('idle') // idle | saving | error

  // Dismissable, not mandatory - matches this app's low-friction style
  // elsewhere (the feedback form's own star rating is optional too).
  // Recorded server-side (not just closed locally) so it's a one-time ask,
  // not repeated on every future sign-in.
  const handleSkip = useCallback(async () => {
    await supabase.auth.updateUser({ data: { username_prompt_dismissed: true } })
    onDone()
  }, [onDone])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleSkip()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSkip])

  const handleSave = async (event) => {
    event.preventDefault()
    const trimmed = value.trim().slice(0, MAX_LENGTH)
    if (!trimmed) return
    setStatus('saving')
    const { error } = await supabase.auth.updateUser({ data: { username: trimmed } })
    if (error) {
      // Same reasoning as SettingsModal.jsx's own save handler - the
      // on-screen message stays generic, this is what actually says why.
      console.error('Failed to save username:', error)
      setStatus('error')
      return
    }
    onDone()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) handleSkip()
      }}
    >
      <form onSubmit={handleSave} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
        <h2 className="text-[14px] font-semibold text-ink">Choose a username</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-soft">
          Shown to collaborators instead of your email while you work
          together - you can change it later in Settings.
        </p>

        <input
          autoFocus
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            if (status === 'error') setStatus('idle')
          }}
          maxLength={MAX_LENGTH}
          placeholder="e.g. Eurika"
          className="mt-4 w-full rounded-lg border border-line bg-surface-soft px-3 py-2 text-[13px] text-ink outline-none placeholder:text-soft"
        />

        {status === 'error' && (
          <p className="mt-2 text-[12px] font-medium text-rose-600">
            Couldn't save that. Try again?
          </p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSkip}
            className="text-[12.5px] font-medium text-soft transition-colors hover:text-ink"
          >
            Skip for now
          </button>
          <button
            type="submit"
            disabled={!value.trim() || status === 'saving'}
            className="rounded-lg bg-brand-blue px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === 'saving' ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default UsernamePrompt
