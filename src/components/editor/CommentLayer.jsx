import { useEffect, useRef, useState } from 'react'
import { useDiagramEditorContext } from './DiagramEditorContext'
import { formatElapsed } from '../../lib/timeFormat'

function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v12H8l-4 4V4Z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  )
}

function Avatar({ picture, name, size = 24 }) {
  if (picture) {
    return (
      <img
        src={picture}
        alt=""
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="gradient-bg flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {name?.[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

// Counter-scales its children back to a constant screen size regardless of
// diagram zoom (same trick EditorCanvas's own CursorMarker uses) - a
// discussion thread's text should stay legible at 25% zoom, not shrink to
// the point of being unreadable the way a shape's own label reasonably
// does.
// z-30 - same tier EditorTopbar's own floating popovers use, above
// ArrowLabels (z-20) and every shape/arrow (no explicit z-index, so they
// stack below anything that has one), so a pin or its open card is always
// clickable/legible regardless of what's drawn underneath it.
function ZoomLocked({ zoom, x, y, children }) {
  return (
    <div className="absolute z-30" style={{ left: x, top: y }}>
      <div style={{ transform: `scale(${1 / zoom})`, transformOrigin: 'top left' }}>{children}</div>
    </div>
  )
}

function CommentPin({ thread, isActive, zoom, onClick }) {
  return (
    <ZoomLocked zoom={zoom} x={thread.x} y={thread.y}>
      <button
        type="button"
        data-export-hidden
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onClick}
        title={thread.resolved ? 'Resolved thread' : 'Comment thread'}
        className={`flex h-7 w-7 items-center justify-center rounded-full rounded-bl-sm border-2 border-white text-white shadow-md transition-transform hover:scale-110 ${
          thread.resolved ? 'bg-emerald-500' : isActive ? 'bg-ink' : 'bg-brand-blue'
        }`}
      >
        {thread.resolved ? <CheckIcon /> : <ChatIcon />}
      </button>
    </ZoomLocked>
  )
}

// A brand-new thread's first message - shown at the click point before
// anything is actually dispatched (see EditorCanvas's pendingCommentPos, the
// local-only state this composes). Same shell as CommentThreadCard's own
// reply row, just without a thread to attach to yet.
function NewCommentComposer({ x, y, zoom, picture, name, onSubmit, onCancel }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <ZoomLocked zoom={zoom} x={x} y={y}>
      <div
        data-export-hidden
        onPointerDown={(event) => event.stopPropagation()}
        className="w-72 -translate-y-2 translate-x-3 rounded-xl border border-line bg-white p-3 shadow-xl"
      >
        <div className="flex items-start gap-2">
          <Avatar picture={picture} name={name} />
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation()
                onCancel()
              } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault()
                submit()
              }
            }}
            placeholder="Leave a comment… (Ctrl+↵ to submit)"
            rows={2}
            className="min-w-0 flex-1 resize-none rounded-lg border border-line bg-surface-soft px-2.5 py-1.5 text-[12.5px] text-ink outline-none placeholder:text-soft"
          />
        </div>
        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-2.5 py-1 text-[12px] font-medium text-soft transition-colors hover:bg-surface-soft hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            className="rounded-lg bg-brand-blue px-3 py-1 text-[12px] font-semibold text-white transition-opacity disabled:opacity-40"
          >
            Comment
          </button>
        </div>
      </div>
    </ZoomLocked>
  )
}

function MessageRow({ message, isOwn, onStartEdit, isEditing, onSaveEdit, onCancelEdit }) {
  const [draft, setDraft] = useState(message.content)

  if (isEditing) {
    return (
      <div className="flex items-start gap-2">
        <Avatar picture={message.picture} name={message.name} />
        <div className="min-w-0 flex-1">
          <textarea
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation()
                onCancelEdit()
              } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault()
                onSaveEdit(draft)
              }
            }}
            rows={2}
            className="w-full resize-none rounded-lg border border-line bg-surface-soft px-2.5 py-1.5 text-[12.5px] text-ink outline-none"
          />
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSaveEdit(draft)}
              className="rounded-md bg-brand-blue px-2.5 py-1 text-[11.5px] font-semibold text-white"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="text-[11.5px] font-medium text-soft hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      <Avatar picture={message.picture} name={message.name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink">{message.name || message.email}</span>
          <span className="text-[11px] text-soft">{formatElapsed(message.createdAt)}</span>
          {message.editedAt && <span className="text-[11px] text-soft">(edited)</span>}
          {isOwn && (
            <button
              type="button"
              onClick={onStartEdit}
              className="text-[11px] font-medium text-brand-blue hover:underline"
            >
              Edit
            </button>
          )}
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink">
          {message.content}
        </p>
      </div>
    </div>
  )
}

