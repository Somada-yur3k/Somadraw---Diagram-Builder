import { Link } from 'react-router'
import GoogleGlyph from './GoogleGlyph'

// Purely decorative "look here" squiggle pointing at the heading - hidden
// from screen readers since it adds nothing a sighted user doesn't already
// get from the heading itself sitting right next to it.
function SquigglyArrow() {
  return (
    <svg
      width="70"
      height="56"
      viewBox="0 0 70 56"
      fill="none"
      aria-hidden="true"
      className="hidden shrink-0 text-brand-blue sm:block"
    >
      <path
        d="M6 16c-3 11 4 20 15 18 10-1.6 13-11 5-16-7-4-15 1-13 9 2 9 13 13 21 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M30 33 37 38 32 44"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

function CtaSection() {
  return (
    <section className="relative w-full bg-white px-4 py-20 sm:px-8">
      <div className="container">
        <div className="flex flex-col items-center gap-6 rounded-[28px] bg-brand-blue/5 px-6 py-14 text-center sm:flex-row sm:items-center sm:justify-center sm:gap-8 sm:px-12 sm:text-left">
          <SquigglyArrow />
          <div className="flex flex-col items-center gap-3 sm:items-start">
            <h2 className="max-w-md text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Ready to build your first diagram?
            </h2>
            <p className="max-w-md text-[16px] leading-relaxed text-soft">
              Free to start — sign in with Google and start building with your team.
            </p>

            <Link
              to="/sign-in"
              className="gradient-bg mt-2 inline-flex items-center gap-2.5 rounded-full py-3.5 pl-3 pr-5 text-[15px] font-semibold text-white shadow-lg shadow-blue-200 transition-transform hover:scale-[1.02]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
                <GoogleGlyph className="h-4 w-4" />
              </span>
              Start with Google
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CtaSection
