'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkAuthStatus, clearLegacyTokens } from '../utils/cookieAuth';

interface AdminPageWrapperProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
}

export default function AdminPageWrapper({ children, requiredPermissions }: AdminPageWrapperProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const verifyAdminAccess = async () => {
      try {
        // Clear any legacy localStorage tokens
        clearLegacyTokens();
        
        // Check authentication status using httpOnly cookies
        const result = await checkAuthStatus();
        
        if (result.success && result.user?.role === 'admin') {
          setIsAuthorized(true);
        } else {
          router.replace('/admin/login?error=unauthorized');
          return;
        }
      } catch (error) {
        console.error('Admin verification failed:', error);
        router.replace('/admin/login?error=verification_failed');
      } finally {
        setLoading(false);
      }
    };

    verifyAdminAccess();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}