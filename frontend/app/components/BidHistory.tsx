"use client";

import React, { useState, useEffect } from 'react';

interface BidEntry {
  bidderEmail: string;
  amount: number;
  time: string;
  isAutoBid?: boolean;
}

interface BidHistoryProps {
  lotId: string;
  auctionId: string;
  bidHistory: BidEntry[];
  currentUserEmail?: string;
  className?: string;
}

export default function BidHistory({ 
  lotId, 
  auctionId, 
  bidHistory, 
  currentUserEmail, 
  className = '' 
}: BidHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [realtimeBids, setRealtimeBids] = useState<BidEntry[]>(bidHistory);

  // Update when bidHistory prop changes
  useEffect(() => {
    setRealtimeBids(bidHistory);
  }, [bidHistory]);

  // Format time display
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // Less than 1 minute
    if (diffMs < 60000) {
      return 'Just now';
    }
    
    // Less than 1 hour
    if (diffMs < 3600000) {
      const minutes = Math.floor(diffMs / 60000);
      return `${minutes}m ago`;
    }
    
    // Less than 24 hours
    if (diffMs < 86400000) {
      const hours = Math.floor(diffMs / 3600000);
      return `${hours}h ago`;
    }
    
    // More than 24 hours
    return date.toLocaleDateString();
  };

  // Mask email for anonymity (show first 2 chars + ***)
  const maskEmail = (email: string) => {
    if (email === currentUserEmail) return 'You';
    if (email.length <= 2) return email;
    const [username, domain] = email.split('@');
    const maskedUsername = username.slice(0, 2) + '*'.repeat(Math.max(username.length - 2, 1));
    return `${maskedUsername}@${domain}`;
  };

  // Sort bids by amount (highest first)
  const sortedBids = [...realtimeBids].sort((a, b) => b.amount - a.amount);
  const displayBids = isExpanded ? sortedBids : sortedBids.slice(0, 3);

  if (!realtimeBids || realtimeBids.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📊</span>
          <h4 className="font-bold text-gray-700">Bid History</h4>
        </div>
        <p className="text-gray-500 text-sm text-center py-4">
          No bids yet. Be the first to bid!
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-white to-blue-50 rounded-lg border border-blue-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h4 className="font-bold text-gray-700">Bid History</h4>
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
            {realtimeBids.length} bids
          </span>
        </div>
        {realtimeBids.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
          >
            {isExpanded ? 'Show Less' : 'Show All'}
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {displayBids.map((bid, index) => {
          const isCurrentUser = bid.bidderEmail === currentUserEmail;
          const isHighestBid = index === 0 && !isExpanded; // Only show crown for highest when not expanded
          const isWinningBid = sortedBids[0] === bid;
          
          return (
            <div
              key={`${bid.bidderEmail}-${bid.amount}-${bid.time}`}
              className={`
                relative p-3 rounded-lg border transition-all duration-200 hover:shadow-md
                ${isCurrentUser 
                  ? 'bg-gradient-to-r from-green-100 to-green-50 border-green-300' 
                  : 'bg-white border-gray-200'
                }
                ${isWinningBid ? 'ring-2 ring-yellow-300' : ''}
              `}
            >
              {/* Winning badge */}
              {isWinningBid && (
                <div className="absolute -top-2 -right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                  🏆 Leading
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-lg ${isWinningBid ? 'text-yellow-600' : 'text-blue-600'}`}>
                        R{(bid.amount || 0).toLocaleString()}
                      </span>
                      {bid.isAutoBid && (
                        <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs font-medium">
                          🤖 Auto
                        </span>
                      )}
                      {isCurrentUser && (
                        <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-medium">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{maskEmail(bid.bidderEmail)}</span>
                      <span>•</span>
                      <span>{formatTime(bid.time)}</span>
                    </div>
                  </div>
                </div>

                {/* Position indicator */}
                <div className="flex items-center gap-2">
                  {isWinningBid && <span className="text-yellow-500 text-xl">👑</span>}
                  <span className="text-xs text-gray-400 font-medium">
                    #{index + 1}
                  </span>
                </div>
              </div>

              {/* Bid confidence indicator */}
              <div className="mt-2 flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 w-6 rounded-full ${
                      i < Math.min(5, Math.floor((bid.amount / sortedBids[0].amount) * 5))
                        ? isWinningBid ? 'bg-yellow-400' : 'bg-blue-400'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
                <span className="text-xs text-gray-500 ml-2">
                  {Math.round((bid.amount / sortedBids[0].amount) * 100)}% of leading bid
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            Average bid: R{realtimeBids.length > 0 ? Math.round(realtimeBids.reduce((sum, bid) => sum + (bid.amount || 0), 0) / realtimeBids.length).toLocaleString() : '0'}
          </span>
          <span>
            Bid range: R{realtimeBids.length > 0 ? Math.min(...realtimeBids.map(b => b.amount || 0)).toLocaleString() : '0'} - R{realtimeBids.length > 0 ? Math.max(...realtimeBids.map(b => b.amount || 0)).toLocaleString() : '0'}
          </span>
        </div>
      </div>
    </div>
  );
}
