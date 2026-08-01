import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatRemaining } from '../lib/timeFormat'

const COOLDOWN_MS = 60 * 60 * 1000
// Matches the errcode the feedback_rate_limit() Postgres trigger raises
// (see supabase/schema.sql) - a distinct SQLSTATE rather than matching
// exception text, so this stays correct even if the trigger's message
// wording changes later.
const RATE_LIMIT_ERRCODE = 'RL001'

function StarIcon({ filled }) {
  return (
    <svg
      width="19"
      height="19"
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

// Optional (see rating's own column comment in schema.sql) - clicking the
// star already marking the current rating clears it back to "not rated"
// (0) rather than being stuck once set, same reasoning most star-rating
// widgets support a clear/undo gesture. Hover previews the value a click
// would commit without actually changing `value` until it does.
function StarRating({ value, onChange, disabled }) {
  const [hovered, setHovered] = useState(0)
  const display = hovered || value

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onMouseEnter={() => setHovered(star)}
          onClick={() => onChange(value === star ? 0 : star)}
          title={`${star} star${star === 1 ? '' : 's'}`}
          aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
          aria-pressed={value === star}
          className={`transition-transform hover:scale-110 disabled:pointer-events-none disabled:opacity-60 ${
            star <= display ? 'text-amber-400' : 'text-line'
          }`}
        >
          <StarIcon filled={star <= display} />
        </button>
      ))}
    </div>
  )
}

function FeedbackForm({ user }) {
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(0)
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
    // No `type` field sent - the column still exists (schema.sql) and
    // defaults to 'suggestion' on its own, now that there's no bug/
    // suggestion toggle here to actually choose one.
    const { error } = await supabase
      .from('feedback')
      .insert({ email: user.email, message: trimmed, rating: rating || null })

    if (error) {
      setStatus(error.code === RATE_LIMIT_ERRCODE ? 'idle' : 'error')
      if (error.code === RATE_LIMIT_ERRCODE) setCooldownUntil(Date.now() + COOLDOWN_MS)
      return
    }
    setMessage('')
    setRating(0)
    setStatus('sent')
    setCooldownUntil(Date.now() + COOLDOWN_MS)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-16 rounded-2xl border border-line bg-surface-soft/40 p-5">
      <h2 className="text-[14px] font-semibold text-ink">Feedback</h2>
      <p className="mt-1 text-[12px] text-soft">
        Share your thoughts - it goes straight to the developer. Limited to
        one message per hour.
      </p>

      <textarea
        value={message}
        onChange={(event) => {
          setMessage(event.target.value)
          if (status === 'sent' || status === 'error') setStatus('idle')
        }}
        disabled={onCooldown}
        placeholder="What should we improve in Somadraw?"
        rows={4}
        className="mt-3 w-full resize-none rounded-xl border border-line bg-white px-3.5 py-3 text-[12.5px] text-ink outline-none placeholder:text-soft disabled:opacity-60"
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <StarRating value={rating} onChange={setRating} disabled={onCooldown} />
        <button
          type="submit"
          disabled={!message.trim() || status === 'sending' || onCooldown}
          className="gradient-bg rounded-lg px-3.5 py-1.5 text-[12px] font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending…' : 'Send feedback'}
        </button>
      </div>

      <div className="mt-2">
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
