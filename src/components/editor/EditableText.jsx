import { useEffect, useRef, useState } from 'react'

function selectAllText(el) {
  if (!el) return
  const range = document.createRange()
  range.selectNodeContents(el)
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
}

// Inserts a literal "\n" text node at the caret (rather than
// document.execCommand, which is deprecated) so a plain-text commit via
// .textContent picks it up as-is - no <br>/<div> normalization needed on
// the way out. Rendering it as a visible line break is up to the caller's
// className (e.g. whitespace-pre-wrap); this only affects the underlying text.
function insertLineBreakAtCaret() {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  range.deleteContents()
  const newline = document.createTextNode('\n')
  range.insertNode(newline)
  range.setStartAfter(newline)
  range.setEndAfter(newline)
  selection.removeAllRanges()
  selection.addRange(range)
}

const DOUBLE_CLICK_MS = 400

function EditableText({
  value,
  onCommit,
  className,
  style,
  placeholder,
  disableDblClick = false,
  // A shape's placeholder is its type's own default text ("Entity",
  // "Process"...) - the exact string `value` itself starts as when the
  // shape is first placed. Without this, clearing the text (double-click,
  // select-all, delete, click away) commits an empty value but then
  // immediately falls back to showing that same placeholder, making the
  // shape look untouched - there was no way to actually leave a shape
  // blank. With this on, an empty value only shows the placeholder while
  // actively being edited (a normal contentEditable typing hint); once
  // blurred, empty means empty. Arrow labels don't set this - they're only
  // ever mounted at all while selected or already labeled (see
  // ArrowLabels.jsx), where the placeholder acts as a persistent "click to
  // add a label" invitation rather than a stand-in for a real default value.
  placeholderOnlyWhileEditing = false,
}) {
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
          // Shift+Enter adds a row (2+ lines of text); plain Enter still
          // commits and blurs, same as elsewhere.
          if (event.shiftKey) {
            insertLineBreakAtCaret()
          } else {
            ref.current?.blur()
          }
        }
        if (event.key === 'Escape') {
          if (ref.current) ref.current.textContent = value
          ref.current?.blur()
        }
      }}
      // min-h-[1em]: a genuinely blank value (see placeholderOnlyWhileEditing
      // above) renders no text at all while idle - without a floor on its
      // own height, this div collapses to 0px and effectively disappears as
      // a click target, leaving no way to double-click back into it to add
      // a label again. Harmless when there's real content (already taller
      // than one line's worth) or a placeholder showing.
      className={`min-h-[1em] ${className} ${editing ? 'cursor-text outline-none' : 'cursor-default'}`}
      style={style}
    >
      {value || (placeholderOnlyWhileEditing && !editing ? '' : placeholder)}
    </div>
  )
}

export default EditableText
