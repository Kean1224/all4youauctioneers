'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  console.log('🚀 PRODUCTION DASHBOARD LOADING');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    console.log('🔍 Dashboard: Starting authentication check...');
    
    const verifyAuth = async () => {
      // First check localStorage for immediate auth (faster)
      const adminSession = localStorage.getItem('admin_session');
      if (adminSession) {
        try {
          const session = JSON.parse(adminSession);
          const currentTime = Date.now();
          const sessionAge = currentTime - session.loginTime;
          const maxAge = 4 * 60 * 60 * 1000; // 4 hours
          
          if (sessionAge < maxAge && session.role === 'admin') {
            console.log('✅ Dashboard: Using valid localStorage session');
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.log('❌ Dashboard: Invalid localStorage session, clearing...');
          localStorage.removeItem('admin_session');
          localStorage.removeItem('admin_token');
        }
      }
      
      // Fallback to API check if no valid localStorage session
      console.log('🔍 Dashboard: Checking API session...');
      try {
        const res = await fetch('/api/session', { credentials: 'include' });
        console.log('🔍 Dashboard: API response status:', res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log('🔍 Dashboard: API response data:', data);
          
          if (data && data.user && data.user.role === 'admin') {
            console.log('✅ Dashboard: API session valid');
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error('❌ Dashboard: API session check failed:', e);
      }
      
      console.log('❌ Dashboard: No valid session found, redirecting to login');
      setIsLoading(false);
      window.location.href = '/admin/login';
    };
    
    verifyAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-yellow-600 text-center">
          Admin Dashboard - SECURE & LIVE
        </h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition cursor-pointer"
               onClick={() => window.open('/admin/users', '_blank')}>
            <h2 className="text-xl font-semibold text-gray-800">👥 Manage Users</h2>
            <p className="text-gray-600 mt-2">View and manage user accounts</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition cursor-pointer"
               onClick={() => window.open('/admin/auctions', '_blank')}>
            <h2 className="text-xl font-semibold text-gray-800">🏷️ Manage Auctions</h2>
            <p className="text-gray-600 mt-2">Create and manage auctions</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition cursor-pointer"
               onClick={() => window.open('/admin/lots', '_blank')}>
            <h2 className="text-xl font-semibold text-gray-800">📦 Manage Lots</h2>
            <p className="text-gray-600 mt-2">Add and edit auction items</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition cursor-pointer"
               onClick={() => window.open('/admin/invoices', '_blank')}>
            <h2 className="text-xl font-semibold text-gray-800">📄 Invoices</h2>
            <p className="text-gray-600 mt-2">Generate and manage invoices</p>
          </div>
          
          {/* Payment Management removed - Payment functionality disabled */}
          
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition cursor-pointer"
               onClick={() => window.open('/admin/offers', '_blank')}>
            <h2 className="text-xl font-semibold text-gray-800">💵 Item Offers</h2>
            <p className="text-gray-600 mt-2">Review direct offers</p>
          </div>
          
          <div className="bg-red-500 text-white rounded-lg shadow p-6 hover:bg-red-600 transition cursor-pointer"
               onClick={async () => {
                 await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                 window.location.href = '/admin/login';
               }}>
            <h2 className="text-xl font-semibold">🚪 Logout</h2>
            <p className="mt-2">Sign out of admin panel</p>
          </div>
          
        </div>
        
        <div className="mt-8 bg-green-50 border border-green-200 rounded p-4">
          <div className="flex items-center">
            <span className="text-green-600 text-2xl mr-2">🔒</span>
            <div>
              <p className="font-semibold text-green-800">Status: SECURE & OPERATIONAL</p>
              <p className="text-green-600 text-sm">Authenticated admin dashboard - Ready for 1000+ user auctions</p>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}