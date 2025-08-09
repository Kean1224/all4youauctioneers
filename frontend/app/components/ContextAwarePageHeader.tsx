"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SmartBackButton from './SmartBackButton';

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  icon?: string;
  userEmail?: string;
  customActions?: React.ReactNode;
  showBackButton?: boolean;
  className?: string;
}

export default function ContextAwarePageHeader({
  title,
  subtitle,
  icon,
  userEmail,
  customActions,
  showBackButton = true,
  className = ''
}: PageHeaderProps) {
  const pathname = usePathname();

  // Generate context-aware content
  const getPageContext = () => {
    const segments = pathname.split('/').filter(Boolean);
    const currentPage = segments[segments.length - 1];
    
    if (title) {
      return { title, subtitle, icon };
    }

    switch (currentPage) {
      case 'auctions':
        return {
          title: 'Active Auctions',
          subtitle: 'Find amazing deals and place your bids',
          icon: '🔨'
        };
      case 'watchlist':
        return {
          title: userEmail ? `${userEmail.split('@')[0]}'s Watchlist` : 'My Watchlist',
          subtitle: 'Items you\'re tracking and interested in',
          icon: '❤️'
        };
      case 'buyer':
        return {
          title: 'Buyer Dashboard',
          subtitle: 'Manage your bids and purchases',
          icon: '🛒'
        };
      case 'seller':
        return {
          title: 'Seller Dashboard',
          subtitle: 'Manage your listings and sales',
          icon: '💼'
        };
      case 'login':
        return {
          title: 'Welcome Back',
          subtitle: 'Sign in to access your account',
          icon: '🔐'
        };
      case 'register':
        return {
          title: 'Join All4You Auctioneers',
          subtitle: 'Create your account to start bidding',
          icon: '📝'
        };
      default:
        if (segments.includes('auctions') && segments.length === 2) {
          return {
            title: 'Auction Details',
            subtitle: 'View lots and place your bids',
            icon: '🏆'
          };
        }
        return {
          title: 'All4You Auctioneers',
          subtitle: 'Your trusted online auction house',
          icon: '🏠'
        };
    }
  };

  const { title: pageTitle, subtitle: pageSubtitle, icon: pageIcon } = getPageContext();

  // Generate contextual quick actions
  const getQuickActions = () => {
    if (customActions) return customActions;

    const actions = [];

    // Common actions based on page
    if (pathname === '/auctions') {
      if (userEmail) {
        actions.push(
          <Link
            key="watchlist"
            href="/watchlist"
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            ❤️ My Watchlist
          </Link>
        );
      }
    }

    if (pathname === '/watchlist') {
      actions.push(
        <Link
          key="browse"
          href="/auctions"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
        >
          🔨 Browse Auctions
        </Link>
      );
    }

    if (pathname.includes('/auctions/') && userEmail) {
      actions.push(
        <Link
          key="watchlist"
          href="/watchlist"
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
        >
          ❤️ Watchlist
        </Link>
      );
    }

    // Authentication actions
    if (!userEmail && !['/login', '/register'].includes(pathname)) {
      actions.push(
        <Link
          key="login"
          href="/login"
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
        >
          🔐 Login
        </Link>
      );
    }

    return actions;
  };

  const quickActions = getQuickActions();

  return (
    <div className={`bg-gradient-to-r from-white/90 to-blue-50/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 p-6 mb-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <SmartBackButton showLabel={false} />
          )}
          
          <div className="flex items-center gap-3">
            {pageIcon && (
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-2xl">{pageIcon}</span>
              </div>
            )}
            
            <div>
              <h1 className="text-2xl font-bold text-gray-800 leading-tight">
                {pageTitle}
              </h1>
              {pageSubtitle && (
                <p className="text-gray-600 text-sm mt-1">
                  {pageSubtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {quickActions && Array.isArray(quickActions) && quickActions.length > 0 && (
          <div className="flex items-center gap-3">
            {quickActions}
          </div>
        )}
      </div>

      {/* Page-specific info bar */}
      {pathname === '/auctions' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live auctions updating in real-time
            </span>
            <span>
              💡 Tip: Use Alt+A to quickly navigate to auctions
            </span>
          </div>
        </div>
      )}

      {pathname === '/watchlist' && userEmail && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              Watching items with live timer updates
            </span>
            <span>
              💡 Tip: Use Alt+W to quickly access your watchlist
            </span>
          </div>
        </div>
      )}

      {pathname.includes('/auctions/') && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Bid updates refreshing every 3 seconds
            </span>
            <span>
              💡 Tip: Click images to zoom, use quick bid buttons for faster bidding
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
