// Human-readable time deltas shared by the two feedback-adjacent views that
// each need one: MonitorUsersView counts elapsed time up ("5m ago"),
// DeveloperInfoView's feedback cooldown counts remaining time down ("5
// minutes"). Kept as two functions (not one parameterized one) since their
// ranges genuinely differ - elapsed time is unbounded and falls back to a
// calendar date past a week, while the cooldown is always under an hour and
// never needs anything past minutes.
export function formatElapsed(isoString) {
  const seconds = Math.max(0, (Date.now() - new Date(isoString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(isoString).toLocaleDateString()
}

export function formatRemaining(msRemaining) {
  const minutes = Math.ceil(msRemaining / 60000)
  if (minutes <= 1) return 'less than a minute'
  if (minutes < 60) return `${minutes} minutes`
  return '1 hour'
}
