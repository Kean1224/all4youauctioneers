import React from 'react';

export default function ModernAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg rounded-3xl p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
