import { useState } from 'react'
import { Link } from 'react-router'
import SiteHeader from './SiteHeader'

// Every answer here is accurate to how Somadraw actually works today - see
// GETTING_STARTED_STEPS/ExportShareContent in DocsPage.jsx for the same
// facts in guide form. No fabricated feature or stat, same reasoning as
// everywhere else in this codebase that draws the line between "not built
// yet" and "pretend it exists."
const FAQS = [
  {
    question: 'How do I create a new diagram?',
    answer: 'Click "+ New diagram" in your workspace sidebar. A blank canvas opens right away — no setup screens in between.',
  },
  {
    question: 'What diagram types does Somadraw support?',
    answer: 'Seven — DFD, Flowchart, Use Case, UML, ERD, System Architecture, and Network — each with shapes that match real notation.',
  },
  {
    question: 'How do I invite someone to collaborate?',
    answer: 'Click Share on any diagram, turn on the shareable link, and choose whether people who open it can view or edit.',
  },
  {
    question: 'What\'s the difference between "Can view" and "Can edit"?',
    answer: 'Viewers see the diagram update live but can\'t make changes. Editors get full editing rights, with live cursors and selections synced instantly for everyone.',
  },
  {
    question: 'Does Somadraw save my work automatically?',
    answer: 'Yes. Every change autosaves — there\'s no save button to remember, and nothing is lost if you close the tab.',
  },
  {
    question: 'Can I export my diagram?',
    answer: 'Yes, from the toolbar\'s Export button — as a PNG (exact pixel snapshot) or a PDF (fixed A4 page, ready for printing).',
  },
  {
    question: 'How do I undo a mistake?',
    answer: 'Ctrl+Z to undo, Ctrl+Shift+Z (or Ctrl+Y) to redo.',
  },
  {
    question: 'Can I lock a shape so it doesn\'t move by accident?',
    answer: 'Yes — select it and press Ctrl+Shift+L to lock or unlock it.',
  },
  {
    question: 'Is Somadraw free to use?',
    answer: 'Yes, free to start — just sign in with Google.',
  },
  {
    question: 'Do I need to install anything?',
    answer: 'No, Somadraw runs entirely in your browser.',
  },
]

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function ChevronDownIcon({ open }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

// Decorative chat-bubble illustration for the header - hidden from screen
// readers, adds nothing the heading/description right next to it doesn't
// already say.
function HelpIllustration() {
  return (
    <svg width="88" height="72" viewBox="0 0 88 72" fill="none" aria-hidden="true" className="hidden shrink-0 sm:block">
      <circle cx="30" cy="46" r="20" fill="var(--color-brand-blue)" opacity="0.08" />
      <rect x="16" y="38" width="20" height="14" rx="4" fill="white" stroke="var(--color-line)" strokeWidth="1.6" />
      <path d="M20 44h12M20 48h8" stroke="var(--color-line)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="66" cy="18" r="18" fill="var(--color-brand-blue)" />
      <path
        d="M66 10a5 5 0 0 1 1.6 9.7c-.9.35-1.6 1.1-1.6 2.3"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="66" cy="26.5" r="1.4" fill="white" />
      <circle cx="82" cy="46" r="2" fill="var(--color-brand-blue)" opacity="0.4" />
      <circle cx="76" cy="58" r="1.5" fill="var(--color-brand-blue)" opacity="0.4" />
      <path d="M8 20l2 2M8 22l2-2" stroke="var(--color-brand-blue)" strokeWidth="1.6" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

function FaqItem({ faq, open, onToggle }) {
  return (
    <div className="rounded-xl border border-line">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="text-[14px] font-medium text-ink">{faq.question}</span>
        <ChevronDownIcon open={open} />
      </button>
      {open && (
        <p className="px-4 pb-4 text-[13.5px] leading-relaxed text-soft">{faq.answer}</p>
      )}
    </div>
  )
}

function HelpCenterPage() {
  const [query, setQuery] = useState('')
  const [openQuestion, setOpenQuestion] = useState(null)

  const q = query.trim().toLowerCase()
  const filteredFaqs = q
    ? FAQS.filter(
        (faq) => faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q),
      )
    : FAQS

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="container max-w-3xl py-10 lg:py-14">
        <p className="text-[13px] text-soft">
          <Link to="/docs" className="hover:text-ink">
            Resources
          </Link>{' '}
          <span className="mx-1">/</span> <span className="text-ink">Help center</span>
        </p>

        <div className="mt-4 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Help Center</h1>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-soft">
              Find answers to common questions and get the support you need.
            </p>
          </div>
          <HelpIllustration />
        </div>

        <div className="mt-6 flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3 py-2.5 text-soft">
            <SearchIcon />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for help articles…"
              aria-label="Search for help articles"
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
          <p className="text-[13px] font-semibold text-ink">Popular questions</p>
          <div className="mt-4 flex flex-col gap-2.5">
            {filteredFaqs.map((faq) => (
              <FaqItem
                key={faq.question}
                faq={faq}
                open={openQuestion === faq.question}
                onToggle={() =>
                  setOpenQuestion((current) => (current === faq.question ? null : faq.question))
                }
              />
            ))}
            {filteredFaqs.length === 0 && (
              <p className="text-[13.5px] text-soft">No matches for "{query}".</p>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start gap-3 rounded-2xl bg-brand-blue/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[15px] font-semibold text-ink">Can't find what you're looking for?</p>
            <p className="mt-0.5 text-[13.5px] text-soft">
              Support isn't self-service yet — reach out through Settings → Feedback once you're signed in.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default HelpCenterPage
