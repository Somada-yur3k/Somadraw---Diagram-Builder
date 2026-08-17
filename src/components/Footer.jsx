import { Link } from 'react-router'
import somadrawLogo from '../assets/SomadrawLogo.png'

const productLinks = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
]

// No "Company" column - unlike the reference this was modeled on, this
// isn't a company, it's one person's project, so there's nothing honest to
// put there (no About/Careers/Contact page behind it).
function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

function DiscordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.07.07 0 0 0-.075.037c-.211.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.955 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.988h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.891h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  )
}

const socialLinks = [
  { label: 'GitHub', icon: GitHubIcon, href: '#' },
  { label: 'Discord', icon: DiscordIcon, href: '#' },
  { label: 'Facebook', icon: FacebookIcon, href: '#' },
]

function FooterColumn({ title, children }) {
  return (
    <div>
      <p className="text-[13.5px] font-semibold text-ink">{title}</p>
      <div className="mt-3 flex flex-col gap-2.5">{children}</div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="border-t border-line bg-surface-soft/70">
      <div className="container flex flex-col gap-10 py-14 sm:flex-row sm:justify-between">
        <div className="flex max-w-xs flex-col items-start gap-3">
          <div className="flex items-center gap-2.5">
            <img src={somadrawLogo} alt="" className="h-8 w-8 object-contain" />
            <span className="text-[17px] font-semibold tracking-tight text-ink">
              Somadraw
            </span>
          </div>
          <p className="text-left text-sm leading-relaxed text-soft">
            A next-generation Data Flow Diagram builder for teams who think in
            systems.
          </p>
          <div className="mt-1 flex items-center gap-4">
            {socialLinks.map(({ label, icon: Icon, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="text-ink transition-colors hover:text-brand-blue"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>

        <div className="flex gap-16">
          <FooterColumn title="Product">
            {productLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[14.5px] font-medium text-body transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </FooterColumn>

          <FooterColumn title="Resources">
            <Link
              to="/docs"
              className="text-[14.5px] font-medium text-body transition-colors hover:text-ink"
            >
              Documentation
            </Link>
            <Link
              to="/help"
              className="text-[14.5px] font-medium text-body transition-colors hover:text-ink"
            >
              Help center
            </Link>
            <Link
              to="/updates"
              className="text-[14.5px] font-medium text-body transition-colors hover:text-ink"
            >
              Updates
            </Link>
          </FooterColumn>
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
