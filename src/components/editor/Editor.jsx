import { useRef } from 'react'
import { useDiagramEditor } from './useDiagramEditor'
import { DiagramEditorContext } from './DiagramEditorContext'
import EditorSidebar from './EditorSidebar'
import EditorTopbar from './EditorTopbar'
import EditorCanvas from './EditorCanvas'
import EditorExportPanel from './EditorExportPanel'

function Editor({ diagramId, initialData, diagramName }) {
  const { state, dispatch, canUndo, canRedo, saveStatus } = useDiagramEditor(diagramId, initialData)
  const canvasNodeRef = useRef(null)

  return (
    <DiagramEditorContext.Provider
      value={{ state, dispatch, canUndo, canRedo, saveStatus, diagramId, diagramName }}
    >
      <div className="flex min-h-0 flex-1">
        <EditorSidebar />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <EditorCanvas canvasNodeRef={canvasNodeRef} />
          <EditorTopbar />
          <EditorExportPanel canvasRef={canvasNodeRef} />
        </div>
      </div>
    </DiagramEditorContext.Provider>
  )
}

export default Editor
