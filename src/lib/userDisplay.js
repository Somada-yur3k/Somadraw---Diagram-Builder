// Supabase's session.user has a different shape than the old
// @react-oauth/google profile object (name/picture/given_name flat fields) -
// display fields live under user_metadata instead, and vary slightly by
// provider, so every place that used to read user.name/user.picture directly
// goes through this single mapping instead of repeating the fallback chain.
export function getDisplayUser(user) {
  const metadata = user?.user_metadata ?? {}
  const name = metadata.full_name ?? metadata.name ?? user?.email ?? 'there'
  return {
    name,
    givenName: name.split(' ')[0],
    email: user?.email ?? '',
    picture: metadata.avatar_url ?? metadata.picture ?? '',
  }
}
