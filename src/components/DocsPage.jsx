import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import SiteHeader from './SiteHeader'
import ShapeIcon from './editor/ShapeIcon'
import { diagramTypeGroups } from './editor/shapeCatalog'
import { SHORTCUT_GROUPS } from '../lib/shortcuts'

// One real, accurate sentence per diagram type - shapeCatalog.js itself has
// no description field (just label/shapes/iconKey), so this stays a small
// hand-written lookup rather than pretending one can be derived.
const DIAGRAM_TYPE_DESCRIPTIONS = {
  dfd: 'Map how data moves through a system — processes, data stores, and external entities.',
  flowchart: 'Lay out a process step by step, with decision points and clear start/end markers.',
  usecase: 'Show who does what — actors and the use cases they interact with.',
  uml: 'Model class structure, activity and state flow, or swimlanes for a software system.',
  erd: 'Design a database schema — entities, their attributes, and the relationships between them.',
  sysArch: "Sketch a system's architecture — clients, servers, databases, infrastructure, and how they connect.",
  network: 'Diagram a network — devices, servers, security appliances, and the connections between them.',
}

const SECTIONS = [
  { key: 'getting-started', label: 'Getting started' },
  { key: 'diagram-types', label: 'Diagram types' },
  { key: 'shortcuts', label: 'Keyboard shortcuts' },
  { key: 'export-share', label: 'Export & share' },
]

// Only the four sections that have real content behind them - User guides/
// Features/Reference/Release notes were here too as disabled "coming soon"
// placeholders, dropped since there's nothing planned behind them either.
const SIDEBAR_ITEMS = [
  { key: 'getting-started', label: 'Getting started' },
  { key: 'diagram-types', label: 'Diagram types' },
  { key: 'shortcuts', label: 'Keyboard shortcuts' },
  { key: 'export-share', label: 'Export & share' },
]

const GETTING_STARTED_STEPS = [
  {
    title: 'Create your first diagram',
    description:
      'Sign in with Google, then click "+ New diagram" in your workspace sidebar. A blank canvas opens right away — no setup screens in between.',
  },
  {
    title: 'Choose a diagram type',
    description:
      'Click "Select Diagram" and pick from seven types — DFD, Flowchart, Use Case, UML, ERD, System Architecture, or Network — each with shapes that match real notation. Drag shapes from the sidebar onto the canvas to place them.',
  },
  {
    title: 'Connect and customize',
    description:
      'Use the arrow tool to connect shapes with auto-routing connectors. Switch to the Format tab to adjust corner radius, fill color, text style, and line style.',
  },
  {
    title: 'Save and export',
    description:
      'Every change autosaves automatically — there\'s no save button to remember. Export your diagram as a PDF or PNG anytime from the toolbar.',
  },
]

function RocketIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  )
}

function KeyboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 13h6" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V6m0 0-4 4m4-4 4 4" />
      <path d="M4 19h16" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.8 1c0 1.5-2.3 1.6-2.3 3.5" />
      <path d="M12 17h.01" />
    </svg>
  )
}

// Decorative open-book + diagram illustration for the Documentation home
// header - hidden from screen readers, adds nothing the heading/description
// right next to it doesn't already say.
function DocsIllustration() {
  return (
    <svg width="88" height="72" viewBox="0 0 88 72" fill="none" aria-hidden="true" className="hidden shrink-0 sm:block">
      <path
        d="M8 12c8-4 20-4 26 2v46c-6-6-18-6-26-2Z"
        fill="white"
        stroke="var(--color-brand-blue)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M60 12c-8-4-20-4-26 2v46c6-6 18-6 26-2Z"
        fill="white"
        stroke="var(--color-brand-blue)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M14 22h14M14 28h14M14 34h10" stroke="var(--color-line)" strokeWidth="1.6" strokeLinecap="round" />
      <g transform="translate(40, 16)">
        <circle cx="30" cy="30" r="26" fill="var(--color-brand-blue)" opacity="0.08" />
        <rect x="18" y="8" width="16" height="10" rx="2" fill="var(--color-brand-blue)" />
        <rect x="6" y="30" width="14" height="10" rx="2" fill="white" stroke="var(--color-brand-blue)" strokeWidth="1.6" />
        <rect x="32" y="30" width="14" height="10" rx="2" fill="white" stroke="var(--color-brand-blue)" strokeWidth="1.6" />
        <path d="M26 18v6m0 0-9 6m9-6 9 6" stroke="var(--color-brand-blue)" strokeWidth="1.6" fill="none" />
      </g>
    </svg>
  )
}

