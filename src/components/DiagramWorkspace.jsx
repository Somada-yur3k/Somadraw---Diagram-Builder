import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import LoadingScreen from './LoadingScreen'
import Editor from './editor/Editor'

// Supabase reads are async, unlike the old synchronous sessionStorage read -
// this component owns the fetch-and-wait so useDiagramEditor itself can stay
// a plain, synchronous, testable reducer hook (see useDiagramEditor.js).
function DiagramWorkspace() {
  const { diagramId } = useParams()
  const navigate = useNavigate()
  // Tagged with the diagramId it was fetched for, so "loading" is a derived
  // value (result missing, or stale from a previous id) rather than a
  // separate piece of state that has to be reset by calling setState
  // directly inside the fetch effect's body.
  const [result, setResult] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('diagrams')
      .select('data, name')
      .eq('id', diagramId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        setResult({ diagramId, diagram: error ? null : data })
      })
    return () => {
      cancelled = true
    }
  }, [diagramId])

  const isLoading = !result || result.diagramId !== diagramId
  const notFound = !isLoading && !result.diagram

  // A missing row is indistinguishable (by design, via RLS) between "deleted"
  // and "not yours" - either way, there's nothing valid to show here.
  useEffect(() => {
    if (notFound) navigate('/workspace', { replace: true })
  }, [notFound, navigate])

  if (isLoading) return <LoadingScreen message="Loading your diagram…" />
  if (notFound) return null

  // `key` forces a full remount (fresh useDiagramEditor instance) whenever
  // the open diagram changes, instead of the same Editor instance being
  // reused with swapped-in data - this is what guarantees a pending
  // autosave timer for the previous diagram gets flushed-then-cancelled via
  // its own unmount, rather than racing against the newly opened one.
  return (
    <Editor
      key={diagramId}
      diagramId={diagramId}
      initialData={result.diagram.data}
      diagramName={result.diagram.name}
    />
  )
}

export default DiagramWorkspace
