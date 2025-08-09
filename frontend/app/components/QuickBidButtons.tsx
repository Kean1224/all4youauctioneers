"use client";

import React, { useState } from 'react';

interface QuickBidButtonsProps {
  currentBid: number;
  increment: number;
  onQuickBid: (amount: number) => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function QuickBidButtons({ 
  currentBid, 
  increment, 
  onQuickBid, 
  disabled = false,
  loading = false 
}: QuickBidButtonsProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  // Generate quick bid amounts
  const quickBidAmounts = [
    currentBid + increment,
    currentBid + increment * 2,
    currentBid + increment * 5,
    currentBid + increment * 10
  ];

  const handleQuickBid = (amount: number) => {
    // Haptic feedback (if supported)
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    setSelectedAmount(amount);
    onQuickBid(amount);
    
    // Clear selection after animation
    setTimeout(() => setSelectedAmount(null), 1000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-blue-50 rounded-xl p-4 border border-yellow-200">
      <h4 className="text-sm font-bold text-gray-700 mb-3 text-center">⚡ Quick Bid</h4>
      <div className="grid grid-cols-2 gap-2">
        {quickBidAmounts.map((amount, index) => {
          const isSelected = selectedAmount === amount;
          const buttonClass = `
            relative overflow-hidden transform transition-all duration-200 
            ${disabled || loading ? 
              'bg-gray-200 text-gray-400 cursor-not-allowed' : 
              'bg-white hover:bg-gradient-to-r hover:from-yellow-400 hover:to-yellow-500 hover:text-white hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer'
            }
            ${isSelected ? 'bg-gradient-to-r from-green-400 to-green-500 text-white scale-105 shadow-lg' : ''}
            text-sm font-bold py-2 px-3 rounded-lg border-2 border-yellow-200 text-center
          `;

          return (
            <button
              key={index}
              onClick={() => !disabled && !loading && handleQuickBid(amount)}
              disabled={disabled || loading}
              className={buttonClass}
            >
              {isSelected && (
                <div className="absolute inset-0 bg-white opacity-20 animate-pulse rounded-lg"></div>
              )}
              <div className="relative z-10">
                <div className="text-xs opacity-75">
                  +R{amount - currentBid}
                </div>
                <div className="font-bold">
                  {formatCurrency(amount).replace('ZAR', 'R')}
                </div>
              </div>
              
              {/* Ripple effect */}
              {isSelected && (
                <div className="absolute inset-0 bg-white rounded-lg animate-ping opacity-20"></div>
              )}
            </button>
          );
        })}
      </div>
      
      <div className="mt-3 text-xs text-gray-500 text-center">
        💡 Tap any amount to bid instantly
      </div>
    </div>
  );
}
