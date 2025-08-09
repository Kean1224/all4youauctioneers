"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function IntelligentPageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Loading...');
  const [previousPath, setPreviousPath] = useState('');

  // Generate smart loading messages based on destination
  const getLoadingMessage = (path: string) => {
    if (path.includes('/auctions/')) {
      return 'Loading auction details...';
    } else if (path === '/auctions') {
      return 'Finding active auctions...';
    } else if (path === '/watchlist') {
      return 'Loading your watchlist...';
    } else if (path.includes('/account')) {
      return 'Loading your account...';
    } else if (path === '/login') {
      return 'Preparing login...';
    } else if (path === '/register') {
      return 'Setting up registration...';
    }
    return 'Loading page...';
  };

  // Handle route changes
  useEffect(() => {
    if (previousPath && previousPath !== pathname) {
      setIsLoading(true);
      setLoadingText(getLoadingMessage(pathname));
      
      // Simulate loading time (in real app, this would be controlled by data fetching)
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800);
      
      return () => clearTimeout(timer);
    }
    setPreviousPath(pathname);
  }, [pathname, previousPath]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-yellow-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          {/* Loading animation */}
          <div className="relative mb-8">
            {/* Spinning auction hammer */}
            <div className="w-24 h-24 mx-auto mb-4 relative">
              <div className="absolute inset-0 border-4 border-yellow-200 rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-4 border-blue-200 rounded-full animate-spin animate-reverse"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl animate-bounce">🔨</span>
              </div>
            </div>
            
            {/* Progress dots */}
            <div className="flex justify-center space-x-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"
                  style={{
                    animationDelay: `${i * 200}ms`,
                    animationDuration: '1s'
                  }}
                ></div>
              ))}
            </div>
          </div>

          {/* Loading text */}
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {loadingText}
          </h2>
          <p className="text-gray-600">
            Getting everything ready for you...
          </p>

          {/* Tips */}
          <div className="mt-8 p-4 bg-white/80 rounded-xl border border-gray-200 max-w-md mx-auto">
            <h3 className="font-semibold text-gray-800 mb-2">💡 Quick Tip</h3>
            <p className="text-sm text-gray-600">
              {pathname.includes('/auctions/') && "Click on images to zoom in and see more details!"}
              {pathname === '/auctions' && "Use the search filters to find exactly what you're looking for!"}
              {pathname === '/watchlist' && "Set up auto-bids to never miss out on items you love!"}
              {pathname.includes('/account') && "Keep your profile updated to improve your bidding experience!"}
              {!pathname.includes('/auctions') && !pathname.includes('/account') && pathname !== '/watchlist' && "Use keyboard shortcuts: Alt+H for Home, Alt+A for Auctions!"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {children}
    </div>
  );
}

// Add these CSS classes to your global styles
export const pageTransitionStyles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes reverse {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(-360deg);
    }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.5s ease-out;
  }
  
  .animate-reverse {
    animation: reverse 2s linear infinite;
  }
`;
