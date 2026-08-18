import GoogleGlyph from './GoogleGlyph'

function SketchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function CollaborateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function SaveExportIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12m0 0-4-4m4 4 4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  )
}

const steps = [
  {
    number: '01',
    title: 'Sign in with Google',
    description: 'One click — no forms, no passwords.',
    icon: <GoogleGlyph className="h-5 w-5" />,
  },
  {
    number: '02',
    title: 'Sketch your diagram',
    description: 'Drop shapes for DFDs, ERDs, UML, flowcharts, use case, system architecture, or network diagrams, then connect them with auto-routing edges.',
    icon: <SketchIcon />,
  },
  {
    number: '03',
    title: 'Collaborate live',
    description: 'Share a link — edits, cursors, and selections sync instantly for everyone.',
    icon: <CollaborateIcon />,
  },
  {
    number: '04',
    title: 'Save & export',
    description: 'Every change autosaves. Export to PDF or PNG anytime.',
    icon: <SaveExportIcon />,
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative scroll-mt-24 bg-surface-soft/60 py-20 sm:py-28">
      <div className="container">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_2fr] lg:items-start lg:gap-16">
          <div className="flex max-w-xl flex-col items-start gap-3 text-left">
            <span className="text-[12.5px] font-semibold uppercase tracking-wide text-brand-blue">
              How it works
            </span>
            <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              From sign-in to a diagram your team can use
            </h2>
            <p className="text-[17px] leading-relaxed text-soft">
              No onboarding calls, no imports to wrangle — just sign in and
              start drawing.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="flex flex-col items-start gap-3">
                {/* The connecting line lives in its own full-width row (not
                    nested inside the circle) so it can stretch edge-to-edge
                    across each grid cell and visually chain into the next
                    cell's own line - a single element half in one cell and
                    half in the next isn't possible in CSS grid, this is the
                    closest continuous-looking equivalent. */}
                <div className="relative flex w-full items-center">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand-blue/30 bg-white text-brand-blue shadow-sm sm:h-14 sm:w-14">
                    {step.icon}
                  </span>
                  {index < steps.length - 1 && (
                    <span className="ml-2 hidden h-px flex-1 bg-brand-blue/20 sm:block" />
                  )}
                </div>
                <span className="text-[13px] font-bold text-brand-blue">{step.number}</span>
                <h3 className="text-[16.5px] font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="text-[14.5px] leading-relaxed text-soft">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
