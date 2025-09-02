// Cookie-based authentication utility
// Replaces localStorage token management with secure httpOnly cookies

export interface AuthResponse {
  success: boolean;
  user?: {
    email: string;
    name: string;
    role: string;
  };
  message?: string;
  error?: string;
}

// Login with credentials - server sets httpOnly cookie
export async function loginWithCookies(email: string, password: string, isAdmin = false): Promise<AuthResponse> {
  try {
    const endpoint = isAdmin ? '/api/auth/admin-login' : '/api/auth/login';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: include cookies
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (response.ok) {
      return {
        success: true,
        user: {
          email: data.email,
          name: data.name,
          role: data.role || 'user'
        },
        message: data.message
      };
    } else {
      return {
        success: false,
        error: data.error || 'Login failed'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Network error during login'
    };
  }
}

// Logout - server clears httpOnly cookie
export async function logoutWithCookies(): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } else {
      return {
        success: false,
        error: 'Logout failed'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Network error during logout'
    };
  }
}

// Check authentication status - server validates httpOnly cookie
export async function checkAuthStatus(): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/verify', {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();
    
    if (response.ok) {
      return {
        success: true,
        user: {
          email: data.user.email,
          name: data.user.name,
          role: data.user.role
        }
      };
    } else {
      return {
        success: false,
        error: data.error || 'Not authenticated'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Network error during auth check'
    };
  }
}

// Make authenticated API request with cookies
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include', // Always include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// Utility to remove localStorage tokens (cleanup)
export function clearLegacyTokens() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('admin_jwt');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('admin_login_time');
  }
}