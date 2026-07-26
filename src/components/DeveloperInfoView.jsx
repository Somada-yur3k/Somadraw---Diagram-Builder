import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatRemaining } from '../lib/timeFormat'

const FEEDBACK_TYPES = [
  { key: 'suggestion', label: 'Suggestion' },
  { key: 'bug', label: 'Bug report' },
]

const COOLDOWN_MS = 60 * 60 * 1000
// Matches the errcode the feedback_rate_limit() Postgres trigger raises
// (see supabase/schema.sql) - a distinct SQLSTATE rather than matching
// exception text, so this stays correct even if the trigger's message
// wording changes later.
const RATE_LIMIT_ERRCODE = 'RL001'

function FeedbackForm({ user }) {
  const [type, setType] = useState('suggestion')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  // Timestamp (ms) the user can next submit at, or null if unknown/clear.
  // Seeded from their last real submission (fetched on mount) so the
  // cooldown survives a page reload, not just re-submits within one visit.
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
    // ticking forever in the background for as long as this page stays
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
    const { error } = await supabase
      .from('feedback')
      .insert({ email: user.email, type, message: trimmed })

    if (error) {
      setStatus(error.code === RATE_LIMIT_ERRCODE ? 'idle' : 'error')
      if (error.code === RATE_LIMIT_ERRCODE) setCooldownUntil(Date.now() + COOLDOWN_MS)
      return
    }
    setMessage('')
    setStatus('sent')
    setCooldownUntil(Date.now() + COOLDOWN_MS)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-16">
      <h2 className="text-[13px] font-semibold text-ink">Send feedback</h2>
      <p className="mt-1 text-[12px] text-soft">
        Found a bug or have a suggestion? It goes straight to the developer.
        Limited to one message per hour.
      </p>

      <div className="mt-3 flex gap-2">
        {FEEDBACK_TYPES.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setType(option.key)}
            aria-pressed={type === option.key}
            className={`rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
              type === option.key
                ? 'bg-brand-purple/10 text-brand-purple'
                : 'text-body hover:bg-surface-soft hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <textarea
        value={message}
        onChange={(event) => {
          setMessage(event.target.value)
          if (status === 'sent' || status === 'error') setStatus('idle')
        }}
        disabled={onCooldown}
        placeholder={
          type === 'bug'
            ? "What happened, and what did you expect instead?"
            : "What would make Somadraw better for you?"
        }
        rows={4}
        className="mt-3 w-full resize-none rounded-lg bg-surface-soft px-3 py-2.5 text-[12.5px] text-ink outline-none placeholder:text-soft disabled:opacity-60"
      />

      <div className="mt-3 flex items-center justify-between">
        <button
          type="submit"
          disabled={!message.trim() || status === 'sending' || onCooldown}
          className="gradient-bg rounded-lg px-3.5 py-1.5 text-[12px] font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending…' : 'Send feedback'}
        </button>

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

function DeveloperInfoView() {
  const { user } = useOutletContext()

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-16">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="text-lg font-semibold tracking-tight text-ink">Developer</h1>
        <p className="mt-1 text-[12.5px] text-soft">
          About the person who built Somadraw.
        </p>

        <div className="mt-6">
          <p className="text-[13px] font-medium text-ink">Eurika Adamos</p>
          <p className="mt-0.5 text-[12px] text-soft">BSIT-MI, 3rd Year</p>
          <p className="text-[12px] text-soft">National University Fairview</p>
        </div>

        <FeedbackForm user={user} />
      </div>
    </div>
  )
}

export default DeveloperInfoView
