'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import SmartBreadcrumbs from '../../components/SmartBreadcrumbs';
import ContextAwarePageHeader from '../../components/ContextAwarePageHeader';
import NavigationHelper from '../../components/NavigationHelper';

type Lot = {
  id: string;
  title: string;
  description?: string;
  currentBid: number;
  status: string;
  bidHistory?: Array<{
    bidderEmail: string;
    amount: number;
    time: string;
  }>;
};

type Auction = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  imageUrl?: string;
  lots: Lot[];
};

export default function PastAuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // Get user email for personalization
    const storedEmail = localStorage.getItem('userEmail');
    if (storedEmail) {
      setUserEmail(storedEmail);
    }

    const fetchPastAuctions = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auctions/past`);
        if (response.ok) {
          const data = await response.json();
          setAuctions(data);
        } else {
          console.error('Failed to fetch past auctions:', response.status);
        }
      } catch (error) {
        console.error('Error fetching past auctions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPastAuctions();
  }, []);

  // Helper function to check if user won any lots in an auction
  const getUserWonLots = (auction: Auction): Lot[] => {
    if (!userEmail) return [];
    
    return auction.lots.filter(lot => {
      if (!lot.bidHistory || lot.bidHistory.length === 0) return false;
      const winningBid = lot.bidHistory[lot.bidHistory.length - 1];
      return winningBid.bidderEmail === userEmail;
    });
  };

  // Helper function to get total lots won by user across all auctions
  const getTotalWonLots = (): number => {
    return auctions.reduce((total, auction) => {
      return total + getUserWonLots(auction).length;
    }, 0);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Smart Breadcrumbs */}
        <SmartBreadcrumbs className="mb-4" />
        
        {/* Context-Aware Page Header */}
        <ContextAwarePageHeader userEmail={userEmail} />
        
        {/* Navigation Helper */}
        <NavigationHelper userEmail={userEmail} />

        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Past Auctions</h1>
          <p className="text-gray-600">Completed auctions and results</p>
          {userEmail && getTotalWonLots() > 0 && (
            <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-xl max-w-md mx-auto">
              <p className="text-green-800 font-semibold">
                🎉 You won {getTotalWonLots()} lot{getTotalWonLots() > 1 ? 's' : ''} across all completed auctions!
              </p>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading past auctions...</p>
        ) : auctions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No completed auctions yet.</p>
            <Link 
              href="/auctions" 
              className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              View Active Auctions
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {auctions.map((auction) => {
              const wonLots = getUserWonLots(auction);
              
              return (
                <div
                  key={auction.id}
                  className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  {auction.imageUrl && (
                    <img
                      src={auction.imageUrl}
                      alt={auction.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-5">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">{auction.title}</h2>
                    <p className="text-gray-600 text-sm mb-2">{auction.description || 'No description available'}</p>
                    
                    {auction.location && (
                      <p className="text-gray-500 text-xs mb-1">📍 {auction.location}</p>
                    )}
                    
                    {auction.startTime && auction.endTime && (
                      <div className="text-gray-500 text-xs mb-3">
                        <p>🕒 Started: {new Date(auction.startTime).toLocaleDateString()}</p>
                        <p>🏁 Ended: {new Date(auction.endTime).toLocaleDateString()}</p>
                      </div>
                    )}

                    {/* Auction Stats */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm">
                      <p className="text-gray-600">
                        <span className="font-semibold">Total Lots:</span> {auction.lots.length}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-semibold">Status:</span> 
                        <span className="ml-1 bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
                          ✅ Completed
                        </span>
                      </p>
                    </div>

                    {/* User's Won Lots */}
                    {userEmail && wonLots.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                        <h3 className="font-bold text-green-800 text-sm mb-2 flex items-center">
                          🏆 YOU WON {wonLots.length} LOT{wonLots.length > 1 ? 'S' : ''}!
                        </h3>
                        <div className="space-y-1">
                          {wonLots.map(lot => {
                            const winningBid = lot.bidHistory![lot.bidHistory!.length - 1];
                            return (
                              <div key={lot.id} className="text-xs text-green-700">
                                <span className="font-semibold">{lot.title}</span>
                                <span className="ml-2 text-green-600">R{(winningBid.amount || 0).toLocaleString()}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* View Details Button */}
                    <Link
                      href={`/auctions/${auction.id}`}
                      className="block w-full text-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      View Results
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Back to Active Auctions */}
        <div className="text-center mt-12">
          <Link 
            href="/auctions" 
            className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            ← Back to Active Auctions
          </Link>
        </div>
      </div>
    </main>
  );
}
