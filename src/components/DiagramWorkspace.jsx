import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router'
import { supabase } from '../lib/supabaseClient'
import { getDisplayUser } from '../lib/userDisplay'
import LoadingScreen from './LoadingScreen'
import Editor from './editor/Editor'

// Supabase reads are async, unlike the old synchronous sessionStorage read -
// this component owns the fetch-and-wait so useDiagramEditor itself can stay
// a plain, synchronous, testable reducer hook (see useDiagramEditor.js).
function DiagramWorkspace() {
  const { diagramId } = useParams()
  const navigate = useNavigate()
  const { user } = useOutletContext()
  const { name, email, picture } = getDisplayUser(user)
  // Tagged with the diagramId it was fetched for, so "loading" is a derived
  // value (result missing, or stale from a previous id) rather than a
  // separate piece of state that has to be reset by calling setState
  // directly inside the fetch effect's body.
  const [result, setResult] = useState(null)

  useEffect(() => {
    let cancelled = false
    // join_shared_diagram (see supabase/schema.sql) replaces a plain
    // select() here - it transparently handles all three cases (owner,
    // already-a-collaborator, brand-new joiner via a share link) and
    // returns each one's current role along with the diagram, without this
    // component needing to know which case applies up front.
    supabase
      .rpc('join_shared_diagram', { p_diagram_id: diagramId })
      .then(({ data, error }) => {
        if (cancelled) return
        setResult({ diagramId, diagram: error ? null : (data?.[0] ?? null) })
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
      role={result.diagram.role}
      email={email}
      name={name}
      picture={picture}
    />
  )
}

export default DiagramWorkspace
