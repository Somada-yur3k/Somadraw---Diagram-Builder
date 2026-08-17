import { SystemArchIcon } from './systemArchIcons'
import { NetworkIcon } from './networkIcons'
import { systemArchOwnShapeKeys, networkOwnShapeKeys } from './shapeCatalog'

// Small mini-swatch representing a shape type - shared by EditorSidebar's
// tool buttons and FloatingShapePreview's drag ghost, so both ever show the
// exact same icon for a given tool key.
function ShapeIcon({ toolKey }) {
  // System Architecture's and Network Diagram's shapes each cover far too
  // many distinct real-world concepts (browser, firewall, cache, gear...)
  // to each reduce to one of this file's usual colored-CSS-primitive
  // swatches the way a circle/square/diamond can - an actual line-icon
  // glyph (systemArchIcons.jsx/networkIcons.jsx, shared with the canvas
  // node itself) reads far better here, same reasoning the plain "T"
  // fallback below already breaks from the colored-box convention for the
  // text label tool.
  if (systemArchOwnShapeKeys.has(toolKey)) {
    return <SystemArchIcon type={toolKey} size={16} className="shrink-0 text-body" />
  }
  if (networkOwnShapeKeys.has(toolKey)) {
    return <NetworkIcon type={toolKey} size={16} className="shrink-0 text-body" />
  }
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
  if (toolKey === 'umlClass') {
    return (
      <span className="flex h-4 w-5 shrink-0 flex-col overflow-hidden rounded-xs border-2 border-slate-500/60 bg-white">
        <span className="h-[35%] w-full border-b border-slate-500/40 bg-slate-500/15" />
        <span className="h-[30%] w-full border-b border-slate-500/30" />
        <span className="h-[35%] w-full" />
      </span>
    )
  }
  if (toolKey === 'activity') {
    return <span className="h-3.5 w-5 shrink-0 rounded-full border-2 border-emerald-500/60 bg-emerald-500/10" />
  }
  if (toolKey === 'umlDecision') {
    return (
      <span className="relative flex h-4 w-5 shrink-0 items-center justify-center">
        <span className="absolute h-3 w-3 rotate-45 border-2 border-amber-500/60 bg-amber-500/10" />
      </span>
    )
  }
  if (toolKey === 'state') {
    return (
      <span className="flex h-4 w-5 shrink-0 flex-col overflow-hidden rounded-[7px] border-2 border-fuchsia-500/60 bg-fuchsia-500/10">
        <span className="h-1/2 w-full border-b border-fuchsia-500/40" />
        <span className="h-1/2 w-full" />
      </span>
    )
  }
  if (toolKey === 'initial') {
    return <span className="h-3 w-3 shrink-0 rounded-full bg-ink" />
  }
  if (toolKey === 'final') {
    return (
      <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 border-ink">
        <span className="h-[55%] w-[55%] rounded-full bg-ink" />
      </span>
    )
  }
  if (toolKey === 'forkJoinH') {
    return <span className="h-1 w-5 shrink-0 rounded-sm bg-ink" />
  }
  if (toolKey === 'forkJoinV') {
    return <span className="h-4 w-1 shrink-0 rounded-sm bg-ink" />
  }
  if (toolKey === 'swimlaneV1') {
    return (
      <span className="flex h-4 w-5 shrink-0 flex-col overflow-hidden rounded-xs border-2 border-cyan-600/60 bg-white">
        <span className="h-[30%] w-full bg-cyan-600" />
        <span className="h-[70%] w-full" />
      </span>
    )
  }
  // Columns side by side, each with its own solid header pinned to that
  // column's own top edge (an evenly-divided shared strip reads identically
  // to three separate per-column headers when the columns are equal width,
  // so this stays the simpler shared-strip markup).
  if (toolKey === 'swimlaneV3') {
    return (
      <span className="flex h-4 w-5 shrink-0 flex-col overflow-hidden rounded-xs border-2 border-cyan-600/60 bg-white">
        <span className="flex h-[30%] w-full bg-cyan-600">
          <span className="h-full w-1/3 border-r border-white/40" />
          <span className="h-full w-1/3 border-r border-white/40" />
          <span className="h-full w-1/3" />
        </span>
        <span className="flex h-[70%] w-full">
          <span className="h-full w-1/3 border-r border-cyan-600/25" />
          <span className="h-full w-1/3 border-r border-cyan-600/25" />
          <span className="h-full w-1/3" />
        </span>
      </span>
    )
  }
  // A horizontal row's own header sits on ITS left edge (not its top,
  // unlike a vertical column) - the standard pool/swimlane convention -
  // so this is swimlaneV1's icon rotated a quarter turn, not a copy of it.
  if (toolKey === 'swimlaneH1') {
    return (
      <span className="flex h-4 w-5 shrink-0 flex-row overflow-hidden rounded-xs border-2 border-cyan-600/60 bg-white">
        <span className="h-full w-[22%] bg-cyan-600" />
        <span className="h-full w-[78%]" />
      </span>
    )
  }
  if (toolKey === 'swimlaneH2') {
    return (
      <span className="flex h-4 w-5 shrink-0 flex-col overflow-hidden rounded-xs border-2 border-cyan-600/60 bg-white">
        <span className="flex h-1/2 w-full flex-row border-b border-cyan-600/40">
          <span className="h-full w-[22%] bg-cyan-600" />
          <span className="h-full w-[78%]" />
        </span>
        <span className="flex h-1/2 w-full flex-row">
          <span className="h-full w-[22%] bg-cyan-600" />
          <span className="h-full w-[78%]" />
        </span>
      </span>
    )
  }
  if (toolKey === 'erdTable') {
    return (
      <span className="flex h-4 w-5 shrink-0 flex-col overflow-hidden rounded-xs border-2 border-slate-500/60 bg-white">
        <span className="h-[30%] w-full bg-slate-500" />
        <span className="h-[23%] w-full border-b border-slate-500/30" />
        <span className="h-[23%] w-full border-b border-slate-500/30" />
        <span className="h-[24%] w-full" />
      </span>
    )
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
