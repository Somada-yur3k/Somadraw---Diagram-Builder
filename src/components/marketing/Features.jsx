const features = [
  {
    title: 'Real-time collaboration',
    description: 'Live cursors show where teammates are working, with every edit synced instantly.',
    icon: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    title: 'Seven diagram types, one canvas',
    description: 'DFD, ERD, UML, flowchart, use case, system architecture, and network diagrams — each with shapes that match real notation.',
    icon: (
      <>
        <rect x="3.5" y="4" width="7" height="5" rx="1.5" />
        <circle cx="17.5" cy="6.5" r="3" />
        <path d="M6 15h6a2 2 0 0 1 2 2v3" />
      </>
    ),
  },
  {
    title: 'Spacious pan & zoom canvas',
    description: 'Smooth pan and zoom, with room for any system to grow.',
    icon: (
      <path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" />
    ),
  },
  {
    title: 'Full creative control',
    description: 'Auto-routing connectors, corner radius, fill color, and text — all tuned exactly your way.',
    icon: (
      <>
        <path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21" />
        <circle cx="12" cy="12" r="5" />
      </>
    ),
  },
  {
    title: 'Personal, autosaved workspace',
    description: 'Sign in with Google — every diagram autosaves, privately.',
    icon: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </>
    ),
  },
  {
    title: 'PDF export',
    description: 'A clean, ready-to-share PDF in one click.',
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
    <section id="features" className="relative scroll-mt-24 border-t border-line bg-white/70 py-20 sm:py-28">
      <div className="container">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_2fr] lg:items-start lg:gap-16">
          <div className="flex max-w-xl flex-col items-start gap-3 text-left">
            <span className="text-[12.5px] font-semibold uppercase tracking-wide text-brand-blue">
              Built for teams
            </span>
            <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Everything your team needs to diagram together
            </h2>
            <p className="text-[17px] leading-relaxed text-soft">
              A distraction-free canvas that adapts to DFDs, ERDs, UML,
              flowcharts, use case, system architecture, and network diagrams
              — accurate to real notation, with teammates in sync the whole
              time.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-line bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-blue/10">
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-brand-blue)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {feature.icon}
                  </svg>
                </span>
                <h3 className="mt-4 text-[17px] font-semibold text-ink">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-soft">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Features
