function NodeChip({ children, className = '', active = false }) {
  return (
    <div
      className={`absolute inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink shadow-sm ${className}`}
    >
      {active && <span className="h-1.5 w-1.5 rounded-full bg-brand-pink" />}
      {children}
    </div>
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

          <NodeChip className="left-[16%] top-[20%]">Customer</NodeChip>
          <NodeChip className="left-[74%] top-[20%]">Orders DB</NodeChip>
          <NodeChip className="left-[42%] top-[50%]" active>
            Validate Order
          </NodeChip>
          <NodeChip className="left-[15%] top-[78%]">Notify User</NodeChip>
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
