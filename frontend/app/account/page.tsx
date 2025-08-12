'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserIcon, 
  HeartIcon, 
  TrophyIcon, 
  DocumentDuplicateIcon,
  BanknotesIcon,
  ShoppingBagIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  CogIcon,
  GiftIcon
} from '@heroicons/react/24/outline';
import { getToken } from '../../utils/auth';

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  profilePicture?: string;
  memberSince?: string;
  totalBids?: number;
  totalWins?: number;
  totalSales?: number;
  rating?: number;
};

type Auction = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  currentBid?: number;
  totalLots?: number;
  image?: string;
};

type Bid = {
  id: string;
  auctionId: string;
  auctionTitle: string;
  lotNumber: number;
  bidAmount: number;
  timestamp: string;
  status: 'winning' | 'outbid' | 'won' | 'lost';
  itemTitle: string;
  itemImage?: string;
};

type WatchlistItem = {
  id: string;
  auctionId: string;
  auctionTitle: string;
  lotNumber: number;
  itemTitle: string;
  currentBid: number;
  endTime: string;
  image?: string;
};

export default function AccountDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<User | null>(null);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Fetch user data and related information
      fetchUserData(payload.email);
    } catch (error) {
      console.error('Error parsing token:', error);
      window.location.href = '/login';
    }
  }, []);

  const fetchUserData = async (email: string) => {
    try {
      setLoading(true);
      
      // Fetch real user data from API
      const { getApiUrl } = await import('../../lib/api');
      const token = getToken();
      
      const response = await fetch(`${getApiUrl()}/api/users/${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser({
          id: userData.email,
          email: userData.email,
          name: userData.name || 'User',
          role: 'buyer',
          memberSince: userData.registeredAt,
          totalBids: 0, // TODO: Calculate from bids API
          totalWins: 0, // TODO: Calculate from bids API
          totalSales: 0, // TODO: Calculate from sales API
          rating: 5.0 // TODO: Calculate from reviews API
        });
      } else {
        console.error('Failed to fetch user data');
        setUser({
          id: '1',
          email: email,
          name: 'User',
          role: 'buyer',
          memberSince: new Date().toISOString(),
          totalBids: 0,
          totalWins: 0,
          totalSales: 0,
          rating: 5.0
        });
      }

      // Fetch real auctions data
      try {
        const auctionsResponse = await fetch(`${getApiUrl()}/api/auctions`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (auctionsResponse.ok) {
          const auctionsData = await auctionsResponse.json();
          setAuctions(auctionsData || []);
        } else {
          setAuctions([]);
        }
      } catch (error) {
        console.error('Failed to fetch auctions:', error);
        setAuctions([]);
      }

      // Initialize empty arrays for bids and watchlist (real data will come from future APIs)
      setBids([]);
      setWatchlist([]);

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: UserIcon },
    { id: 'watchlist', label: 'Watchlist', icon: HeartIcon },
    { id: 'bids', label: 'My Bids', icon: TrophyIcon },
    { id: 'invoices', label: 'Invoices', icon: DocumentDuplicateIcon },
    { id: 'settings', label: 'Settings', icon: CogIcon }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'winning': return 'text-green-400';
      case 'outbid': return 'text-red-400';
      case 'won': return 'text-blue-400';
      case 'lost': return 'text-gray-400';
      case 'live': return 'text-green-400';
      case 'upcoming': return 'text-yellow-400';
      case 'ended': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'winning':
      case 'won':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'outbid':
      case 'lost':
        return <XCircleIcon className="w-4 h-4" />;
      case 'live':
        return <ClockIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-lg">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name || 'User'}</h1>
                <p className="text-gray-400">Member since {user?.memberSince ? new Date(user.memberSince).getFullYear() : '2024'}</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/sell'}
              className="bg-gradient-to-r from-green-400 to-emerald-500 text-black px-6 py-2 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-green-400/25"
            >
              <PlusIcon className="w-5 h-5" />
              Sell Item
            </motion.button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        activeTab === tab.id
                          ? 'bg-green-400/20 text-green-400 border border-green-400/30'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </motion.button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">Total Bids</p>
                          <p className="text-2xl font-bold text-white">{user?.totalBids || 0}</p>
                        </div>
                        <TrophyIcon className="w-8 h-8 text-green-400" />
                      </div>
                    </div>
                    
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">Wins</p>
                          <p className="text-2xl font-bold text-white">{user?.totalWins || 0}</p>
                        </div>
                        <GiftIcon className="w-8 h-8 text-blue-400" />
                      </div>
                    </div>
                    
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">Rating</p>
                          <p className="text-2xl font-bold text-white">{user?.rating || 0}/5</p>
                        </div>
                        <ArrowTrendingUpIcon className="w-8 h-8 text-yellow-400" />
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Recent Bids</h3>
                    {bids.length === 0 ? (
                      <div className="text-center py-8">
                        <TrophyIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">No bids yet</p>
                        <p className="text-gray-500 text-sm">Start bidding on auctions to see your activity here</p>
                      </div>
                    ) : (
                    <>
                      <div className="space-y-4">
                        {bids.slice(0, 3).map((bid) => (
                          <div key={bid.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-4">
                              <div className={`flex items-center gap-2 ${getStatusColor(bid.status)}`}>
                                {getStatusIcon(bid.status)}
                                <span className="text-sm font-medium capitalize">{bid.status}</span>
                              </div>
                              <div>
                                <p className="text-white font-medium">{bid.itemTitle}</p>
                                <p className="text-gray-400 text-sm">Lot #{bid.lotNumber} • {bid.auctionTitle}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-green-400 font-bold">R{bid.bidAmount}</p>
                              <p className="text-gray-400 text-sm">{new Date(bid.timestamp).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {bids.length > 3 && (
                        <button
                          onClick={() => setActiveTab('bids')}
                          className="w-full mt-4 text-green-400 hover:text-green-300 transition-colors"
                        >
                          View All Bids
                        </button>
                      )}
                    </>
                    )}
                  </div>

                  {/* Active Auctions */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Active Auctions</h3>
                    {auctions.filter(auction => auction.status === 'live' || auction.status === 'upcoming').length === 0 ? (
                      <div className="text-center py-8">
                        <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">No active auctions</p>
                        <p className="text-gray-500 text-sm">Check back later for upcoming auctions</p>
                      </div>
                    ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {auctions.filter(auction => auction.status === 'live' || auction.status === 'upcoming').map((auction) => (
                        <div key={auction.id} className="p-4 bg-white/5 rounded-xl border border-white/5">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-white font-medium">{auction.title}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(auction.status)} bg-current/20`}>
                              {auction.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="space-y-2 text-sm text-gray-400">
                            <p>Lots: {auction.totalLots}</p>
                            {auction.currentBid && (
                              <p>Current High: <span className="text-green-400 font-bold">R{auction.currentBid}</span></p>
                            )}
                            <p>Ends: {new Date(auction.endDate).toLocaleDateString()}</p>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => window.location.href = `/auctions/${auction.id}`}
                            className="w-full mt-3 bg-green-400/20 text-green-400 py-2 rounded-lg hover:bg-green-400/30 transition-colors flex items-center justify-center gap-2"
                          >
                            <EyeIcon className="w-4 h-4" />
                            View Auction
                          </motion.button>
                        </div>
                      ))}
                    </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'watchlist' && (
                <motion.div
                  key="watchlist"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
                >
                  <h3 className="text-xl font-bold text-white mb-6">Watchlist</h3>
                  {watchlist.length === 0 ? (
                    <div className="text-center py-12">
                      <HeartIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">Your watchlist is empty</p>
                      <p className="text-gray-500 text-sm">Add items to your watchlist to keep track of them</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {watchlist.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                          <div>
                            <h4 className="text-white font-medium">{item.itemTitle}</h4>
                            <p className="text-gray-400 text-sm">Lot #{item.lotNumber} • {item.auctionTitle}</p>
                            <p className="text-gray-400 text-sm">Ends: {new Date(item.endTime).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-bold">R{item.currentBid}</p>
                            <p className="text-gray-400 text-sm">Current Bid</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'bids' && (
                <motion.div
                  key="bids"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
                >
                  <h3 className="text-xl font-bold text-white mb-6">My Bids</h3>
                  <div className="space-y-4">
                    {bids.map((bid) => (
                      <div key={bid.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-4">
                          <div className={`flex items-center gap-2 ${getStatusColor(bid.status)}`}>
                            {getStatusIcon(bid.status)}
                            <span className="text-sm font-medium capitalize">{bid.status}</span>
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{bid.itemTitle}</h4>
                            <p className="text-gray-400 text-sm">Lot #{bid.lotNumber} • {bid.auctionTitle}</p>
                            <p className="text-gray-400 text-sm">{new Date(bid.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-bold">R{bid.bidAmount}</p>
                          <p className="text-gray-400 text-sm">Your Bid</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'invoices' && (
                <motion.div
                  key="invoices"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
                >
                  <h3 className="text-xl font-bold text-white mb-6">Invoices</h3>
                  <div className="flex gap-4 mb-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => window.location.href = '/account/buyer'}
                      className="flex-1 bg-blue-400/20 text-blue-400 py-3 rounded-xl hover:bg-blue-400/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingBagIcon className="w-5 h-5" />
                      Buyer Invoices
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => window.location.href = '/account/seller'}
                      className="flex-1 bg-green-400/20 text-green-400 py-3 rounded-xl hover:bg-green-400/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <BanknotesIcon className="w-5 h-5" />
                      Seller Reports
                    </motion.button>
                  </div>
                  <div className="text-center py-8">
                    <DocumentDuplicateIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">Select a type to view your invoices</p>
                  </div>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
                >
                  <h3 className="text-xl font-bold text-white mb-6">Account Settings</h3>
                  <div className="space-y-6">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                      <h4 className="text-white font-medium mb-2">Profile Information</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Email</span>
                          <span className="text-white">{user?.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Member Since</span>
                          <span className="text-white">{user?.memberSince ? new Date(user.memberSince).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Account Type</span>
                          <span className="text-white capitalize">{user?.role}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full p-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors text-left"
                      >
                        Change Password
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full p-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors text-left"
                      >
                        Notification Preferences
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full p-3 bg-red-400/20 text-red-400 rounded-xl hover:bg-red-400/30 transition-colors text-left"
                      >
                        Delete Account
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
