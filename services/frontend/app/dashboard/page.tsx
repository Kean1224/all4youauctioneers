'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  email: string;
  name: string;
  verified: boolean;
  suspended: boolean;
  joinedDate: string;
}

interface Auction {
  id: string;
  title: string;
  status: string;
  endTime: string;
  currentBid?: number;
  yourBid?: number;
}

interface FICAStatus {
  status: 'pending' | 'approved' | 'rejected' | 'none';
  submittedAt?: string;
  rejectionReason?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ficaStatus, setFicaStatus] = useState<FICAStatus>({ status: 'none' });
  const [activeAuctions, setActiveAuctions] = useState<Auction[]>([]);
  const [watchedAuctions, setWatchedAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch user profile
      const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      }

      // Fetch FICA status
      const ficaResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/fica-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (ficaResponse.ok) {
        const ficaData = await ficaResponse.json();
        setFicaStatus(ficaData);
      }

      // Fetch user's active bids/auctions
      // This would need to be implemented in your backend
      // For now, using placeholder data
      setActiveAuctions([]);
      setWatchedAuctions([]);

    } catch (error) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getFicaStatusColor = () => {
    switch (ficaStatus.status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFicaStatusText = () => {
    switch (ficaStatus.status) {
      case 'approved': return '✓ Verified';
      case 'pending': return '⏳ Under Review';
      case 'rejected': return '✗ Rejected';
      default: return 'Not Submitted';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/10 pointer-events-none"></div>
        <div className="relative z-10 animate-spin rounded-full h-32 w-32 border-b-2 border-primary-400"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/10 pointer-events-none"></div>
        <div className="relative z-10 text-center">
          <p className="text-red-400 mb-4">Unable to load user data</p>
          <Link href="/login" className="text-primary-400 hover:text-primary-300 font-semibold">
            Please log in again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 relative overflow-hidden py-8 px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/10 pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-500/10 via-transparent to-transparent pointer-events-none"></div>
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 font-sora">Welcome Back, {user.name}!</h1>
          <p className="text-white/80 font-inter">Manage your auctions, bids, and account settings</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">
            {error}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Link href="/auctions" className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 hover:bg-white/20 hover:border-primary-500/50 transition-all group transform hover:scale-105">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary-500/20 flex items-center justify-center group-hover:bg-primary-500/30 transition-colors">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="font-semibold text-white font-inter">Browse Auctions</h3>
              <p className="text-sm text-white/70 mt-1">Find items to bid on</p>
            </div>
          </Link>

          <Link href="/sell" className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 hover:bg-white/20 hover:border-primary-500/50 transition-all group transform hover:scale-105">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="font-semibold text-white font-inter">Sell Item</h3>
              <p className="text-sm text-white/70 mt-1">List your items</p>
            </div>
          </Link>

          <Link href="/account" className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 hover:bg-white/20 hover:border-primary-500/50 transition-all group transform hover:scale-105">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                <span className="text-2xl">👤</span>
              </div>
              <h3 className="font-semibold text-white font-inter">My Account</h3>
              <p className="text-sm text-white/70 mt-1">Manage profile & FICA</p>
            </div>
          </Link>

          <Link href="/watchlist" className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 hover:bg-white/20 hover:border-primary-500/50 transition-all group transform hover:scale-105">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                <span className="text-2xl">👁️</span>
              </div>
              <h3 className="font-semibold text-gray-800">Watchlist</h3>
              <p className="text-sm text-gray-600 mt-1">Track favorite items</p>
            </div>
          </Link>
        </div>

        {/* Account Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Account Overview */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-yellow-200 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Account Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Email Verification</span>
                <span className={`px-3 py-1 rounded-full text-sm ${user.verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {user.verified ? '✓ Verified' : '✗ Not Verified'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">FICA Status</span>
                <span className={`px-3 py-1 rounded-full text-sm ${getFicaStatusColor()}`}>
                  {getFicaStatusText()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Account Status</span>
                <span className={`px-3 py-1 rounded-full text-sm ${user.suspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  {user.suspended ? '⚠️ Suspended' : '✓ Active'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Member Since</span>
                <span className="text-gray-800">
                  {new Date(user.joinedDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* FICA Information */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-yellow-200 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">FICA Verification</h2>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${getFicaStatusColor()}`}>
                <h3 className="font-semibold">{getFicaStatusText()}</h3>
                {ficaStatus.status === 'pending' && ficaStatus.submittedAt && (
                  <p className="text-sm mt-1">
                    Submitted: {new Date(ficaStatus.submittedAt).toLocaleDateString()}
                  </p>
                )}
                {ficaStatus.status === 'rejected' && ficaStatus.rejectionReason && (
                  <p className="text-sm mt-1">
                    Reason: {ficaStatus.rejectionReason}
                  </p>
                )}
              </div>
              
              {ficaStatus.status === 'none' && (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    Complete your FICA verification to participate in auctions
                  </p>
                  <Link 
                    href="/account"
                    className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Upload Documents
                  </Link>
                </div>
              )}

              {ficaStatus.status === 'rejected' && (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    Your documents were rejected. Please resubmit with corrections.
                  </p>
                  <Link 
                    href="/account"
                    className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Resubmit Documents
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Bids */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-yellow-200 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Active Bids</h2>
            {activeAuctions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No active bids</p>
                <Link href="/auctions" className="text-yellow-600 hover:text-yellow-700 font-semibold">
                  Browse auctions to start bidding
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {activeAuctions.map((auction) => (
                  <div key={auction.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold">{auction.title}</h3>
                    <div className="flex justify-between text-sm text-gray-600 mt-2">
                      <span>Your Bid: ${auction.yourBid}</span>
                      <span>Current: ${auction.currentBid}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Watchlist */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-yellow-200 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Watchlist</h2>
            {watchedAuctions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No items in watchlist</p>
                <Link href="/auctions" className="text-yellow-600 hover:text-yellow-700 font-semibold">
                  Add items to watch
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {watchedAuctions.map((auction) => (
                  <div key={auction.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold">{auction.title}</h3>
                    <div className="flex justify-between text-sm text-gray-600 mt-2">
                      <span>Status: {auction.status}</span>
                      <span>Current: ${auction.currentBid}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-8 text-center">
          <Link 
            href="/" 
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
