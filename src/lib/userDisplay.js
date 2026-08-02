// Supabase's session.user has a different shape than the old
// @react-oauth/google profile object (name/picture/given_name flat fields) -
// display fields live under user_metadata instead, and vary slightly by
// provider, so every place that used to read user.name/user.picture directly
// goes through this single mapping instead of repeating the fallback chain.
// `username` (set via UsernamePrompt.jsx or SettingsView.jsx,
// supabase.auth.updateUser({ data: { username } })) takes priority over
// Google's own full_name where present - the whole point of it existing is
// a shorter, self-chosen alternative to whatever Google/email would
// otherwise show, so every consumer of `name` here (live cursors,
// ActiveUsersStack, SettingsView, the sign-out dialog) picks it up
// automatically without needing its own opt-in.
export function getDisplayUser(user) {
  const metadata = user?.user_metadata ?? {}
  const name = metadata.username ?? metadata.full_name ?? metadata.name ?? user?.email ?? 'there'
  return {
    name,
    givenName: name.split(' ')[0],
    email: user?.email ?? '',
    picture: metadata.avatar_url ?? metadata.picture ?? '',
    username: metadata.username ?? '',
  }
}
