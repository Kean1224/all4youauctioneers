"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface SmartBackButtonProps {
  className?: string;
  showLabel?: boolean;
}

export default function SmartBackButton({ className = '', showLabel = true }: SmartBackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [canGoBack, setCanGoBack] = useState(false);
  const [backLabel, setBackLabel] = useState('Back');

  useEffect(() => {
    // Check if we can go back in browser history
    setCanGoBack(window.history.length > 1);
    
    // Generate smart back label based on current path
    const generateBackLabel = () => {
      const segments = pathname.split('/').filter(Boolean);
      
      if (segments.length === 0) return 'Back';
      
      const currentPage = segments[segments.length - 1];
      const parentPage = segments[segments.length - 2];
      
      switch (currentPage) {
        case 'watchlist':
          return 'Back to Home';
        case 'login':
        case 'register':
          return 'Back to Home';
        case 'buyer':
        case 'seller':
          return 'Back to Account';
        default:
          if (parentPage === 'auctions') {
            return 'Back to Auctions';
          } else if (parentPage === 'account') {
            return 'Back to Account';
          } else if (parentPage === 'admin') {
            return 'Back to Admin';
          }
          return 'Back';
      }
    };

    setBackLabel(generateBackLabel());
  }, [pathname]);

  const handleGoBack = () => {
    if (canGoBack) {
      router.back();
    } else {
      // Fallback navigation based on current path
      const segments = pathname.split('/').filter(Boolean);
      
      if (segments.length > 1) {
        // Go to parent path
        const parentPath = '/' + segments.slice(0, -1).join('/');
        router.push(parentPath);
      } else {
        // Go to home
        router.push('/');
      }
    }
  };

  // Don't show on home page
  if (pathname === '/') return null;

  return (
    <button
      onClick={handleGoBack}
      className={`
        inline-flex items-center gap-2 px-4 py-2 
        bg-white/80 hover:bg-white border border-gray-200 
        rounded-full shadow-sm hover:shadow-md 
        text-gray-700 hover:text-blue-600 
        transition-all duration-200 backdrop-blur-sm
        ${className}
      `}
      title={backLabel}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {showLabel && (
        <span className="text-sm font-medium">{backLabel}</span>
      )}
    </button>
  );
}
