"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileNavProps {
  userEmail?: string;
  className?: string;
}

export default function EnhancedMobileNav({ userEmail, className = '' }: MobileNavProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Hide/show nav on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Touch gestures for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const deltaY = currentY - startY;
    
    // Swipe down to hide nav
    if (deltaY > 50) {
      setIsVisible(false);
    }
    // Swipe up to show nav
    else if (deltaY < -50) {
      setIsVisible(true);
    }
    
    setIsDragging(false);
  };

  const navItems = [
    {
      href: '/',
      icon: '🏠',
      label: 'Home',
      active: pathname === '/',
      show: true
    },
    {
      href: '/auctions',
      icon: '🔨',
      label: 'Auctions',
      active: pathname === '/auctions' || pathname.includes('/auctions/'),
      show: true
    },
    {
      href: '/watchlist',
      icon: '❤️',
      label: 'Watchlist',
      active: pathname === '/watchlist',
      show: !!userEmail,
      badge: true
    },
    {
      href: userEmail ? '/account/buyer' : '/login',
      icon: userEmail ? '👤' : '🔐',
      label: userEmail ? 'Account' : 'Login',
      active: pathname.includes('/account') || (pathname === '/login' && !userEmail),
      show: true
    }
  ].filter(item => item.show);

  // Don't render on desktop
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile) return null;

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-50 
        transform transition-transform duration-300 ease-in-out
        ${isVisible ? 'translate-y-0' : 'translate-y-full'}
        ${className}
      `}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drag indicator */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 px-4 py-1">
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto"></div>
      </div>

      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-md border-t border-gray-200 safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex flex-col items-center justify-center p-3 rounded-xl
                transition-all duration-200 min-w-[64px]
                ${item.active 
                  ? 'bg-blue-100 text-blue-600 scale-105' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 active:scale-95'
                }
              `}
            >
              {/* Active indicator */}
              {item.active && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-blue-600 rounded-full"></div>
              )}

              {/* Icon with badge */}
              <div className="relative">
                <span className={`text-xl ${item.active ? 'animate-bounce' : ''}`}>
                  {item.icon}
                </span>
                {item.badge && item.label === 'Watchlist' && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                )}
              </div>

              {/* Label */}
              <span className={`text-xs mt-1 font-medium ${item.active ? 'font-bold' : ''}`}>
                {item.label}
              </span>

              {/* Ripple effect */}
              {item.active && (
                <div className="absolute inset-0 bg-blue-200 rounded-xl animate-ping opacity-20"></div>
              )}
            </Link>
          ))}
        </div>

        {/* Quick action hint */}
        <div className="px-4 pb-2">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              💡 Swipe up/down to hide/show • Long press for shortcuts
            </p>
          </div>
        </div>
      </nav>

      {/* Safe area spacing for devices with home indicator */}
      <div className="h-safe-area-inset-bottom bg-white/95"></div>
    </div>
  );
}
