import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import somadrawLogo from '../assets/SomadrawLogo.png'
import { supabase } from '../lib/supabaseClient'
import { usePopoverState } from '../lib/usePopoverState'
import { createBlankDiagramData } from './editor/useDiagramEditor'

const SETTINGS_PANEL_WIDTH = 224
const SETTINGS_PANEL_MARGIN = 16

// The Settings button sits at the bottom-left of the screen (desktop
// sidebar footer, or the mobile drawer), where the shared hook's default
// "centered below the trigger" placement would frequently run the panel
// off the bottom or left edge of the viewport. Opening to the trigger's
// right and growing upward from its bottom edge (rather than down from its
// top) keeps the panel on-screen regardless of sidebar width (collapsed,
// expanded, or the mobile drawer) or viewport height - the horizontal
// clamp additionally protects the mobile drawer case, where the trigger's
// own right edge can sit close to (or past, on very narrow phones) the
// panel's required width.
function computeSettingsPos(rect) {
  const left = Math.min(
    rect.right + 8,
    window.innerWidth - SETTINGS_PANEL_WIDTH - SETTINGS_PANEL_MARGIN,
  )
  return {
    left: Math.max(SETTINGS_PANEL_MARGIN, left),
    bottom: window.innerHeight - rect.bottom,
  }
}

function Logo() {
  return (
    <img
      src={somadrawLogo}
      alt=""
      className="h-8 w-8 shrink-0 object-contain"
    />
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

function AccountIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  )
}

function DeveloperIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="m8 6-5 6 5 6M16 6l5 6-5 6" />
    </svg>
  )
}

function LogOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

function PanelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

const RELATIVE_UNITS = [
  { limit: 60, divisor: 1, label: 'just now', always: false },
  { limit: 3600, divisor: 60, label: 'm ago' },
  { limit: 86400, divisor: 3600, label: 'h ago' },
  { limit: 604800, divisor: 86400, label: 'd ago' },
]

