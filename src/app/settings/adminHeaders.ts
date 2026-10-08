export const ADMIN_KEY_STORAGE = 'specialite_hub_admin_key';

export function getAdminHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = localStorage.getItem(ADMIN_KEY_STORAGE);
  if (key) headers['x-admin-key'] = key;
  return headers;
}
