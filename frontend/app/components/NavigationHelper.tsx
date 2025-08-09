"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationHelperProps {
  userEmail?: string;
  className?: string;
}

interface NavSuggestion {
  title: string;
  description: string;
  href: string;
  icon: string;
  priority: number;
  condition?: boolean;
}

export default function NavigationHelper({ userEmail, className = '' }: NavigationHelperProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [suggestions, setSuggestions] = useState<NavSuggestion[]>([]);

  // Generate contextual navigation suggestions
  useEffect(() => {
    const generateSuggestions = (): NavSuggestion[] => {
      const allSuggestions: NavSuggestion[] = [
        {
          title: 'Browse Active Auctions',
          description: 'Find items to bid on right now',
          href: '/auctions',
          icon: '🔨',
          priority: 10,
          condition: pathname !== '/auctions'
        },
        {
          title: 'Check Your Watchlist',
          description: 'See items you\'re tracking',
          href: '/watchlist',
          icon: '❤️',
          priority: 9,
          condition: !!userEmail && pathname !== '/watchlist'
        },
        {
          title: 'View Your Account',
          description: 'Manage your profile and bids',
          href: '/account/buyer',
          icon: '👤',
          priority: 7,
          condition: !!userEmail && !pathname.includes('/account')
        },
        {
          title: 'Login to Start Bidding',
          description: 'Access all auction features',
          href: '/login',
          icon: '🔐',
          priority: 8,
          condition: !userEmail && pathname !== '/login'
        },
        {
          title: 'Create Account',
          description: 'Join thousands of bidders',
          href: '/register',
          icon: '📝',
          priority: 6,
          condition: !userEmail && pathname !== '/register'
        },
        {
          title: 'Go to Homepage',
          description: 'Return to main page',
          href: '/',
          icon: '🏠',
          priority: 5,
          condition: pathname !== '/'
        }
      ];

      // Filter based on conditions and sort by priority
      return allSuggestions
        .filter(suggestion => suggestion.condition !== false)
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 3); // Show top 3 suggestions
    };

    setSuggestions(generateSuggestions());
  }, [pathname, userEmail]);

  // Auto-hide after some time on certain pages
  useEffect(() => {
    if (pathname === '/' || pathname === '/auctions') {
      const timer = setTimeout(() => setIsVisible(false), 10000); // Hide after 10 seconds
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.altKey) {
        switch (e.key) {
          case 'h':
            e.preventDefault();
            window.location.href = '/';
            break;
          case 'a':
            e.preventDefault();
            window.location.href = '/auctions';
            break;
          case 'w':
            if (userEmail) {
              e.preventDefault();
              window.location.href = '/watchlist';
            }
            break;
          case 'p':
            if (userEmail) {
              e.preventDefault();
              window.location.href = '/account/buyer';
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [userEmail]);

  if (!isVisible || suggestions.length === 0) return null;

  return (
    <div className={`fixed bottom-20 left-4 z-30 ${className}`}>
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl border border-blue-200 p-4 max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧭</span>
            <h4 className="font-bold text-gray-800">Quick Navigation</h4>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Suggestions */}
        <div className="space-y-2 mb-3">
          {suggestions.map((suggestion, index) => (
            <Link
              key={suggestion.href}
              href={suggestion.href}
              className="block p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl group-hover:scale-110 transition-transform">
                  {suggestion.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <h5 className="font-semibold text-gray-800 text-sm group-hover:text-blue-600 transition-colors">
                    {suggestion.title}
                  </h5>
                  <p className="text-xs text-gray-600 leading-tight">
                    {suggestion.description}
                  </p>
                </div>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="border-t border-gray-200 pt-2">
          <p className="text-xs text-gray-500 text-center">
            💡 Use <kbd className="bg-gray-100 px-1 rounded text-xs">Alt + H</kbd> for Home, 
            <kbd className="bg-gray-100 px-1 rounded text-xs ml-1">Alt + A</kbd> for Auctions
            {userEmail && (
              <>
                , <kbd className="bg-gray-100 px-1 rounded text-xs">Alt + W</kbd> for Watchlist
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
