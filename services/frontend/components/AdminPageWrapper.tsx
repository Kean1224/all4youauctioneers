'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminPageWrapperProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
}

export default function AdminPageWrapper({ 
  children, 
  requiredPermissions = [] 
}: AdminPageWrapperProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const verifyAdminAccess = async () => {
      try {
        const token = localStorage.getItem('admin_jwt');
        
        if (!token) {
          router.replace('/admin/login?error=no_token');
          return;
        }

        // Decode and validate token structure
        let payload;
        try {
          payload = JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
          localStorage.clear();
          router.replace('/admin/login?error=invalid_token');
          return;
        }

        // Check token expiration
        if (!payload.exp || Date.now() / 1000 >= payload.exp) {
          localStorage.clear();
          router.replace('/admin/login?error=token_expired');
          return;
        }

        // Check admin role
        if (payload.role !== 'admin') {
          localStorage.clear();
          router.replace('/admin/login?error=insufficient_permissions');
          return;
        }

        // Verify with backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-admin`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          localStorage.clear();
          router.replace('/admin/login?error=token_invalid');
          return;
        }

        // Check session timeout (4 hours max)
        const loginTime = localStorage.getItem('admin_login_time');
        if (loginTime) {
          const sessionDuration = Date.now() - parseInt(loginTime);
          const maxSession = 4 * 60 * 60 * 1000; // 4 hours
          
          if (sessionDuration > maxSession) {
            localStorage.clear();
            router.replace('/admin/login?error=session_expired');
            return;
          }
        }

        // All checks passed
        setIsAuthorized(true);
        
      } catch (error) {
        console.error('Admin access verification failed:', error);
        localStorage.clear();
        router.replace('/admin/login?error=verification_failed');
      } finally {
        setLoading(false);
      }
    };

    verifyAdminAccess();

    // Re-verify every 5 minutes
    const interval = setInterval(verifyAdminAccess, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [router, requiredPermissions]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized if checks failed
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <svg className="h-16 w-16 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-medium text-red-800 mb-2">Access Denied</h3>
            <p className="text-red-600 text-sm mb-4">
              You do not have permission to access this admin page. Please contact your administrator.
            </p>
            <button
              onClick={() => router.push('/admin/login')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
}