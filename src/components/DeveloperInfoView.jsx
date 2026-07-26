import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const FEEDBACK_TYPES = [
  { key: 'suggestion', label: 'Suggestion' },
  { key: 'bug', label: 'Bug report' },
]

function FeedbackForm({ user }) {
  const [type, setType] = useState('suggestion')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || !user) return

    setStatus('sending')
    const { error } = await supabase
      .from('feedback')
      .insert({ email: user.email, type, message: trimmed })

    if (error) {
      setStatus('error')
      return
    }
    setMessage('')
    setStatus('sent')
  }

  return (
    <form onSubmit={handleSubmit} className="mt-16">
      <h2 className="text-[13px] font-semibold text-ink">Send feedback</h2>
      <p className="mt-1 text-[12px] text-soft">
        Found a bug or have a suggestion? It goes straight to the developer.
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
        placeholder={
          type === 'bug'
            ? "What happened, and what did you expect instead?"
            : "What would make Somadraw better for you?"
        }
        rows={4}
        className="mt-3 w-full resize-none rounded-lg bg-surface-soft px-3 py-2.5 text-[12.5px] text-ink outline-none placeholder:text-soft"
      />

      <div className="mt-3 flex items-center justify-between">
        <button
          type="submit"
          disabled={!message.trim() || status === 'sending'}
          className="gradient-bg rounded-lg px-3.5 py-1.5 text-[12px] font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending…' : 'Send feedback'}
        </button>

        {status === 'sent' && (
          <span className="text-[12px] font-medium text-emerald-600">
            Thanks — your feedback was sent.
          </span>
        )}
        {status === 'error' && (
          <span className="text-[12px] font-medium text-rose-600">
            Couldn't send that. Try again?
          </span>
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
