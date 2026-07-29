import { useDiagramEditorContext } from './DiagramEditorContext'
import { colorForEmail } from '../../lib/useDiagramChannel'

const MAX_VISIBLE = 4

function PersonAvatar({ person, isSelf }) {
  const label = isSelf ? `${person.name || person.email} (you)` : person.name || person.email
  return (
    <div
      title={label}
      className="h-7 w-7 shrink-0 overflow-hidden rounded-full ring-2 ring-white"
      style={{ backgroundColor: person.picture ? undefined : colorForEmail(person.email) }}
    >
      {person.picture ? (
        <img src={person.picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-white">
          {(person.name || person.email || '?')[0]?.toUpperCase()}
        </span>
      )}
    </div>
  )
}

// Live "who's here" avatar stack, sitting next to the Share button - every
// participant on this diagram right now (owner, editors, viewers alike),
// sourced from the same Realtime presence data the live cursors use (see
// useDiagramChannel's `activeUsers`), not the persisted collaborator list -
// this is about who's *currently looking*, not who has *access*.
// Deliberately renders nothing when no one else is around: an avatar stack
// of just yourself isn't information, it's chrome.
function ActiveUsersStack() {
  const { email, name, picture, activeUsers } = useDiagramEditorContext()
  if (!activeUsers || activeUsers.length === 0) return null

  const self = { email, name, picture }
  // Presence is keyed per browser tab, not per account - the same person
  // signed in twice (two tabs, or a second window) shows up as two separate
  // presence entries with the same email. Collapse those down to one avatar
  // each; `self` goes first so a second tab of your own account can never
  // shadow "you" with a duplicate "them".
  const seenEmails = new Set()
  const everyone = [self, ...activeUsers].filter((person) => {
    if (seenEmails.has(person.email)) return false
    seenEmails.add(person.email)
    return true
  })
  const visible = everyone.slice(0, MAX_VISIBLE)
  const overflow = everyone.length - visible.length

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((person, i) => (
        <PersonAvatar key={person.clientId ?? 'self'} person={person} isSelf={i === 0} />
      ))}
      {overflow > 0 && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[11px] font-semibold text-soft ring-2 ring-white">
          +{overflow}
        </div>
      )}
    </div>
  )
}

export default ActiveUsersStack
