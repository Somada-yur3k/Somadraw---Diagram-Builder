import { Link } from 'react-router'
import GoogleGlyph from './GoogleGlyph'
import DfdMockup from './DfdMockup'

function FloatingPill({ className = '', dotClassName = '', children }) {
  return (
    <div
      className={`absolute z-20 hidden items-center gap-2 rounded-full border border-line bg-white/90 px-3.5 py-2 text-xs font-medium text-body shadow-md backdrop-blur-sm lg:flex ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClassName}`} />
      {children}
    </div>
  )
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="animate-glow-a pointer-events-none absolute -left-24 -top-32 h-72 w-72 rounded-full bg-linear-to-br from-neutral-300/50 via-neutral-200/50 to-neutral-300/40 blur-3xl sm:h-96 sm:w-96"
      />
      <div
        aria-hidden="true"
        className="animate-glow-b pointer-events-none absolute -right-24 top-1/4 h-64 w-64 rounded-full bg-linear-to-br from-neutral-300/40 via-neutral-200/40 to-neutral-300/40 blur-3xl sm:h-80 sm:w-80"
      />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 hidden h-64 w-64 text-line lg:block"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path
          d="M200 0C140 10 70 40 40 90S10 180 0 200"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 5"
        />
      </svg>

      <div className="container relative z-10 grid gap-14 px-4 py-16 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-14 lg:px-12 lg:py-24">
        <div className="rounded-4xl p-6 sm:p-9 lg:p-11">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] font-medium text-body shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-ink" />
            Every diagram type, one canvas
          </span>

          <h1 className="mt-6 text-[38px] font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[52px]">
            Diagram together,
            <br />
            <span className="text-brand-blue">in real time.</span>
          </h1>

          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-body">
            From DFDs and ERDs to UML, flowcharts, use case, system
            architecture, and network diagrams — sketch and refine together
            in real time, with every change autosaved to your workspace.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-6">
            <Link
              to="/sign-in"
              className="gradient-bg inline-flex items-center gap-2.5 rounded-full py-3.5 pl-3 pr-5 text-[15px] font-semibold text-white shadow-lg shadow-blue-200 transition-transform hover:scale-[1.02]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
                <GoogleGlyph className="h-4 w-4" />
              </span>
              Start with Google
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </Link>
            <a
              href="#features"
              className="text-[15px] font-medium text-body transition-colors hover:text-ink"
            >
              Learn more ↓
            </a>
          </div>
        </div>

        {/* Pills pinned to this wrapper's own corners (not the section's) so
            they stay anchored to the illustration they're labeling and can
            never drift into the text column's box, whatever the exact
            breakpoint or column-height mismatch happens to be. */}
        <div className="relative">
          <FloatingPill className="-left-4 -top-4 animate-float-a sm:-left-8" dotClassName="bg-ink">
            Entity shape
          </FloatingPill>
          <FloatingPill className="-bottom-4 -left-4 animate-float-b sm:-left-8" dotClassName="bg-ink">
            Draw arrow →
          </FloatingPill>
          <FloatingPill className="-right-4 top-1/2 animate-float-c sm:-right-8" dotClassName="bg-ink">
            Use case
          </FloatingPill>

          <DfdMockup />
        </div>
      </div>
    </section>
  )
}

export default Hero
