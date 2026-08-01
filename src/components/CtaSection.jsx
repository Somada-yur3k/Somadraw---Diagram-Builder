import GoogleGlyph from './GoogleGlyph'

function CtaSection({ onSignIn, isSigningIn }) {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="container flex flex-col items-center gap-6 text-center">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Ready to draw your first <span className="gradient-text">flow</span>?
        </h2>
        <p className="max-w-md text-[16px] leading-relaxed text-soft">
          Free to start — sign in with Google and start building.
        </p>

        <button
          type="button"
          onClick={() => onSignIn()}
          disabled={isSigningIn}
          className="gradient-bg mt-2 inline-flex items-center gap-2.5 rounded-full py-3.5 pl-3 pr-5 text-[15px] font-semibold text-white shadow-lg shadow-purple-200 transition-transform hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
            <GoogleGlyph className="h-4 w-4" />
          </span>
          {isSigningIn ? 'Signing in…' : 'Start with Google'}
        </button>
      </div>
    </section>
  )
}

export default CtaSection
