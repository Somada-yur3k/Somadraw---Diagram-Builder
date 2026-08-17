// One label + one key-combo per row, grouped under a section heading.
// Sourced from every real keydown handler across the editor
// (EditorCanvas.jsx's global listener, CommentLayer.jsx's own,
// EditableText.jsx's own) - kept in sync by hand, same as every other
// "this app's own reference of itself" constant (PLACEABLE_SHAPE_LABEL_BY_KEY,
// DEFAULT_TEXT, etc.) rather than generated, since there's no single
// registry these handlers already report themselves into. Shared between
// SettingsModal.jsx's own Keyboard Shortcuts tab and DocsPage.jsx so the two
// can't quietly drift out of sync with each other.
export const SHORTCUT_GROUPS = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], label: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], label: 'Redo' },
      { keys: ['Ctrl', 'Y'], label: 'Redo (alternate)' },
      { keys: ['Ctrl', 'C'], label: 'Copy' },
      { keys: ['Ctrl', 'V'], label: 'Paste' },
      { keys: ['Ctrl', 'D'], label: 'Duplicate' },
      { keys: ['Ctrl', 'A'], label: 'Select all' },
      { keys: ['Delete'], label: 'Delete selection' },
    ],
  },
  {
    title: 'Selection & Arrange',
    shortcuts: [
      { keys: ['Ctrl', 'G'], label: 'Group' },
      { keys: ['Ctrl', 'Shift', 'G'], label: 'Ungroup' },
      { keys: ['Ctrl', 'Shift', 'L'], label: 'Lock / unlock' },
      { keys: ['Ctrl', ']'], label: 'Bring forward' },
      { keys: ['Ctrl', '['], label: 'Send backward' },
      { keys: ['Ctrl', 'Shift', ']'], label: 'Bring to front' },
      { keys: ['Ctrl', 'Shift', '['], label: 'Send to back' },
      { keys: ['↑', '↓', '←', '→'], label: 'Nudge selection (1px)' },
      { keys: ['Shift', '↑↓←→'], label: 'Nudge selection (10px)' },
      { keys: ['Esc'], label: 'Cancel drawing an arrow' },
    ],
  },
  {
    title: 'Zoom',
    shortcuts: [{ keys: ['Ctrl', 'Scroll'], label: 'Zoom in / out' }],
  },
  {
    title: 'Text editing',
    shortcuts: [
      { keys: ['Enter'], label: 'Confirm text' },
      { keys: ['Shift', 'Enter'], label: 'New line' },
      { keys: ['Esc'], label: 'Cancel edit' },
    ],
  },
  {
    title: 'Comments',
    shortcuts: [
      { keys: ['Alt', 'R'], label: 'Resolve / reopen thread' },
      { keys: ['Alt', 'D'], label: 'Delete thread' },
      { keys: ['Ctrl', 'Enter'], label: 'Submit comment / reply' },
    ],
  },
]
