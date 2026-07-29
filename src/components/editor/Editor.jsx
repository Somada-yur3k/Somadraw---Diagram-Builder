import { useRef } from 'react'
import { useDiagramEditor } from './useDiagramEditor'
import { DiagramEditorContext } from './DiagramEditorContext'
import EditorSidebar from './EditorSidebar'
import EditorTopbar from './EditorTopbar'
import EditorCanvas from './EditorCanvas'
import ShareButton from './ShareButton'
import ActiveUsersStack from './ActiveUsersStack'
import FloatingShapePreview from './FloatingShapePreview'

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
            full width back. */}
        {!readOnly && <EditorSidebar />}
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
