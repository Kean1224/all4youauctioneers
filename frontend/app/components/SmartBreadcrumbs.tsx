"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: string;
  isActive?: boolean;
}

interface SmartBreadcrumbsProps {
  customItems?: BreadcrumbItem[];
  className?: string;
}

export default function SmartBreadcrumbs({ customItems, className = '' }: SmartBreadcrumbsProps) {
  const pathname = usePathname();
  
  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (customItems) return customItems;
    
    const pathSegments = pathname.split('/').filter(segment => segment);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/', icon: '🏠' }
    ];

    let currentPath = '';
    
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;
      
      // Smart labeling based on route patterns
      let label = segment;
      let icon = '📁';
      
      switch (segment) {
        case 'auctions':
          label = 'Auctions';
          icon = '🔨';
          break;
        case 'watchlist':
          label = 'My Watchlist';
          icon = '❤️';
          break;
        case 'account':
          label = 'My Account';
          icon = '👤';
          break;
        case 'buyer':
          label = 'Buyer Dashboard';
          icon = '🛒';
          break;
        case 'seller':
          label = 'Seller Dashboard';
          icon = '💼';
          break;
        case 'admin':
          label = 'Admin Panel';
          icon = '⚙️';
          break;
        case 'login':
          label = 'Login';
          icon = '🔐';
          break;
        case 'register':
          label = 'Sign Up';
          icon = '📝';
          break;
        default:
          // Check if it's an auction ID (typically numeric or UUID-like)
          if (pathSegments[index - 1] === 'auctions' && /^[a-zA-Z0-9-]+$/.test(segment)) {
            label = 'Auction Details';
            icon = '🏆';
          } else {
            label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
          }
      }
      
      breadcrumbs.push({
        label,
        href: currentPath,
        icon,
        isActive: isLast
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-md border border-gray-200">
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={item.href}>
            {index > 0 && (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            
            {item.isActive ? (
              <span className="flex items-center gap-1.5 text-blue-600 font-semibold px-2 py-1 bg-blue-50 rounded-full">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </span>
            ) : (
              <Link
                href={item.href}
                className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 px-2 py-1 rounded-full"
              >
                <span>{item.icon}</span>
                <span className="hover:underline">{item.label}</span>
              </Link>
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Quick actions based on current page */}
      <div className="flex items-center gap-2">
        {pathname.includes('/auctions/') && (
          <Link
            href="/watchlist"
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1"
          >
            ❤️ Watchlist
          </Link>
        )}
        {pathname === '/watchlist' && (
          <Link
            href="/auctions"
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1"
          >
            🔨 Browse Auctions
          </Link>
        )}
      </div>
    </nav>
  );
}
