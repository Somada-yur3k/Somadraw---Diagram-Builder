import { useState } from 'react'
import { Link } from 'react-router'
import SiteHeader from '../workspace/SiteHeader'
import { UPDATE_BADGE_LABEL, UPDATE_BADGE_STYLE, useAnnouncements } from '../../lib/updates'

const FILTERS = [
  { key: 'all', label: 'All updates' },
  { key: 'new', label: 'Features' },
  { key: 'improved', label: 'Improvements' },
  { key: 'fix', label: 'Fixes' },
  { key: 'announcement', label: 'Announcements' },
]

const PAGE_SIZE = 4

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  )
}

function TrendingUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M17 7h4v4" />
    </svg>
  )
}

function WrenchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2Z" />
    </svg>
  )
}

function MegaphoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11v3a1 1 0 0 0 1 1h2l4 5v-14l-4 5H4a1 1 0 0 0-1 1z" />
      <path d="M15 8a4 4 0 0 1 0 8" />
      <path d="M18 5a8 8 0 0 1 0 14" />
    </svg>
  )
}

const FILTER_ICON = {
  all: GridIcon,
  new: SparkleIcon,
  improved: TrendingUpIcon,
  fix: WrenchIcon,
  announcement: MegaphoneIcon,
}

// Decorative megaphone illustration for the header - hidden from screen
// readers, adds nothing the heading/description right next to it doesn't
// already say.
function UpdatesIllustration() {
  return (
    <svg width="88" height="72" viewBox="0 0 88 72" fill="none" aria-hidden="true" className="hidden shrink-0 sm:block">
      <path d="M52 26 30 34v14l22 8V26Z" fill="var(--color-brand-blue)" />
      <path d="M30 34H22a5 5 0 0 0 0 10h8V34Z" fill="var(--color-brand-blue)" />
      <path d="M26 44v10a3 3 0 0 0 6 0V45" fill="var(--color-brand-blue)" opacity="0.6" />
      <path d="M60 30a10 10 0 0 1 0 12" stroke="var(--color-brand-blue)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M67 24a18 18 0 0 1 0 24" stroke="var(--color-brand-blue)" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M14 20l2 2M14 22l2-2" stroke="var(--color-brand-blue)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
      <circle cx="10" cy="52" r="2" fill="var(--color-brand-blue)" opacity="0.4" />
      <circle cx="76" cy="52" r="1.6" fill="var(--color-brand-blue)" opacity="0.4" />
    </svg>
  )
}

function UpdateEntry({ update, isLast }) {
  return (
    <div className="relative pl-6">
      {!isLast && <span className="absolute left-[3px] top-3 h-full w-px bg-line" aria-hidden="true" />}
      <span className="absolute left-0 top-2 h-2 w-2 rounded-full bg-brand-blue" aria-hidden="true" />
      <p className="text-[12px] text-soft">
        {new Date(update.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
      </p>
      <div className="mt-1.5 rounded-xl border border-line p-5">
        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${UPDATE_BADGE_STYLE[update.type]}`}>
          {UPDATE_BADGE_LABEL[update.type]}
        </span>
        <h3 className="mt-2 text-[15px] font-semibold text-ink">{update.title}</h3>
        <p className="mt-1 text-[13.5px] leading-relaxed text-soft">{update.description}</p>
      </div>
    </div>
  )
}

function UpdatesPage() {
  const { announcements, loading } = useAnnouncements()
  const [filter, setFilter] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = filter === 'all' ? announcements : announcements.filter((update) => update.type === filter)
  const visible = filtered.slice(0, visibleCount)

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="container max-w-4xl py-10 lg:py-14">
        <p className="text-[13px] text-soft">
          <Link to="/docs" className="hover:text-ink">
            Resources
          </Link>{' '}
          <span className="mx-1">/</span> <span className="text-ink">Updates</span>
        </p>

        <div className="mt-4 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Updates</h1>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-soft">
              Stay up to date with the latest features, improvements, and fixes.
            </p>
          </div>
          <UpdatesIllustration />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <nav className="flex flex-row flex-wrap gap-1 lg:flex-col">
            {FILTERS.map((item) => {
              const Icon = FILTER_ICON[item.key]
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setFilter(item.key)
                    setVisibleCount(PAGE_SIZE)
                  }}
                  className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-left text-[14px] font-medium transition-colors ${
                    filter === item.key
                      ? 'bg-brand-blue/10 text-brand-blue'
                      : 'text-body hover:bg-surface-soft hover:text-ink'
                  }`}
                >
                  <Icon />
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="flex flex-col gap-6">
            {loading ? (
              <p className="text-[13.5px] text-soft">Loading updates…</p>
            ) : filtered.length === 0 ? (
              <p className="text-[13.5px] text-soft">No updates in this category yet.</p>
            ) : (
              visible.map((update, index) => (
                <UpdateEntry key={update.id} update={update} isLast={index === visible.length - 1} />
              ))
            )}
          </div>
        </div>

        {visibleCount < filtered.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="mt-8 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line py-2.5 text-[13.5px] font-medium text-brand-blue transition-colors hover:bg-surface-soft"
          >
            Load more updates ↓
          </button>
        )}
      </main>
    </div>
  )
}

export default UpdatesPage
