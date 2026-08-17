import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabaseClient'
import { createBlankDiagramData } from './editor/useDiagramEditor'
import AnnouncementBanner from './AnnouncementBanner'

function WorkspaceHome() {
  const navigate = useNavigate()

  const handleCreate = async () => {
    const { data, error } = await supabase
      .from('diagrams')
      .insert({ data: createBlankDiagramData() })
      .select('id')
      .single()
    if (!error && data) navigate(`/workspace/${data.id}`)
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-3 px-6 py-6 text-center">
      <AnnouncementBanner />
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          Select a diagram, or start a new one
        </h1>
        <p className="max-w-sm text-[14px] text-soft">
          Your diagrams live in the sidebar. Pick one up where you left off, or create a fresh
          canvas.
        </p>
        <button
          type="button"
          onClick={handleCreate}
          className="mt-2 rounded-lg bg-brand-blue px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-brand-blue/90"
        >
          + New diagram
        </button>
      </div>
    </div>
  )
}

export default WorkspaceHome
