const steps = [
  {
    number: '01',
    title: 'Sign in with Google',
    description: 'No forms, no passwords. One click with your Google account and you’re in.',
  },
  {
    number: '02',
    title: 'Start a canvas',
    description:
      'Create a new diagram from your workspace — a blank canvas, ready in one click.',
  },
  {
    number: '03',
    title: 'Drop shapes, connect flows',
    description:
      'Place entity, process, and data store shapes, then connect them with auto-routing edges — drag to reroute anytime.',
  },
  {
    number: '04',
    title: 'Collaborate in real time',
    description:
      'Share a diagram and edits, cursors, and selections sync live to everyone in it — no refresh, no version conflicts.',
  },
  {
    number: '05',
    title: 'Autosaved to your workspace',
    description:
      'Every change saves automatically. Come back anytime — your diagrams are right where you left them.',
  },
  {
    number: '06',
    title: 'Export to PDF or PNG',
    description:
      'Download a pixel-accurate PNG for sharing, or a print-ready PDF for docs — both match your canvas exactly.',
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
              No onboarding calls, no imports to wrangle. Somadraw gets out
              of your way from the first click — then keeps your team in
              sync and your diagrams ready to share.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step) => (
              <div key={step.title} className="flex flex-col items-start gap-2">
                <span className="gradient-text text-2xl font-bold tracking-tight">
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
