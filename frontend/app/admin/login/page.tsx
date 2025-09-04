'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { loginWithCookies, clearLegacyTokens } from '../../../utils/cookieAuth';

// Separate component for handling search params to avoid SSR issues
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check for session expiry error
    const errorParam = searchParams.get('error');
    if (errorParam === 'session_expired') {
      setError('Your session has expired. Please login again.');
    }

    // Clear any existing legacy localStorage tokens
    clearLegacyTokens();
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      console.log('Attempting admin login with cookie-based auth');
      
      const result = await loginWithCookies(email, password, true);
      
      if (result.success) {
        console.log('Admin login successful, redirecting to dashboard...');
        // Use immediate redirect with fallback
        router.push('/admin/dashboard');
        // Also use window.location as fallback
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/admin/dashboard';
          }
        }, 1000);
      } else {
        console.error('Login failed:', result.error);
        setError(result.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please check your connection.');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded shadow">
        <h1 className="text-3xl font-bold text-center text-yellow-600">Admin Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600 transition-colors"
          >
            Sign In
          </button>
        </form>
        
        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-6">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-blue-400 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Security Notice:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Admin sessions expire after 4 hours</li>
                <li>Automatic logout on inactivity</li>
                <li>All admin actions are logged</li>
                <li>Only authorized personnel allowed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin login...</p>
        </div>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}