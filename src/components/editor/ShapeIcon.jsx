// Small mini-swatch representing a shape type - shared by EditorSidebar's
// tool buttons and FloatingShapePreview's drag ghost, so both ever show the
// exact same icon for a given tool key.
function ShapeIcon({ toolKey }) {
  if (toolKey === 'entity') {
    return <span className="h-3.5 w-5 shrink-0 rounded border-2 border-brand-blue/60 bg-brand-blue/10" />
  }
  if (toolKey === 'process') {
    return <span className="h-3.5 w-5 shrink-0 rounded-[3px] border-2 border-brand-purple/60 bg-brand-purple/10" />
  }
  if (toolKey === 'store') {
    return <span className="h-3.5 w-5 shrink-0 border-y-2 border-brand-pink/60 bg-brand-pink/10" />
  }
  if (toolKey === 'flowProcess') {
    return <span className="h-3.5 w-5 shrink-0 rounded-[3px] border-2 border-teal-500/60 bg-teal-500/10" />
  }
  if (toolKey === 'decision') {
    return (
      <span className="relative flex h-4 w-5 shrink-0 items-center justify-center">
        <span className="absolute h-3 w-3 rotate-45 border-2 border-amber-500/60 bg-amber-500/10" />
      </span>
    )
  }
  if (toolKey === 'terminator') {
    return <span className="h-3.5 w-5 shrink-0 rounded-full border-2 border-slate-500/60 bg-slate-500/10" />
  }
  if (toolKey === 'inputOutput') {
    return (
      <span
        className="h-3.5 w-5 shrink-0 border-2 border-cyan-500/60 bg-cyan-500/10"
        style={{ transform: 'skewX(-12deg)' }}
      />
    )
  }
  if (toolKey === 'actor') {
    return (
      <svg width="14" height="16" viewBox="0 0 24 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-indigo-500">
        <circle cx="12" cy="5" r="4" />
        <line x1="12" y1="9" x2="12" y2="19" />
        <line x1="4" y1="13" x2="20" y2="13" />
        <line x1="12" y1="19" x2="5" y2="27" />
        <line x1="12" y1="19" x2="19" y2="27" />
      </svg>
    )
  }
  if (toolKey === 'usecase') {
    return <span className="h-3.5 w-5 shrink-0 rounded-full border-2 border-sky-500/60 bg-sky-500/10" />
  }
  if (toolKey === 'boundary') {
    return <span className="h-3.5 w-5 shrink-0 rounded-[3px] border-2 border-slate-400/60 bg-slate-400/10" />
  }
  if (toolKey === 'circle') {
    return <span className="h-4 w-4 shrink-0 rounded-full border-2 border-brand-blue/60 bg-brand-blue/10" />
  }
  if (toolKey === 'square') {
    return <span className="h-4 w-4 shrink-0 border-2 border-brand-purple/60 bg-brand-purple/10" />
  }
  if (toolKey === 'rectangle') {
    return <span className="h-3.5 w-5 shrink-0 border-2 border-teal-500/60 bg-teal-500/10" />
  }
  if (toolKey === 'triangle') {
    return (
      <span
        className="h-3.5 w-4 shrink-0 border-2 border-amber-500/60 bg-amber-500/10"
        style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}
      />
    )
  }
  if (toolKey === 'diamond') {
    return (
      <span
        className="h-4 w-4 shrink-0 border-2 border-slate-500/60 bg-slate-500/10"
        style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
      />
    )
  }
  return <span className="flex h-3.5 w-5 shrink-0 items-center justify-center text-[10px] font-bold text-body">T</span>
}

export default ShapeIcon
