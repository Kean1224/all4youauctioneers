"use client";

// Top-level LotCard component to fix React hook violation
function LotCard({
  lot,
  auctionId,
  index,
  watchlist,
  toggleWatchlist,
  expandedDescriptions,
  toggleDescription,
  biddingLoading,
  handlePlaceBid,
  openImageModal,
  openVideoModal,
  sniperProtectionActive
}: {
  lot: Lot;
  auctionId: string;
  index: number;
  watchlist: string[];
  toggleWatchlist: (lotId: string) => void;
  expandedDescriptions: { [key: string]: boolean };
  toggleDescription: (lotId: string) => void;
  biddingLoading: string | null;
  handlePlaceBid: (lotId: string, currentBid: number, increment: number) => void;
  openImageModal: (images: string[], currentIndex: number, lotTitle: string) => void;
  openVideoModal: (videoUrl: string, lotTitle: string) => void;
  sniperProtectionActive?: boolean;
}) {
  const images = lot.images?.length ? lot.images : (lot.imageUrl || lot.image ? [lot.imageUrl || lot.image] : []);
  const lotNumber = lot.lotNumber || index + 1;
  const lotEndTime = lot.endTime || '';
  const startPrice = lot.startingPrice || lot.startPrice || 0;
  const currentBid = lot.currentBid || startPrice;
  const nextBidAmount = currentBid + (lot.bidIncrement || 100);
  const reserveMet = lot.reservePrice ? currentBid >= lot.reservePrice : true;
  
  // Check if current user is the highest bidder
  const userEmail = typeof window !== 'undefined' ? (localStorage.getItem('userEmail') || localStorage.getItem('user_email')) : null;
  const lastBid = lot.bidHistory?.[lot.bidHistory.length - 1];
  const isUserHighestBidder = lastBid && lastBid.bidderEmail === userEmail;
  
  // Determine if lot has actually ended based on time
  const isLotEnded = () => {
    if (!lotEndTime) return lot.status === 'ended';
    const now = new Date().getTime();
    const endTime = new Date(lotEndTime).getTime();
    return now >= endTime || lot.status === 'ended';
  };
  
  const lotEnded = isLotEnded();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': case 'live': return 'bg-green-500 text-white';
      case 'ended': return 'bg-red-500 text-white';
      case 'not_started': case 'pending': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const specialConditions = [];
  if (lot.vatApplicable) specialConditions.push('VAT Applies');
  if (lot.soldAsIs) specialConditions.push('Sold As-Is');
  if (lot.specialConditions) specialConditions.push(...lot.specialConditions);

  return (
    <motion.div
      key={lot.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-green-400 hover:shadow-2xl transition-all duration-300 relative shadow-lg group"
    >
      {/* Compact Header */}
      <div className="absolute top-2 left-2 flex gap-1 items-center z-10">
        <span className="px-2 py-1 bg-black text-white text-xs font-bold rounded-full">
          #{lotNumber}
        </span>
        <LotTimer endTime={lotEndTime} lotNumber={lotNumber} />
      </div>
      
      {/* Watchlist Button */}
      <div className="absolute top-2 right-2 z-10">
        <button
          className={`p-1 rounded-full shadow-lg transition-all ${watchlist.includes(lot.id) ? 'bg-yellow-400 text-black' : 'bg-white/80 text-gray-600 hover:bg-white'}`}
          onClick={() => toggleWatchlist(lot.id)}
        >
          {watchlist.includes(lot.id) ? '★' : '☆'}
        </button>
      </div>

      {/* Image Section */}
      <div className="relative h-32 overflow-hidden cursor-pointer" onClick={() => openImageModal(images, 0, lot.title)}>
        {images.length > 0 ? (
          <>
            <Image
              src={images[0].startsWith('http') ? images[0] : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${images[0]}`}
              alt={lot.title || 'Auction Lot Image'}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {images.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded-full text-xs font-bold">
                +{images.length - 1}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
            <TagIcon className="w-12 h-12 text-white" />
          </div>
        )}
        {lot.videoUrl && (
          <button 
            className="absolute bottom-2 left-2 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-full text-xs font-bold transition-colors shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              openVideoModal(lot.videoUrl!, lot.title);
            }}
          >
            🎥
          </button>
        )}
      </div>

      {/* Streamlined Content */}
      <div className="p-4">
        {/* Title and Price Row */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-base font-bold text-gray-900 line-clamp-2 flex-1 mr-2">{lot.title}</h3>
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-gray-500">Starting</div>
            <div className="text-sm font-bold text-blue-600">R{startPrice.toLocaleString()}</div>
          </div>
        </div>

        {/* Status Badges - Only show if important */}
        {(lot.reservePrice || specialConditions.length > 0) && (
          <div className="flex gap-1 mb-2">
            {lot.reservePrice && (
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${reserveMet ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {reserveMet ? '✓ Reserve Met' : '⚠ Reserve'}
              </span>
            )}
            {specialConditions.slice(0, 1).map((condition, idx) => (
              <span key={idx} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                {condition.length > 10 ? condition.slice(0, 10) + '...' : condition}
              </span>
            ))}
          </div>
        )}

        {/* Current Bid Section */}
        <div className={`rounded-xl p-3 mb-3 bg-gradient-to-r ${
          isUserHighestBidder 
            ? 'from-green-500 to-green-600 text-white' 
            : 'from-blue-500 to-blue-600 text-white'
        } shadow-lg`}>
          <div className="flex justify-between items-center">
            <div>
              {isUserHighestBidder && (
                <div className="text-xs font-bold mb-1 flex items-center gap-1">
                  🏆 You're Winning!
                </div>
              )}
              <div className="text-xs opacity-90">Current Bid</div>
              <div className="text-xl font-bold">
                R{currentBid.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-90">{lot.bidHistory?.length || 0} bids</div>
              {!isUserHighestBidder && (
                <div className="text-sm font-semibold bg-white/20 px-2 py-1 rounded-full">
                  Next: R{nextBidAmount.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {lotEnded ? (
          <div className="bg-red-100 border-2 border-red-300 rounded-xl p-3 text-center">
            <div className="text-red-700 font-bold">🔨 AUCTION ENDED</div>
            <div className="text-red-600 text-sm">Final: R{currentBid.toLocaleString()}</div>
            {isUserHighestBidder && (
              <div className="text-green-700 text-sm font-bold mt-1">🏆 You Won!</div>
            )}
          </div>
        ) : isUserHighestBidder ? (
          <div className="bg-green-100 border-2 border-green-300 rounded-xl p-3 text-center">
            <div className="text-green-700 font-bold">🥇 You're the Highest Bidder!</div>
            <div className="text-green-600 text-sm">Keep watching for new bids</div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Main Bid Button */}
            <button
              className={`w-full py-4 px-4 rounded-xl font-bold text-lg shadow-xl transition-all duration-200 transform ${
                biddingLoading === lot.id 
                  ? 'bg-gray-400 cursor-not-allowed text-white scale-95' 
                  : 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white hover:scale-105 active:scale-95 hover:shadow-2xl'
              }`}
              disabled={biddingLoading === lot.id}
              onClick={() => handlePlaceBid(lot.id, currentBid, lot.bidIncrement || 100)}
            >
              {biddingLoading === lot.id ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Placing Bid...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>🚀 BID R{nextBidAmount.toLocaleString()}</span>
                </div>
              )}
            </button>
            
            {/* Quick Bid Options */}
            <div className="grid grid-cols-2 gap-2">
              <button
                className="py-2 px-3 bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white text-sm font-bold rounded-lg transition-all hover:scale-105 shadow-lg"
                onClick={() => handlePlaceBid(lot.id, currentBid, (lot.bidIncrement || 100) * 2)}
                disabled={biddingLoading === lot.id}
              >
                Quick +R{((lot.bidIncrement || 100) * 2).toLocaleString()}
              </button>
              <button
                className="py-2 px-3 bg-gradient-to-r from-purple-400 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white text-sm font-bold rounded-lg transition-all hover:scale-105 shadow-lg"
                onClick={() => handlePlaceBid(lot.id, currentBid, (lot.bidIncrement || 100) * 5)}
                disabled={biddingLoading === lot.id}
              >
                Max +R{((lot.bidIncrement || 100) * 5).toLocaleString()}
              </button>
            </div>
          </div>
        )}

        {/* Footer Stats */}
        <div className="flex justify-between items-center text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
          <span className="flex items-center gap-1">
            👁 {lot.views || 0} views
          </span>
          <span className="flex items-center gap-1">
            ❤️ {lot.watchers || 0} watching
          </span>
          {lot.condition && (
            <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
              {lot.condition}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}


import React, { useState, useEffect, useRef } from 'react';
// Helper: Scroll to notifications for accessibility
function scrollToNotifications() {
  const el = document.getElementById('auction-notifications');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
import BidNotifications from '../../components/BidNotifications';
// WebSocket URL for local development (adjust if needed)
// Make sure to set NEXT_PUBLIC_WS_URL in your .env.local for production or custom setups
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5051';

console.log('WebSocket URL:', WS_URL); // Debug log

// API URL for local development
// Make sure to set NEXT_PUBLIC_API_URL in your .env.local for production or custom setups
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
// Enhanced Timer component for each lot with different display formats
function LotTimer({ endTime, lotNumber }: { endTime: string; lotNumber: number }) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);

  useEffect(() => {
    if (!endTime) {
      setTimeLeft('No end time');
      return;
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const difference = end - now;
      const totalSecs = Math.floor(difference / 1000);
      setTotalSeconds(totalSecs);

      if (difference <= 0) {
        setTimeLeft('ENDED');
        setIsExpired(true);
        setIsUrgent(false);
        clearInterval(timer);
        return;
      }

      // Mark as urgent if less than 5 minutes (300 seconds)
      setIsUrgent(totalSecs <= 300);

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      // Different display formats based on time remaining
      if (days > 7) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 5) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        // Show seconds for last 5 minutes
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  const getTimerStyle = () => {
    if (isExpired) {
      return 'bg-red-500 text-white border-red-600';
    } else if (isUrgent) {
      return 'bg-red-600 text-white border-red-700 animate-pulse';
    } else if (totalSeconds <= 3600) { // Less than 1 hour
      return 'bg-orange-500 text-white border-orange-600';
    } else {
      return 'bg-green-600 text-white border-green-700';
    }
  };

  return (
    <div className={`px-2 py-1 rounded-lg font-mono text-xs font-bold border-2 shadow ${getTimerStyle()}`}>
      {isExpired ? '⏰ ENDED' : `🕒 ${timeLeft}`}
    </div>
  );
}
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  TagIcon,
  EyeIcon,
  HeartIcon,
  ArrowLeftIcon,
  TrophyIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

type Lot = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  image?: string;
  images?: string[];
  currentBid: number;
  startingPrice?: number;
  startPrice?: number;
  reservePrice?: number;
  reserveMet?: boolean;
  status: 'open' | 'ended' | 'pending' | 'not_started';
  bidHistory?: any[];
  bidIncrement?: number;
  endTime?: string;
  lotNumber?: number;
  location?: string;
  condition?: string;
  sellerName?: string;
  sellerEmail?: string;
  videoUrl?: string;
  specialConditions?: string[];
  vatApplicable?: boolean;
  soldAsIs?: boolean;
  sniperProtection?: boolean;
  views?: number;
  watchers?: number;
  category?: string;
};

type Auction = {
  id: string;
  title: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  depositRequired: boolean;
  depositAmount: number;
  auctionImage?: string;
  increment: number;
  lots: Lot[];
  createdAt: string;
  status?: string;
  viewCount?: number;
};

export default function AuctionDetailPage() {
  // --- Advanced Logic State ---
  const [notifications, setNotifications] = useState<any[]>([]);
  const [biddingLoading, setBiddingLoading] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [imageModal, setImageModal] = useState({ isOpen: false, images: [], currentIndex: 0, lotTitle: '' });
  const [videoModal, setVideoModal] = useState({ isOpen: false, videoUrl: '', lotTitle: '' });
  const [expandedDescriptions, setExpandedDescriptions] = useState<{[key: string]: boolean}>({});
  const [sniperProtections, setSniperProtections] = useState<{[key: string]: boolean}>({});
  const wsRef = useRef<WebSocket | null>(null);
  const params = useParams();
  const auctionId = params.auctionId as string;
  // --- WebSocket: Live Bidding ---
  useEffect(() => {
    if (!auctionId) return;
    
    // Add a small delay to ensure the component is fully mounted
    const connectTimer = setTimeout(() => {
      connectWebSocket();
    }, 1000);
    
    return () => {
      clearTimeout(connectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [auctionId]);

  const connectWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    if (wsRef.current) wsRef.current.close();
    
    let ws;
    try {
      console.log('Attempting to connect to WebSocket:', WS_URL);
      ws = new window.WebSocket(WS_URL);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully to', WS_URL);
        // Get user email from localStorage (or use a default/guest identifier)
        const userEmail = localStorage.getItem('userEmail') || `guest_${Math.random().toString(36).substr(2, 9)}`;
        console.log('Registering user:', userEmail);
        
        // Register with the WebSocket server
        ws.send(JSON.stringify({
          type: 'register',
          email: userEmail
        }));
        
        // Subscribe to auction updates
        ws.send(JSON.stringify({
          type: 'subscribe_auction',
          auctionId: auctionId
        }));
        
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            message: 'Connected to live bidding',
            type: 'success',
            timestamp: Date.now(),
          },
        ]);
      };
    } catch (e) {
      console.warn('WebSocket connection creation failed (continuing without live bidding):', e);
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          message: 'Live bidding unavailable. You can still view auctions and place bids.',
          type: 'warning',
          timestamp: Date.now(),
        },
      ]);
      return;
    }
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Handle different WebSocket message types
        if (data.type === 'connection_confirmed') {
          console.log('WebSocket registration confirmed:', data.message);
        } else if (data.type === 'auction_subscribed') {
          console.log('Auction subscription confirmed:', data.message);
        } else if (data.type === 'bid_update' && data.lotId && data.newBid) {
          setAuction((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              lots: prev.lots.map(lot =>
                lot.id === data.lotId ? { 
                  ...lot, 
                  currentBid: data.newBid, 
                  bidHistory: data.bidHistory,
                  endTime: data.extendedEndTime || lot.endTime // Update end time if extended
                } : lot
              )
            };
          });
          
          // Handle sniper protection notification
          if (data.sniperProtectionActivated) {
            setSniperProtections(prev => ({ ...prev, [data.lotId]: true }));
            setNotifications((prev) => [
              ...prev,
              {
                id: Date.now() + Math.random(),
                message: `🛡️ Sniper Protection: Lot ending time extended due to late bid!`,
                type: 'warning',
                timestamp: Date.now(),
              },
            ]);
            // Remove sniper protection indicator after 5 seconds
            setTimeout(() => {
              setSniperProtections(prev => ({ ...prev, [data.lotId]: false }));
            }, 5000);
          }
          
          setNotifications((prev) => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              message: `New bid on Lot: R ${data.newBid.toLocaleString()}`,
              type: data.isUserOutbid ? 'outbid' : 'success',
              timestamp: Date.now(),
            },
          ]);
        }
        if (data.type === 'lot_won' && data.lotId) {
          setNotifications((prev) => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              message: `You won Lot!`,
              type: 'win',
              timestamp: Date.now(),
            },
          ]);
        }
      } catch (e) {
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            message: 'WebSocket message error: ' + (e instanceof Error ? e.message : ''),
            type: 'error',
            timestamp: Date.now(),
          },
        ]);
      }
    };
    ws.onerror = (event) => {
      console.error('❌ WebSocket error occurred:', event);
      console.error('WebSocket readyState:', ws.readyState);
      console.error('WebSocket URL was:', WS_URL);
      
      // Try to provide more specific error information
      let errorMessage = 'WebSocket connection error';
      if (ws.readyState === WebSocket.CONNECTING) {
        errorMessage = 'Failed to connect to WebSocket server. Server may be down.';
      } else if (ws.readyState === WebSocket.CLOSING) {
        errorMessage = 'WebSocket connection is closing unexpectedly.';
      } else if (ws.readyState === WebSocket.CLOSED) {
        errorMessage = 'WebSocket connection was closed unexpectedly.';
      }
      
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          message: `${errorMessage} You can still view auctions and place bids normally.`,
          type: 'warning',
          timestamp: Date.now(),
        },
      ]);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      if (event.code !== 1000) { // 1000 is normal closure
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            message: 'Connection to live bidding lost. Attempting to reconnect...',
            type: 'warning',
            timestamp: Date.now(),
          },
        ]);
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED) {
            console.log('Attempting WebSocket reconnection...');
            connectWebSocket();
          }
        }, 3000);
      }
    };
  };
  // Remove notification by id
  const removeNotification = (id: any) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Enhanced bid placement with validation
  const handlePlaceBid = async (lotId: string, currentBid: number, increment: number) => {
    // Get current user info
    const userEmail = localStorage.getItem('userEmail') || localStorage.getItem('user_email');
    
    if (!userEmail) {
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          message: '🔒 Please login to place bids',
          type: 'warning',
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    // Find the lot to get its details
    const lot = auction?.lots.find(l => l.id === lotId);
    if (!lot) return;

    // Validate bid increment
    const requiredIncrement = lot.bidIncrement || 100;
    if (increment < requiredIncrement) {
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          message: `❌ Minimum bid increment is R${requiredIncrement.toLocaleString()}`,
          type: 'error',
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    // Check if user is already highest bidder
    const lastBid = lot.bidHistory?.[lot.bidHistory.length - 1];
    if (lastBid && lastBid.bidderEmail === userEmail) {
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          message: '🏆 You are already the highest bidder! Wait for others to outbid you.',
          type: 'info',
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    const proposedBid = currentBid + increment;
    setBiddingLoading(lotId);
    
    try {
      const res = await fetch(`${API_URL}/api/lots/${lotId}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: proposedBid,
          bidderEmail: userEmail,
          increment: increment
        }),
        credentials: 'include',
      });
      
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            message: '⚠️ Invalid server response when placing bid',
            type: 'error',
            timestamp: Date.now(),
          },
        ]);
        return;
      }
      
      if (res.ok && data.success) {
        // Update local state immediately for better UX
        setAuction((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            lots: prev.lots.map(l => 
              l.id === lotId 
                ? { 
                    ...l, 
                    currentBid: data.currentBid || proposedBid,
                    bidHistory: data.bidHistory || [...(l.bidHistory || []), {
                      bidderEmail: userEmail,
                      amount: proposedBid,
                      timestamp: new Date().toISOString()
                    }]
                  }
                : l
            )
          };
        });

        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            message: `🎉 Bid successful! You bid R${proposedBid.toLocaleString()}`,
            type: 'success',
            timestamp: Date.now(),
          },
        ]);
      } else {
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            message: `❌ ${(data && data.message) ? data.message : 'Bid failed'}`,
            type: 'error',
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (e) {
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          message: '🚫 Network error placing bid: ' + (e instanceof Error ? e.message : ''),
          type: 'error',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setBiddingLoading(null);
    }
  };

  // Watchlist (persist to localStorage)
  useEffect(() => {
    // Load watchlist from localStorage on mount
    try {
      const stored = localStorage.getItem('auction_watchlist');
      if (stored) setWatchlist(JSON.parse(stored));
    } catch (e) {
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          message: 'Failed to load watchlist: ' + (e instanceof Error ? e.message : ''),
          type: 'error',
          timestamp: Date.now(),
        },
      ]);
    }
  }, []);

  useEffect(() => {
    // Save watchlist to localStorage on change
    try {
      localStorage.setItem('auction_watchlist', JSON.stringify(watchlist));
    } catch (e) {
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          message: 'Failed to save watchlist: ' + (e instanceof Error ? e.message : ''),
          type: 'error',
          timestamp: Date.now(),
        },
      ]);
    }
  }, [watchlist]);

  const toggleWatchlist = (lotId: string) => {
    setWatchlist((prev) =>
      prev.includes(lotId) ? prev.filter((id) => id !== lotId) : [...prev, lotId]
    );
  };

  // Description toggle
  const toggleDescription = (lotId: string) => {
    setExpandedDescriptions((prev) => ({ ...prev, [lotId]: !prev[lotId] }));
  };

  // Image modal (with accessibility improvements)
  const openImageModal = (images: string[], currentIndex: number, lotTitle: string) => {
    setImageModal({ isOpen: true, images, currentIndex, lotTitle });
    setTimeout(() => {
      const modal = document.getElementById('image-modal');
      if (modal) modal.focus();
    }, 100);
  };
  const closeImageModal = () => setImageModal({ isOpen: false, images: [], currentIndex: 0, lotTitle: '' });
  
  // Video modal functions
  const openVideoModal = (videoUrl: string, lotTitle: string) => {
    setVideoModal({ isOpen: true, videoUrl, lotTitle });
  };
  const closeVideoModal = () => setVideoModal({ isOpen: false, videoUrl: '', lotTitle: '' });
  const navigateModalImage = (direction: 'prev' | 'next') => {
    setImageModal((prev) => {
      const newIndex = direction === 'next'
        ? (prev.currentIndex + 1) % prev.images.length
        : (prev.currentIndex - 1 + prev.images.length) % prev.images.length;
      return { ...prev, currentIndex: newIndex };
    });
  };
  // removed duplicate params and auctionId declarations
  
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isWatched, setIsWatched] = useState(false);
  const [activeTab, setActiveTab] = useState<'lots' | 'details'>('lots');

  useEffect(() => {
    fetchAuction();
    // eslint-disable-next-line
  }, [auctionId, retryCount]);

  const fetchAuction = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/auctions/${auctionId}`);
      if (!response.ok) {
        setError('Auction not found (server returned ' + response.status + ')');
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            message: 'Auction not found (server returned ' + response.status + ')',
            type: 'error',
            timestamp: Date.now(),
          },
        ]);
        setTimeout(scrollToNotifications, 100);
        return;
      }
      let auctionData;
      try {
        auctionData = await response.json();
      } catch (jsonErr) {
        setError('Invalid server response');
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            message: 'Invalid server response',
            type: 'error',
            timestamp: Date.now(),
          },
        ]);
        setTimeout(scrollToNotifications, 100);
        return;
      }
      setAuction(auctionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load auction');
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          message: 'Failed to load auction: ' + (err instanceof Error ? err.message : ''),
          type: 'error',
          timestamp: Date.now(),
        },
      ]);
      setTimeout(scrollToNotifications, 100);
    } finally {
      setLoading(false);
    }
  };

  const getAuctionStatus = () => {
    if (!auction) return 'unknown';
    
    const now = new Date().getTime();
    const startTime = new Date(auction.startTime).getTime();
    const endTime = new Date(auction.endTime).getTime();

    if (now < startTime) return 'upcoming';
    if (now >= startTime && now < endTime) return 'live';
    return 'ended';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return (
          <span className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-full">
            UPCOMING
          </span>
        );
      case 'live':
        return (
          <span className="px-4 py-2 bg-green-500 text-white text-sm font-bold rounded-full animate-pulse">
            LIVE AUCTION
          </span>
        );
      case 'ended':
        return (
          <span className="px-4 py-2 bg-gray-500 text-white text-sm font-bold rounded-full">
            ENDED
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleWatchToggle = () => {
    setIsWatched(!isWatched);
    // TODO: Add to watchlist API call
  };

  if (!process.env.NEXT_PUBLIC_API_URL) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="bg-yellow-400 text-black px-6 py-4 rounded-lg font-semibold shadow-lg mb-6">
            <span className="text-lg">Warning: <b>NEXT_PUBLIC_API_URL</b> is not set. Using <b>http://localhost:5000</b> for API calls. Set this in your <b>.env.local</b> for custom or production environments.</span>
          </div>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading auction details...</p>
        </div>
      </div>
    );
  }

  // Error Banner with Retry
  if (error || !auction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div id="auction-notifications" />
          <div className="mb-6">
            <div className="bg-red-600 text-white px-6 py-4 rounded-lg font-semibold shadow-lg flex flex-col items-center gap-2">
              <span className="text-lg">{error || 'The auction you\'re looking for doesn\'t exist.'}</span>
              <button
                className="mt-2 px-4 py-2 bg-white text-red-700 rounded font-bold hover:bg-gray-100 transition-colors"
                onClick={() => { setRetryCount((c) => c + 1); setError(null); }}
                aria-label="Retry loading auction"
              >
                Retry
              </button>
            </div>
          </div>
          <Link href="/auctions" className="bg-green-400 text-black px-6 py-3 rounded-lg font-semibold hover:bg-green-300 transition-colors">
            Browse Auctions
          </Link>
        </div>
      </div>
    );
  }

  const status = getAuctionStatus();
  const auctionImage = auction.auctionImage || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526]">
      {/* Bid Notifications */}
      <div id="auction-notifications" />
      <BidNotifications notifications={notifications} onRemove={removeNotification} />
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-xl border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link href="/auctions" className="flex items-center gap-2 text-gray-300 hover:text-green-400 transition-colors font-semibold">
              <ArrowLeftIcon className="w-5 h-5" />
              Back to Auctions
            </Link>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleWatchToggle}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-400/80 to-green-600/80 hover:from-green-500 hover:to-green-700 text-black rounded-xl font-bold shadow-lg transition-all border border-green-300/40"
            >
              {isWatched ? (
                <HeartSolidIcon className="w-5 h-5 text-red-500" />
              ) : (
                <HeartIcon className="w-5 h-5 text-black" />
              )}
              <span>{isWatched ? 'Watching' : 'Watch Auction'}</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Auction Hero Section */}
      <div className="relative h-96 overflow-hidden rounded-b-3xl shadow-2xl">
        {auctionImage && auctionImage.trim() !== "" ? (
          <Image
            src={auctionImage.startsWith('http') ? auctionImage : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${auctionImage}`}
            alt={`${auction.title} - Auction Banner`}
            fill
            className="object-cover w-full h-full"
            priority
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526] flex items-center justify-center">
            <div className="text-center">
              <TrophyIcon className="w-24 h-24 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 text-lg font-light">No banner image available</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                {getStatusBadge(status)}
                <h1 className="text-5xl md:text-6xl font-extrabold text-white mt-4 mb-2 drop-shadow-lg tracking-tight">
                  {auction.title}
                </h1>
                {auction.description && (
                  <p className="text-2xl text-gray-200 max-w-2xl font-light drop-shadow">
                    {auction.description}
                  </p>
                )}
              </div>
              <div className="bg-white/20 backdrop-blur-2xl rounded-2xl p-8 min-w-[320px] shadow-xl border border-white/30">
                <h3 className="text-gray-900 font-bold mb-4 text-lg">Auction Details</h3>
                <div className="space-y-3 text-base">
                  <div className="flex items-center gap-2 text-gray-800">
                    <CalendarIcon className="w-4 h-4 text-green-500" />
                    <span className="font-semibold">Starts:</span>
                    <span>{formatDate(auction.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-800">
                    <ClockIcon className="w-4 h-4 text-red-500" />
                    <span className="font-semibold">Ends:</span>
                    <span>{formatDate(auction.endTime)}</span>
                  </div>
                  {auction.location && (
                    <div className="flex items-center gap-2 text-blue-800">
                      <MapPinIcon className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold">Location:</span>
                      <span>{auction.location}</span>
                    </div>
                  )}
                  {auction.depositRequired && (
                    <div className="flex items-center gap-2 text-yellow-700">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      <span className="font-semibold">Deposit Required:</span>
                      <span>R{(auction.depositAmount || 0).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tab Navigation */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={() => setActiveTab('lots')}
            className={`px-7 py-3 rounded-2xl font-bold text-lg shadow transition-all border-2 ${
              activeTab === 'lots'
                ? 'bg-gradient-to-r from-green-400 to-green-600 text-black border-green-400 shadow-lg scale-105'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:scale-105'
            }`}
          >
            Lots ({auction.lots.length})
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-7 py-3 rounded-2xl font-bold text-lg shadow transition-all border-2 ${
              activeTab === 'details'
                ? 'bg-gradient-to-r from-green-400 to-green-600 text-black border-green-400 shadow-lg scale-105'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:scale-105'
            }`}
          >
            Auction Details
          </button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'lots' && (
            <motion.div
              key="lots"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {auction.lots.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {auction.lots.map((lot, index) => (
                    <LotCard
                      key={lot.id}
                      lot={lot}
                      auctionId={auction.id}
                      index={index}
                      watchlist={watchlist}
                      toggleWatchlist={toggleWatchlist}
                      expandedDescriptions={expandedDescriptions}
                      toggleDescription={toggleDescription}
                      biddingLoading={biddingLoading}
                      handlePlaceBid={handlePlaceBid}
                      openImageModal={openImageModal}
                      openVideoModal={openVideoModal}
                      sniperProtectionActive={sniperProtections[lot.id]}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white/20 backdrop-blur-2xl border border-white/30 rounded-3xl p-16 text-center shadow-xl">
                  <TrophyIcon className="w-20 h-20 text-gray-400 mx-auto mb-6" />
                  <h3 className="text-2xl font-extrabold text-gray-900 mb-2">No Lots Available</h3>
                  <p className="text-gray-600">This auction doesn't have any lots yet. Check back soon!</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Image Modal with Gallery Support */}
        <AnimatePresence>
          {imageModal.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl"
              onClick={closeImageModal}
            >
              <div className="absolute inset-4 flex items-center justify-center">
                <div className="relative max-w-5xl max-h-full" onClick={e => e.stopPropagation()}>
                  {/* Close button */}
                  <button
                    className="absolute -top-12 right-0 text-white hover:text-red-400 text-2xl font-bold z-10 bg-black/50 rounded-full p-2"
                    onClick={closeImageModal}
                  >
                    ×
                  </button>
                  
                  {/* Navigation arrows */}
                  {imageModal.images.length > 1 && (
                    <>
                      <button
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-green-400 text-4xl font-bold z-10 bg-black/50 rounded-full p-2"
                        onClick={() => navigateModalImage('prev')}
                      >
                        ‹
                      </button>
                      <button
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-green-400 text-4xl font-bold z-10 bg-black/50 rounded-full p-2"
                        onClick={() => navigateModalImage('next')}
                      >
                        ›
                      </button>
                    </>
                  )}
                  
                  {/* Main image */}
                  <div className="relative">
                    <Image
                      src={
                        imageModal.images[imageModal.currentIndex]?.startsWith('http') 
                          ? imageModal.images[imageModal.currentIndex]
                          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${imageModal.images[imageModal.currentIndex]}`
                      }
                      alt={`${imageModal.lotTitle} - Image ${imageModal.currentIndex + 1}`}
                      width={800}
                      height={600}
                      className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-lot.svg';
                      }}
                    />
                    
                    {/* Image counter */}
                    {imageModal.images.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-bold">
                        {imageModal.currentIndex + 1} of {imageModal.images.length}
                      </div>
                    )}
                  </div>
                  
                  {/* Image title */}
                  <div className="mt-4 text-center">
                    <h3 className="text-white text-xl font-bold">{imageModal.lotTitle}</h3>
                  </div>
                  
                  {/* Thumbnail strip for navigation */}
                  {imageModal.images.length > 1 && (
                    <div className="mt-6 flex justify-center gap-2 max-w-full overflow-x-auto pb-2">
                      {imageModal.images.map((img, idx) => (
                        <button
                          key={idx}
                          className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                            idx === imageModal.currentIndex ? 'border-green-400' : 'border-white/30'
                          }`}
                          onClick={() => setImageModal(prev => ({ ...prev, currentIndex: idx }))}
                        >
                          <Image
                            src={
                              img.startsWith('http') 
                                ? img
                                : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${img}`
                            }
                            alt={`Thumbnail ${idx + 1}`}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-lot.svg';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/20 backdrop-blur-2xl border border-white/30 rounded-3xl p-12 shadow-xl"
            >
              <h3 className="text-3xl font-extrabold text-gray-900 mb-8">Auction Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-3">Bidding Information</h4>
                    <div className="space-y-2 text-gray-700 text-base">
                      <p><span className="font-semibold">Bid Increment:</span> R{auction.increment}</p>
                      <p><span className="font-semibold">Total Lots:</span> {auction.lots.length}</p>
                      <p><span className="font-semibold">Deposit Required:</span> {auction.depositRequired ? `Yes (R${(auction.depositAmount || 0).toLocaleString()})` : 'No'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-3">Auction Stats</h4>
                    <div className="space-y-2 text-gray-700 text-base">
                      <p><span className="font-semibold">Created:</span> {new Date(auction.createdAt).toLocaleDateString()}</p>
                      <p><span className="font-semibold">Views:</span> {auction.viewCount || 0}</p>
                      <p><span className="font-semibold">Status:</span> <span className="capitalize">{status}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Modal */}
        <AnimatePresence>
          {videoModal.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl"
              onClick={closeVideoModal}
            >
              <div className="absolute inset-4 flex items-center justify-center">
                <div className="relative max-w-4xl max-h-full w-full" onClick={e => e.stopPropagation()}>
                  {/* Close button */}
                  <button
                    className="absolute -top-12 right-0 text-white hover:text-red-400 text-2xl font-bold z-10 bg-black/50 rounded-full p-2"
                    onClick={closeVideoModal}
                  >
                    ×
                  </button>
                  
                  {/* Video player */}
                  <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl">
                    <div className="aspect-video">
                      {videoModal.videoUrl.includes('youtube.com') || videoModal.videoUrl.includes('youtu.be') ? (
                        <iframe
                          src={videoModal.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                          title={`${videoModal.lotTitle} - Video`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full"
                        />
                      ) : (
                        <video
                          src={videoModal.videoUrl}
                          controls
                          className="w-full h-full"
                          onError={(e) => {
                            console.error('Video failed to load:', e);
                          }}
                        >
                          Your browser does not support the video tag.
                        </video>
                      )}
                    </div>
                  </div>
                  
                  {/* Video title */}
                  <div className="mt-4 text-center">
                    <h3 className="text-white text-xl font-bold">{videoModal.lotTitle}</h3>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