function formatRelativeTime(isoString) {
  const seconds = Math.max(0, (Date.now() - new Date(isoString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  for (const unit of RELATIVE_UNITS.slice(1)) {
    if (seconds < unit.limit) return `${Math.floor(seconds / unit.divisor)}${unit.label}`
  }
  return new Date(isoString).toLocaleDateString()
}

function DeleteDiagramDialog({ name, onCancel, onConfirm }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="text-[16px] font-semibold text-ink">Delete "{name}"?</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-soft">
          This will permanently delete this diagram. This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line px-3.5 py-2 text-[13.5px] font-medium text-ink transition-colors hover:bg-surface-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-rose-600 px-3.5 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-rose-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function SignOutConfirmDialog({ onCancel, onConfirm }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="text-[16px] font-semibold text-ink">Sign out?</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-soft">
          You'll need to sign in again to get back to your diagrams.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line px-3.5 py-2 text-[13.5px] font-medium text-ink transition-colors hover:bg-surface-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-rose-600 px-3.5 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-rose-700"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

function DiagramListItem({ diagram, isActive, onOpen, onRename, onDelete }) {
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState(diagram.name)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const commitRename = () => {
    setRenaming(false)
    const trimmed = draftName.trim()
    if (trimmed && trimmed !== diagram.name) onRename(trimmed)
    else setDraftName(diagram.name)
  }

  if (renaming) {
    return (
      <input
        autoFocus
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
        onFocus={(event) => event.target.select()}
        onBlur={commitRename}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            setDraftName(diagram.name)
            setRenaming(false)
          }
        }}
        className="w-full rounded-lg border border-brand-purple/40 px-3 py-2 text-[13.5px] font-medium text-ink outline-none"
      />
    )
  }

  return (
    <div
      className={`group flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors ${
        isActive ? 'bg-surface-soft text-ink' : 'text-body hover:bg-surface-soft hover:text-ink'
      }`}
    >
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="truncate font-medium">{diagram.name}</p>
        <p className="truncate text-[11.5px] text-soft">{formatRelativeTime(diagram.updated_at)}</p>
      </button>
      <button
        type="button"
        onClick={() => setRenaming(true)}
        title="Rename"
        aria-label="Rename diagram"
        className="hidden h-6 w-6 shrink-0 items-center justify-center rounded text-soft hover:bg-white hover:text-ink group-hover:flex"
      >
        <PencilIcon />
      </button>
      <button
        type="button"
        onClick={() => setConfirmingDelete(true)}
        title="Delete"
        aria-label="Delete diagram"
        className="hidden h-6 w-6 shrink-0 items-center justify-center rounded text-soft hover:bg-white hover:text-rose-500 group-hover:flex"
      >
        <TrashIcon />
      </button>

      {confirmingDelete && (
        <DeleteDiagramDialog
          name={diagram.name}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => {
            setConfirmingDelete(false)
            onDelete()
          }}
        />
      )}
    </div>
  )
}

function SidebarBody({
  variant,
  collapsed,
  diagrams,
  activeDiagramId,
  onOpenDiagram,
  onNewDiagram,
  onRenameDiagram,
  onDeleteDiagram,
  onSignOut,
  onToggleCollapse,
  onCloseMobile,
}) {
  const isMobile = variant === 'mobile'
  const showLabels = isMobile || !collapsed
  const navigate = useNavigate()
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const visibleDiagrams = diagrams.filter((diagram) =>
    diagram.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  )

  const settingsTriggerRef = useRef(null)
  const settingsPanelRef = useRef(null)
  const settingsPopover = usePopoverState(settingsTriggerRef, settingsPanelRef, computeSettingsPos)

  const goToSettingsPage = (path) => {
    settingsPopover.close()
    navigate(path)
    if (isMobile) onCloseMobile()
  }

  const itemClass = (active) =>
    `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors ${
      active ? 'bg-surface-soft text-ink' : 'text-body hover:bg-surface-soft hover:text-ink'
    } ${showLabels ? '' : 'justify-center px-0'}`

  const settingsMenuItemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-body transition-colors hover:bg-surface-soft hover:text-ink'

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 py-4">
        {showLabels && (
          <>
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight text-ink">
              Somadraw
            </span>
          </>
        )}
        <button
          type="button"
          onClick={isMobile ? onCloseMobile : onToggleCollapse}
          aria-label={isMobile ? 'Close menu' : 'Toggle sidebar'}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-body hover:bg-surface-soft hover:text-ink"
        >
          {isMobile ? <XIcon /> : <PanelIcon />}
        </button>
      </div>

      <div className="px-2">
        <button
          type="button"
          title="New diagram"
          onClick={onNewDiagram}
          className={itemClass(false)}
        >
          <PlusIcon />
          {showLabels && <span>New diagram</span>}
        </button>
      </div>

      {showLabels && (
        <div className="mt-2 px-2">
          <div className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-soft focus-within:border-brand-purple/40">
            <SearchIcon />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search diagrams"
              aria-label="Search diagrams"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-soft"
            />
          </div>
        </div>
      )}

      {showLabels && (
        <nav className="mt-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2">
          {visibleDiagrams.map((diagram) => (
            <DiagramListItem
              key={diagram.id}
              diagram={diagram}
              isActive={diagram.id === activeDiagramId}
              onOpen={() => onOpenDiagram(diagram.id)}
              onRename={(name) => onRenameDiagram(diagram.id, name)}
              onDelete={() => onDeleteDiagram(diagram.id)}
            />
          ))}
          {visibleDiagrams.length === 0 && (
            <p className="px-3 py-2 text-[13px] text-soft">No diagrams found.</p>
          )}
        </nav>
      )}
      {!showLabels && <div className="flex-1" />}

      <div className="border-t border-line p-2">
        <button
          ref={settingsTriggerRef}
          type="button"
          title={showLabels ? undefined : 'Settings'}
          onClick={settingsPopover.toggle}
          aria-haspopup="true"
          aria-expanded={settingsPopover.open}
          className={itemClass(settingsPopover.open)}
        >
          <SettingsIcon />
          {showLabels && <span>Settings</span>}
        </button>

        {settingsPopover.open &&
          settingsPopover.pos &&
          createPortal(
            <div
              ref={settingsPanelRef}
              className="fixed z-60 w-56 rounded-2xl border border-line bg-white p-1.5 shadow-lg"
              style={settingsPopover.pos}
            >
              <button
                type="button"
                onClick={() => goToSettingsPage('/workspace/settings')}
                className={settingsMenuItemClass}
              >
                <AccountIcon />
                <span>Account Info</span>
              </button>
              <button
                type="button"
                onClick={() => goToSettingsPage('/workspace/developer')}
                className={settingsMenuItemClass}
              >
                <DeveloperIcon />
                <span>Developer</span>
              </button>
            </div>,
            document.body,
          )}

        <button
          type="button"
          title={showLabels ? undefined : 'Sign out'}
          onClick={() => setConfirmingSignOut(true)}
          className={itemClass(false)}
        >
          <LogOutIcon />
          {showLabels && <span>Sign out</span>}
        </button>

        {confirmingSignOut && (
          <SignOutConfirmDialog
            onCancel={() => setConfirmingSignOut(false)}
            onConfirm={() => {
              setConfirmingSignOut(false)
              onSignOut()
            }}
          />
        )}
      </div>
    </div>
  )
}

