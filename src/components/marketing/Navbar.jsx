import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import somadrawLogo from '../../assets/SomadrawLogo.png'
import ResourcesMenu from '../workspace/ResourcesMenu'

const links = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
]

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeHref, setActiveHref] = useState(null)

  // Tracks whichever of the two sections is currently under a thin band
  // near the top of the viewport (just below the sticky navbar), so the
  // matching nav link turns blue whether the user got there by clicking it
  // or by scrolling past it manually - not just at the instant of a click.
  useEffect(() => {
    const sections = links
      .map((link) => document.querySelector(link.href))
      .filter(Boolean)
    if (sections.length === 0) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting)
        if (visible) setActiveHref(`#${visible.target.id}`)
      },
      { rootMargin: '-96px 0px -70% 0px' },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5">
          <img src={somadrawLogo} alt="" className="h-10 w-10 object-contain" />
          <span className="text-[17px] font-semibold tracking-tight mark text-ink">
            Somadraw
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setActiveHref(link.href)}
              className={`text-[14.5px] font-medium transition-colors ${
                activeHref === link.href ? 'text-brand-blue' : 'text-body hover:text-ink'
              }`}
            >
              {link.label}
            </a>
          ))}
          <ResourcesMenu />
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/sign-in"
            className="rounded-full border border-line px-3.5 py-2 text-[13.5px] font-medium text-ink shadow-sm transition-all hover:border-ink/20 hover:shadow-md sm:px-4 sm:text-[14.5px]"
          >
            Sign in
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink md:hidden"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {menuOpen ? (
                <path d="M6 6l12 12M18 6 6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-line bg-white px-6 py-4 md:hidden">
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-2 py-2.5 text-[15px] font-medium text-body transition-colors hover:bg-surface-soft hover:text-ink"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                to="/docs"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-2 py-2.5 text-[15px] font-medium text-body transition-colors hover:bg-surface-soft hover:text-ink"
              >
                Documentation
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}

export default Navbar
