import { ShapeBody } from '../editor/Shape'

// Mock shapes are display-only - disableDblClick below blocks the one path
// (EditableText's own double-click-to-edit handler) that could ever call
// this, so it never actually needs to do anything.
function noop() {}

// Real DFD notation, not generic chips - actual shapes rendered through the
// editor's own ShapeBody (Shape.jsx), not a hand-copied lookalike. A
// lookalike is exactly what silently drifted out of sync with the real
// thing before this (Data Store's whole layout changed there without a
// hand-copied version anywhere else ever being told) - rendering the real
// component instead means it can't happen again, and any future style
// change to a shape shows up here automatically.
function MockShape({ shape, width, height, floatClassName }) {
  return (
    <div className={`shadow-sm ${floatClassName}`} style={{ width, height }}>
      <ShapeBody shape={shape} dispatch={noop} disableDblClick dragHandlers={{}} zoom={1} />
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
          className="relative h-75 bg-canvas sm:h-85 lg:h-96"
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
            <MockShape
              shape={{ id: 'mock-customer', type: 'entity', text: 'Customer' }}
              width={96}
              height={40}
              floatClassName="animate-float-a"
            />
          </NodeAnchor>
          <NodeAnchor className="left-[74%] top-[20%]">
            <MockShape
              shape={{ id: 'mock-store', type: 'store', text: 'Orders DB', badge: 'D1' }}
              width={132}
              height={44}
              floatClassName="animate-float-c"
            />
          </NodeAnchor>
          <NodeAnchor className="left-[42%] top-[50%]">
            <MockShape
              shape={{ id: 'mock-process-1', type: 'process', text: 'Validate Order', badge: '1' }}
              width={124}
              height={74}
              floatClassName="animate-float-b"
            />
          </NodeAnchor>
          <NodeAnchor className="left-[16%] top-[78%]">
            <MockShape
              shape={{ id: 'mock-process-2', type: 'process', text: 'Notify User', badge: '2' }}
              width={124}
              height={74}
              floatClassName="animate-float-d"
            />
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