function Kbd({ children }) {
  return (
    <kbd className="rounded-md border border-line bg-surface-soft px-1.5 py-0.5 text-[11px] font-medium text-ink">
      {children}
    </kbd>
  )
}

function CategoryCard({ card, onOpen }) {
  const Icon = card.icon
  return (
    <div className="rounded-xl border border-line p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
        <Icon />
      </span>
      <h3 className="mt-3 text-[14.5px] font-semibold text-ink">{card.label}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-soft">{card.description}</p>
      <button
        type="button"
        onClick={() => onOpen(card.key)}
        className="mt-3 flex items-center gap-1 text-[13px] font-medium text-brand-blue"
      >
        View guides
        <ChevronRightIcon />
      </button>
    </div>
  )
}

function HomeContent({ onOpenSection }) {
  const [query, setQuery] = useState('')

  const categoryCards = useMemo(
    () => [
      {
        key: 'getting-started',
        label: 'Getting started',
        description: 'Learn the basics and start creating your first diagram.',
        icon: RocketIcon,
      },
      {
        key: 'diagram-types',
        label: 'Diagram types',
        description: 'Explore all seven diagram types and their use cases.',
        icon: GridIcon,
      },
      {
        key: 'shortcuts',
        label: 'Keyboard shortcuts',
        description: 'Boost your productivity with shortcuts.',
        icon: KeyboardIcon,
      },
      {
        key: 'export-share',
        label: 'Export & share',
        description: 'Export your diagrams and share them with others.',
        icon: ExportIcon,
      },
    ],
    [],
  )

  const popularArticles = [
    { label: 'How to create your first diagram', section: 'getting-started' },
    { label: 'How to add and connect shapes', section: 'getting-started' },
    { label: 'How to export diagrams as PDF', section: 'export-share' },
    { label: 'Customize your diagram style', section: 'getting-started' },
    { label: 'Keyboard shortcuts you should know', section: 'shortcuts' },
  ]

  const q = query.trim().toLowerCase()
  const filteredCards = q
    ? categoryCards.filter(
        (card) => card.label.toLowerCase().includes(q) || card.description.toLowerCase().includes(q),
      )
    : categoryCards

  return (
    <>
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Documentation</h1>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-soft">
            Step-by-step guides and references to help you understand Somadraw better.
          </p>
        </div>
        <DocsIllustration />
      </div>

      <div className="mt-6 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3 py-2.5 text-soft">
          <SearchIcon />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search documentation…"
            aria-label="Search documentation"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-soft"
          />
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg bg-brand-blue px-4 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Search
        </button>
      </div>

      <div className="mt-10">
        <p className="text-[13px] font-semibold text-ink">Browse by category</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCards.map((card) => (
            <CategoryCard key={card.key} card={card} onOpen={onOpenSection} />
          ))}
          {filteredCards.length === 0 && (
            <p className="col-span-full text-[13.5px] text-soft">No matches for "{query}".</p>
          )}
        </div>
      </div>

      <div className="mt-10">
        <p className="text-[13px] font-semibold text-ink">Popular articles</p>
        <div className="mt-4 flex flex-col divide-y divide-line rounded-xl border border-line">
          {popularArticles.map((article) => (
            <button
              key={article.label}
              type="button"
              onClick={() => onOpenSection(article.section)}
              className="flex items-center justify-between gap-3 px-4 py-3 text-left text-[14px] text-ink transition-colors hover:bg-surface-soft"
            >
              {article.label}
              <ChevronRightIcon />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function GettingStartedContent() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Getting started</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-soft">
        Learn the basics and start creating your first diagram in just a few steps.
      </p>

      <ol className="mt-10 flex flex-col gap-8">
        {GETTING_STARTED_STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue text-[13px] font-semibold text-white">
              {index + 1}
            </span>
            <div>
              <h3 className="text-[16.5px] font-semibold text-ink">{step.title}</h3>
              <p className="mt-1 text-[14.5px] leading-relaxed text-soft">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 flex flex-col items-start gap-3 rounded-2xl bg-brand-blue/5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[15px] font-semibold text-ink">Ready to dive in?</p>
          <p className="mt-0.5 text-[13.5px] text-soft">Sign in and start your first diagram.</p>
        </div>
        <Link
          to="/sign-in"
          className="shrink-0 rounded-lg bg-brand-blue px-4 py-2 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Start with Google
        </Link>
      </div>
    </>
  )
}

function DiagramTypesContent() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Diagram types</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-soft">
        Somadraw supports seven diagram types, each with shapes that match real notation.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {diagramTypeGroups.map((group) => (
          <div key={group.key} className="flex items-start gap-3 rounded-xl border border-line p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
              <ShapeIcon toolKey={group.iconKey} />
            </span>
            <div>
              <h3 className="text-[14.5px] font-semibold text-ink">{group.label}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-soft">
                {DIAGRAM_TYPE_DESCRIPTIONS[group.key]}
              </p>
              <p className="mt-1 text-[12px] text-soft">{group.shapes.length} shapes</p>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function ShortcutsContent() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Keyboard shortcuts</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-soft">
        Every shortcut available inside a diagram — the same reference shown in Settings.
      </p>

      {SHORTCUT_GROUPS.map((group) => (
        <div key={group.title} className="mt-8">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-soft">{group.title}</p>
          <ul className="mt-3 flex flex-col gap-2.5 border-t border-line pt-3">
            {group.shortcuts.map((shortcut) => (
              <li key={shortcut.label} className="flex items-center justify-between gap-3">
                <span className="text-[14px] text-ink">{shortcut.label}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {shortcut.keys.map((key, index) => (
                    <span key={key} className="flex items-center gap-1">
                      {index > 0 && <span className="text-[11px] text-soft">+</span>}
                      <Kbd>{key}</Kbd>
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

function ExportShareContent() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Export & share</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-soft">
        Take a diagram out of Somadraw, or bring a collaborator into it.
      </p>

      <div className="mt-8">
        <h2 className="text-[17px] font-semibold text-ink">Export</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-soft">
          From the toolbar's Export button, choose:
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-[14.5px] leading-relaxed text-soft">
          <li>
            <span className="font-medium text-ink">PNG image</span> — an exact pixel snapshot, the
            most accurate option for sharing as-is.
          </li>
          <li>
            <span className="font-medium text-ink">PDF document</span> — a fixed A4 page, ready for
            printing.
          </li>
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-[17px] font-semibold text-ink">Share</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-soft">
          Click Share on any diagram to turn on a shareable link. Anyone with the link joins with
          one of two roles you choose:
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-[14.5px] leading-relaxed text-soft">
          <li>
            <span className="font-medium text-ink">Can view</span> — sees the diagram update live,
            can't make changes.
          </li>
          <li>
            <span className="font-medium text-ink">Can edit</span> — full editing rights, with
            live cursors and selections synced instantly for everyone in the diagram.
          </li>
        </ul>
      </div>
    </>
  )
}

const CONTENT_BY_SECTION = {
  'getting-started': GettingStartedContent,
  'diagram-types': DiagramTypesContent,
  shortcuts: ShortcutsContent,
  'export-share': ExportShareContent,
}

function DocsPage() {
  // null = the Documentation home/index view - not tied to any one sidebar
  // item, so nothing in the sidebar shows as active while it's showing.
  const [activeSection, setActiveSection] = useState(null)
  const ActiveContent = activeSection ? CONTENT_BY_SECTION[activeSection] : null
  const activeLabel = SECTIONS.find((section) => section.key === activeSection)?.label

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="container flex flex-col gap-10 py-10 lg:flex-row lg:gap-16 lg:py-14">
        <aside className="shrink-0 lg:w-56">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-soft">Documentation</p>
          <nav className="mt-3 flex flex-row flex-wrap gap-1 lg:flex-col">
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveSection(item.key)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-[14px] font-medium transition-colors ${
                  activeSection === item.key
                    ? 'bg-brand-blue/10 text-brand-blue'
                    : 'text-body hover:bg-surface-soft hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <Link
            to="/help"
            className="mt-6 hidden rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4 transition-colors hover:bg-brand-blue/10 lg:block"
          >
            <p className="text-[13px] font-semibold text-ink">Still need help?</p>
            <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-soft">
              <HelpIcon />
              Visit our help center
            </p>
          </Link>
        </aside>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-soft">
            <button type="button" onClick={() => setActiveSection(null)} className="hover:text-ink">
              Resources
            </button>{' '}
            <span className="mx-1">/</span>{' '}
            <button type="button" onClick={() => setActiveSection(null)} className="hover:text-ink">
              Documentation
            </button>
            {activeLabel && (
              <>
                {' '}
                <span className="mx-1">/</span> <span className="text-ink">{activeLabel}</span>
              </>
            )}
          </p>
          <div className="mt-4 max-w-2xl">
            {ActiveContent ? <ActiveContent /> : <HomeContent onOpenSection={setActiveSection} />}
          </div>
        </div>
      </main>
    </div>
  )
}

export default DocsPage
