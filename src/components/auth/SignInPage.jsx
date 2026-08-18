import { Link } from 'react-router'
import somadrawLogo from '../../assets/SomadrawLogo.png'
import GoogleGlyph from '../marketing/GoogleGlyph'
import DfdMockup from '../marketing/DfdMockup'

const CHECKLIST = [
  'Private workspace — only you see your diagrams',
  'Every change autosaves as you draw',
  'Share a link to collaborate in real time',
]

function CheckItem({ children }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink/10 text-ink lg:h-6 lg:w-6">
        <svg className="h-2.75 w-2.75 lg:h-3.5 lg:w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <span className="text-[14.5px] leading-relaxed text-body">{children}</span>
    </li>
  )
}

// Same cursor-arrow + name-pill look EditorCanvas.jsx's own CursorMarker
// renders for a real collaborator's live pointer - reused here (not the
// same component - that one's driven by real broadcast x/y, this one's
// driven by pure CSS keyframes, see index.css's cursor-drift-a/b) purely to
// sell "you're not the only one who can be on this canvas" at a glance,
// standing in for the real-time collaboration feature before anyone's
// actually signed in to see it happen.
function DriftingCursor({ name, color, animationClass }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute z-10 flex -translate-x-1 -translate-y-1 items-center gap-1 ${animationClass}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={color} stroke="white" strokeWidth="1.5" className="shrink-0 drop-shadow-sm">
        <path d="M4 3 L20 12 L12.5 13.5 L9.5 20.5 Z" />
      </svg>
      <span
        className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
    </div>
  )
}

function SignInPage({ onSignIn, isSigningIn, authError }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* Solid white (not left transparent over body's own grid background,
          the way it was) - the grid stays exclusive to the right panel,
          matching the reference layout's clean split: plain left, grid +
          mockup right.
          flex-col + the middle block's own flex-1/justify-center (not
          justify-between across all three children directly) - distributing
          three items with justify-between assumes a roughly-fixed
          container height, which min-h-screen isn't on mobile: a phone
          browser's own chrome (URL bar) resizing the viewport as the page
          scrolls makes 100vh shift under it, and would visibly jostle the
          logo/link toward and away from the edges. Letting the middle block
          alone claim the remaining space and center itself inside that is
          stable regardless of exactly how tall the viewport ends up. */}
      <div className="flex min-h-screen flex-col bg-white px-6 py-8 sm:px-12 sm:py-10 lg:px-20 lg:py-14">
        <Link to="/" className="flex shrink-0 items-center gap-2.5 self-start">
          <img src={somadrawLogo} alt="" className="h-9 w-9 object-contain" />
          <span className="text-[16px] font-semibold tracking-tight text-ink">Somadraw</span>
        </Link>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-[34px] font-semibold tracking-tight text-ink sm:text-4xl lg:text-[42px]">
            Sign in to Somadraw
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-body sm:text-[15.5px]">
            Use your Google account — no forms, no passwords. Your workspace
            is ready in one click.
          </p>

          <button
            type="button"
            onClick={() => onSignIn()}
            disabled={isSigningIn}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-white py-3.5 text-[15px] font-semibold text-ink shadow-sm transition-colors hover:bg-surface-soft disabled:opacity-60"
          >
            <GoogleGlyph className="h-4.5 w-4.5 lg:h-5 lg:w-5" />
            {isSigningIn ? 'Signing in…' : 'Continue with Google'}
          </button>

          {authError && (
            <p className="mt-3 text-[13.5px] font-medium text-rose-500">{authError}</p>
          )}

          <div className="mt-9 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" aria-hidden="true" />
            <span className="shrink-0 text-[12.5px] font-medium text-soft">What you get</span>
            <span className="h-px flex-1 bg-line" aria-hidden="true" />
          </div>

          <ul className="mt-6 flex flex-col gap-3.5">
            {CHECKLIST.map((item) => (
              <CheckItem key={item}>{item}</CheckItem>
            ))}
          </ul>

          <p className="mt-9 text-[12.5px] leading-relaxed text-soft">
            By continuing you agree to the Terms of Service and Privacy Policy.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex shrink-0 items-center gap-1.5 self-start text-[14px] font-medium text-body transition-colors hover:text-ink"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          Back to home
        </Link>
      </div>

      {/* No longer hidden below lg - it used to be, but that also hid the
          whole drifting-cursor animation on every phone/tablet, not just
          the illustration. Plain DOM order (no order-* override) puts it
          below the form on mobile - stacked in the same top-to-bottom
          sequence it's written in - and to the form's right once there's
          room for both side by side at lg. Sized to DfdMockup's own
          intrinsic height on mobile (no forced min-height here) so it reads
          as a compact preview, not a second full screen to scroll through.
          bg-white + bg-grid: the exact same grid utility (and plain white
          base, no color wash over it) body's own site-wide background
          already uses in index.css - matches the home page's grid exactly
          instead of a similar-but-tinted lookalike. */}
      <div className="bg-grid relative flex items-center justify-center overflow-hidden bg-white px-6 py-10 sm:px-10 sm:py-14 lg:px-10 lg:py-0">
        <div className="relative w-full max-w-sm py-4 sm:max-w-md lg:max-w-2xl lg:px-10 lg:py-0">
          <DfdMockup />
          <DriftingCursor name="Ana" color="#8b5cf6" animationClass="animate-cursor-a" />
          <DriftingCursor name="Marco" color="#3b82f6" animationClass="animate-cursor-b" />
        </div>
      </div>
    </div>
  )
}

export default SignInPage
