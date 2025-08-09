'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import SmartBreadcrumbs from '../components/SmartBreadcrumbs';
import ContextAwarePageHeader from '../components/ContextAwarePageHeader';
import NavigationHelper from '../components/NavigationHelper';

type Lot = {
  id: string;
  title: string;
  description: string;
  image?: string; // Backend stores single image as 'image'
  imageUrl?: string;
  currentBid: number;
  endTime: string;
  auctionId: string;
  auctionTitle?: string;
  lotNumber: number;
};

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date().getTime());

  // Update time every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().getTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Get user email from localStorage
  useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail');
    if (storedEmail) {
      setUserEmail(storedEmail);
    } else {
      // If no user email, redirect to login
      window.location.href = '/login';
      return;
    }
  }, []);

  // Load watchlist from localStorage
  useEffect(() => {
    const savedWatchlist = localStorage.getItem('watchlist');
    if (savedWatchlist) {
      setWatchlist(JSON.parse(savedWatchlist));
    }
  }, []);

  // Fetch lots data with staggered end times
  useEffect(() => {
    const fetchAllLots = async () => {
      try {
        // Fetch from all auctions
        const auctionsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auctions`);
        if (auctionsResponse.ok) {
          const auctions = await auctionsResponse.json();
          let allLots: Lot[] = [];
          
          for (const auction of auctions) {
            const lotsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auctions/${auction.id}/lots`);
            if (lotsResponse.ok) {
              const lotsData = await lotsResponse.json();
              const lotsWithAuction = lotsData.lots.map((lot: any, index: number) => {
                // Create staggered end times - each lot ends 1 minute after the previous
                const baseEndTime = new Date();
                baseEndTime.setMinutes(baseEndTime.getMinutes() + 5 + index); // Start from 5 minutes, add 1 minute per lot
                
                return {
                  ...lot,
                  auctionId: auction.id,
                  auctionTitle: auction.title,
                  endTime: baseEndTime.toISOString(),
                  lotNumber: index + 1,
                  currentBid: lot.currentBid || 100 // Default starting bid
                };
              });
              allLots = [...allLots, ...lotsWithAuction];
            }
          }
          setLots(allLots);
        }
      } catch (error) {
        console.error('Error fetching lots:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllLots();
  }, []);

  // Filter lots to only show watchlisted ones
  const watchlistedLots = lots.filter(lot => watchlist.includes(lot.id));

  // Remove from watchlist
  const removeFromWatchlist = (lotId: string) => {
    const newWatchlist = watchlist.filter(id => id !== lotId);
    setWatchlist(newWatchlist);
    localStorage.setItem('watchlist', JSON.stringify(newWatchlist));
  };

  // Enhanced time formatter with beautiful display
  const formatTimeLeft = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const timeLeft = end - currentTime;

    if (timeLeft <= 0) return { text: 'ENDED', className: 'bg-red-500 text-white', expired: true };

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    let text = '';
    let className = '';

    if (days > 0) {
      text = `${days}d ${hours}h ${minutes}m ${seconds}s`;
      className = 'bg-green-100 text-green-800';
    } else if (hours > 0) {
      text = `${hours}h ${minutes}m ${seconds}s`;
      className = 'bg-yellow-100 text-yellow-800';
    } else if (minutes > 5) {
      text = `${minutes}m ${seconds}s`;
      className = 'bg-orange-100 text-orange-800';
    } else {
      text = `${minutes}m ${seconds}s`;
      className = 'bg-red-100 text-red-800 animate-pulse';
    }

    return { text, className, expired: false };
  };

  if (loading) {
    return (
      <main className="min-h-screen px-2 py-10 sm:px-6 bg-gradient-to-br from-yellow-200 via-white to-blue-200 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading your watchlist...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-blue-50 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Smart Breadcrumbs */}
        <SmartBreadcrumbs className="mb-4" />
        
        {/* Context-Aware Page Header */}
        <ContextAwarePageHeader userEmail={userEmail} />
        
        {/* Navigation Helper */}
        <NavigationHelper userEmail={userEmail} />

        {/* Watchlist Content */}
        {watchlistedLots.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-yellow-200 p-12 text-center">
            <div className="text-6xl mb-4">💔</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Your watchlist is empty</h2>
            <p className="text-gray-600 mb-6">Start adding lots to your watchlist by clicking the heart icon on any lot!</p>
            <Link href="/" className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg transition-all duration-150">
              Browse Auctions
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {watchlistedLots.map(lot => {
              const timeInfo = formatTimeLeft(lot.endTime);
              return (
                <div key={lot.id} className="bg-white/90 rounded-2xl shadow-lg border border-yellow-100 p-6 hover:shadow-2xl transition-all duration-150">
                  {/* Lot Image */}
                  <div className="relative w-full h-48 mb-4 rounded-xl overflow-hidden group">
                    {(lot.image && lot.image.trim() !== "") || (lot.imageUrl && lot.imageUrl.trim() !== "") ? (
                      <img 
                        src={
                          lot.image ? 
                            (lot.image.startsWith('/uploads') ? `${process.env.NEXT_PUBLIC_API_URL}${lot.image}` : `${process.env.NEXT_PUBLIC_API_URL}/uploads/lots/${lot.image}`) :
                          lot.imageUrl ? 
                            (lot.imageUrl.startsWith('/uploads') ? `${process.env.NEXT_PUBLIC_API_URL}${lot.imageUrl}` : `${process.env.NEXT_PUBLIC_API_URL}/uploads/lots/${lot.imageUrl}`) :
                          '/placeholder.jpg'
                        } 
                        alt={lot.title}
                        className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                        onClick={() => {
                          const imgSrc = lot.image ? 
                            (lot.image.startsWith('/uploads') ? `${process.env.NEXT_PUBLIC_API_URL}${lot.image}` : `${process.env.NEXT_PUBLIC_API_URL}/uploads/lots/${lot.image}`) :
                            lot.imageUrl ? 
                              (lot.imageUrl.startsWith('/uploads') ? `${process.env.NEXT_PUBLIC_API_URL}${lot.imageUrl}` : `${process.env.NEXT_PUBLIC_API_URL}/uploads/lots/${lot.imageUrl}`) :
                            '/placeholder.jpg';
                          window.open(imgSrc, '_blank');
                        }}
                      />
                    ) : (
                      <img 
                        src={'/placeholder.jpg'}
                        alt={lot.title}
                        className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                    
                    {/* Magnifying Glass Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center cursor-pointer">
                      <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black bg-opacity-50 rounded-full p-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWatchlist(lot.id);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all z-10"
                      title="Remove from watchlist"
                    >
                      ✕
                    </button>
                    <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">
                      LOT #{lot.lotNumber}
                    </div>
                  </div>

                  {/* Lot Info */}
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-yellow-700 mb-2">{lot.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{lot.description}</p>
                    
                    {/* Current Bid */}
                    <div className="mb-3">
                      <span className="text-lg font-semibold text-blue-700">
                        Current Bid: R{lot.currentBid}
                      </span>
                    </div>

                    {/* Time Left - Enhanced Display */}
                    <div className="mb-4">
                      <div className={`px-3 py-2 rounded-lg font-mono text-sm font-bold ${timeInfo.className}`}>
                        {timeInfo.expired ? '⏰ ENDED' : `🕒 Ends in: ${timeInfo.text}`}
                      </div>
                    </div>

                    {/* Auction Info */}
                    <div className="mb-4">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {lot.auctionTitle}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Link 
                        href={`/auctions/${lot.auctionId}`}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-4 py-2 rounded-lg shadow transition-all duration-150 text-center"
                      >
                        View Auction
                      </Link>
                      <button
                        onClick={() => removeFromWatchlist(lot.id)}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold px-4 py-2 rounded-lg shadow transition-all duration-150"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
