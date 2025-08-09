'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

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

    // Clear any existing admin data on login page load
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_jwt');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userRole');
      localStorage.removeItem('admin_login_time');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/admin-login`;
      console.log('Attempting admin login to:', apiUrl);
      console.log('Credentials:', { email, password: password ? '***' : 'empty' });
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);
      
      if (res.ok && data.token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_jwt', data.token);
          localStorage.setItem('userEmail', data.email);
          localStorage.setItem('userRole', 'admin');
          localStorage.setItem('admin_login_time', Date.now().toString());
        }
        console.log('Admin login successful, token and timestamp stored');
        // Always redirect to /admin/dashboard after login
        console.log('Redirecting to /admin/dashboard');
        setTimeout(() => router.push('/admin/dashboard'), 100);
      } else {
        setError(data.error || 'Invalid credentials');
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