import { useRef, useState } from 'react'
import { useDiagramEditor } from './useDiagramEditor'
import { DiagramEditorContext } from './DiagramEditorContext'
import EditorSidebar from './EditorSidebar'
import EditorTopbar from './EditorTopbar'
import EditorCanvas from './EditorCanvas'
import ShareButton from './ShareButton'
import ActiveUsersStack from './ActiveUsersStack'
import FloatingShapePreview from './FloatingShapePreview'

function SidebarToggleIcon({ collapsed }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {collapsed ? <path d="m9 6 6 6-6 6" /> : <path d="m15 6-6 6 6 6" />}
    </svg>
  )
}

function Editor({ diagramId, initialData, diagramName, role = 'owner', email, name, picture }) {
  const {
    state,
    dispatch,
    canUndo,
    canRedo,
    saveStatus,
    readOnly,
    isDragging,
    cursors,
    activeUsers,
    updateCursor,
    clearCursor,
  } = useDiagramEditor(diagramId, initialData, role, email, name, picture)
  const canvasNodeRef = useRef(null)
  // Manual show/hide for the whole Tools + diagram-type sidebar, on top of
  // (not instead of) its own existing !readOnly gate below - a viewer still
  // never gets one regardless of this, since they have nothing to place/draw
  // with it in the first place.
  const [showSidebar, setShowSidebar] = useState(true)

  return (
    <DiagramEditorContext.Provider
      value={{
        state,
        dispatch,
        canUndo,
        canRedo,
        saveStatus,
        diagramId,
        diagramName,
        role,
        readOnly,
        isDragging,
        email,
        name,
        picture,
        cursors,
        activeUsers,
        updateCursor,
        clearCursor,
      }}
    >
      <div className="flex min-h-0 flex-1">
        {/* A viewer has nothing to place/draw - hiding the whole sidebar
            (rather than rendering it disabled) also gives their canvas the
            full width back. showSidebar is the same idea applied manually,
            for anyone else who wants that width back too (see the toggle
            strip just below). */}
        {!readOnly && showSidebar && <EditorSidebar />}
        {/* The toggle itself - its own thin strip between the sidebar and
            the topbar/canvas column, not tucked inside either one, so it
            stays reachable regardless of which way it was last toggled (a
            control tucked inside the sidebar would vanish along with it).
            Same !readOnly gate as the sidebar above: a viewer has nothing
            here to toggle. */}
        {!readOnly && (
          <div className="flex w-7 shrink-0 items-start justify-center border-r border-line bg-white pt-3">
            <button
              type="button"
              onClick={() => setShowSidebar((visible) => !visible)}
              title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
              aria-label={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
              aria-pressed={showSidebar}
              className="flex h-10 w-7 shrink-0 items-center justify-center rounded text-soft transition-colors hover:bg-surface-soft hover:text-ink"
            >
              <SidebarToggleIcon collapsed={!showSidebar} />
            </button>
          </div>
        )}
        <FloatingShapePreview />
        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* Docked top nav bar, not a floating pill - own row in normal
              flow, ahead of the canvas, so it pushes the canvas down instead
              of overlaying it (see EditorTopbar's own comment). */}
          <EditorTopbar canvasNodeRef={canvasNodeRef} />
          <EditorCanvas canvasNodeRef={canvasNodeRef} />
          <div className="fixed right-4 bottom-4 z-20 flex items-center gap-2">
            <ActiveUsersStack />
            {role === 'owner' && <ShareButton />}
          </div>
        </div>
      </div>
    </DiagramEditorContext.Provider>
  )
}

export default Editor
