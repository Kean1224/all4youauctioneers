'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminAuthProps {
  children: React.ReactNode;
  fallbackUrl?: string;
}

export default function AdminAuth({ children, fallbackUrl = '/admin/login' }: AdminAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [adminData, setAdminData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const verifyAdminAuth = async () => {
      const adminToken = localStorage.getItem('admin_jwt');
      const userRole = localStorage.getItem('userRole');
      
      if (!adminToken || userRole !== 'admin') {
        console.log('No admin token or role found, redirecting to login');
        setIsAuthenticated(false);
        router.push(fallbackUrl);
        return;
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-admin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.valid && data.admin) {
            setIsAuthenticated(true);
            setAdminData(data.admin);
            console.log('✅ Admin authentication verified:', data.admin.email);
          } else {
            throw new Error('Invalid admin session');
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error('Admin verification failed:', error);
        // Clear invalid admin data
        localStorage.removeItem('admin_jwt');
        localStorage.removeItem('userRole');
        localStorage.removeItem('admin_login_time');
        setIsAuthenticated(false);
        router.push(`${fallbackUrl}?error=session_expired`);
      }
    };

    verifyAdminAuth();
  }, [router, fallbackUrl]);

  // Show loading state while verifying
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Show error state if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">Redirecting to admin login...</p>
        </div>
      </div>
    );
  }

  // Render children with admin context if authenticated
  return (
    <div>
      {/* Admin Status Bar */}
      <div className="bg-yellow-500 text-white px-4 py-2 text-sm font-medium">
        🔐 Admin Mode: {adminData?.email} | {adminData?.name}
      </div>
      {children}
    </div>
  );
}
