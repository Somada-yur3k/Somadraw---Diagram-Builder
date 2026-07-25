import { useEffect, useRef, useState } from 'react'

function selectAllText(el) {
  if (!el) return
  const range = document.createRange()
  range.selectNodeContents(el)
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
}

const DOUBLE_CLICK_MS = 400

function EditableText({ value, onCommit, className, style, placeholder, disableDblClick = false }) {
  const ref = useRef(null)
  const [editing, setEditing] = useState(false)
  const lastPointerDownAt = useRef(0)

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus()
      selectAllText(ref.current)
    }
  }, [editing])

  // Native dblclick isn't reliable here: an ancestor calls setPointerCapture
  // on pointerdown for dragging, which can redirect the second click's event
  // target away from this element. Detect the double-click ourselves from
  // pointerdown timing instead.
  const handlePointerDown = (event) => {
    // A shift-click is a selection-toggle gesture (see Shape.jsx), never a
    // rename - bail without touching the double-click timer so it doesn't
    // get misread as (half of) a double-click by a nearby plain click.
    if (editing || disableDblClick || event.shiftKey) return
    const now = Date.now()
    const isDoubleClick = now - lastPointerDownAt.current < DOUBLE_CLICK_MS
    lastPointerDownAt.current = now
    if (isDoubleClick) {
      event.stopPropagation()
      event.preventDefault()
      setEditing(true)
    }
  }

  return (
    <div
      ref={ref}
      data-no-drag={editing ? '' : undefined}
      contentEditable={editing}
      suppressContentEditableWarning
      onPointerDown={handlePointerDown}
      onBlur={() => {
        setEditing(false)
        onCommit(ref.current?.textContent.trim() || '')
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          ref.current?.blur()
        }
        if (event.key === 'Escape') {
          if (ref.current) ref.current.textContent = value
          ref.current?.blur()
        }
      }}
      className={`${className} ${editing ? 'cursor-text outline-none' : 'cursor-default'}`}
      style={style}
    >
      {value || placeholder}
    </div>
  )
}

export default EditableText
