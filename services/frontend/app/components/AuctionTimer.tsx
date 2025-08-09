'use client';

import { useState, useEffect } from 'react';
import { useAuctionWebSocket, TimerUpdate } from '../../hooks/useAuctionWebSocket';

interface AuctionTimerProps {
  auctionId: string;
  initialTime?: number;
  onTimeUpdate?: (timeLeft: number) => void;
  onAuctionEnd?: () => void;
  className?: string;
}

export default function AuctionTimer({
  auctionId,
  initialTime = 0,
  onTimeUpdate,
  onAuctionEnd,
  className = ''
}: AuctionTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [status, setStatus] = useState<'active' | 'extended' | 'closing' | 'closed'>('active');
  const [isUrgent, setIsUrgent] = useState(false);

  const { isConnected } = useAuctionWebSocket({
    auctionId,
    onTimerUpdate: (timerUpdate: TimerUpdate) => {
      setTimeRemaining(timerUpdate.timeRemaining);
      setStatus(timerUpdate.status);
      onTimeUpdate?.(timerUpdate.timeRemaining);
      
      if (timerUpdate.status === 'closed') {
        onAuctionEnd?.();
      }
    }
  });

  // Local timer fallback when WebSocket is not connected
  useEffect(() => {
    if (!isConnected && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = Math.max(0, prev - 1);
          onTimeUpdate?.(newTime);
          
          if (newTime === 0) {
            setStatus('closed');
            onAuctionEnd?.();
          }
          
          return newTime;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isConnected, timeRemaining, onTimeUpdate, onAuctionEnd]);

  // Check if time is urgent (less than 5 minutes)
  useEffect(() => {
    setIsUrgent(timeRemaining <= 300 && timeRemaining > 0);
  }, [timeRemaining]);

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = (): string => {
    switch (status) {
      case 'active': return 'Auction Active';
      case 'extended': return 'Time Extended';
      case 'closing': return 'Final Moments';
      case 'closed': return 'Auction Ended';
      default: return 'Unknown Status';
    }
  };

  const getContainerClass = (): string => {
    const baseClass = 'rounded-lg p-4 text-center transition-all duration-300';
    
    if (status === 'closed') {
      return `${baseClass} bg-gray-100 text-gray-600`;
    }
    
    if (isUrgent) {
      return `${baseClass} bg-red-50 border-2 border-red-300 ${timeRemaining <= 60 ? 'animate-pulse' : ''}`;
    }
    
    if (status === 'extended') {
      return `${baseClass} bg-blue-50 border-2 border-blue-300`;
    }
    
    return `${baseClass} bg-green-50 border-2 border-green-300`;
  };

  const getTimeClass = (): string => {
    if (status === 'closed') return 'text-gray-500';
    if (isUrgent) return 'text-red-600 font-bold';
    if (status === 'extended') return 'text-blue-600 font-bold';
    return 'text-green-600 font-bold';
  };

  const getStatusClass = (): string => {
    if (status === 'closed') return 'text-gray-500';
    if (isUrgent) return 'text-red-500';
    if (status === 'extended') return 'text-blue-500';
    return 'text-green-500';
  };

  return (
    <div className={`${getContainerClass()} ${className}`}>
      <div className="flex items-center justify-between">
        {/* Connection Status Indicator */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
          <span className="text-xs text-gray-500">
            {isConnected ? 'Live' : 'Local'}
          </span>
        </div>

        {/* Status */}
        <div className={`text-sm font-medium uppercase tracking-wide ${getStatusClass()}`}>
          {getStatusText()}
        </div>
      </div>

      {/* Time Display */}
      <div className="mt-2">
        <div className={`text-3xl font-mono ${getTimeClass()}`}>
          {formatTime(timeRemaining)}
        </div>
        
        {isUrgent && timeRemaining > 0 && (
          <div className="mt-1 text-sm text-red-500 font-medium">
            ⚠️ Bidding closes soon!
          </div>
        )}
        
        {status === 'extended' && (
          <div className="mt-1 text-sm text-blue-500 font-medium">
            ⏰ Time extended due to late bids
          </div>
        )}
        
        {status === 'closed' && (
          <div className="mt-1 text-sm text-gray-500">
            ✅ Bidding has ended
          </div>
        )}
      </div>

      {/* Progress Bar for Visual Time Indication */}
      {timeRemaining > 0 && initialTime > 0 && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-1000 ${
                isUrgent ? 'bg-red-500' : status === 'extended' ? 'bg-blue-500' : 'bg-green-500'
              }`}
              style={{
                width: `${Math.max(0, (timeRemaining / initialTime) * 100)}%`
              }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0:00</span>
            <span>{formatTime(initialTime)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
