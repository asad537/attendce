type UserTitleSource = {
  role?: string | null;
  designation?: string | { title?: string | null; name?: string | null } | null;
};

const roleTitles: Record<string, string> = {
  ceo: 'President',
  manager: 'Manager',
  tl: 'Team Lead',
  employee: 'Employee',
};

/** CEO role takes precedence over any stale job designation. */
export function userDisplayTitle(user: UserTitleSource, fallback = 'Team member'): string {
  if (user.role === 'ceo') return 'President';
  const designation = typeof user.designation === 'string'
    ? user.designation
    : user.designation?.title || user.designation?.name;
  return designation || roleTitles[user.role || ''] || fallback;
}
