// Utility functions for storing and retrieving JWT token

export function setToken(token) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('admin_jwt', token);
  }
}

export function getToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('admin_jwt');
  }
  return null;
}

export function clearToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_jwt');
  }
}
