'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const validateAdminAuth = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_jwt') : null;
      
      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      try {
        // First, validate the token structure and expiration locally
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload.role || payload.role !== 'admin' || !payload.email || !payload.exp || Date.now() / 1000 >= payload.exp) {
          localStorage.removeItem('admin_jwt');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userRole');
          localStorage.removeItem('admin_login_time');
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        // Then, verify with backend to ensure token is still valid
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-admin`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          // Backend rejected token, clear all admin data
          localStorage.removeItem('admin_jwt');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userRole');
          localStorage.removeItem('admin_login_time');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Admin auth validation failed:', error);
        localStorage.removeItem('admin_jwt');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        localStorage.removeItem('admin_login_time');
        setIsAuthenticated(false);
      }
      
      setLoading(false);
    };

    validateAdminAuth();
  }, []);

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_jwt');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userRole');
      localStorage.removeItem('admin_login_time');
    }
    setIsAuthenticated(false);
    router.push('/admin/login');
  };

  return {
    isAuthenticated,
    loading,
    logout,
  };
}
