'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkAuthStatus, logoutWithCookies } from '../../../utils/cookieAuth';
import AdminSidebar from '../../../components/AdminSidebar';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      console.log('🔍 Dashboard: Starting auth verification...');
      
      // FIXED: Check localStorage ONLY - no cookie/API calls
      if (typeof window !== 'undefined') {
        const adminToken = localStorage.getItem('admin_token');
        const adminSession = localStorage.getItem('admin_session');
        
        console.log('🔍 Dashboard: Token exists:', !!adminToken);
        console.log('🔍 Dashboard: Session exists:', !!adminSession);
        
        if (adminToken && adminSession) {
          try {
            const session = JSON.parse(adminSession);
            const sessionAge = Date.now() - session.loginTime;
            const maxAge = 4 * 60 * 60 * 1000; // 4 hours
            
            console.log('🔍 Dashboard: Session age:', Math.floor(sessionAge / 60000) + ' minutes');
            console.log('🔍 Dashboard: Session role:', session.role);
            
            if (sessionAge < maxAge && session.role === 'admin') {
              console.log('✅ Dashboard: Valid admin session found - AUTHENTICATED');
              setIsAuthenticated(true);
              setIsLoading(false);
              return;
            } else {
              console.log('❌ Dashboard: Session expired or invalid role');
              localStorage.removeItem('admin_token');
              localStorage.removeItem('admin_session');
            }
          } catch (e) {
            console.error('❌ Dashboard: Error parsing session:', e);
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_session');
          }
        } else {
          console.log('❌ Dashboard: No token or session found');
        }
      }
      
      // No valid session - redirect to login
      console.log('❌ Dashboard: Redirecting to login...');
      setIsLoading(false);
      window.location.href = '/admin/login?error=session_expired';
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
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 px-8 py-8 bg-gray-100">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-yellow-600 drop-shadow text-center">
            Admin Dashboard
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card title="Manage Users" href="/admin/users" />
            <Card title="Manage Auctions" href="/admin/auctions" />
            <Card title="Manage Lots" href="/admin/lots" />
            <Card title="Invoices" href="/admin/invoices" />
            <Card title="💰 Payment Management" href="/admin/payments" />
            <Card title="Item Offers" href="/admin/offers" />
            <Card title="Logout" onClick={async () => {
              try {
                await logoutWithCookies();
                router.push('/admin/login');
              } catch (error) {
                console.error('Logout failed:', error);
                router.push('/admin/login');
              }
            }} />
          </div>
        </div>
      </main>
    </div>
  );
}

function Card({ title, href, onClick }: { title: string; href?: string; onClick?: () => void }) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer bg-white rounded-lg shadow p-6 hover:shadow-xl transition"
    >
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
    </div>
  );
}
