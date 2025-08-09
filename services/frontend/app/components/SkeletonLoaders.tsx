"use client";

import React from 'react';

export function LotCardSkeleton() {
  return (
    <div className="bg-white/90 rounded-2xl shadow-lg border border-yellow-100 p-6 animate-pulse">
      {/* Image skeleton */}
      <div className="w-full h-48 bg-gray-200 rounded-xl mb-4"></div>
      
      {/* Title skeleton */}
      <div className="h-6 bg-gray-200 rounded mb-2"></div>
      
      {/* Description skeleton */}
      <div className="space-y-2 mb-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      
      {/* Current bid skeleton */}
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
      
      {/* Timer skeleton */}
      <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg mb-4"></div>
      
      {/* Auto-bid section skeleton */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="flex gap-2">
          <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
          <div className="w-16 h-10 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
      
      {/* Button skeleton */}
      <div className="h-12 bg-gray-200 rounded-lg"></div>
    </div>
  );
}

export function AuctionHeaderSkeleton() {
  return (
    <div className="w-full px-6 py-12 bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-yellow-200 mb-8 animate-pulse">
      <div className="flex flex-col items-center text-center">
        {/* Logo skeleton */}
        <div className="w-20 h-20 bg-gray-200 rounded-full mb-4"></div>
        
        {/* Title skeleton */}
        <div className="h-12 bg-gray-200 rounded w-2/3 mb-2"></div>
        
        {/* Registration status skeleton */}
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        
        {/* Timer skeleton */}
        <div className="h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl w-1/2"></div>
      </div>
    </div>
  );
}

export function WatchlistSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-blue-50 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-yellow-200 p-8 mb-8 animate-pulse">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-10 bg-gray-200 rounded w-64 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="w-32 h-12 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
        
        {/* Lots grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <LotCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
