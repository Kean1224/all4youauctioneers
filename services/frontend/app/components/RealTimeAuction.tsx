'use client';

import { useState, useEffect } from 'react';
import { useAuctionWebSocket, BidUpdate, TimerUpdate, AuctionUpdate, OutbidNotification } from '../../hooks/useAuctionWebSocket';

interface RealTimeAuctionProps {
  auctionId: string;
  lotId?: string;
  currentBid?: number;
  timeRemaining?: number;
  onBidChange?: (newBid: number) => void;
  onTimerChange?: (timeLeft: number) => void;
}

export default function RealTimeAuction({
  auctionId,
  lotId,
  currentBid: initialBid = 0,
  timeRemaining: initialTime = 0,
  onBidChange,
  onTimerChange
}: RealTimeAuctionProps) {
  const [currentBid, setCurrentBid] = useState(initialBid);
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [auctionStatus, setAuctionStatus] = useState<string>('active');
  const [bidNotifications, setBidNotifications] = useState<BidUpdate[]>([]);
  const [outbidAlert, setOutbidAlert] = useState<OutbidNotification | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const { isConnected, error } = useAuctionWebSocket({
    auctionId,
    onBidUpdate: (bidUpdate: BidUpdate) => {
      console.log('📊 Real-time bid update:', bidUpdate);
      
      // Update current bid if it's for our lot or general auction update
      if (!lotId || bidUpdate.lotTitle) {
        setCurrentBid(bidUpdate.currentBid);
        onBidChange?.(bidUpdate.currentBid);
      }
      
      // Add to notifications feed
      setBidNotifications(prev => [bidUpdate, ...prev.slice(0, 4)]); // Keep last 5
      
      // Auto-clear notification after 3 seconds
      setTimeout(() => {
        setBidNotifications(prev => prev.filter(n => n.timestamp !== bidUpdate.timestamp));
      }, 3000);
    },
    onTimerUpdate: (timerUpdate: TimerUpdate) => {
      console.log('⏰ Timer update:', timerUpdate);
      setTimeRemaining(timerUpdate.timeRemaining);
      setAuctionStatus(timerUpdate.status);
      onTimerChange?.(timerUpdate.timeRemaining);
    },
    onAuctionUpdate: (auctionUpdate: AuctionUpdate) => {
      console.log('🏛️ Auction update:', auctionUpdate);
      setAuctionStatus(auctionUpdate.status);
    },
    onOutbidNotification: (notification: OutbidNotification) => {
      console.log('🚨 Outbid notification:', notification);
      setOutbidAlert(notification);
      
      // Auto-clear alert after 5 seconds
      setTimeout(() => setOutbidAlert(null), 5000);
    },
    onConnectionChange: (connected: boolean) => {
      setConnectionStatus(connected ? 'connected' : 'disconnected');
    }
  });

  // Update connection status based on hook state
  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('connected');
    } else if (error) {
      setConnectionStatus('disconnected');
    } else {
      setConnectionStatus('connecting');
    }
  }, [isConnected, error]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'closing': return 'text-orange-600';
      case 'extended': return 'text-blue-600';
      case 'closed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConnectionStatusColor = (): string => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      {/* Connection Status Indicator */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Live Auction Updates</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
          <span className={`text-sm font-medium ${getConnectionStatusColor()}`}>
            {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Current Bid Display */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Current Bid</p>
            <p className="text-3xl font-bold text-indigo-600">{formatCurrency(currentBid)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Time Remaining</p>
            <p className={`text-2xl font-bold ${getStatusColor(auctionStatus)}`}>
              {formatTime(timeRemaining)}
            </p>
            <p className={`text-xs uppercase tracking-wide ${getStatusColor(auctionStatus)}`}>
              {auctionStatus}
            </p>
          </div>
        </div>
      </div>

      {/* Outbid Alert */}
      {outbidAlert && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 animate-pulse">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-red-800 font-semibold">You've been outbid!</h4>
              <p className="text-red-700 text-sm mt-1">{outbidAlert.message}</p>
              <p className="text-red-600 text-xs mt-1">
                New bid: {formatCurrency(outbidAlert.newBid)}
                {outbidAlert.isAutoBid && " (Auto-bid)"}
              </p>
            </div>
            <button
              onClick={() => setOutbidAlert(null)}
              className="text-red-400 hover:text-red-600 font-bold text-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Bid Notifications Feed */}
      {bidNotifications.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Recent Bids</h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {bidNotifications.map((bid, index) => (
              <div
                key={`${bid.timestamp}-${index}`}
                className="bg-gray-50 rounded p-2 text-xs border-l-2 border-blue-400 animate-fadeIn"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    {bid.bidderEmail} bid {formatCurrency(bid.bidAmount)}
                    {bid.isAutoBid && <span className="text-purple-600 ml-1">(Auto)</span>}
                  </span>
                  <span className="text-gray-500">
                    {new Date(bid.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {bid.lotTitle && (
                  <p className="text-gray-600 truncate mt-1">{bid.lotTitle}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-red-700 text-sm">⚠️ Connection Error: {error}</p>
        </div>
      )}

      {/* No Connection Warning */}
      {connectionStatus === 'disconnected' && !error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <p className="text-yellow-700 text-sm">📶 Reconnecting to live updates...</p>
        </div>
      )}
    </div>
  );
}
