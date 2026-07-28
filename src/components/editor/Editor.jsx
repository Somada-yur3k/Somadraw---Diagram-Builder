import { useRef } from 'react'
import { useDiagramEditor } from './useDiagramEditor'
import { DiagramEditorContext } from './DiagramEditorContext'
import EditorSidebar from './EditorSidebar'
import EditorTopbar from './EditorTopbar'
import EditorCanvas from './EditorCanvas'
import ShareButton from './ShareButton'
import ActiveUsersStack from './ActiveUsersStack'

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
        <div className="relative flex min-w-0 flex-1 flex-col">
          <EditorCanvas canvasNodeRef={canvasNodeRef} />
          <EditorTopbar />
          {/* PDF export hidden for now - EditorExportPanel.jsx/pdfExport.js
              are untouched, just not mounted, so this is a one-line revert
              when it's ready to come back. */}
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
