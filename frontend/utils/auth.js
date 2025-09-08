// Auth utility functions - now using httpOnly cookies only
// These functions are kept for backward compatibility but should not be used
// Authentication is now handled entirely through httpOnly cookies

export function setToken(token) {
  console.warn('setToken() is deprecated - authentication now uses httpOnly cookies only');
  // No-op - tokens are handled by httpOnly cookies
}

export function getToken() {
  console.warn('getToken() is deprecated - authentication now uses httpOnly cookies only');
  return null; // Always return null since we use httpOnly cookies
}

export function clearToken() {
  console.warn('clearToken() is deprecated - use logout API endpoint instead');
  // Clean up any residual localStorage items for migration purposes
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_jwt');
    localStorage.removeItem('admin_session');
  }
}