function DashboardSidebar({ onSignOut, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const [diagrams, setDiagrams] = useState([])
  const navigate = useNavigate()
  const location = useLocation()

  const isSettingsActive =
    location.pathname === '/workspace/settings' || location.pathname === '/workspace/developer'
  const diagramIdMatch = !isSettingsActive && location.pathname.match(/^\/workspace\/([^/]+)$/)
  const activeDiagramId = diagramIdMatch ? diagramIdMatch[1] : null

  function fetchDiagrams() {
    return supabase
      .from('diagrams')
      .select('id, name, updated_at')
      .order('updated_at', { ascending: false })
  }

  // Re-fetch whenever the open diagram changes, so a just-created/renamed
  // diagram's updated_at-driven ordering and name stay in sync with what's
  // actually open, without needing a realtime subscription for v1.
  useEffect(() => {
    let cancelled = false
    fetchDiagrams().then(({ data, error }) => {
      if (cancelled || error) return
      setDiagrams(data ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [activeDiagramId])

  const refreshDiagrams = async () => {
    const { data, error } = await fetchDiagrams()
    if (!error) setDiagrams(data ?? [])
  }

  const handleNewDiagram = async () => {
    const { data, error } = await supabase
      .from('diagrams')
      .insert({ data: createBlankDiagramData() })
      .select('id')
      .single()
    if (!error && data) {
      await refreshDiagrams()
      navigate(`/workspace/${data.id}`)
    }
  }

  const handleRenameDiagram = async (id, name) => {
    setDiagrams((current) => current.map((d) => (d.id === id ? { ...d, name } : d)))
    await supabase.from('diagrams').update({ name }).eq('id', id)
  }

  const handleDeleteDiagram = async (id) => {
    await supabase.from('diagrams').delete().eq('id', id)
    await refreshDiagrams()
    if (id === activeDiagramId) navigate('/workspace')
  }

  const sharedProps = {
    diagrams,
    activeDiagramId,
    onOpenDiagram: (id) => navigate(`/workspace/${id}`),
    onNewDiagram: handleNewDiagram,
    onRenameDiagram: handleRenameDiagram,
    onDeleteDiagram: handleDeleteDiagram,
    onSignOut,
  }

  return (
    <>
      <aside
        className={`hidden shrink-0 border-r border-line bg-white transition-[width] duration-200 md:flex md:flex-col ${
          collapsed ? 'md:w-[4.5rem]' : 'md:w-64'
        }`}
      >
        <SidebarBody
          variant="desktop"
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          {...sharedProps}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-ink/30"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80vw] bg-white shadow-lg">
            <SidebarBody
              variant="mobile"
              collapsed={false}
              onCloseMobile={onCloseMobile}
              {...sharedProps}
              onOpenDiagram={(id) => {
                sharedProps.onOpenDiagram(id)
                onCloseMobile()
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}

export default DashboardSidebar
