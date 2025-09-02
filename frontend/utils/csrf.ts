// Utility to fetch CSRF token from backend
export async function getCsrfToken() {
  const res = await fetch('/api/csrf-token', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch CSRF token');
  const data = await res.json();
  return data.csrfToken;
}
