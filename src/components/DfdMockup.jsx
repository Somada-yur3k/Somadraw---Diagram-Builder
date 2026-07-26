// Real DFD notation, not generic chips - deliberately reuses the exact
// class strings the editor's own Shape.jsx uses for entity/process/store
// (see ShapeBody there) so this Hero mockup reads as an honest preview of
// what a diagram actually looks like, not a stand-in illustration.
function EntityNode({ children, floatClassName }) {
  return (
    <div className={`flex h-10 w-24 items-center justify-center rounded-lg border-2 border-brand-blue/50 bg-brand-blue/6 shadow-sm ${floatClassName}`}>
      <span className="px-1.5 text-center text-[10.5px] font-semibold uppercase tracking-wide text-ink">
        {children}
      </span>
    </div>
  )
}

function ProcessNode({ badge, children, floatClassName }) {
  return (
    <div className={`flex h-[52px] w-28 flex-col overflow-hidden rounded-xl border-2 border-brand-purple shadow-sm ${floatClassName}`}>
      <div className="flex shrink-0 items-center gap-1.5 bg-brand-purple px-2 py-1">
        <span className="text-[11px] font-extrabold leading-none text-white">{badge}</span>
        <span className="text-[9px] font-bold uppercase tracking-wide leading-none text-white">
          Process
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center bg-brand-purple/6 px-2">
        <span className="text-center text-[11px] font-medium leading-snug text-ink">
          {children}
        </span>
      </div>
    </div>
  )
}

function StoreNode({ badge, children, floatClassName }) {
  return (
    <div className={`flex h-9 w-28 items-center gap-1.5 border-y-2 border-brand-pink/50 bg-brand-pink/6 px-2 shadow-sm ${floatClassName}`}>
      <span className="shrink-0 text-[10px] font-bold text-brand-pink">{badge}</span>
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium leading-snug text-ink">
        {children}
      </span>
    </div>
  )
}

// Anchors each node's center on its left/top % position (the
// -translate-x/y-1/2 below), independent of the floating animation on the
// node itself - a CSS animation fully owns the `transform` property for as
// long as it runs, so putting the float animation directly on this centering
// element would replace the centering transform each frame instead of
// composing with it, and the node would visibly snap out of position.
function NodeAnchor({ className = '', children }) {
  return (
    <div className={`absolute -translate-x-1/2 -translate-y-1/2 ${className}`}>{children}</div>
  )
}

function DfdMockup() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
        <div className="flex items-center gap-1.5 border-b border-line bg-surface-soft px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 text-xs font-medium text-soft">
            somadraw · checkout flow
          </span>
        </div>

        <div
          className="relative h-[300px] bg-canvas sm:h-[340px]"
          style={{
            backgroundImage:
              'radial-gradient(circle, #e8e7f1 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        >
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            fill="none"
          >
            <defs>
              <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="55%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
            <path
              d="M18 22 C 26 32, 30 40, 36 47"
              stroke="url(#edge)"
              strokeWidth="0.6"
              strokeDasharray="2.2 2.2"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M50 46 C 58 38, 62 30, 68 24"
              stroke="url(#edge)"
              strokeWidth="0.6"
              strokeDasharray="2.2 2.2"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M20 74 C 28 66, 33 62, 38 57"
              stroke="url(#edge)"
              strokeWidth="0.6"
              strokeDasharray="2.2 2.2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <NodeAnchor className="left-[16%] top-[20%]">
            <EntityNode floatClassName="animate-float-a">Customer</EntityNode>
          </NodeAnchor>
          <NodeAnchor className="left-[74%] top-[20%]">
            <StoreNode badge="D1" floatClassName="animate-float-c">
              Orders DB
            </StoreNode>
          </NodeAnchor>
          <NodeAnchor className="left-[42%] top-[50%]">
            <ProcessNode badge="1" floatClassName="animate-float-b">
              Validate Order
            </ProcessNode>
          </NodeAnchor>
          <NodeAnchor className="left-[16%] top-[78%]">
            <ProcessNode badge="2" floatClassName="animate-float-d">
              Notify User
            </ProcessNode>
          </NodeAnchor>
        </div>
      </div>

      <div className="absolute -bottom-6 -right-3 flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 shadow-lg sm:-right-8">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <span className="text-[12.5px] font-medium text-ink">Saved to your workspace</span>
      </div>
    </div>
  )
}

export default DfdMockup
