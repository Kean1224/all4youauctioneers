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

// Login with credentials - server sets httpOnly cookie + localStorage backup
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
      console.log('🔍 Login API Response:', data);
      console.log('🔍 Token in response:', !!data.token);
      console.log('🔍 Is admin login:', isAdmin);
      
      // DIRECT TOKEN APPROACH: Store token directly for admin
      if (typeof window !== 'undefined' && isAdmin && data.token) {
        console.log('🔍 Storing admin token and session...');
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_session', JSON.stringify({
          email: data.email,
          name: data.name,
          role: data.role,
          loginTime: Date.now(),
          expiresAt: data.expiresAt
        }));
        console.log('✅ Token and session stored successfully');
      } else if (isAdmin) {
        console.error('❌ Failed to store admin token:', {
          hasWindow: typeof window !== 'undefined',
          isAdmin,
          hasToken: !!data.token
        });
      }
      
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

// Logout - server clears httpOnly cookie + clear localStorage
export async function logoutWithCookies(): Promise<AuthResponse> {
  try {
    // Clear localStorage immediately
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_session');
      clearLegacyTokens(); // Clear any old tokens too
    }
    
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
    // Even if network fails, we cleared localStorage
    return {
      success: true,
      message: 'Logged out locally'
    };
  }
}

// Check authentication status - direct token approach
export async function checkAuthStatus(): Promise<AuthResponse> {
  try {
    // Check for admin token first (direct approach)
    if (typeof window !== 'undefined') {
      const adminToken = localStorage.getItem('admin_token');
      const adminSession = localStorage.getItem('admin_session');
      
      console.log('🔍 Auth Check: Token exists:', !!adminToken);
      console.log('🔍 Auth Check: Session exists:', !!adminSession);
      console.log('🔍 Auth Check: localStorage contents:', {
        adminToken: adminToken ? adminToken.substring(0, 20) + '...' : null,
        adminSession: adminSession ? 'exists' : null
      });
      
      if (adminToken && adminSession) {
        try {
          const session = JSON.parse(adminSession);
          const currentTime = Date.now();
          const sessionAge = currentTime - session.loginTime;
          const maxAge = 4 * 60 * 60 * 1000; // 4 hours
          
          // Check if session is still valid
          if (sessionAge < maxAge && session.role === 'admin') {
            console.log('✅ Using LOCAL token authentication for admin - NO API CALL NEEDED');
            
            // BYPASS API completely - use local session data for immediate auth
            return {
              success: true,
              user: {
                email: session.email,
                name: session.name,
                role: session.role
              }
            };
          } else {
            // Session expired, clear it
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_session');
          }
        } catch (e) {
          // Invalid session data, clear it
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_session');
        }
      }
    }
    
    // Fallback to cookie-based authentication for regular users
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
    }
    
    return {
      success: false,
      error: data.error || 'Not authenticated'
    };
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