function CommentThreadCard({ thread, zoom, currentUser, dispatch, onClose }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [reply, setReply] = useState('')
  const cardRef = useRef(null)
  const menuRef = useRef(null)

  // Alt+R / Alt+D only fire while this specific thread's card is the one
  // open - not a global shortcut, so they can't silently resolve/delete
  // whatever thread happened to be open somewhere off-screen.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!event.altKey) return
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        dispatch({ type: 'TOGGLE_COMMENT_THREAD_RESOLVED', threadId: thread.id })
      } else if (event.key === 'd' || event.key === 'D') {
        event.preventDefault()
        dispatch({ type: 'DELETE_COMMENT_THREAD', threadId: thread.id })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, thread.id])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (cardRef.current && !cardRef.current.contains(event.target)) onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [onClose])

  const submitReply = () => {
    const trimmed = reply.trim()
    if (!trimmed) return
    dispatch({
      type: 'ADD_COMMENT_REPLY',
      threadId: thread.id,
      content: trimmed,
      userId: currentUser.userId,
      email: currentUser.email,
      name: currentUser.name,
      picture: currentUser.picture,
    })
    setReply('')
  }

  return (
    <ZoomLocked zoom={zoom} x={thread.x} y={thread.y}>
      <div
        ref={cardRef}
        data-export-hidden
        onPointerDown={(event) => event.stopPropagation()}
        className="w-80 -translate-y-2 translate-x-3 overflow-hidden rounded-xl border border-line bg-white shadow-xl"
      >
        <div className="flex max-h-80 flex-col gap-3 overflow-y-auto p-3">
          {thread.messages.map((message, index) => (
            <div key={message.id} className={index === 0 ? '' : 'border-t border-line pt-3'}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <MessageRow
                    message={message}
                    isOwn={!currentUser.readOnly && message.userId === currentUser.userId}
                    isEditing={editingMessageId === message.id}
                    onStartEdit={() => setEditingMessageId(message.id)}
                    onSaveEdit={(content) => {
                      dispatch({ type: 'EDIT_COMMENT_MESSAGE', threadId: thread.id, messageId: message.id, content })
                      setEditingMessageId(null)
                    }}
                    onCancelEdit={() => setEditingMessageId(null)}
                  />
                </div>
                {index === 0 && !currentUser.readOnly && (
                  <div className="relative shrink-0">
                    <button
                      ref={menuRef}
                      type="button"
                      onClick={() => setMenuOpen((open) => !open)}
                      aria-label="Thread options"
                      aria-haspopup="true"
                      aria-expanded={menuOpen}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-soft transition-colors hover:bg-surface-soft hover:text-ink"
                    >
                      <MoreIcon />
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 top-7 z-10 w-44 rounded-lg border border-line bg-white p-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            dispatch({ type: 'TOGGLE_COMMENT_THREAD_RESOLVED', threadId: thread.id })
                            setMenuOpen(false)
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] font-medium text-ink hover:bg-surface-soft"
                        >
                          <span className="flex items-center gap-1.5">
                            <CheckIcon />
                            {thread.resolved ? 'Reopen Thread' : 'Resolve Thread'}
                          </span>
                          <span className="text-[10.5px] text-soft">Alt R</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            dispatch({ type: 'DELETE_COMMENT_THREAD', threadId: thread.id })
                            setMenuOpen(false)
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] font-medium text-rose-600 hover:bg-rose-50"
                        >
                          <span className="flex items-center gap-1.5">
                            <TrashIcon />
                            Delete Thread
                          </span>
                          <span className="text-[10.5px] text-soft">Alt D</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {!currentUser.readOnly && (
          <div className="flex items-center gap-2 border-t border-line bg-surface-soft/60 p-2.5">
            <Avatar picture={currentUser.picture} name={currentUser.name} size={22} />
            <input
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault()
                  submitReply()
                }
              }}
              placeholder="Reply… (Ctrl+↵ to submit)"
              className="min-w-0 flex-1 rounded-full border border-line bg-white px-3 py-1.5 text-[12.5px] text-ink outline-none placeholder:text-soft"
            />
            <button
              type="button"
              onClick={submitReply}
              disabled={!reply.trim()}
              aria-label="Send reply"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white transition-opacity disabled:opacity-40"
            >
              <SendIcon />
            </button>
          </div>
        )}
      </div>
    </ZoomLocked>
  )
}

// Pinned discussion threads, anywhere on the canvas - collapsed to a small
// pin (CommentPin) until clicked open (CommentThreadCard). Mounted as a
// sibling of ArrowLabels/Shape inside EditorCanvas's own scale(zoom) layer,
// so pins live in the same logical coordinate space shapes do and pan/zoom
// with everything else for free.
function CommentLayer({ zoom, pendingCommentPos, onCancelPending }) {
  const { state, dispatch, readOnly, userId, email, name, picture } = useDiagramEditorContext()

  const currentUser = { userId, email, name, picture, readOnly }

  return (
    <>
      {state.commentThreadOrder.map((id) => {
        const thread = state.commentThreads[id]
        const isActive = state.activeCommentThreadId === id
        return (
          <CommentPin
            key={id}
            thread={thread}
            zoom={zoom}
            isActive={isActive}
            onClick={() => dispatch({ type: 'SET_ACTIVE_COMMENT_THREAD', threadId: isActive ? null : id })}
          />
        )
      })}

      {state.activeCommentThreadId && state.commentThreads[state.activeCommentThreadId] && (
        <CommentThreadCard
          thread={state.commentThreads[state.activeCommentThreadId]}
          zoom={zoom}
          currentUser={currentUser}
          dispatch={dispatch}
          onClose={() => dispatch({ type: 'SET_ACTIVE_COMMENT_THREAD', threadId: null })}
        />
      )}

      {pendingCommentPos && !readOnly && (
        <NewCommentComposer
          x={pendingCommentPos.x}
          y={pendingCommentPos.y}
          zoom={zoom}
          picture={picture}
          name={name}
          onCancel={onCancelPending}
          onSubmit={(content) => {
            dispatch({
              type: 'ADD_COMMENT_THREAD',
              x: pendingCommentPos.x,
              y: pendingCommentPos.y,
              content,
              userId,
              email,
              name,
              picture,
            })
            onCancelPending()
          }}
        />
      )}
    </>
  )
}

export default CommentLayer
