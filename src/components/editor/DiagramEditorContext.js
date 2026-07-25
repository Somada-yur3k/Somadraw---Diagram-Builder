import { createContext, useContext } from 'react'

export const DiagramEditorContext = createContext(null)

export function useDiagramEditorContext() {
  const ctx = useContext(DiagramEditorContext)
  if (!ctx) {
    throw new Error(
      'useDiagramEditorContext must be used within a DiagramEditorContext.Provider',
    )
  }
  return ctx
}
