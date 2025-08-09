'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import SmartBreadcrumbs from '../components/SmartBreadcrumbs';
import ContextAwarePageHeader from '../components/ContextAwarePageHeader';
import NavigationHelper from '../components/NavigationHelper';

type Auction = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  imageUrl?: string;
};

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // Get user email for personalization
    const storedEmail = localStorage.getItem('userEmail');
    if (storedEmail) {
      setUserEmail(storedEmail);
    }

    const fetchAuctions = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auctions`);
        if (response.ok) {
          const data = await response.json();
          setAuctions(data);
        } else {
          console.error('Failed to fetch auctions:', response.status);
        }
      } catch (error) {
        console.error('Error fetching auctions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 relative overflow-hidden">
      {/* Background Elements - ensure they don't block clicks */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/10 pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-500/10 via-transparent to-transparent pointer-events-none"></div>
      
      <main className="relative z-10 px-4 py-8">
        <div className="max-w-6xl mx-auto">
        {/* Smart Breadcrumbs */}
        <SmartBreadcrumbs className="mb-4" />
        
        {/* Context-Aware Page Header */}
        <ContextAwarePageHeader userEmail={userEmail} />
        
        {/* Navigation Helper */}
        <NavigationHelper userEmail={userEmail} />

        {/* Past Auctions Link */}
        <div className="text-center mb-8">
          <Link 
            href="/auctions/past" 
            className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            📜 View Past Auctions
          </Link>
        </div>

        {loading ? (
        <p className="text-center text-white/80 text-lg">Loading auctions...</p>
      ) : auctions.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🏛️</div>
          <p className="text-white/80 text-xl font-medium">No auctions available right now.</p>
          <p className="text-white/60 mt-2">Please check back later for exciting new auctions!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {auctions.map((auction) => (
            <Link
              key={auction.id}
              href={`/auctions/${auction.id}`}
              className="group bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-300 rounded-2xl overflow-hidden border border-white/20 hover:border-primary-500/50 transform hover:scale-105 hover:shadow-2xl"
            >
              {auction.imageUrl && (
                <img
                  src={auction.imageUrl}
                  alt={auction.title}
                  className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                />
              )}
              <div className="p-6">
                <h2 className="text-xl font-bold text-white mb-2 group-hover:text-primary-300 transition-colors">{auction.title}</h2>
                <p className="text-white/70 text-sm mb-3 line-clamp-2">{auction.description || 'No description available'}</p>
                {auction.location && (
                  <p className="text-white/60 text-sm mb-2 flex items-center">
                    <span className="mr-2">📍</span> {auction.location}
                  </p>
                )}
                {auction.startTime && auction.endTime && (
                  <div className="text-white/60 text-sm space-y-1">
                    <p className="flex items-center">
                      <span className="mr-2">🕒</span> Starts: {new Date(auction.startTime).toLocaleDateString()}
                    </p>
                    <p className="flex items-center">
                      <span className="mr-2">🏁</span> Ends: {new Date(auction.endTime).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
        </div>
      </main>
    </div>
  );
}
