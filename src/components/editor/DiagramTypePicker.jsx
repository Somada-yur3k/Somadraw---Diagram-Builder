import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import ShapeIcon from './ShapeIcon'
import { diagramTypeGroups, groupShapesByCategory } from './shapeCatalog'

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

// Same size/shell as SettingsModal - a "pick your diagram type" decision
// deserves the same room to browse as Settings does, not a cramped
// dropdown, now that it also has to show every element inside each
// category rather than just a flat list of five names.
function DiagramTypePicker({ activeDiagramType, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  // Which category the right pane is currently showing - independent of
  // activeDiagramType (the diagram actually applied to the sidebar/canvas)
  // so browsing other categories here is just a preview, with nothing
  // committed until onSelect actually fires.
  const [previewKey, setPreviewKey] = useState(activeDiagramType ?? diagramTypeGroups[0].key)
  const previewGroup =
    diagramTypeGroups.find((group) => group.key === previewKey) ?? diagramTypeGroups[0]
  // [{ category, shapes }] - category is null for every diagram type
  // except System Architecture (the only one large enough to need
  // sub-sections at all), in which case this is just one untitled group
  // and renders as the same flat grid it always has.
  const shapeCategories = useMemo(
    () => groupShapesByCategory(previewGroup.shapes),
    [previewGroup],
  )

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return diagramTypeGroups
    return diagramTypeGroups.filter((group) => group.label.toLowerCase().includes(q))
  }, [query])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-ink/30 p-3 sm:p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="flex h-[min(700px,88vh)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl sm:max-w-5xl">
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4 sm:px-8">
          <h1 className="text-[19px] font-bold text-ink">Select Diagram</h1>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface-soft"
          >
            Close
            <span className="rounded border border-line bg-surface-soft px-1.5 py-0.5 text-[10.5px] font-medium text-soft">
              Esc
            </span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <div className="flex w-full shrink-0 flex-col border-b border-line p-4 sm:w-64 sm:border-b-0 sm:border-r">
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-soft">
                <SearchIcon />
              </span>
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search diagram types…"
                className="w-full rounded-lg border border-line bg-surface-soft py-2 pl-8 pr-3 text-[13px] text-ink outline-none placeholder:text-soft focus:border-brand-blue/40"
              />
            </div>

            <div className="mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
              {filteredGroups.length === 0 && (
                <p className="px-2 py-6 text-center text-[12.5px] text-soft">
                  No diagram types match "{query}".
                </p>
              )}
              {filteredGroups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setPreviewKey(group.key)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors ${
                    previewKey === group.key
                      ? 'bg-brand-blue text-white'
                      : 'text-body hover:bg-surface-soft hover:text-ink'
                  }`}
                >
                  <ShapeIcon toolKey={group.iconKey} />
                  <span className="min-w-0 flex-1 truncate">{group.label}</span>
                  {activeDiagramType === group.key && (
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide ${
                        previewKey === group.key ? 'bg-white/20 text-white' : 'bg-brand-blue/10 text-brand-blue'
                      }`}
                    >
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-semibold text-ink">{previewGroup.label}</h2>
                <p className="mt-0.5 text-[12.5px] text-soft">
                  {previewGroup.shapes.length} element{previewGroup.shapes.length === 1 ? '' : 's'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelect(previewGroup.key)}
                className="gradient-bg rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Use This Diagram
              </button>
            </div>

            {/* Clicking a specific element (not just the category) both
                switches the active diagram type and pre-selects that
                element's tool - a small shortcut for "I already know I want
                to start with a Process shape," not just "show me this
                category." Grouped under its own category label wherever
                the diagram type actually has categories (System
                Architecture only, currently) - every other diagram type
                fits comfortably as one flat grid and renders exactly as
                before (shapeCategories collapses to a single untitled
                group for those). */}
            {shapeCategories.map((group) => (
              <div key={group.category ?? 'ungrouped'} className="mt-6">
                {group.category && (
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-soft">
                    {group.category}
                  </p>
                )}
                <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 ${group.category ? 'mt-2.5' : ''}`}>
                  {group.shapes.map((shape) => (
                    <button
                      key={shape.key}
                      type="button"
                      onClick={() => onSelect(previewGroup.key, shape.key)}
                      className="flex flex-col items-center gap-2 rounded-xl border border-line p-4 text-center transition-colors hover:border-brand-blue/40 hover:bg-brand-blue/5"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-soft">
                        <ShapeIcon toolKey={shape.key} />
                      </span>
                      <span className="text-[12.5px] font-medium text-ink">{shape.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default DiagramTypePicker
