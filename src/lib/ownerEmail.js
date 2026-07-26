// The one account allowed to see the user-monitoring panel - checked both
// in the UI (DashboardSidebar hides the menu entry from everyone else) and
// again in the page itself (MonitorUsersView, in case someone navigates to
// the URL directly), so this is the single source of truth for both checks.
export const OWNER_EMAIL = 'eurikasomada@gmail.com'
