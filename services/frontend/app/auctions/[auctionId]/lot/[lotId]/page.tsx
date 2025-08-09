'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function LotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const auctionId = params?.auctionId as string;
  const lotId = params?.lotId as string;
  
  const [lot, setLot] = useState<any>(null);
  const [auction, setAuction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [biddingLoading, setBiddingLoading] = useState(false);
  const [watching, setWatching] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [sniperExtended, setSniperExtended] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    // Get user email from localStorage
    const email = localStorage.getItem('userEmail') || '';
    setUserEmail(email);
  }, []);

  useEffect(() => {
    if (!auctionId || !lotId) return;
    
    const fetchData = async () => {
      try {
        // Fetch auction and lots
        const auctionResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auctions`);
        if (!auctionResponse.ok) throw new Error('Failed to fetch auctions');
        
        const auctions = await auctionResponse.json();
        const foundAuction = auctions.find((a: any) => a.id === auctionId);
        
        if (!foundAuction) {
          setError('Auction not found');
          return;
        }
        
        setAuction(foundAuction);
        
        // Find the specific lot
        const foundLot = foundAuction.lots?.find((l: any) => l.id === lotId);
        if (!foundLot) {
          setError('Lot not found');
          return;
        }
        
        setLot(foundLot);
      } catch (err) {
        console.error('Error fetching lot:', err);
        setError('Failed to load lot details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Check watchlist
    const watchlist = JSON.parse(localStorage.getItem('lot_watchlist') || '[]');
    setWatching(watchlist.includes(lotId));
  }, [auctionId, lotId]);

  const handlePlaceBid = async () => {
    if (!userEmail) {
      alert('Please log in to place a bid');
      return;
    }
    setShowBidModal(true);
    setBidAmount((lot.currentBid || lot.startingBid || 0) + (lot.bidIncrement || 10));
  };

  const confirmBid = async () => {
    setBiddingLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('admin_jwt');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lots/${auctionId}/${lotId}/bid`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ 
          bidderEmail: userEmail,
          amount: bidAmount
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      alert(`Bid placed successfully! New bid: R${data.currentBid}`);
      // Sniper protection: extend end time if bid placed in last 2 minutes
      const now = new Date().getTime();
      const end = new Date(lot.endTime).getTime();
      if (end - now < 2 * 60 * 1000) {
        setSniperExtended(true);
      }
      setShowBidModal(false);
      window.location.reload();
    } catch (error) {
      console.error('Bid placement failed:', error);
      alert(`Failed to place bid: ${error.message}`);
    } finally {
      setBiddingLoading(false);
    }
  };

  const toggleWatch = () => {
    let watchlist = JSON.parse(localStorage.getItem('lot_watchlist') || '[]');
    if (watching) {
      watchlist = watchlist.filter((id: string) => id !== lotId);
    } else {
      watchlist.push(lotId);
    }
    localStorage.setItem('lot_watchlist', JSON.stringify(watchlist));
    setWatching(!watching);
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Lot link copied to clipboard!');
  };

  const showInvoicePreview = () => {
    setShowInvoice(true);
  };

  const goBackToAuction = () => {
    router.push(`/auctions/${auctionId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-blue-50 to-purple-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-blue-50 to-purple-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <button
            onClick={goBackToAuction}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            ← Back to Auction
          </button>
        </div>
      </div>
    );
  }

  if (!lot) return null;

  const imageUrl = lot.imageUrl?.startsWith('http') 
    ? lot.imageUrl 
    : lot.imageUrl?.startsWith('/uploads')
    ? `${process.env.NEXT_PUBLIC_API_URL}${lot.imageUrl}`
    : lot.imageUrl || '/placeholder-lot.svg';
  const lotNumber = auction?.lots?.findIndex((l: any) => l.id === lotId) + 1;
  const timeLeft = (() => {
    if (!lot.endTime) return '';
    const now = new Date().getTime();
    const end = new Date(lot.endTime).getTime();
    const diff = end - now;
    if (diff <= 0) return 'ENDED';
    const min = Math.floor(diff / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    return `${min}m ${sec}s`;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-2">
          <button
            onClick={goBackToAuction}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-2 transition-colors"
          >
            ← Back to {auction?.title || 'Auction'}
          </button>
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-200 text-gray-700">Lot #{lotNumber}</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${lot.status === 'ended' ? 'bg-red-500 text-white' : lot.status === 'open' ? 'bg-green-500 text-white' : 'bg-yellow-400 text-gray-800'}`}>{lot.status?.toUpperCase()}</span>
            <button onClick={toggleWatch} className={`px-3 py-1 rounded-full text-xs font-bold border-2 shadow ${watching ? 'bg-yellow-200 border-yellow-400 text-yellow-900' : 'bg-white/30 border-white/50 text-gray-800 hover:bg-white/50'}`}>{watching ? '★ Watched' : '☆ Watch'}</button>
            <button onClick={handleShare} className="px-3 py-1 rounded-full text-xs font-bold border-2 shadow bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200">Share</button>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">{lot.title}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col gap-2">
            <img
              src={imageUrl}
              alt={lot.title}
              className="w-full h-96 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-lot.svg';
              }}
            />
            <div className="flex justify-between items-center px-4 py-2">
              <span className="text-xs text-gray-500">Views: {lot.views || 0}</span>
              <span className="text-xs text-gray-500">Watchers: {lot.watchers || 0}</span>
              <span className="text-xs text-gray-500">Category: {lot.category || 'N/A'}</span>
            </div>
          </div>

          {/* Details and Bidding */}
          <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{lot.title}</h2>
            <div className="flex gap-4 mb-2">
              <span className="text-sm text-gray-600">Location: {lot.location || 'N/A'}</span>
              {lot.sellerInfo && <span className="text-sm text-gray-600">Seller: {lot.sellerInfo}</span>}
            </div>
            {lot.description && (
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-gray-700 mb-1">Description</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{lot.description}</p>
              </div>
            )}
            <div className="flex gap-4 mb-2">
              <span className="text-sm text-gray-600">Start Price: <span className="font-bold">R{(lot.startingBid || 0).toLocaleString()}</span></span>
              <span className="text-sm text-gray-600">Current Bid: <span className="font-bold text-blue-600">R{(lot.currentBid || lot.startingBid || 0).toLocaleString()}</span></span>
              <span className="text-sm text-gray-600">Min Increment: <span className="font-bold">R{(lot.bidIncrement || 10).toLocaleString()}</span></span>
              {lot.reservePrice && <span className="text-sm text-gray-600">Reserve: <span className="font-bold">R{(lot.reservePrice).toLocaleString()}</span></span>}
            </div>
            <div className="flex gap-4 mb-2">
              <span className="text-sm text-gray-600">Time Left: <span className="font-bold">{timeLeft}</span></span>
              {sniperExtended && <span className="text-xs text-red-500">Sniper protection: End time extended!</span>}
            </div>
            {/* Bid History */}
            {lot.bidHistory && lot.bidHistory.length > 0 && (
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-gray-700 mb-1">Recent Bids</h3>
                <div className="max-h-32 overflow-y-auto border rounded p-2">
                  {lot.bidHistory.slice(-10).reverse().map((bid: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm py-1">
                      <span>{bid.bidderEmail.replace(/(.{3}).*@/, '$1***@')}</span>
                      <span className="font-semibold">R{bid.amount}</span>
                      <span className="text-xs text-gray-400">{new Date(bid.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Bidding Actions */}
            {lot.status !== 'ended' ? (
              <div className="space-y-4">
                {userEmail ? (
                  <>
                    <button
                      onClick={handlePlaceBid}
                      disabled={biddingLoading}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors disabled:opacity-50"
                    >
                      {biddingLoading ? 'Placing Bid...' : `Bid R${((lot.currentBid || lot.startingBid || 0) + (lot.bidIncrement || 10)).toLocaleString()}`}
                    </button>
                    <button
                      onClick={() => setBidAmount((lot.currentBid || lot.startingBid || 0) + (lot.bidIncrement || 10))}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg text-base mt-2"
                    >
                      Quick Bid
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">Please log in to place a bid</p>
                    <button
                      onClick={() => router.push('/login')}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded"
                    >
                      Login
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-4 bg-gray-100 rounded-lg">
                <p className="text-gray-600 font-semibold">🔚 This lot has ended</p>
                {lot.bidHistory && lot.bidHistory.length > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Final bid: R{(lot.currentBid || lot.startingBid || 0).toLocaleString()}
                  </p>
                )}
                <button onClick={showInvoicePreview} className="mt-2 px-4 py-2 bg-green-500 text-white rounded">View Invoice Preview</button>
              </div>
            )}
            {/* Invoice Preview Modal */}
            {showInvoice && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
                  <h3 className="text-xl font-bold mb-4">Invoice Preview</h3>
                  <p className="mb-2">Lot: <span className="font-bold">{lot.title}</span></p>
                  <p className="mb-2">Final Bid: <span className="font-bold">R{(lot.currentBid || lot.startingBid || 0).toLocaleString()}</span></p>
                  <p className="mb-2">Auction: <span className="font-bold">{auction?.title}</span></p>
                  <button onClick={() => setShowInvoice(false)} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">Close</button>
                </div>
              </div>
            )}
            {/* Bid Confirmation Modal */}
            {showBidModal && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
                  <h3 className="text-xl font-bold mb-4">Confirm Your Bid</h3>
                  <p className="mb-2">Lot: <span className="font-bold">{lot.title}</span></p>
                  <p className="mb-2">Your Bid: <span className="font-bold">R{bidAmount.toLocaleString()}</span></p>
                  <button onClick={confirmBid} disabled={biddingLoading} className="mt-4 px-4 py-2 bg-yellow-500 text-white rounded font-bold">{biddingLoading ? 'Placing Bid...' : 'Confirm Bid'}</button>
                  <button onClick={() => setShowBidModal(false)} className="mt-2 px-4 py-2 bg-gray-300 text-gray-800 rounded">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
