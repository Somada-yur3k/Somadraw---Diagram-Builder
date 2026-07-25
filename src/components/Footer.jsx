import somadrawLogo from '../assets/SomadrawLogo.png'

const links = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
]

function Footer() {
  return (
    <footer className="border-t border-line bg-surface-soft/70">
      <div className="container flex flex-col items-center gap-6 py-14 text-center">
        <div className="flex items-center gap-2.5">
          <img src={somadrawLogo} alt="" className="h-8 w-8 object-contain" />
          <span className="text-[17px] font-semibold tracking-tight text-ink">
            Somadraw
          </span>
        </div>

        <p className="max-w-xs text-sm leading-relaxed text-soft">
          A next-generation Data Flow Diagram builder for teams who think in
          systems.
        </p>

        <div className="flex items-center gap-6">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[14.5px] font-medium text-body transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container flex justify-center py-6 text-[13px] text-soft">
          <span>© {new Date().getFullYear()} Somadraw. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
