'use client';

import React from 'react';
import Header from './Header';
import ModernFooter from './ModernFooter';
import EnhancedMobileNav from '../app/components/EnhancedMobileNav';
import IntelligentPageTransition from '../app/components/IntelligentPageTransition';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <IntelligentPageTransition>
        <main className="min-h-screen bg-white text-gray-900">
          {children}
        </main>
      </IntelligentPageTransition>
      <ModernFooter />
      <EnhancedMobileNav />
    </>
  );
}
