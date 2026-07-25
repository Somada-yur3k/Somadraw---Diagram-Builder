const features = [
  {
    title: 'Spacious pan & zoom canvas',
    description:
      'A generous, distraction-free canvas that pans and zooms smoothly, giving every system room to grow.',
    icon: (
      <path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" />
    ),
  },
  {
    title: 'DFD-aware shapes',
    description:
      'Purpose-built shapes for entities, processes, and data stores — so every diagram reads like a real Data Flow Diagram.',
    icon: (
      <>
        <rect x="3.5" y="4" width="7" height="5" rx="1.5" />
        <circle cx="17.5" cy="6.5" r="3" />
        <path d="M6 15h6a2 2 0 0 1 2 2v3" />
      </>
    ),
  },
  {
    title: 'Smart connectors, your way',
    description:
      'Edges auto-route between shapes by default, or drag the middle segment to reroute manually — double-click to snap back to auto.',
    icon: (
      <>
        <circle cx="5" cy="6" r="2" />
        <circle cx="19" cy="18" r="2" />
        <path d="M7 7c3 1 8 6 10 10" strokeDasharray="2 2.5" />
      </>
    ),
  },
  {
    title: 'Full style control',
    description:
      'Fine-tune corner radius, fill color, and text styling on any shape or connector label to match how you think.',
    icon: (
      <>
        <path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21" />
        <circle cx="12" cy="12" r="5" />
      </>
    ),
  },
  {
    title: 'Personal, autosaved workspace',
    description:
      'Sign in with Google and every diagram saves automatically to your own private workspace — organize, rename, and revisit anytime.',
    icon: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </>
    ),
  },
  {
    title: 'PDF export',
    description:
      'Export any diagram to a clean PDF, ready to share or drop into a doc.',
    icon: (
      <>
        <path d="M6 3h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="M15 3v3h3" />
        <path d="M8 13h1.5a1.5 1.5 0 0 0 0-3H8v6M12.5 10v6h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-1Z" />
      </>
    ),
  },
]

function Features() {
  return (
    <section id="features" className="relative border-t border-line bg-white/70 py-20 sm:py-28">
      <div className="container">
        <div className="flex max-w-xl flex-col items-start gap-3 text-left">
          <span className="gradient-text text-[13.5px] font-semibold uppercase tracking-wide">
            Built for flow
          </span>
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Everything a data flow deserves
          </h2>
          <p className="text-[17px] leading-relaxed text-soft">
            Somadraw pairs a distraction-free canvas with the structure of a
            real DFD, so diagrams stay accurate as your system evolves.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-line bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <span className="gradient-bg inline-flex h-11 w-11 items-center justify-center rounded-full shadow-sm">
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {feature.icon}
                </svg>
              </span>
              <h3 className="mt-5 text-[17px] font-semibold text-ink">
                {feature.title}
              </h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-soft">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
