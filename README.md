# Somadraw

A browser-based diagram builder with real-time collaboration - draw
diagrams, share a link, and see teammates' cursors and edits live.

Built with React 19 + Vite, styled with Tailwind CSS v4, and backed by
Supabase (auth, database, and Realtime).

## Features

- **Seven diagram types**: Data Flow Diagram, Flowchart, Use Case, UML,
  ERD, System Architecture, and Network - each with its own shape
  catalog and notation-appropriate arrow routing/styling.
- **System Architecture Layer Containers**: pre-themed frames (Client,
  Application, Data, External Services) for visually grouping related
  shapes, alongside a plain Container/Group frame.
- **Real-time collaboration**: live cursors, presence, and instant
  content sync over Supabase Realtime, plus pinned discussion threads
  (comments) with resolve/delete.
- **Sharing**: per-diagram share links with viewer/editor roles.
- **Export**: PNG and print-ready PDF, cropped to the diagram's own
  content.
- **Canvas tools**: undo/redo, align/distribute, group/ungroup,
  front/back ordering, a toggleable grid (Dots/Lines/Graph Paper
  styles), and starring/favoriting diagrams.
- **Owner-only Monitor Dashboard**: registered users, diagrams,
  security events (rate-limit hits, unauthorized admin calls), and
  submitted feedback.
- **Public pages**: Docs, Help Center, and an Updates/announcements feed.

## Tech stack

- [React 19](https://react.dev) + [Vite](https://vite.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [React Router v8](https://reactrouter.com)
- [Supabase](https://supabase.com) - Postgres, Auth (Google OAuth), Realtime, Row-Level Security
- [jsPDF](https://github.com/parallax/jsPDF) + [html-to-image](https://github.com/bubkoo/html-to-image) for export
- Deployed on [Vercel](https://vercel.com)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

### Environment variables (`.env.local`)

| Variable | Where to get it |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase project → Settings → API (the **anon** public key - never the `service_role` key) |
| `VITE_GOOGLE_CLIENT_ID` | Google Cloud OAuth client ID, used when configuring the Google provider in Supabase's Authentication → Providers |

### Database

[`supabase/schema.sql`](supabase/schema.sql) is the source of truth for
tables, Row-Level Security policies, and functions. It's not applied
automatically - run it against your own Supabase project's SQL Editor.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build (outputs `dist/`) |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build locally |

## Project structure

```
src/
  components/
    marketing/   Public landing page (Hero, Features, Navbar, Footer, ...)
    auth/        Sign-in
    workspace/   Signed-in app shell (dashboard sidebar, workspace home,
                 diagram loading, site header, settings)
    resources/   Public Docs / Help Center / Updates pages
    monitor/     Owner-only Monitor Dashboard
    editor/      The diagram editor itself - canvas, shapes, arrows,
                 sidebar, topbar, comments, export
  lib/           Shared utilities (Supabase client, presence, realtime
                 channel, shortcuts, time/user formatting, ...)
supabase/
  schema.sql     Tables, RLS policies, and functions
```

## Deployment

Hosted on Vercel, connected to this repository's `main` branch (auto-deploys
on push). The `/monitor` route is a separate entry point
(`monitor.html` / `monitor-main.jsx`) reserved for the app owner.

---

Somadraw is a personal/capstone project by Eurika Adamos - BSIT-MI, 3rd
Year, National University Fairview.
