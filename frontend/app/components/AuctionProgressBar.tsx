"use client";

import React, { useState, useEffect } from 'react';

interface AuctionProgressBarProps {
  startTime: number;
  endTime: number;
  className?: string;
}

export default function AuctionProgressBar({ startTime, endTime, className = '' }: AuctionProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const now = Date.now();
      const total = endTime - startTime;
      const elapsed = now - startTime;
      const remaining = endTime - now;
      
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        setProgress(100);
      } else if (elapsed <= 0) {
        setProgress(0);
      } else {
        setProgress(Math.min(100, (elapsed / total) * 100));
      }
    };

    updateProgress();
    const interval = setInterval(updateProgress, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return 'Ended';
    
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getProgressColor = () => {
    if (progress >= 90) return 'from-red-500 to-red-600';
    if (progress >= 75) return 'from-orange-500 to-orange-600';
    if (progress >= 50) return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-green-600';
  };

  const getStatusIcon = () => {
    if (timeLeft <= 0) return '🏁';
    if (progress >= 90) return '🚨';
    if (progress >= 75) return '⚠️';
    return '⏰';
  };

  return (
    <div className={`bg-white/90 rounded-xl p-4 shadow-lg border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getStatusIcon()}</span>
          <span className="font-bold text-gray-700">Auction Progress</span>
        </div>
        <span className="text-sm font-medium text-gray-600">
          {progress.toFixed(1)}% Complete
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${getProgressColor()} transition-all duration-1000 ease-out relative overflow-hidden`}
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        >
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
        </div>
      </div>
      
      {/* Time Display */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          {timeLeft <= 0 ? 'Auction Ended' : 'Time Remaining:'}
        </span>
        <span className={`font-bold ${timeLeft <= 0 ? 'text-red-600' : progress >= 90 ? 'text-red-600' : 'text-blue-600'}`}>
          {formatTimeLeft(timeLeft)}
        </span>
      </div>
      
      {/* Urgency Alert */}
      {timeLeft > 0 && progress >= 90 && (
        <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded-lg">
          <p className="text-red-700 text-xs font-medium text-center animate-pulse">
            🚨 Auction ending soon! Place your bids now!
          </p>
        </div>
      )}
      
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
