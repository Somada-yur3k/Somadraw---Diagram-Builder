import { Link } from 'react-router'
import somadrawLogo from '../../assets/SomadrawLogo.png'
import ResourcesMenu from './ResourcesMenu'

// Shared by every page outside the landing page's own Navbar.jsx (DocsPage,
// HelpCenterPage, and whatever else lands under /docs or /help later) -
// Features/How it works link back to the landing page's own anchors since
// none of these pages have those sections themselves.
function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={somadrawLogo} alt="" className="h-10 w-10 object-contain" />
          <span className="text-[17px] font-semibold tracking-tight text-ink">
            Somadraw
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="/#features" className="text-[14.5px] font-medium text-body transition-colors hover:text-ink">
            Features
          </a>
          <a href="/#how-it-works" className="text-[14.5px] font-medium text-body transition-colors hover:text-ink">
            How it works
          </a>
          <ResourcesMenu />
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/sign-in"
            className="rounded-full border border-line px-3.5 py-2 text-[13.5px] font-medium text-ink shadow-sm transition-all hover:border-ink/20 hover:shadow-md sm:px-4 sm:text-[14.5px]"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  )
}

export default SiteHeader
