// Shared by server and browser code: what each role and permission means.
export const PERMISSIONS = [
  { key: 'write', label: 'Write stories', help: 'Create stories and edit their own drafts' },
  { key: 'publish', label: 'Publish', help: 'Publish and unpublish stories, choose the lead story' },
  { key: 'edit_all', label: "Edit everyone's stories", help: 'See and edit drafts and stories by other staff' },
  { key: 'delete', label: 'Delete stories', help: 'Permanently delete stories' },
  { key: 'feed', label: 'News feed', help: 'Review the automatic news feed' },
  { key: 'comments', label: 'Moderate comments', help: 'Delete any reader comment' },
  { key: 'newsletter', label: 'Send newsletter', help: 'Send editions to every subscriber' },
  { key: 'subscribers', label: 'Subscribers', help: 'See and export subscriber emails' },
  { key: 'users', label: 'Reader memberships', help: 'Give readers free membership' },
  { key: 'tips', label: 'Reader tips', help: 'Read tips sent in by readers' },
  { key: 'learn', label: 'Learning hub & CTFs', help: 'Add and edit CTF events in the calendar' },
] as const;
export type Perm = (typeof PERMISSIONS)[number]['key'];

export const STAFF_ROLES = ['writer', 'editor', 'admin', 'owner'] as const;
export type Role = 'reader' | (typeof STAFF_ROLES)[number];

export const PRESETS: Record<'writer' | 'editor' | 'admin', Perm[]> = {
  writer: ['write', 'feed'],
  editor: ['write', 'publish', 'edit_all', 'feed', 'comments', 'tips', 'learn'],
  admin: ['write', 'publish', 'edit_all', 'delete', 'feed', 'comments', 'newsletter', 'subscribers', 'users', 'tips', 'learn'],
};

export const ROLE_INFO: Record<Role, string> = {
  owner: 'Full control. Manages staff and sees the audit log. Can only be changed in Supabase.',
  admin: 'Runs the newsroom: publishes, deletes, sends the newsletter, sees subscribers.',
  editor: 'Writes, edits and publishes any story. Moderates comments.',
  writer: 'Writes drafts. An editor or the owner publishes them.',
  reader: 'Normal reader account.',
};

type P = { role: string; permissions?: string[] | null } | null | undefined;
export const isStaffRole = (role?: string | null) => !!role && (STAFF_ROLES as readonly string[]).includes(role);
export const isOwner = (p: P) => p?.role === 'owner';
export function can(p: P, perm: Perm) {
  if (!p) return false;
  if (p.role === 'owner') return true;
  return isStaffRole(p.role) && (p.permissions ?? []).includes(perm);
}
