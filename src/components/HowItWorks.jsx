const steps = [
  {
    number: '01',
    title: 'Sign in with Google',
    description: 'One click — no forms, no passwords.',
  },
  {
    number: '02',
    title: 'Sketch your diagram',
    description: 'Drop entity, process, and data store shapes, then connect them with auto-routing edges.',
  },
  {
    number: '03',
    title: 'Collaborate live',
    description: 'Share a link — edits, cursors, and selections sync instantly for everyone.',
  },
  {
    number: '04',
    title: 'Save & export',
    description: 'Every change autosaves. Export to PDF or PNG anytime.',
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 sm:py-28">
      <div className="container">
        <div className="rounded-3xl border border-line bg-white/60 p-8 shadow-sm backdrop-blur-sm sm:p-12">
          <div className="flex max-w-xl flex-col items-start gap-3 text-left">
            <span className="gradient-text text-[13.5px] font-semibold uppercase tracking-wide">
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

          <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.title} className="flex flex-col items-start gap-3">
                <span className="gradient-bg flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-bold text-white shadow-sm">
                  {step.number}
                </span>
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
