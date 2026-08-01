// The one account allowed to see the user-monitoring panel - checked both
// in the UI (DashboardSidebar hides the menu entry from everyone else) and
// again in the page itself (MonitorPage, in case someone navigates to
// the URL directly), so this is the single source of truth for both checks.
// Also hardcoded a second time in supabase/schema.sql's admin_list_users()
// function, since SQL has no way to import this file - keep both in sync
// by hand.
export const OWNER_EMAIL = 'eurikasomada@gmail.com'
