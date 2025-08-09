"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface FloatingActionButtonProps {
  userEmail?: string;
  currentPage?: string;
}

export default function FloatingActionButton({ userEmail, currentPage }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Hide/show FAB on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false); // Hide when scrolling down
      } else {
        setIsVisible(true); // Show when scrolling up
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Close FAB when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (isOpen) setIsOpen(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  const quickActions = [
    {
      icon: '❤️',
      label: 'My Watchlist',
      href: '/watchlist',
      color: 'from-red-500 to-red-600',
      show: userEmail && currentPage !== 'watchlist'
    },
    {
      icon: '🔨',
      label: 'Browse Auctions',
      href: '/auctions',
      color: 'from-blue-500 to-blue-600',
      show: currentPage !== 'auctions'
    },
    {
      icon: '📊',
      label: 'My Account',
      href: '/account/buyer',
      color: 'from-green-500 to-green-600',
      show: userEmail && currentPage !== 'account'
    },
    {
      icon: '🏠',
      label: 'Home',
      href: '/',
      color: 'from-yellow-500 to-yellow-600',
      show: currentPage !== 'home'
    }
  ].filter(action => action.show);

  if (!isVisible || quickActions.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Action Buttons */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 space-y-3 animate-fade-in-up">
          {quickActions.map((action, index) => (
            <Link key={action.href} href={action.href}>
              <div 
                className={`
                  flex items-center bg-gradient-to-r ${action.color} text-white 
                  px-4 py-3 rounded-full shadow-lg hover:shadow-xl 
                  transform hover:scale-105 transition-all duration-200
                  animate-slide-in-up cursor-pointer group min-w-max
                `}
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: 'both'
                }}
              >
                <span className="text-xl mr-3">{action.icon}</span>
                <span className="font-medium text-sm whitespace-nowrap group-hover:scale-105 transition-transform">
                  {action.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`
          w-14 h-14 bg-gradient-to-r from-purple-500 to-purple-600 
          text-white rounded-full shadow-lg hover:shadow-xl 
          flex items-center justify-center transition-all duration-300
          hover:scale-110 active:scale-95 group
          ${isOpen ? 'rotate-45' : 'rotate-0'}
        `}
      >
        <svg 
          className={`w-6 h-6 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out;
        }
        
        .animate-slide-in-up {
          animation: slideInUp 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
