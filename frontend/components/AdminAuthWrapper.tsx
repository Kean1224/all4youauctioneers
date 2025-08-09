'use client';

import { useAdminAuth } from '../hooks/useAdminAuth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AdminAuthWrapperProps {
  children: React.ReactNode;
}


export default function AdminAuthWrapper({ children }: AdminAuthWrapperProps) {
  const { isAuthenticated, loading, logout } = useAdminAuth();
  const router = useRouter();

  // Add session timeout warning and redirect if not authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Set login timestamp if not already set
      if (!localStorage.getItem('admin_login_time')) {
        localStorage.setItem('admin_login_time', Date.now().toString());
      }
      // Add page visibility change listener to logout on tab close/blur
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // Page is hidden, start countdown for auto-logout
          const timeoutId = setTimeout(() => {
            if (document.hidden) {
              console.log('Auto-logout due to inactivity');
              logout();
            }
          }, 30 * 60 * 1000); // 30 minutes of inactivity
          (window as any).inactivityTimeout = timeoutId;
        } else {
          if ((window as any).inactivityTimeout) {
            clearTimeout((window as any).inactivityTimeout);
            delete (window as any).inactivityTimeout;
          }
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      const preventRightClick = (e: MouseEvent) => {
        e.preventDefault();
        return false;
      };
      document.addEventListener('contextmenu', preventRightClick);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.removeEventListener('contextmenu', preventRightClick);
        if ((window as any).inactivityTimeout) {
          clearTimeout((window as any).inactivityTimeout);
        }
      };
    } else if (!loading) {
      // Not authenticated and not loading: redirect to login
      router.replace('/admin/login');
    }
  }, [isAuthenticated, loading, logout, router]);


  if (loading) {
    return null;
  }
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="admin-protected">
      {/* Add admin logout button in header */}
      <div className="bg-yellow-600 text-white px-4 py-2 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 2.676-1.332 6-6.031 6-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-sm font-medium">Admin Mode Active</span>
        </div>
        <button
          onClick={logout}
          className="text-sm bg-red-600 hover:bg-red-700 px-3 py-1 rounded transition-colors"
        >
          Logout
        </button>
      </div>
      {children}
    </div>
  );
}
